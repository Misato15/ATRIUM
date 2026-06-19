import { CommissionAttachmentDto } from './commission-attachment.dto';

export class CreateCommissionRequestDto {
  projectTitle?: string;
  message!: string;
  budget?: string;
  budgetMin?: string;
  budgetMax?: string;
  desiredDeadline?: string;
  isFlexibleDeadline?: boolean;
  serviceMode?: 'ONLINE' | 'IN_PERSON' | 'BOTH';
  referenceAttachments?: CommissionAttachmentDto[];
}
