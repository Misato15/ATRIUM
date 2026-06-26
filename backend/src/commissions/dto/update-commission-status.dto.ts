import { CommissionStatus } from '../../generated/prisma/client.js';

export class UpdateCommissionStatusDto {
  status!: CommissionStatus;
  rejectionReason?: string;
  quotedPrice?: string;
  includedRevisions?: number;
  extraRevisionPrice?: string;
  cancellationRetentionPercent?: number;
}
