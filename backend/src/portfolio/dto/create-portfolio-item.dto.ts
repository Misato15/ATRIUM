import { MediaType } from '../../generated/prisma/client.js';

export class PortfolioAssetDto {
  mediaType!: MediaType;
  url!: string;
  thumbnailUrl?: string;
  publicId?: string;
  resourceType?: string;
  deliveryType?: string;
  name?: string;
  mimeType?: string;
  size?: number;
  sortOrder?: number;
}

export class CreatePortfolioItemDto {
  title!: string;
  description?: string;
  mediaType!: MediaType;
  mediaUrl!: string;
  thumbnailUrl?: string;
  assets?: PortfolioAssetDto[];
}
