import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateArtistProfileDto } from './dto/update-artist-profile.dto';

@Injectable()
export class ArtistsService {
  constructor(private readonly prisma: PrismaService) {}

  private getProfileInclude() {
    return {
      category: true,
      portfolioItems: {
        orderBy: {
          createdAt: 'desc' as const,
        },
      },
    };
  }

  private parseCategoryId(categoryId?: number | string) {
    if (!categoryId) {
      return undefined;
    }

    const parsedCategoryId = Number(categoryId);

    if (!Number.isInteger(parsedCategoryId) || parsedCategoryId <= 0) {
      throw new BadRequestException('Categoria artistica invalida');
    }

    return parsedCategoryId;
  }

  private getProfileData(updateArtistProfileDto: UpdateArtistProfileDto) {
    return {
      fullName: updateArtistProfileDto.fullName,
      artistName: updateArtistProfileDto.artistName,
      bio: updateArtistProfileDto.bio,
      categoryId: this.parseCategoryId(updateArtistProfileDto.categoryId),
      location: updateArtistProfileDto.location,
      profileImageUrl: updateArtistProfileDto.profileImageUrl,
      coverImageUrl: updateArtistProfileDto.coverImageUrl,
      commissionTypes: updateArtistProfileDto.commissionTypes,
      startingPrice: updateArtistProfileDto.startingPrice,
      servicePriceRange: updateArtistProfileDto.servicePriceRange,
      serviceMode: updateArtistProfileDto.serviceMode,
      serviceArea: updateArtistProfileDto.serviceArea,
      serviceDescription: updateArtistProfileDto.serviceDescription,
      interests: updateArtistProfileDto.interests,
    };
  }

  async getMyMetrics(userId: number) {
  const profile = await this.prisma.artistProfile.findUnique({
    where: {
      userId,
    },
    include: {
      portfolioItems: true,
    },
  });

  if (!profile) {
    return {
      totalWorks: 0,
      totalViews: 0,
      totalLikes: 0,
      topViewedWork: null,
      topLikedWork: null,
    };
  }

  const totalWorks = profile.portfolioItems.length;

  const totalViews = profile.portfolioItems.reduce(
    (sum, item) => sum + item.viewCount,
    0,
  );

  const totalLikes = profile.portfolioItems.reduce(
    (sum, item) => sum + item.likeCount,
    0,
  );

  const topViewedWork =
    profile.portfolioItems
      .slice()
      .sort((a, b) => b.viewCount - a.viewCount)[0] || null;

  const topLikedWork =
    profile.portfolioItems
      .slice()
      .sort((a, b) => b.likeCount - a.likeCount)[0] || null;

  return {
    totalWorks,
    totalViews,
    totalLikes,
    topViewedWork,
    topLikedWork,
  };
}
  findAll() {
    return this.prisma.artistProfile.findMany({
      where: {
        isHidden: false,
        user: {
          isSuspended: false,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        category: true,
      },
    });
  }

  async findOne(id: number) {
    const artist = await this.prisma.artistProfile.findFirst({
      where: {
        id,
        isHidden: false,
        user: {
          isSuspended: false,
        },
      },
      include: {
        category: true,
        portfolioItems: {
          where: {
            isHidden: false,
          },
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            assets: {
              orderBy: {
                sortOrder: 'asc',
              },
            },
          },
        },
        reviews: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!artist) {
      throw new NotFoundException('Artista no encontrado');
    }

    return artist;
  }
  async updateMyProfile(
  userId: number,
  updateArtistProfileDto: UpdateArtistProfileDto,
) {
  const profile = await this.prisma.artistProfile.findUnique({
    where: {
      userId,
    },
  });

  if (!profile) {
    throw new NotFoundException('Perfil de artista no encontrado');
  }

  return this.prisma.artistProfile.update({
    where: {
      id: profile.id,
    },
    data: this.getProfileData(updateArtistProfileDto),
    include: this.getProfileInclude(),
  });
}

  async createMyProfile(
    userId: number,
    updateArtistProfileDto: UpdateArtistProfileDto,
  ) {
    const existingProfile = await this.prisma.artistProfile.findUnique({
      where: {
        userId,
      },
    });

    if (existingProfile) {
      throw new ConflictException('Esta cuenta ya tiene perfil de artista');
    }

    if (!updateArtistProfileDto.categoryId) {
      throw new BadRequestException('La categoria artistica es obligatoria');
    }

    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const profile = await this.prisma.artistProfile.create({
      data: {
        ...this.getProfileData(updateArtistProfileDto),
        fullName: updateArtistProfileDto.fullName || user.fullName,
        userId,
      },
      include: this.getProfileInclude(),
    });

    if (user.role !== 'ARTIST') {
      await this.prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          role: 'ARTIST',
        },
      });
    }

    return profile;
  }
}
