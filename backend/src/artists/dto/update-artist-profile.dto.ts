export class UpdateArtistProfileDto {
  categoryId?: number | string;
  fullName?: string;
  artistName?: string;
  bio?: string;
  location?: string;
  profileImageUrl?: string;
  coverImageUrl?: string;
  commissionTypes?: string;
  startingPrice?: string;
  servicePriceRange?: string;
  serviceMode?: 'ONLINE' | 'IN_PERSON' | 'BOTH';
  serviceArea?: string;
  serviceDescription?: string;
  interests?: string;
}
