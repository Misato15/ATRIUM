import { CommissionStatus } from '../../generated/prisma/client.js';

export class ResolveCommissionDisputeDto {
  resolution!: string;
  commissionStatus!: CommissionStatus;
}
