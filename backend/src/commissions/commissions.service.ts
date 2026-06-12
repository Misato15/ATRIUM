import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CommissionStatus } from '../generated/prisma/client.js';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommissionRequestDto } from './dto/create-commission-request.dto';
import { UpdateCommissionProposalDto } from './dto/update-commission-proposal.dto';

@Injectable()
export class CommissionsService {
  private readonly logger = new Logger(CommissionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
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

  async createForArtist(
    artistProfileId: number,
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

    if (
      !createCommissionRequestDto.clientName?.trim() ||
      !createCommissionRequestDto.clientEmail?.trim() ||
      !createCommissionRequestDto.message?.trim()
    ) {
      throw new BadRequestException(
        'Nombre, correo y mensaje son obligatorios',
      );
    }

    const commissionRequest = await this.prisma.$transaction(
      async (transaction) => {
        const commissionRequest = await transaction.commissionRequest.create({
          data: {
            artistProfileId,
            clientName: createCommissionRequestDto.clientName,
            clientEmail: createCommissionRequestDto.clientEmail,
            message: createCommissionRequestDto.message,
            budget: createCommissionRequestDto.budget,
          },
        });

        await transaction.notification.create({
          data: {
            userId: artistProfile.userId,
            type: 'COMMISSION_REQUEST',
            title: 'Nueva solicitud de comision',
            message: `${createCommissionRequestDto.clientName} envio una solicitud para trabajar contigo.`,
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
        clientName: createCommissionRequestDto.clientName,
        clientEmail: createCommissionRequestDto.clientEmail,
        message: createCommissionRequestDto.message,
        budget: createCommissionRequestDto.budget,
      })
      .catch((error: Error) => {
        this.logger.warn(
          `No se pudo enviar correo de comision: ${error.message}`,
        );
      });

    return commissionRequest;
  }

  async findMine(userId: number) {
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
      orderBy: {
        createdAt: 'desc',
      },
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

    if (
      status === CommissionStatus.ACCEPTED &&
      commissionRequest.status !== CommissionStatus.CLIENT_ACCEPTED
    ) {
      throw new BadRequestException(
        'El cliente debe aceptar la propuesta antes de confirmar la comision',
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

  async respondToProposal(
    commissionRequestId: number,
    decision: 'ACCEPT' | 'REJECT',
  ) {
    const commissionRequest = await this.prisma.commissionRequest.findUnique({
      where: {
        id: commissionRequestId,
      },
      include: {
        artistProfile: true,
      },
    });

    if (!commissionRequest) {
      throw new NotFoundException('Propuesta no encontrada');
    }

    if (commissionRequest.status !== CommissionStatus.PROPOSED) {
      throw new BadRequestException('Esta propuesta ya fue respondida');
    }

    const status =
      decision === 'ACCEPT'
        ? CommissionStatus.CLIENT_ACCEPTED
        : CommissionStatus.CLIENT_REJECTED;

    const updatedCommissionRequest = await this.prisma.commissionRequest.update({
      where: {
        id: commissionRequestId,
      },
      data: {
        status,
      },
      include: {
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
        clientName: true,
        clientEmail: true,
        rejectionReason: true,
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
}
