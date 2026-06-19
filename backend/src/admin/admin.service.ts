import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import {
  CommissionStatus,
  DigitalProductStatus,
  JobPostStatus,
  UserRole,
} from '../generated/prisma/client.js';
import { CommissionsService } from '../commissions/commissions.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commissionsService: CommissionsService,
  ) {}

  private async log(
    adminUserId: number,
    action: string,
    targetType: string,
    targetId?: number,
    metadata?: unknown,
  ) {
    await this.prisma.adminActionLog.create({
      data: {
        adminUserId,
        action,
        targetType,
        targetId,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });
  }

  async summary() {
    const [
      users,
      artists,
      commissions,
      openDisputes,
      commissionPayments,
      digitalPurchases,
      jobPosts,
      digitalProducts,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.artistProfile.count(),
      this.prisma.commissionRequest.count(),
      this.prisma.commissionDispute.count({ where: { status: 'OPEN' } }),
      this.prisma.paymentTransaction.count(),
      this.prisma.digitalProductPurchase.count(),
      this.prisma.jobPost.count(),
      this.prisma.digitalProduct.count(),
    ]);

    return {
      users,
      artists,
      commissions,
      openDisputes,
      commissionPayments,
      digitalPurchases,
      jobPosts,
      digitalProducts,
    };
  }

  users() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isSuspended: true,
        emailVerifiedAt: true,
        createdAt: true,
        profile: {
          select: {
            id: true,
            artistName: true,
            fullName: true,
            isHidden: true,
          },
        },
      },
    });
  }

  async updateUser(
    adminUserId: number,
    userId: number,
    body: { isSuspended?: boolean; role?: 'ARTIST' | 'CLIENT' | 'ADMIN' },
  ) {
    if (adminUserId === userId && body.isSuspended) {
      throw new BadRequestException('No puedes suspender tu propia cuenta');
    }

    const role = body.role ? (body.role as UserRole) : undefined;

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(body.isSuspended !== undefined
          ? { isSuspended: Boolean(body.isSuspended) }
          : {}),
        ...(role ? { role } : {}),
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isSuspended: true,
      },
    });

    await this.log(adminUserId, 'UPDATE_USER', 'User', userId, body);
    return user;
  }

  artists() {
    return this.prisma.artistProfile.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        category: true,
        user: {
          select: {
            id: true,
            email: true,
            isSuspended: true,
          },
        },
        _count: {
          select: {
            portfolioItems: true,
            commissionRequests: true,
            digitalProducts: true,
          },
        },
      },
    });
  }

  async updateArtist(
    adminUserId: number,
    artistProfileId: number,
    body: { isHidden?: boolean },
  ) {
    const artist = await this.prisma.artistProfile.update({
      where: { id: artistProfileId },
      data: {
        ...(body.isHidden !== undefined
          ? { isHidden: Boolean(body.isHidden) }
          : {}),
      },
      include: {
        user: {
          select: { id: true, email: true },
        },
      },
    });

    await this.log(adminUserId, 'UPDATE_ARTIST', 'ArtistProfile', artistProfileId, body);
    return artist;
  }

  portfolioItems() {
    return this.prisma.portfolioItem.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        artistProfile: {
          select: {
            id: true,
            artistName: true,
            fullName: true,
          },
        },
      },
    });
  }

  async updatePortfolioItem(
    adminUserId: number,
    portfolioItemId: number,
    body: { isHidden?: boolean },
  ) {
    const item = await this.prisma.portfolioItem.update({
      where: { id: portfolioItemId },
      data: {
        ...(body.isHidden !== undefined
          ? { isHidden: Boolean(body.isHidden) }
          : {}),
      },
      include: {
        artistProfile: true,
      },
    });

    await this.log(adminUserId, 'UPDATE_PORTFOLIO_ITEM', 'PortfolioItem', portfolioItemId, body);
    return item;
  }

  commissions() {
    return this.prisma.commissionRequest.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        artistProfile: {
          select: {
            id: true,
            artistName: true,
            fullName: true,
          },
        },
        paymentTransactions: { orderBy: { createdAt: 'desc' } },
        disputes: { orderBy: { createdAt: 'desc' } },
      },
    });
  }

  disputes() {
    return this.prisma.commissionDispute.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        openedByUser: { select: { id: true, email: true, fullName: true } },
        resolvedByUser: { select: { id: true, email: true, fullName: true } },
        commissionRequest: {
          include: {
            artistProfile: {
              select: {
                id: true,
                artistName: true,
                fullName: true,
              },
            },
          },
        },
      },
    });
  }

  async resolveDispute(
    adminUserId: number,
    disputeId: number,
    body: { resolution?: string; commissionStatus?: string },
  ) {
    if (!body.resolution?.trim() || !body.commissionStatus) {
      throw new BadRequestException('Resolucion y estado final son obligatorios');
    }

    const result = await this.commissionsService.resolveDisputeAsAdmin(
      adminUserId,
      'ADMIN',
      disputeId,
      {
        resolution: body.resolution,
        commissionStatus: body.commissionStatus as CommissionStatus,
      },
    );

    await this.log(adminUserId, 'RESOLVE_DISPUTE', 'CommissionDispute', disputeId, body);
    return result;
  }

  async payments() {
    const [commissionPayments, digitalPurchases] = await Promise.all([
      this.prisma.paymentTransaction.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          commissionRequest: {
            select: {
              id: true,
              clientName: true,
              status: true,
              artistProfile: {
                select: {
                  id: true,
                  artistName: true,
                  fullName: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.digitalProductPurchase.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          buyerUser: { select: { id: true, email: true, fullName: true } },
          digitalProduct: {
            select: {
              id: true,
              title: true,
              artistProfile: {
                select: {
                  id: true,
                  artistName: true,
                  fullName: true,
                },
              },
            },
          },
        },
      }),
    ]);

    return { commissionPayments, digitalPurchases };
  }

  jobPosts() {
    return this.prisma.jobPost.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        clientUser: { select: { id: true, email: true, fullName: true } },
        category: true,
        _count: { select: { applications: true } },
      },
    });
  }

  async updateJobPost(
    adminUserId: number,
    jobPostId: number,
    body: { status?: 'OPEN' | 'IN_REVIEW' | 'PAUSED' | 'ASSIGNED' | 'CLOSED' },
  ) {
    if (!body.status) {
      throw new BadRequestException('Estado requerido');
    }

    const jobPost = await this.prisma.jobPost.update({
      where: { id: jobPostId },
      data: { status: body.status as JobPostStatus },
      include: { clientUser: true },
    });

    await this.log(adminUserId, 'UPDATE_JOB_POST', 'JobPost', jobPostId, body);
    return jobPost;
  }

  digitalProducts() {
    return this.prisma.digitalProduct.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        artistProfile: {
          select: {
            id: true,
            artistName: true,
            fullName: true,
          },
        },
        _count: { select: { assets: true, purchases: true } },
      },
    });
  }

  async updateDigitalProduct(
    adminUserId: number,
    productId: number,
    body: { status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' },
  ) {
    if (!body.status) {
      throw new BadRequestException('Estado requerido');
    }

    const product = await this.prisma.digitalProduct.update({
      where: { id: productId },
      data: { status: body.status as DigitalProductStatus },
      include: { artistProfile: true },
    });

    await this.log(adminUserId, 'UPDATE_DIGITAL_PRODUCT', 'DigitalProduct', productId, body);
    return product;
  }

  logs() {
    return this.prisma.adminActionLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        adminUser: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
    });
  }
}
