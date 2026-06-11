import { MediaType } from '../../generated/prisma/client.js';

export class CreatePortfolioItemDto {
  title!: string;
  description?: string;
  mediaType!: MediaType;
  mediaUrl!: string;
  thumbnailUrl?: string;
}
