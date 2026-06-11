import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateArtistProfileDto } from './dto/update-artist-profile.dto';

@Injectable()
export class ArtistsService {
  constructor(private readonly prisma: PrismaService) {}
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
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        category: true,
      },
    });
  }

  async findOne(id: number) {
    const artist = await this.prisma.artistProfile.findUnique({
      where: {
        id,
      },
      include: {
        category: true,
        portfolioItems: {
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
    data: {
      fullName: updateArtistProfileDto.fullName,
      artistName: updateArtistProfileDto.artistName,
      bio: updateArtistProfileDto.bio,
      location: updateArtistProfileDto.location,
      profileImageUrl: updateArtistProfileDto.profileImageUrl,
      coverImageUrl: updateArtistProfileDto.coverImageUrl,
    },
    include: {
      category: true,
      portfolioItems: {
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  });
}
}
