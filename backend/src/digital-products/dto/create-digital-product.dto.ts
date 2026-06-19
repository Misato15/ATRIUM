import { DigitalProductAssetDto } from './digital-product-asset.dto';

export class CreateDigitalProductDto {
  title?: string;
  description?: string;
  price?: string;
  currency?: string;
  coverImageUrl?: string;
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  previewAssets?: DigitalProductAssetDto[];
  downloadAssets?: DigitalProductAssetDto[];
}
