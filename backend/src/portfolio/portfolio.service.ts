import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePortfolioItemDto } from './dto/create-portfolio-item.dto';

@Injectable()
export class PortfolioService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.portfolioItem.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        artistProfile: true,
      },
    });
  }

  async findOne(id: number) {
    const portfolioItem = await this.prisma.portfolioItem.findUnique({
      where: {
        id,
      },
      include: {
        artistProfile: {
          include: {
            category: true,
          },
        },
      },
    });

    if (!portfolioItem) {
      throw new NotFoundException('Obra no encontrada');
    }

    return portfolioItem;
  }

  async incrementView(id: number) {
    try {
      const portfolioItem = await this.prisma.portfolioItem.update({
        where: {
          id,
        },
        data: {
          viewCount: {
            increment: 1,
          },
        },
        select: {
          viewCount: true,
        },
      });

      return {
        viewCount: portfolioItem.viewCount,
      };
    } catch {
      throw new NotFoundException('Obra no encontrada');
    }
  }

  async getLikeStatus(id: number, userId: number) {
    const portfolioItem = await this.prisma.portfolioItem.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
      },
    });

    if (!portfolioItem) {
      throw new NotFoundException('Obra no encontrada');
    }

    const [like, likeCount] = await Promise.all([
      this.prisma.portfolioLike.findUnique({
        where: {
          userId_portfolioItemId: {
            userId,
            portfolioItemId: id,
          },
        },
      }),
      this.prisma.portfolioLike.count({
        where: {
          portfolioItemId: id,
        },
      }),
    ]);

    return {
      liked: Boolean(like),
      likeCount,
    };
  }

  async toggleLike(id: number, userId: number) {
    return this.prisma.$transaction(async (transaction) => {
      const portfolioItem = await transaction.portfolioItem.findUnique({
        where: {
          id,
        },
        select: {
          id: true,
          title: true,
          artistProfile: {
            select: {
              userId: true,
            },
          },
        },
      });

      if (!portfolioItem) {
        throw new NotFoundException('Obra no encontrada');
      }

      const existingLike = await transaction.portfolioLike.findUnique({
        where: {
          userId_portfolioItemId: {
            userId,
            portfolioItemId: id,
          },
        },
      });

      const likedByCurrentUser = !existingLike;

      if (existingLike) {
        await transaction.portfolioLike.delete({
          where: {
            id: existingLike.id,
          },
        });
      } else {
        await transaction.portfolioLike.create({
          data: {
            userId,
            portfolioItemId: id,
          },
        });

        if (portfolioItem.artistProfile.userId !== userId) {
          const likingUser = await transaction.user.findUnique({
            where: {
              id: userId,
            },
            select: {
              email: true,
              profile: {
                select: {
                  fullName: true,
                  artistName: true,
                },
              },
            },
          });

          const likingUserName =
            likingUser?.profile?.artistName ||
            likingUser?.profile?.fullName ||
            likingUser?.email ||
            'Alguien';

          await transaction.notification.create({
            data: {
              userId: portfolioItem.artistProfile.userId,
              type: 'PORTFOLIO_LIKE',
              title: 'Nuevo me gusta',
              message: `${likingUserName} dio me gusta a tu obra "${portfolioItem.title}".`,
              relatedEntityId: portfolioItem.id,
            },
          });
        }
      }

      const likeCount = await transaction.portfolioLike.count({
        where: {
          portfolioItemId: id,
        },
      });

      const updatedPortfolioItem = await transaction.portfolioItem.update({
        where: {
          id,
        },
        data: {
          likeCount,
        },
        include: {
          artistProfile: {
            include: {
              category: true,
            },
          },
        },
      });

      return {
        ...updatedPortfolioItem,
        likedByCurrentUser,
      };
    });
  }

  async createForUser(
    userId: number,
    createPortfolioItemDto: CreatePortfolioItemDto,
  ) {
    if (!createPortfolioItemDto.mediaUrl?.trim()) {
      throw new BadRequestException(
        'Debes subir una imagen para publicar la obra',
      );
    }

    const profile = await this.prisma.artistProfile.findUnique({
      where: {
        userId,
      },
    });

    if (!profile) {
      throw new ForbiddenException('Este usuario no tiene perfil de artista');
    }

    return this.prisma.portfolioItem.create({
      data: {
        artistProfileId: profile.id,
        title: createPortfolioItemDto.title,
        description: createPortfolioItemDto.description,
        mediaType: createPortfolioItemDto.mediaType,
        mediaUrl: createPortfolioItemDto.mediaUrl,
        thumbnailUrl: createPortfolioItemDto.thumbnailUrl,
      },
    });
  }
}
