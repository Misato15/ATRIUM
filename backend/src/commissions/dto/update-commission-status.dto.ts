import { CommissionStatus } from '../../generated/prisma/client.js';

export class UpdateCommissionStatusDto {
  status!: CommissionStatus;
  rejectionReason?: string;
}
