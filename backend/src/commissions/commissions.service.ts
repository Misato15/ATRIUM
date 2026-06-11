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
  ) {
    await this.ensureOwnsCommissionRequest(userId, commissionRequestId);

    return this.prisma.commissionRequest.update({
      where: {
        id: commissionRequestId,
      },
      data: {
        status,
      },
    });
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
    await this.ensureOwnsCommissionRequest(userId, commissionRequestId);

    return this.prisma.commissionRequest.update({
      where: {
        id: commissionRequestId,
      },
      data: {
        artistResponse:
          updateCommissionProposalDto.artistResponse?.trim() || null,
        quotedPrice: updateCommissionProposalDto.quotedPrice?.trim() || null,
      },
    });
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
      },
    });

    if (!commissionRequest) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    if (commissionRequest.artistProfileId !== profile.id) {
      throw new ForbiddenException('No puedes modificar esta solicitud');
    }
  }
}
