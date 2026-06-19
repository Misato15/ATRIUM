import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createReviewDto: CreateReviewDto) {
    const rating = Number(createReviewDto.rating);
    const comment = createReviewDto.comment?.trim();

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new BadRequestException('La calificacion debe estar entre 1 y 5');
    }

    if (!comment) {
      throw new BadRequestException('El comentario es obligatorio');
    }

    const commissionRequest = await this.prisma.commissionRequest.findUnique({
      where: {
        id: Number(createReviewDto.commissionRequestId),
      },
      include: {
        review: true,
      },
    });

    if (!commissionRequest) {
      throw new NotFoundException('Comision no encontrada');
    }

    if (commissionRequest.status !== 'COMPLETED') {
      throw new BadRequestException(
        'Solo puedes calificar una comision completada',
      );
    }

    if (commissionRequest.review) {
      throw new ConflictException('Esta comision ya tiene una review');
    }

    return this.prisma.review.create({
      data: {
        artistProfileId: commissionRequest.artistProfileId,
        commissionRequestId: commissionRequest.id,
        clientName: commissionRequest.clientName,
        rating,
        comment,
      },
    });
  }

  findByArtist(artistProfileId: number) {
    return this.prisma.review.findMany({
      where: {
        artistProfileId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async createClientReview(artistUserId: number, createReviewDto: CreateReviewDto) {
    const rating = Number(createReviewDto.rating);
    const comment = createReviewDto.comment?.trim();

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new BadRequestException('La calificacion debe estar entre 1 y 5');
    }

    if (!comment) {
      throw new BadRequestException('El comentario es obligatorio');
    }

    const commissionRequest = await this.prisma.commissionRequest.findUnique({
      where: {
        id: Number(createReviewDto.commissionRequestId),
      },
      include: {
        clientReview: true,
        artistProfile: true,
      },
    });

    if (!commissionRequest) {
      throw new NotFoundException('Comision no encontrada');
    }

    if (commissionRequest.artistProfile.userId !== artistUserId) {
      throw new ForbiddenException('No puedes calificar este cliente');
    }

    if (!commissionRequest.clientUserId) {
      throw new BadRequestException('El cliente debe tener cuenta registrada');
    }

    if (commissionRequest.status !== 'COMPLETED') {
      throw new BadRequestException(
        'Solo puedes calificar clientes de comisiones completadas',
      );
    }

    if (commissionRequest.clientReview) {
      throw new ConflictException('Este cliente ya fue calificado');
    }

    return this.prisma.clientReview.create({
      data: {
        clientUserId: commissionRequest.clientUserId,
        artistProfileId: commissionRequest.artistProfileId,
        commissionRequestId: commissionRequest.id,
        rating,
        comment,
      },
    });
  }
}
