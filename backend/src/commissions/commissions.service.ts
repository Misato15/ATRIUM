import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import {
  CommissionAttachmentType,
  CommissionDisputeStatus,
  CommissionStatus,
  PaymentPurpose,
  PaymentStatus,
} from '../generated/prisma/client.js';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommissionRequestDto } from './dto/create-commission-request.dto';
import { DeliverCommissionDto } from './dto/deliver-commission.dto';
import { OpenCommissionDisputeDto } from './dto/open-commission-dispute.dto';
import { ResolveCommissionDisputeDto } from './dto/resolve-commission-dispute.dto';
import { UpdateCommissionProposalDto } from './dto/update-commission-proposal.dto';

@Injectable()
export class CommissionsService {
  private readonly logger = new Logger(CommissionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  private getFrontendUrl() {
    return process.env.FRONTEND_URL || 'http://localhost:5173';
  }

  private getArtistDisplayName(artistProfile: {
    artistName?: string | null;
    fullName?: string | null;
  }) {
    return artistProfile.artistName || artistProfile.fullName || 'artista';
  }

  private getCommissionSummaryInclude() {
    return {
      artistProfile: {
        select: {
          id: true,
          fullName: true,
          artistName: true,
          location: true,
          profileImageUrl: true,
        },
      },
      paymentTransactions: {
        orderBy: {
          createdAt: 'desc',
        },
      },
      attachments: {
        orderBy: {
          createdAt: 'asc',
        },
      },
      disputes: {
        orderBy: {
          createdAt: 'desc',
        },
      },
    } as const;
  }

  private getClientResponseDeadline() {
    const responseDays = Number(process.env.COMMISSION_RESPONSE_DAYS ?? 5);
    const safeResponseDays =
      Number.isFinite(responseDays) && responseDays > 0 ? responseDays : 5;
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + safeResponseDays);

    return deadline;
  }

  private normalizeAttachmentInputs(
    attachments:
      | {
          url?: string;
          publicId?: string;
          resourceType?: string;
          deliveryType?: string;
          previewUrl?: string;
          name?: string;
          mimeType?: string;
          size?: number;
        }[]
      | undefined,
    type: CommissionAttachmentType,
    uploadedByUserId: number,
  ) {
    return (attachments || [])
      .map((attachment) => ({
        uploadedByUserId,
        type,
        url: attachment.url?.trim() || '',
        publicId: attachment.publicId?.trim() || null,
        resourceType: attachment.resourceType?.trim() || null,
        deliveryType: attachment.deliveryType?.trim() || null,
        previewUrl: attachment.previewUrl?.trim() || null,
        name: attachment.name?.trim() || null,
        mimeType: attachment.mimeType?.trim() || null,
        size:
          Number.isFinite(Number(attachment.size)) && Number(attachment.size) > 0
            ? Number(attachment.size)
            : null,
      }))
      .filter((attachment) => attachment.url);
  }

  private withWatermarkPreview(attachment: {
    uploadedByUserId: number;
    type: CommissionAttachmentType;
    url: string;
    publicId: string | null;
    resourceType: string | null;
    deliveryType: string | null;
    previewUrl: string | null;
    name: string | null;
    mimeType: string | null;
    size: number | null;
  }) {
    if (
      attachment.previewUrl ||
      !attachment.publicId ||
      attachment.resourceType !== 'image' ||
      (attachment.mimeType && !attachment.mimeType.startsWith('image/'))
    ) {
      return attachment;
    }

    return {
      ...attachment,
      previewUrl: this.cloudinaryService.createWatermarkedImageUrl(
        attachment.publicId,
        attachment.deliveryType || 'upload',
      ),
    };
  }

  private hideLockedFinalFile<
    T extends {
      status: CommissionStatus;
      finalFileUrl?: string | null;
      attachments?: { type: CommissionAttachmentType }[];
    },
  >(
    commissionRequest: T,
  ) {
    return {
      ...commissionRequest,
      finalFileUrl:
        commissionRequest.status === CommissionStatus.COMPLETED
          ? commissionRequest.finalFileUrl
          : null,
      attachments: commissionRequest.attachments?.filter(
        (attachment) =>
          attachment.type !== CommissionAttachmentType.ARTIST_FINAL ||
          commissionRequest.status === CommissionStatus.COMPLETED,
      ).map((attachment) =>
        attachment.type === CommissionAttachmentType.ARTIST_FINAL
          ? {
              ...attachment,
              url: '',
            }
          : attachment,
      ),
    };
  }

  private async autoCompleteExpiredDeliveries() {
    const now = new Date();
    const expiredDeliveries = await this.prisma.commissionRequest.findMany({
      where: {
        status: CommissionStatus.DELIVERED,
        clientResponseDeadline: {
          lte: now,
        },
      },
      select: {
        id: true,
        clientName: true,
        artistProfile: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (expiredDeliveries.length === 0) {
      return;
    }

    const expiredDeliveryIds = expiredDeliveries.map((delivery) => delivery.id);

    await this.prisma.$transaction(async (transaction) => {
      await transaction.commissionRequest.updateMany({
        where: {
          id: {
            in: expiredDeliveryIds,
          },
          status: CommissionStatus.DELIVERED,
        },
        data: {
          status: CommissionStatus.COMPLETED,
          completedAt: now,
          autoApprovedAt: now,
        },
      });

      await transaction.paymentTransaction.updateMany({
        where: {
          commissionRequestId: {
            in: expiredDeliveryIds,
          },
          status: 'PAID',
          releasedAt: null,
        },
        data: {
          releasedAt: now,
        },
      });

      for (const delivery of expiredDeliveries) {
        await transaction.notification.create({
          data: {
            userId: delivery.artistProfile.userId,
            type: 'COMMISSION_REQUEST',
            title: 'Entrega aprobada automaticamente',
            message: `${delivery.clientName} no respondio dentro del plazo. La entrega fue aprobada automaticamente.`,
            relatedEntityId: delivery.id,
          },
        });
      }
    });
  }

  async createForArtist(
    artistProfileId: number,
    clientUserId: number,
    createCommissionRequestDto: CreateCommissionRequestDto,
  ) {
    const artistProfile = await this.prisma.artistProfile.findUnique({
      where: {
        id: artistProfileId,
      },
      select: {
        id: true,
        userId: true,
        fullName: true,
        artistName: true,
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    if (!artistProfile) {
      throw new NotFoundException('Artista no encontrado');
    }

    if (artistProfile.userId === clientUserId) {
      throw new BadRequestException(
        'No puedes solicitar una comision a tu propio perfil',
      );
    }

    const clientUser = await this.prisma.user.findUnique({
      where: {
        id: clientUserId,
      },
      select: {
        email: true,
        fullName: true,
        profile: {
          select: {
            fullName: true,
            artistName: true,
          },
        },
      },
    });

    if (!clientUser) {
      throw new BadRequestException('Cliente no encontrado');
    }

    if (!createCommissionRequestDto.message?.trim()) {
      throw new BadRequestException('El mensaje es obligatorio');
    }

    const clientName =
      clientUser.profile?.artistName ||
      clientUser.profile?.fullName ||
      clientUser.fullName ||
      clientUser.email;
    const projectTitle =
      createCommissionRequestDto.projectTitle?.trim() || null;
    const budgetMin = createCommissionRequestDto.budgetMin?.trim() || null;
    const budgetMax = createCommissionRequestDto.budgetMax?.trim() || null;
    const budget =
      createCommissionRequestDto.budget?.trim() ||
      [budgetMin, budgetMax].filter(Boolean).join(' - ') ||
      null;
    const validServiceModes = ['ONLINE', 'IN_PERSON', 'BOTH'] as const;
    const serviceMode =
      createCommissionRequestDto.serviceMode &&
      validServiceModes.includes(createCommissionRequestDto.serviceMode)
        ? createCommissionRequestDto.serviceMode
        : null;
    const desiredDeadline = createCommissionRequestDto.desiredDeadline
      ? new Date(createCommissionRequestDto.desiredDeadline)
      : null;
    const referenceAttachments = this.normalizeAttachmentInputs(
      createCommissionRequestDto.referenceAttachments,
      CommissionAttachmentType.CLIENT_REFERENCE,
      clientUserId,
    );

    if (desiredDeadline && Number.isNaN(desiredDeadline.getTime())) {
      throw new BadRequestException('La fecha de entrega no es valida');
    }

    const commissionRequest = await this.prisma.$transaction(
      async (transaction) => {
        const commissionRequest = await transaction.commissionRequest.create({
          data: {
            artistProfileId,
            clientUserId,
            clientName,
            clientEmail: clientUser.email,
            projectTitle,
            message: createCommissionRequestDto.message.trim(),
            budget,
            budgetMin,
            budgetMax,
            desiredDeadline,
            isFlexibleDeadline: Boolean(
              createCommissionRequestDto.isFlexibleDeadline,
            ),
            serviceMode,
            attachments:
              referenceAttachments.length > 0
                ? {
                    create: referenceAttachments,
                  }
                : undefined,
          },
          include: {
            attachments: {
              orderBy: {
                createdAt: 'asc',
              },
            },
          },
        });

        await transaction.notification.create({
          data: {
            userId: artistProfile.userId,
            type: 'COMMISSION_REQUEST',
            title: 'Nueva solicitud de comision',
            message: `${clientName} envio una solicitud para trabajar contigo.`,
            relatedEntityId: commissionRequest.id,
          },
        });

        return commissionRequest;
      },
    );

    await this.mailService
      .sendCommissionRequestEmail({
        to: artistProfile.user.email,
        artistName:
          artistProfile.artistName || artistProfile.fullName || 'artista',
        clientName,
        clientEmail: clientUser.email,
        message: createCommissionRequestDto.message.trim(),
        budget: budget || undefined,
      })
      .catch((error: Error) => {
        this.logger.warn(
          `No se pudo enviar correo de comision: ${error.message}`,
        );
      });

    return commissionRequest;
  }

  async findMine(userId: number) {
    await this.autoCompleteExpiredDeliveries();

    const profile = await this.prisma.artistProfile.findUnique({
      where: {
        userId,
      },
      select: {
        id: true,
      },
    });

    if (!profile) {
      throw new ForbiddenException('Este usuario no tiene perfil de artista');
    }

    return this.prisma.commissionRequest.findMany({
      where: {
        artistProfileId: profile.id,
      },
      include: {
        attachments: {
          orderBy: {
            createdAt: 'asc',
          },
        },
        disputes: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        clientReview: true,
        clientUser: {
          select: {
            id: true,
            fullName: true,
            email: true,
            interests: true,
            clientReviewsReceived: {
              include: {
                artistProfile: {
                  select: {
                    id: true,
                    fullName: true,
                    artistName: true,
                  },
                },
              },
              orderBy: {
                createdAt: 'desc',
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findRequestedByClient(userId: number) {
    await this.autoCompleteExpiredDeliveries();

    const commissionRequests = await this.prisma.commissionRequest.findMany({
      where: {
        clientUserId: userId,
      },
      include: {
        attachments: {
          orderBy: {
            createdAt: 'asc',
          },
        },
        artistProfile: {
          select: {
            id: true,
            fullName: true,
            artistName: true,
            location: true,
            profileImageUrl: true,
          },
        },
        paymentTransactions: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        disputes: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return commissionRequests.map((commissionRequest) =>
      this.hideLockedFinalFile(commissionRequest),
    );
  }

  async getFinalDownloadUrl(
    userId: number,
    commissionRequestId: number,
    attachmentId?: number,
  ) {
    const commissionRequest = await this.prisma.commissionRequest.findUnique({
      where: {
        id: commissionRequestId,
      },
      include: {
        artistProfile: {
          select: {
            userId: true,
          },
        },
        attachments: {
          where: {
            type: CommissionAttachmentType.ARTIST_FINAL,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!commissionRequest) {
      throw new NotFoundException('Comision no encontrada');
    }

    const isArtistOwner = commissionRequest.artistProfile.userId === userId;
    const isClientOwner = commissionRequest.clientUserId === userId;

    if (!isArtistOwner && !isClientOwner) {
      throw new ForbiddenException('No puedes descargar esta entrega');
    }

    if (isClientOwner && commissionRequest.status !== CommissionStatus.COMPLETED) {
      throw new ForbiddenException(
        'El archivo final se desbloquea cuando apruebas la entrega',
      );
    }

    const finalAttachment = attachmentId
      ? commissionRequest.attachments.find(
          (attachment) => attachment.id === attachmentId,
        )
      : commissionRequest.attachments[0];

    if (finalAttachment?.publicId) {
      return {
        downloadUrl: this.cloudinaryService.createSignedDownloadUrl({
          publicId: finalAttachment.publicId,
          resourceType: finalAttachment.resourceType || 'raw',
          deliveryType: finalAttachment.deliveryType || 'authenticated',
          attachmentName: finalAttachment.name,
        }),
        expiresInSeconds: 10 * 60,
      };
    }

    if (commissionRequest.finalFileUrl) {
      return {
        downloadUrl: commissionRequest.finalFileUrl,
        expiresInSeconds: null,
      };
    }

    throw new NotFoundException('Esta comision no tiene archivo final');
  }

  async cancelAsArtist(
    userId: number,
    commissionRequestId: number,
    reason?: string,
  ) {
    const commissionRequest = await this.ensureOwnsCommissionRequest(
      userId,
      commissionRequestId,
    );

    return this.cancelCommissionRecord({
      commissionRequestId,
      cancelledByUserId: userId,
      status: CommissionStatus.CANCELLED_BY_ARTIST,
      reason,
      shouldReleasePaidPayment: false,
      notifyUserId: commissionRequest.clientUserId || undefined,
      notificationTitle: 'Comision cancelada por el artista',
      notificationMessage: `${this.getArtistDisplayName(
        commissionRequest.artistProfile,
      )} cancelo la comision.`,
    });
  }

  async cancelAsClient(
    userId: number,
    commissionRequestId: number,
    reason?: string,
  ) {
    const commissionRequest = await this.ensureClientOwnsCommissionRequest(
      userId,
      commissionRequestId,
      'Comision no encontrada',
    );

    return this.cancelCommissionRecord({
      commissionRequestId,
      cancelledByUserId: userId,
      status: CommissionStatus.CANCELLED_BY_CLIENT,
      reason,
      shouldReleasePaidPayment: Boolean(commissionRequest.deliveredAt),
      notifyUserId: commissionRequest.artistProfile.userId,
      notificationTitle: 'Comision cancelada por el cliente',
      notificationMessage: commissionRequest.deliveredAt
        ? `${commissionRequest.clientName} cancelo despues de una entrega. Aplica la retencion acordada de ${commissionRequest.cancellationRetentionPercent || 0}%.`
        : `${commissionRequest.clientName} cancelo la comision antes de la entrega.`,
    });
  }

  async openDisputeAsArtist(
    userId: number,
    commissionRequestId: number,
    openCommissionDisputeDto: OpenCommissionDisputeDto,
  ) {
    const commissionRequest = await this.ensureOwnsCommissionRequest(
      userId,
      commissionRequestId,
    );

    return this.openDisputeRecord({
      commissionRequestId,
      openedByUserId: userId,
      reason: openCommissionDisputeDto.reason,
      evidenceAttachments: openCommissionDisputeDto.evidenceAttachments,
      notifyUserId: commissionRequest.clientUserId || undefined,
      notificationMessage: `${this.getArtistDisplayName(
        commissionRequest.artistProfile,
      )} abrio una disputa en la comision.`,
    });
  }

  async openDisputeAsClient(
    userId: number,
    commissionRequestId: number,
    openCommissionDisputeDto: OpenCommissionDisputeDto,
  ) {
    const commissionRequest = await this.ensureClientOwnsCommissionRequest(
      userId,
      commissionRequestId,
      'Comision no encontrada',
    );

    return this.openDisputeRecord({
      commissionRequestId,
      openedByUserId: userId,
      reason: openCommissionDisputeDto.reason,
      evidenceAttachments: openCommissionDisputeDto.evidenceAttachments,
      notifyUserId: commissionRequest.artistProfile.userId,
      notificationMessage: `${commissionRequest.clientName} abrio una disputa en la comision.`,
    });
  }

  async resolveDisputeAsAdmin(
    adminUserId: number,
    role: string,
    disputeId: number,
    resolveCommissionDisputeDto: ResolveCommissionDisputeDto,
  ) {
    if (role !== 'ADMIN') {
      throw new ForbiddenException('Solo un administrador puede resolver disputas');
    }

    const resolution = resolveCommissionDisputeDto.resolution?.trim();

    if (!resolution) {
      throw new BadRequestException('Debes escribir la resolucion');
    }

    const allowedStatuses: CommissionStatus[] = [
      CommissionStatus.IN_PROGRESS,
      CommissionStatus.COMPLETED,
      CommissionStatus.CANCELLED_BY_CLIENT,
      CommissionStatus.CANCELLED_BY_ARTIST,
    ];

    if (!allowedStatuses.includes(resolveCommissionDisputeDto.commissionStatus)) {
      throw new BadRequestException('Estado de resolucion no permitido');
    }

    const dispute = await this.prisma.commissionDispute.findUnique({
      where: {
        id: disputeId,
      },
      include: {
        commissionRequest: true,
      },
    });

    if (!dispute) {
      throw new NotFoundException('Disputa no encontrada');
    }

    if (dispute.status !== CommissionDisputeStatus.OPEN) {
      throw new BadRequestException('Esta disputa ya fue resuelta');
    }

    const now = new Date();

    return this.prisma.$transaction(async (transaction) => {
      await transaction.commissionDispute.update({
        where: {
          id: disputeId,
        },
        data: {
          status: CommissionDisputeStatus.RESOLVED,
          resolution,
          resolvedByUserId: adminUserId,
          resolvedAt: now,
        },
      });

      const updatedCommissionRequest =
        await transaction.commissionRequest.update({
          where: {
            id: dispute.commissionRequestId,
          },
          data: {
            status: resolveCommissionDisputeDto.commissionStatus,
            completedAt:
              resolveCommissionDisputeDto.commissionStatus ===
              CommissionStatus.COMPLETED
                ? now
                : undefined,
            clientResponseDeadline: null,
          },
          include: this.getCommissionSummaryInclude(),
        });

      if (
        resolveCommissionDisputeDto.commissionStatus ===
        CommissionStatus.COMPLETED
      ) {
        await transaction.paymentTransaction.updateMany({
          where: {
            commissionRequestId: dispute.commissionRequestId,
            status: PaymentStatus.PAID,
            releasedAt: null,
          },
          data: {
            releasedAt: now,
          },
        });
      }

      if (
        resolveCommissionDisputeDto.commissionStatus ===
        CommissionStatus.CANCELLED_BY_ARTIST
      ) {
        await transaction.paymentTransaction.updateMany({
          where: {
            commissionRequestId: dispute.commissionRequestId,
            status: {
              in: [PaymentStatus.PENDING, PaymentStatus.PAID],
            },
            releasedAt: null,
          },
          data: {
            status: PaymentStatus.CANCELLED,
          },
        });
      }

      return this.hideLockedFinalFile(updatedCommissionRequest);
    });
  }

  async updateMineStatus(
    userId: number,
    commissionRequestId: number,
    status: CommissionStatus,
    rejectionReason?: string,
  ) {
    const commissionRequest = await this.ensureOwnsCommissionRequest(
      userId,
      commissionRequestId,
    );

    const directAcceptableStatuses: CommissionStatus[] = [
      CommissionStatus.CLIENT_ACCEPTED,
      CommissionStatus.REVIEWED,
      CommissionStatus.PENDING,
    ];

    if (
      status === CommissionStatus.ACCEPTED &&
      !directAcceptableStatuses.includes(commissionRequest.status)
    ) {
      throw new BadRequestException(
        'Esta solicitud no se puede aceptar en su estado actual',
      );
    }

    if (status === CommissionStatus.REJECTED && !rejectionReason?.trim()) {
      throw new BadRequestException('Debes indicar el motivo de rechazo');
    }

    const updatedCommissionRequest = await this.prisma.commissionRequest.update({
      where: {
        id: commissionRequestId,
      },
      data: {
        status,
        quotedPrice:
          status === CommissionStatus.ACCEPTED && !commissionRequest.quotedPrice
            ? commissionRequest.budget
            : commissionRequest.quotedPrice,
        rejectionReason:
          status === CommissionStatus.REJECTED
            ? rejectionReason?.trim()
            : commissionRequest.rejectionReason,
      },
    });

    const artistName = this.getArtistDisplayName(
      commissionRequest.artistProfile,
    );

    if (status === CommissionStatus.REVIEWED) {
      await this.mailService
        .sendCommissionReviewEmail({
          to: commissionRequest.clientEmail,
          clientName: commissionRequest.clientName,
          artistName,
        })
        .catch((error: Error) =>
          this.logger.warn(`No se pudo enviar correo de revision: ${error.message}`),
        );
    }

    if (status === CommissionStatus.REJECTED && rejectionReason?.trim()) {
      await this.mailService
        .sendCommissionRejectedEmail({
          to: commissionRequest.clientEmail,
          clientName: commissionRequest.clientName,
          artistName,
          rejectionReason: rejectionReason.trim(),
        })
        .catch((error: Error) =>
          this.logger.warn(`No se pudo enviar correo de rechazo: ${error.message}`),
        );
    }

    return updatedCommissionRequest;
  }

  async updateMineNote(
    userId: number,
    commissionRequestId: number,
    artistNote?: string,
  ) {
    await this.ensureOwnsCommissionRequest(userId, commissionRequestId);

    return this.prisma.commissionRequest.update({
      where: {
        id: commissionRequestId,
      },
      data: {
        artistNote: artistNote?.trim() || null,
      },
    });
  }

  async updateMineProposal(
    userId: number,
    commissionRequestId: number,
    updateCommissionProposalDto: UpdateCommissionProposalDto,
  ) {
    const commissionRequest = await this.ensureOwnsCommissionRequest(
      userId,
      commissionRequestId,
    );

    const artistResponse =
      updateCommissionProposalDto.artistResponse?.trim() || null;
    const quotedPrice = updateCommissionProposalDto.quotedPrice?.trim() || null;
    const includedRevisions = Math.max(
      0,
      Math.floor(Number(updateCommissionProposalDto.includedRevisions ?? 1)),
    );
    const extraRevisionPrice =
      updateCommissionProposalDto.extraRevisionPrice?.trim() || null;
    const cancellationRetentionPercent = Math.min(
      100,
      Math.max(
        0,
        Math.floor(
          Number(updateCommissionProposalDto.cancellationRetentionPercent ?? 0),
        ),
      ),
    );

    if (!artistResponse || !quotedPrice) {
      throw new BadRequestException(
        'La propuesta necesita respuesta y cotizacion',
      );
    }

    const updatedCommissionRequest = await this.prisma.commissionRequest.update({
      where: {
        id: commissionRequestId,
      },
      data: {
        artistResponse,
        quotedPrice,
        includedRevisions: Number.isFinite(includedRevisions)
          ? includedRevisions
          : 1,
        extraRevisionPrice,
        cancellationRetentionPercent: Number.isFinite(
          cancellationRetentionPercent,
        )
          ? cancellationRetentionPercent
          : 0,
        rejectionReason: null,
        status: CommissionStatus.PROPOSED,
      },
    });

    const proposalUrl = `${this.getFrontendUrl()}/commissions/proposals/${commissionRequestId}`;

    await this.mailService
      .sendCommissionProposalEmail({
        to: commissionRequest.clientEmail,
        clientName: commissionRequest.clientName,
        artistName: this.getArtistDisplayName(commissionRequest.artistProfile),
        quotedPrice,
        artistResponse,
        proposalUrl,
      })
      .catch((error: Error) =>
        this.logger.warn(`No se pudo enviar correo de propuesta: ${error.message}`),
      );

    return updatedCommissionRequest;
  }

  async findProposal(commissionRequestId: number) {
    const commissionRequest = await this.prisma.commissionRequest.findUnique({
      where: {
        id: commissionRequestId,
      },
      select: {
        id: true,
        clientName: true,
        message: true,
        budget: true,
        artistResponse: true,
        quotedPrice: true,
        includedRevisions: true,
        usedRevisions: true,
        extraRevisionPrice: true,
        cancellationRetentionPercent: true,
        rejectionReason: true,
        status: true,
        artistProfile: {
          select: {
            id: true,
            fullName: true,
            artistName: true,
            location: true,
            profileImageUrl: true,
          },
        },
      },
    });

    if (!commissionRequest) {
      throw new NotFoundException('Propuesta no encontrada');
    }

    return commissionRequest;
  }

  async findDelivery(commissionRequestId: number) {
    await this.autoCompleteExpiredDeliveries();

    const commissionRequest = await this.prisma.commissionRequest.findUnique({
      where: {
        id: commissionRequestId,
      },
      select: {
        id: true,
        clientName: true,
        message: true,
        artistResponse: true,
        quotedPrice: true,
        deliveryMessage: true,
        deliveryUrl: true,
        deliveryPreviewUrl: true,
        finalFileUrl: true,
        includedRevisions: true,
        usedRevisions: true,
        extraRevisionPrice: true,
        cancellationRetentionPercent: true,
        clientResponseDeadline: true,
        autoApprovedAt: true,
        revisionRequest: true,
        status: true,
        deliveredAt: true,
        completedAt: true,
        artistProfile: {
          select: {
            id: true,
            fullName: true,
            artistName: true,
            location: true,
            profileImageUrl: true,
          },
        },
        attachments: {
          orderBy: {
            createdAt: 'asc',
          },
        },
        paymentTransactions: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        disputes: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!commissionRequest) {
      throw new NotFoundException('Entrega no encontrada');
    }

    return this.hideLockedFinalFile(commissionRequest);
  }

  async respondToProposal(
    commissionRequestId: number,
    decision: 'ACCEPT' | 'REJECT' | 'REQUEST_REVISION',
  ) {
    const commissionRequest = await this.findCommissionForClientResponse(
      commissionRequestId,
      'Propuesta no encontrada',
    );

    return this.respondToProposalRecord(commissionRequest, decision);
  }

  async respondToProposalAsClient(
    userId: number,
    commissionRequestId: number,
    decision: 'ACCEPT' | 'REJECT' | 'REQUEST_REVISION',
  ) {
    const commissionRequest = await this.ensureClientOwnsCommissionRequest(
      userId,
      commissionRequestId,
      'Propuesta no encontrada',
    );

    return this.respondToProposalRecord(commissionRequest, decision);
  }

  async respondToDelivery(
    commissionRequestId: number,
    decision: 'ACCEPT' | 'REJECT' | 'REQUEST_REVISION',
    revisionRequest?: string,
  ) {
    const commissionRequest = await this.findCommissionForClientResponse(
      commissionRequestId,
      'Entrega no encontrada',
    );

    return this.respondToDeliveryRecord(
      commissionRequest,
      decision,
      revisionRequest,
    );
  }

  async respondToDeliveryAsClient(
    userId: number,
    commissionRequestId: number,
    decision: 'ACCEPT' | 'REJECT' | 'REQUEST_REVISION',
    revisionRequest?: string,
  ) {
    const commissionRequest = await this.ensureClientOwnsCommissionRequest(
      userId,
      commissionRequestId,
      'Entrega no encontrada',
    );

    return this.respondToDeliveryRecord(
      commissionRequest,
      decision,
      revisionRequest,
    );
  }

  async deliverMine(
    userId: number,
    commissionRequestId: number,
    deliverCommissionDto: DeliverCommissionDto,
  ) {
    const commissionRequest = await this.ensureOwnsCommissionRequest(
      userId,
      commissionRequestId,
    );

    const deliverableStatuses: CommissionStatus[] = [
      CommissionStatus.IN_PROGRESS,
      CommissionStatus.REVISION_REQUESTED,
    ];

    if (!deliverableStatuses.includes(commissionRequest.status)) {
      throw new BadRequestException(
        'Solo puedes entregar comisiones en trabajo o con cambios solicitados',
      );
    }

    const deliveryMessage = deliverCommissionDto.deliveryMessage?.trim();
    const deliveryPreviewUrl =
      deliverCommissionDto.deliveryPreviewUrl?.trim() ||
      deliverCommissionDto.deliveryUrl?.trim() ||
      null;
    const finalFileUrl = deliverCommissionDto.finalFileUrl?.trim() || null;
    const previewAttachments = this.normalizeAttachmentInputs(
      deliverCommissionDto.previewAttachments,
      CommissionAttachmentType.ARTIST_PREVIEW,
      userId,
    ).map((attachment) => this.withWatermarkPreview(attachment));
    const finalAttachments = this.normalizeAttachmentInputs(
      deliverCommissionDto.finalAttachments,
      CommissionAttachmentType.ARTIST_FINAL,
      userId,
    );
    const firstPreviewUrl =
      deliveryPreviewUrl ||
      previewAttachments[0]?.previewUrl ||
      previewAttachments[0]?.url;
    const firstFinalUrl = finalFileUrl || finalAttachments[0]?.url || null;

    if (!deliveryMessage) {
      throw new BadRequestException('Debes escribir un mensaje de entrega');
    }

    if (!firstPreviewUrl) {
      throw new BadRequestException(
        'Debes enviar una vista previa o link para revision',
      );
    }

    const clientResponseDeadline = this.getClientResponseDeadline();

    const updatedCommissionRequest = await this.prisma.commissionRequest.update({
      where: {
        id: commissionRequestId,
      },
      data: {
        deliveryMessage,
        deliveryUrl: firstPreviewUrl,
        deliveryPreviewUrl: firstPreviewUrl,
        finalFileUrl: firstFinalUrl,
        clientResponseDeadline,
        autoApprovedAt: null,
        revisionRequest: null,
        status: CommissionStatus.DELIVERED,
        deliveredAt: new Date(),
        attachments:
          previewAttachments.length > 0 || finalAttachments.length > 0
            ? {
                create: [...previewAttachments, ...finalAttachments],
              }
            : undefined,
      },
      include: {
        attachments: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    await this.mailService
      .sendCommissionDeliveryEmail({
        to: commissionRequest.clientEmail,
        clientName: commissionRequest.clientName,
        artistName: this.getArtistDisplayName(commissionRequest.artistProfile),
        deliveryMessage,
        deliveryUrl: firstPreviewUrl,
        clientResponseDeadline,
        reviewUrl: `${this.getFrontendUrl()}/commissions/deliveries/${commissionRequestId}`,
      })
      .catch((error: Error) =>
        this.logger.warn(`No se pudo enviar correo de entrega: ${error.message}`),
      );

    return updatedCommissionRequest;
  }

  private async ensureOwnsCommissionRequest(
    userId: number,
    commissionRequestId: number,
  ) {
    const profile = await this.prisma.artistProfile.findUnique({
      where: {
        userId,
      },
      select: {
        id: true,
      },
    });

    if (!profile) {
      throw new ForbiddenException('Este usuario no tiene perfil de artista');
    }

    const commissionRequest = await this.prisma.commissionRequest.findUnique({
      where: {
        id: commissionRequestId,
      },
      select: {
        artistProfileId: true,
        clientUserId: true,
        clientName: true,
        clientEmail: true,
        budget: true,
        quotedPrice: true,
        includedRevisions: true,
        usedRevisions: true,
        extraRevisionPrice: true,
        cancellationRetentionPercent: true,
        rejectionReason: true,
        deliveryMessage: true,
        deliveryUrl: true,
        deliveryPreviewUrl: true,
        finalFileUrl: true,
        revisionRequest: true,
        deliveredAt: true,
        status: true,
        artistProfile: {
          select: {
            id: true,
            userId: true,
            fullName: true,
            artistName: true,
          },
        },
      },
    });

    if (!commissionRequest) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    if (commissionRequest.artistProfileId !== profile.id) {
      throw new ForbiddenException('No puedes modificar esta solicitud');
    }

    return commissionRequest;
  }

  private async findCommissionForClientResponse(
    commissionRequestId: number,
    notFoundMessage: string,
  ) {
    const commissionRequest = await this.prisma.commissionRequest.findUnique({
      where: {
        id: commissionRequestId,
      },
      include: {
        artistProfile: true,
        paymentTransactions: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        attachments: {
          orderBy: {
            createdAt: 'asc',
          },
        },
        disputes: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!commissionRequest) {
      throw new NotFoundException(notFoundMessage);
    }

    return commissionRequest;
  }

  private async ensureClientOwnsCommissionRequest(
    userId: number,
    commissionRequestId: number,
    notFoundMessage: string,
  ) {
    const commissionRequest = await this.findCommissionForClientResponse(
      commissionRequestId,
      notFoundMessage,
    );

    if (commissionRequest.clientUserId !== userId) {
      throw new ForbiddenException('No puedes responder esta solicitud');
    }

    return commissionRequest;
  }

  private async respondToProposalRecord(
    commissionRequest: {
      id: number;
      clientName: string;
      status: CommissionStatus;
      usedRevisions?: number | null;
      artistProfile: {
        userId: number;
      };
    },
    decision: 'ACCEPT' | 'REJECT' | 'REQUEST_REVISION',
  ) {
    if (commissionRequest.status !== CommissionStatus.PROPOSED) {
      throw new BadRequestException('Esta propuesta ya fue respondida');
    }

    if (decision === 'REQUEST_REVISION') {
      throw new BadRequestException('Esta respuesta solo aplica a entregas');
    }

    const status =
      decision === 'ACCEPT'
        ? CommissionStatus.CLIENT_ACCEPTED
        : CommissionStatus.CLIENT_REJECTED;

    const updatedCommissionRequest = await this.prisma.commissionRequest.update({
      where: {
        id: commissionRequest.id,
      },
      data: {
        status,
      },
      include: this.getCommissionSummaryInclude(),
    });

    await this.prisma.notification.create({
      data: {
        userId: commissionRequest.artistProfile.userId,
        type: 'COMMISSION_REQUEST',
        title:
          decision === 'ACCEPT'
            ? 'Propuesta aceptada por el cliente'
            : 'Propuesta rechazada por el cliente',
        message:
          decision === 'ACCEPT'
            ? `${commissionRequest.clientName} acepto tu propuesta. Ya puedes confirmar la comision.`
            : `${commissionRequest.clientName} rechazo tu propuesta.`,
        relatedEntityId: commissionRequest.id,
      },
    });

    return updatedCommissionRequest;
  }

  private async openDisputeRecord({
    commissionRequestId,
    openedByUserId,
    reason,
    evidenceAttachments,
    notifyUserId,
    notificationMessage,
  }: {
    commissionRequestId: number;
    openedByUserId: number;
    reason?: string;
    evidenceAttachments?: {
      url?: string;
      name?: string;
      mimeType?: string;
      size?: number;
    }[];
    notifyUserId?: number;
    notificationMessage: string;
  }) {
    const trimmedReason = reason?.trim();

    if (!trimmedReason) {
      throw new BadRequestException('Debes indicar el motivo de la disputa');
    }

    const commissionRequest = await this.prisma.commissionRequest.findUnique({
      where: {
        id: commissionRequestId,
      },
      select: {
        status: true,
        disputes: {
          where: {
            status: CommissionDisputeStatus.OPEN,
          },
          select: {
            id: true,
          },
        },
      },
    });

    if (!commissionRequest) {
      throw new NotFoundException('Comision no encontrada');
    }

    if (commissionRequest.disputes.length > 0) {
      throw new BadRequestException('Esta comision ya tiene una disputa abierta');
    }

    const disputeBlockedStatuses: CommissionStatus[] = [
      CommissionStatus.COMPLETED,
      CommissionStatus.REJECTED,
      CommissionStatus.CANCELLED_BY_CLIENT,
      CommissionStatus.CANCELLED_BY_ARTIST,
    ];

    if (disputeBlockedStatuses.includes(commissionRequest.status)) {
      throw new BadRequestException('Esta comision ya no permite disputas');
    }

    const disputeAttachments = this.normalizeAttachmentInputs(
      evidenceAttachments,
      CommissionAttachmentType.DISPUTE_EVIDENCE,
      openedByUserId,
    );

    return this.prisma.$transaction(async (transaction) => {
      await transaction.commissionDispute.create({
        data: {
          commissionRequestId,
          openedByUserId,
          reason: trimmedReason,
        },
      });

      const updatedCommissionRequest =
        await transaction.commissionRequest.update({
          where: {
            id: commissionRequestId,
          },
          data: {
            status: CommissionStatus.DISPUTED,
            clientResponseDeadline: null,
            attachments:
              disputeAttachments.length > 0
                ? {
                    create: disputeAttachments,
                  }
                : undefined,
          },
          include: this.getCommissionSummaryInclude(),
        });

      if (notifyUserId) {
        await transaction.notification.create({
          data: {
            userId: notifyUserId,
            type: 'COMMISSION_REQUEST',
            title: 'Disputa abierta',
            message: notificationMessage,
            relatedEntityId: commissionRequestId,
          },
        });
      }

      return this.hideLockedFinalFile(updatedCommissionRequest);
    });
  }

  private async createExtraRevisionPaymentIfNeeded(
    commissionRequestId: number,
    nextRevisionNumber: number,
  ) {
    const commissionRequest = await this.prisma.commissionRequest.findUnique({
      where: {
        id: commissionRequestId,
      },
      include: {
        artistProfile: {
          select: {
            id: true,
            fullName: true,
            artistName: true,
            location: true,
            profileImageUrl: true,
            userId: true,
          },
        },
        paymentTransactions: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        attachments: {
          orderBy: {
            createdAt: 'asc',
          },
        },
        disputes: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!commissionRequest) {
      throw new NotFoundException('Comision no encontrada');
    }

    const includedRevisions = commissionRequest.includedRevisions ?? 1;

    if (nextRevisionNumber <= includedRevisions) {
      return null;
    }

    if (!commissionRequest.extraRevisionPrice?.trim()) {
      return null;
    }

    const requiredExtraPayments = nextRevisionNumber - includedRevisions;
    const paidExtraPayments = commissionRequest.paymentTransactions.filter(
      (paymentTransaction) =>
        paymentTransaction.purpose === PaymentPurpose.REVISION_EXTRA &&
        paymentTransaction.status === PaymentStatus.PAID,
    ).length;

    if (paidExtraPayments >= requiredExtraPayments) {
      return null;
    }

    const pendingExtraPayment = commissionRequest.paymentTransactions.find(
      (paymentTransaction) =>
        paymentTransaction.purpose === PaymentPurpose.REVISION_EXTRA &&
        paymentTransaction.status === PaymentStatus.PENDING,
    );

    if (!pendingExtraPayment) {
      await this.prisma.paymentTransaction.create({
        data: {
          commissionRequestId,
          amount: commissionRequest.extraRevisionPrice,
          currency: 'USD',
          purpose: PaymentPurpose.REVISION_EXTRA,
          description: `Revision extra #${requiredExtraPayments}`,
        },
      });

      await this.prisma.notification.create({
        data: {
          userId: commissionRequest.artistProfile.userId,
          type: 'COMMISSION_REQUEST',
          title: 'Pago extra de revision pendiente',
          message: `${commissionRequest.clientName} solicito una revision fuera de las incluidas. Se genero un pago extra.`,
          relatedEntityId: commissionRequestId,
        },
      });
    }

    const updatedCommissionRequest =
      await this.prisma.commissionRequest.findUnique({
        where: {
          id: commissionRequestId,
        },
        include: this.getCommissionSummaryInclude(),
      });

    return updatedCommissionRequest
      ? this.hideLockedFinalFile(updatedCommissionRequest)
      : null;
  }

  private async cancelCommissionRecord({
    commissionRequestId,
    cancelledByUserId,
    status,
    reason,
    shouldReleasePaidPayment,
    notifyUserId,
    notificationTitle,
    notificationMessage,
  }: {
    commissionRequestId: number;
    cancelledByUserId: number;
    status: CommissionStatus;
    reason?: string;
    shouldReleasePaidPayment: boolean;
    notifyUserId?: number;
    notificationTitle: string;
    notificationMessage: string;
  }) {
    const now = new Date();
    const cancellableStatuses: CommissionStatus[] = [
      CommissionStatus.PENDING,
      CommissionStatus.REVIEWED,
      CommissionStatus.PROPOSED,
      CommissionStatus.CLIENT_ACCEPTED,
      CommissionStatus.ACCEPTED,
      CommissionStatus.PAYMENT_PENDING,
      CommissionStatus.IN_PROGRESS,
      CommissionStatus.DELIVERED,
      CommissionStatus.REVISION_REQUESTED,
    ];

    const currentCommissionRequest =
      await this.prisma.commissionRequest.findUnique({
        where: {
          id: commissionRequestId,
        },
        select: {
          status: true,
        },
      });

    if (
      !currentCommissionRequest ||
      !cancellableStatuses.includes(currentCommissionRequest.status)
    ) {
      throw new BadRequestException('Esta comision ya no se puede cancelar');
    }

    return this.prisma.$transaction(async (transaction) => {
      const updatedCommissionRequest =
        await transaction.commissionRequest.update({
          where: {
            id: commissionRequestId,
          },
          data: {
            status,
            cancelledByUserId,
            cancelledAt: now,
            cancellationReason: reason?.trim() || null,
            clientResponseDeadline: null,
          },
          include: this.getCommissionSummaryInclude(),
        });

      if (shouldReleasePaidPayment) {
        await transaction.paymentTransaction.updateMany({
          where: {
            commissionRequestId,
            status: PaymentStatus.PAID,
            releasedAt: null,
          },
          data: {
            releasedAt: now,
          },
        });
      } else {
        await transaction.paymentTransaction.updateMany({
          where: {
            commissionRequestId,
            status: {
              in: [PaymentStatus.PENDING, PaymentStatus.PAID],
            },
            releasedAt: null,
          },
          data: {
            status: PaymentStatus.CANCELLED,
          },
        });
      }

      if (notifyUserId) {
        await transaction.notification.create({
          data: {
            userId: notifyUserId,
            type: 'COMMISSION_REQUEST',
            title: notificationTitle,
            message: notificationMessage,
            relatedEntityId: commissionRequestId,
          },
        });
      }

      return this.hideLockedFinalFile(updatedCommissionRequest);
    });
  }

  private async respondToDeliveryRecord(
    commissionRequest: {
      id: number;
      clientName: string;
      status: CommissionStatus;
      usedRevisions?: number | null;
      artistProfile: {
        userId: number;
      };
    },
    decision: 'ACCEPT' | 'REJECT' | 'REQUEST_REVISION',
    revisionRequest?: string,
  ) {
    if (commissionRequest.status !== CommissionStatus.DELIVERED) {
      throw new BadRequestException(
        'Esta entrega no esta pendiente de respuesta',
      );
    }

    if (decision === 'REQUEST_REVISION' && !revisionRequest?.trim()) {
      throw new BadRequestException(
        'Debes indicar que cambios solicita el cliente',
      );
    }

    if (decision === 'REJECT') {
      throw new BadRequestException(
        'Para rechazar una entrega se debe abrir disputa. Para este MVP puedes pedir cambios.',
      );
    }

    if (decision === 'REQUEST_REVISION') {
      const pendingExtraRevisionPayment =
        await this.createExtraRevisionPaymentIfNeeded(
          commissionRequest.id,
          (commissionRequest.usedRevisions || 0) + 1,
        );

      if (pendingExtraRevisionPayment) {
        return pendingExtraRevisionPayment;
      }
    }

    const status =
      decision === 'ACCEPT'
        ? CommissionStatus.COMPLETED
        : CommissionStatus.REVISION_REQUESTED;

    const now = new Date();

    const updatedCommissionRequest = await this.prisma.$transaction(
      async (transaction) => {
        const updatedCommissionRequest =
          await transaction.commissionRequest.update({
            where: {
              id: commissionRequest.id,
            },
            data: {
              status,
              revisionRequest:
                decision === 'REQUEST_REVISION'
                  ? revisionRequest?.trim()
                  : null,
              usedRevisions:
                decision === 'REQUEST_REVISION'
                  ? (commissionRequest.usedRevisions || 0) + 1
                  : undefined,
              clientResponseDeadline:
                decision === 'REQUEST_REVISION' ? null : undefined,
              completedAt: decision === 'ACCEPT' ? now : null,
            },
            include: this.getCommissionSummaryInclude(),
          });

        if (decision === 'ACCEPT') {
          await transaction.paymentTransaction.updateMany({
            where: {
              commissionRequestId: commissionRequest.id,
              status: 'PAID',
              releasedAt: null,
            },
            data: {
              releasedAt: now,
            },
          });
        }

        return updatedCommissionRequest;
      },
    );

    if (decision === 'ACCEPT') {
      const refreshedCommissionRequest =
        await this.prisma.commissionRequest.findUnique({
          where: {
            id: commissionRequest.id,
          },
          include: this.getCommissionSummaryInclude(),
        });

      if (refreshedCommissionRequest) {
        Object.assign(updatedCommissionRequest, refreshedCommissionRequest);
      }
    }

    await this.prisma.notification.create({
      data: {
        userId: commissionRequest.artistProfile.userId,
        type: 'COMMISSION_REQUEST',
        title:
          decision === 'ACCEPT'
            ? 'Entrega aprobada'
            : 'Cambios solicitados',
        message:
          decision === 'ACCEPT'
            ? `${commissionRequest.clientName} aprobo la entrega final.`
            : `${commissionRequest.clientName} pidio cambios en la entrega.`,
        relatedEntityId: commissionRequest.id,
      },
    });

    return this.hideLockedFinalFile(updatedCommissionRequest);
  }
}
