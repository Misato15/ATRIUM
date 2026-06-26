import { DigitalProductAssetDto } from './digital-product-asset.dto';

export class UpdateDigitalProductDto {
  title?: string;
  description?: string;
  price?: string;
  currency?: string;
  coverImageUrl?: string;
  previewVideoUrl?: string;
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  previewAssets?: DigitalProductAssetDto[];
  downloadAssets?: DigitalProductAssetDto[];
}
