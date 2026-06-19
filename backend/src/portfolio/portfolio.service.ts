import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MediaType } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreatePortfolioItemDto,
  PortfolioAssetDto,
} from './dto/create-portfolio-item.dto';

@Injectable()
export class PortfolioService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.portfolioItem.findMany({
      where: {
        isHidden: false,
        artistProfile: {
          isHidden: false,
          user: {
            isSuspended: false,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        artistProfile: true,
        assets: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
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
            user: {
              select: {
                isSuspended: true,
              },
            },
          },
        },
        assets: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
    });

    if (!portfolioItem) {
      throw new NotFoundException('Obra no encontrada');
    }

    if (
      portfolioItem.isHidden ||
      portfolioItem.artistProfile.isHidden ||
      portfolioItem.artistProfile.user.isSuspended
    ) {
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
          assets: {
            orderBy: {
              sortOrder: 'asc',
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
    const assets = this.getAssets(createPortfolioItemDto);
    const cover = assets[0];

    if (!cover) {
      throw new BadRequestException(
        'Debes subir al menos un archivo para publicar la obra',
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
        mediaType: cover.mediaType,
        mediaUrl: cover.url,
        thumbnailUrl: cover.thumbnailUrl,
        assets: {
          create: assets.map((asset, index) => ({
            mediaType: asset.mediaType,
            url: asset.url,
            thumbnailUrl: asset.thumbnailUrl,
            publicId: asset.publicId,
            resourceType: asset.resourceType,
            deliveryType: asset.deliveryType,
            name: asset.name,
            mimeType: asset.mimeType,
            size: asset.size,
            sortOrder: asset.sortOrder ?? index,
          })),
        },
      },
      include: this.getPortfolioInclude(),
    });
  }

  async updateForUser(
    id: number,
    userId: number,
    updatePortfolioItemDto: CreatePortfolioItemDto,
  ) {
    await this.ensureOwnsPortfolioItem(id, userId);

    if (!updatePortfolioItemDto.title?.trim()) {
      throw new BadRequestException('El titulo es obligatorio');
    }

    const assets = this.getAssets(updatePortfolioItemDto);
    const cover = assets[0];

    if (!cover) {
      throw new BadRequestException('La obra necesita al menos un archivo');
    }

    return this.prisma.$transaction(async (transaction) => {
      await transaction.portfolioAsset.deleteMany({
        where: {
          portfolioItemId: id,
        },
      });

      return transaction.portfolioItem.update({
        where: {
          id,
        },
        data: {
          title: updatePortfolioItemDto.title,
          description: updatePortfolioItemDto.description,
          mediaType: cover.mediaType,
          mediaUrl: cover.url,
          thumbnailUrl: cover.thumbnailUrl,
          assets: {
            create: assets.map((asset, index) => ({
              mediaType: asset.mediaType,
              url: asset.url,
              thumbnailUrl: asset.thumbnailUrl,
              publicId: asset.publicId,
              resourceType: asset.resourceType,
              deliveryType: asset.deliveryType,
              name: asset.name,
              mimeType: asset.mimeType,
              size: asset.size,
              sortOrder: asset.sortOrder ?? index,
            })),
          },
        },
        include: this.getPortfolioInclude(),
      });
    });
  }

  async removeForUser(id: number, userId: number) {
    await this.ensureOwnsPortfolioItem(id, userId);

    await this.prisma.portfolioItem.delete({
      where: {
        id,
      },
    });

    return {
      deleted: true,
      id,
    };
  }

  private async ensureOwnsPortfolioItem(id: number, userId: number) {
    const portfolioItem = await this.prisma.portfolioItem.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
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

    if (portfolioItem.artistProfile.userId !== userId) {
      throw new ForbiddenException('No puedes modificar esta obra');
    }

    return portfolioItem;
  }

  private getPortfolioInclude() {
    return {
      artistProfile: {
        include: {
          category: true,
        },
      },
      assets: {
        orderBy: {
          sortOrder: 'asc' as const,
        },
      },
    };
  }

  private getAssets(dto: CreatePortfolioItemDto): PortfolioAssetDto[] {
    const assets =
      dto.assets
        ?.map((asset, index) => ({
          ...asset,
          sortOrder: asset.sortOrder ?? index,
        }))
        .filter((asset) => asset.url?.trim()) || [];

    if (assets.length > 0) {
      return assets.map((asset) => ({
        ...asset,
        mediaType: this.getMediaType(asset.mediaType, asset.mimeType),
      }));
    }

    if (!dto.mediaUrl?.trim()) {
      return [];
    }

    return [
      {
        mediaType: this.getMediaType(dto.mediaType, undefined),
        url: dto.mediaUrl,
        thumbnailUrl: dto.thumbnailUrl,
        sortOrder: 0,
      },
    ];
  }

  private getMediaType(mediaType: MediaType | undefined, mimeType?: string) {
    if (mediaType) {
      return mediaType;
    }

    if (mimeType?.startsWith('video/')) {
      return MediaType.VIDEO;
    }

    if (mimeType === 'application/pdf') {
      return MediaType.PDF;
    }

    return MediaType.IMAGE;
  }
}
