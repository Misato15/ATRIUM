import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import {
  DigitalProductAssetKind,
  DigitalProductPurchaseStatus,
  DigitalProductStatus,
} from '../generated/prisma/client.js';
import { PayPalService } from '../paypal/paypal.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDigitalProductDto } from './dto/create-digital-product.dto';
import { DigitalProductAssetDto } from './dto/digital-product-asset.dto';
import { UpdateDigitalProductDto } from './dto/update-digital-product.dto';

const PRODUCT_STATUSES = [
  DigitalProductStatus.DRAFT,
  DigitalProductStatus.PUBLISHED,
  DigitalProductStatus.ARCHIVED,
] as const;

@Injectable()
export class DigitalProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly paypalService: PayPalService,
  ) {}

  private normalizeStatus(status?: string) {
    if (!status) {
      return DigitalProductStatus.DRAFT;
    }

    if (!PRODUCT_STATUSES.includes(status as DigitalProductStatus)) {
      throw new BadRequestException('El estado del producto no es valido');
    }

    return status as DigitalProductStatus;
  }

  private normalizeAssets(
    assets: DigitalProductAssetDto[] | undefined,
    kind: DigitalProductAssetKind,
  ) {
    return (assets || [])
      .map((asset) => ({
        kind,
        url: asset.url?.trim() || '',
        publicId: asset.publicId?.trim() || null,
        resourceType: asset.resourceType?.trim() || null,
        deliveryType: asset.deliveryType?.trim() || null,
        name: asset.name?.trim() || null,
        mimeType: asset.mimeType?.trim() || null,
        size:
          Number.isFinite(Number(asset.size)) && Number(asset.size) > 0
            ? Number(asset.size)
            : null,
      }))
      .filter((asset) => asset.url);
  }

  private getProductInclude(includeDownloads = false) {
    return {
      artistProfile: {
        select: {
          id: true,
          fullName: true,
          artistName: true,
          profileImageUrl: true,
          location: true,
        },
      },
      assets: {
        where: includeDownloads
          ? undefined
          : { kind: DigitalProductAssetKind.PREVIEW },
        orderBy: {
          createdAt: 'asc' as const,
        },
      },
      _count: {
        select: {
          purchases: true,
        },
      },
    };
  }

  private hideDownloadAssetUrls<T extends { assets?: { kind: DigitalProductAssetKind; url: string }[] }>(
    product: T,
  ) {
    return {
      ...product,
      assets: product.assets?.map((asset) =>
        asset.kind === DigitalProductAssetKind.DOWNLOAD
          ? {
              ...asset,
              url: '',
            }
          : asset,
      ),
    };
  }

  async findPublished() {
    return this.prisma.digitalProduct.findMany({
      where: {
        status: DigitalProductStatus.PUBLISHED,
        artistProfile: {
          isHidden: false,
          user: {
            isSuspended: false,
          },
        },
      },
      include: this.getProductInclude(false),
      orderBy: {
        createdAt: 'desc',
      },
    });
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
      return [];
    }

    return this.prisma.digitalProduct.findMany({
      where: {
        artistProfileId: profile.id,
      },
      include: {
        ...this.getProductInclude(true),
        purchases: {
          where: {
            status: DigitalProductPurchaseStatus.PAID,
          },
          orderBy: {
            paidAt: 'desc',
          },
          include: {
            buyerUser: {
              select: {
                id: true,
                fullName: true,
                email: true,
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

  async create(userId: number, dto: CreateDigitalProductDto) {
    const profile = await this.prisma.artistProfile.findUnique({
      where: {
        userId,
      },
      select: {
        id: true,
      },
    });

    if (!profile) {
      throw new ForbiddenException('Debes crear un perfil artistico primero');
    }

    const title = dto.title?.trim();
    const description = dto.description?.trim();
    const status = this.normalizeStatus(dto.status);
    const previewAssets = this.normalizeAssets(
      dto.previewAssets,
      DigitalProductAssetKind.PREVIEW,
    );
    const downloadAssets = this.normalizeAssets(
      dto.downloadAssets,
      DigitalProductAssetKind.DOWNLOAD,
    );

    if (!title || !description) {
      throw new BadRequestException('El producto necesita titulo y descripcion');
    }

    if (status === DigitalProductStatus.PUBLISHED && downloadAssets.length === 0) {
      throw new BadRequestException(
        'Debes adjuntar al menos un archivo descargable para publicar',
      );
    }

    return this.prisma.digitalProduct.create({
      data: {
        artistProfileId: profile.id,
        title,
        description,
        price: this.paypalService.normalizeAmount(
          dto.price,
          'El precio debe incluir un numero valido',
        ),
        currency: dto.currency?.trim() || 'USD',
        coverImageUrl:
          dto.coverImageUrl?.trim() || previewAssets[0]?.url || null,
        status,
        assets: {
          create: [...previewAssets, ...downloadAssets],
        },
      },
      include: this.getProductInclude(true),
    });
  }

  async update(userId: number, productId: number, dto: UpdateDigitalProductDto) {
    const product = await this.prisma.digitalProduct.findUnique({
      where: {
        id: productId,
      },
      include: {
        artistProfile: true,
        assets: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    if (product.artistProfile.userId !== userId) {
      throw new ForbiddenException('No puedes editar este producto');
    }

    const status =
      dto.status === undefined ? undefined : this.normalizeStatus(dto.status);
    const previewAssets =
      dto.previewAssets === undefined
        ? undefined
        : this.normalizeAssets(dto.previewAssets, DigitalProductAssetKind.PREVIEW);
    const downloadAssets =
      dto.downloadAssets === undefined
        ? undefined
        : this.normalizeAssets(dto.downloadAssets, DigitalProductAssetKind.DOWNLOAD);
    const hasDownloadsAfterUpdate =
      downloadAssets === undefined
        ? product.assets.some(
            (asset) => asset.kind === DigitalProductAssetKind.DOWNLOAD,
          )
        : downloadAssets.length > 0;

    if (status === DigitalProductStatus.PUBLISHED && !hasDownloadsAfterUpdate) {
      throw new BadRequestException(
        'Debes adjuntar al menos un archivo descargable para publicar',
      );
    }

    const updatedProduct = await this.prisma.$transaction(async (transaction) => {
      if (previewAssets !== undefined) {
        await transaction.digitalProductAsset.deleteMany({
          where: {
            digitalProductId: productId,
            kind: DigitalProductAssetKind.PREVIEW,
          },
        });
      }

      if (downloadAssets !== undefined) {
        await transaction.digitalProductAsset.deleteMany({
          where: {
            digitalProductId: productId,
            kind: DigitalProductAssetKind.DOWNLOAD,
          },
        });
      }

      return transaction.digitalProduct.update({
        where: {
          id: productId,
        },
        data: {
          ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description.trim() }
            : {}),
          ...(dto.price !== undefined
            ? {
                price: this.paypalService.normalizeAmount(
                  dto.price,
                  'El precio debe incluir un numero valido',
                ),
              }
            : {}),
          ...(dto.currency !== undefined
            ? { currency: dto.currency.trim() || 'USD' }
            : {}),
          ...(dto.coverImageUrl !== undefined
            ? { coverImageUrl: dto.coverImageUrl.trim() || null }
            : {}),
          ...(status !== undefined ? { status } : {}),
          assets: {
            create: [
              ...(previewAssets || []),
              ...(downloadAssets || []),
            ],
          },
        },
        include: this.getProductInclude(true),
      });
    });

    return updatedProduct;
  }

  async createCheckout(userId: number, productId: number) {
    const product = await this.prisma.digitalProduct.findUnique({
      where: {
        id: productId,
      },
      include: {
        artistProfile: true,
      },
    });

    if (!product || product.status !== DigitalProductStatus.PUBLISHED) {
      throw new NotFoundException('Producto no disponible');
    }

    if (product.artistProfile.userId === userId) {
      throw new ForbiddenException('No puedes comprar tu propio producto');
    }

    let purchase = await this.prisma.digitalProductPurchase.findUnique({
      where: {
        digitalProductId_buyerUserId: {
          digitalProductId: product.id,
          buyerUserId: userId,
        },
      },
      include: {
        digitalProduct: {
          include: this.getProductInclude(false),
        },
      },
    });

    if (purchase?.status === DigitalProductPurchaseStatus.PAID) {
      return purchase;
    }

    const amount = this.paypalService.normalizeAmount(
      product.price,
      'El precio debe incluir un numero valido',
    );

    if (!purchase) {
      purchase = await this.prisma.digitalProductPurchase.create({
        data: {
          digitalProductId: product.id,
          buyerUserId: userId,
          amount,
          currency: product.currency,
        },
        include: {
          digitalProduct: {
            include: this.getProductInclude(false),
          },
        },
      });
    } else {
      purchase = await this.prisma.digitalProductPurchase.update({
        where: {
          id: purchase.id,
        },
        data: {
          amount,
          currency: product.currency,
          status: DigitalProductPurchaseStatus.PENDING,
        },
        include: {
          digitalProduct: {
            include: this.getProductInclude(false),
          },
        },
      });
    }

    if (purchase.providerOrderId) {
      return purchase;
    }

    const providerOrderId = await this.paypalService.createOrder({
      referenceId: `atrium-digital-product-${purchase.id}`,
      customId: String(purchase.id),
      description: `Producto digital Atrium: ${product.title}`,
      currency: product.currency,
      amount,
    });

    return this.prisma.digitalProductPurchase.update({
      where: {
        id: purchase.id,
      },
      data: {
        providerOrderId,
      },
      include: {
        digitalProduct: {
          include: this.getProductInclude(false),
        },
      },
    });
  }

  async findCheckout(providerOrderId: string) {
    const purchase = await this.prisma.digitalProductPurchase.findUnique({
      where: {
        providerOrderId,
      },
      include: {
        digitalProduct: {
          include: this.getProductInclude(false),
        },
      },
    });

    if (!purchase) {
      throw new NotFoundException('Compra no encontrada');
    }

    return purchase;
  }

  async capturePayPalOrder(paypalOrderId: string) {
    const purchase = await this.prisma.digitalProductPurchase.findUnique({
      where: {
        providerOrderId: paypalOrderId,
      },
      include: {
        digitalProduct: true,
      },
    });

    if (!purchase) {
      throw new NotFoundException('Compra no encontrada');
    }

    if (purchase.status !== DigitalProductPurchaseStatus.PENDING) {
      throw new ConflictException('Solo se pueden capturar compras pendientes');
    }

    const status =
      (await this.paypalService.captureOrder(paypalOrderId))
        ? DigitalProductPurchaseStatus.PAID
        : DigitalProductPurchaseStatus.FAILED;

    return this.prisma.digitalProductPurchase.update({
      where: {
        id: purchase.id,
      },
      data: {
        status,
        paidAt: status === DigitalProductPurchaseStatus.PAID ? new Date() : null,
      },
      include: {
        digitalProduct: {
          include: this.getProductInclude(false),
        },
      },
    });
  }

  async findMyPurchases(userId: number) {
    const purchases = await this.prisma.digitalProductPurchase.findMany({
      where: {
        buyerUserId: userId,
        status: DigitalProductPurchaseStatus.PAID,
      },
      include: {
        digitalProduct: {
          include: this.getProductInclude(true),
        },
      },
      orderBy: {
        paidAt: 'desc',
      },
    });

    return purchases.map((purchase) => ({
      ...purchase,
      digitalProduct: this.hideDownloadAssetUrls(purchase.digitalProduct),
    }));
  }

  async getDownloadUrl(userId: number, purchaseId: number, assetId?: number) {
    const purchase = await this.prisma.digitalProductPurchase.findUnique({
      where: {
        id: purchaseId,
      },
      include: {
        digitalProduct: {
          include: {
            assets: {
              where: {
                kind: DigitalProductAssetKind.DOWNLOAD,
              },
              orderBy: {
                createdAt: 'asc',
              },
            },
          },
        },
      },
    });

    if (!purchase || purchase.buyerUserId !== userId) {
      throw new NotFoundException('Compra no encontrada');
    }

    if (purchase.status !== DigitalProductPurchaseStatus.PAID) {
      throw new ForbiddenException('Debes comprar este producto para descargarlo');
    }

    const asset = assetId
      ? purchase.digitalProduct.assets.find(
          (currentAsset) => currentAsset.id === assetId,
        )
      : purchase.digitalProduct.assets[0];

    if (!asset) {
      throw new NotFoundException('Archivo descargable no encontrado');
    }

    if (asset.publicId) {
      return {
        downloadUrl: this.cloudinaryService.createSignedDownloadUrl({
          publicId: asset.publicId,
          resourceType: asset.resourceType || 'raw',
          deliveryType: asset.deliveryType || 'authenticated',
          attachmentName: asset.name,
        }),
        expiresInSeconds: 10 * 60,
      };
    }

    return {
      downloadUrl: asset.url,
      expiresInSeconds: null,
    };
  }
}
