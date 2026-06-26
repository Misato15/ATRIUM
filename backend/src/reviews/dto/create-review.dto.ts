export class CreateReviewDto {
  commissionRequestId!: number;
  rating!: number;
  comment!: string;
  isPublic?: boolean;
}
