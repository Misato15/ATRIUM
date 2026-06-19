import { CommissionAttachmentDto } from './commission-attachment.dto';

export class DeliverCommissionDto {
  deliveryMessage!: string;
  deliveryUrl?: string;
  deliveryPreviewUrl?: string;
  finalFileUrl?: string;
  previewAttachments?: CommissionAttachmentDto[];
  finalAttachments?: CommissionAttachmentDto[];
}
