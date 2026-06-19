import { CommissionAttachmentDto } from './commission-attachment.dto';

export class OpenCommissionDisputeDto {
  reason!: string;
  evidenceAttachments?: CommissionAttachmentDto[];
}
