export class CreateJobPostDto {
  title!: string;
  description!: string;
  categoryId?: number;
  budgetMin?: string;
  budgetMax?: string;
  desiredDeadline?: string;
  isFlexibleDeadline?: boolean;
  serviceMode?: 'ONLINE' | 'IN_PERSON' | 'BOTH';
  location?: string;
}
