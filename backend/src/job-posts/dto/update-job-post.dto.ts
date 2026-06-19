export class UpdateJobPostDto {
  title?: string;
  description?: string;
  categoryId?: number | null;
  budgetMin?: string;
  budgetMax?: string;
  desiredDeadline?: string | null;
  isFlexibleDeadline?: boolean;
  serviceMode?: 'ONLINE' | 'IN_PERSON' | 'BOTH' | null;
  location?: string;
}
