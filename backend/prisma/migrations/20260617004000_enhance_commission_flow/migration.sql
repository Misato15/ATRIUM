ALTER TABLE `CommissionRequest`
  MODIFY `status` ENUM(
    'PENDING',
    'REVIEWED',
    'PROPOSED',
    'CLIENT_ACCEPTED',
    'CLIENT_REJECTED',
    'ACCEPTED',
    'PAYMENT_PENDING',
    'IN_PROGRESS',
    'DELIVERED',
    'REVISION_REQUESTED',
    'COMPLETED',
    'REJECTED',
    'CANCELLED_BY_CLIENT',
    'CANCELLED_BY_ARTIST',
    'DISPUTED'
  ) NOT NULL DEFAULT 'PENDING',
  ADD COLUMN `includedRevisions` INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN `usedRevisions` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `extraRevisionPrice` VARCHAR(191) NULL,
  ADD COLUMN `cancellationRetentionPercent` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `cancelledByUserId` INTEGER NULL,
  ADD COLUMN `cancelledAt` DATETIME(3) NULL,
  ADD COLUMN `cancellationReason` TEXT NULL;

CREATE TABLE `CommissionAttachment` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `commissionRequestId` INTEGER NOT NULL,
  `uploadedByUserId` INTEGER NOT NULL,
  `type` ENUM('CLIENT_REFERENCE', 'ARTIST_PREVIEW', 'ARTIST_FINAL') NOT NULL,
  `url` TEXT NOT NULL,
  `name` VARCHAR(191) NULL,
  `mimeType` VARCHAR(191) NULL,
  `size` INTEGER NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `CommissionAttachment`
  ADD CONSTRAINT `CommissionAttachment_commissionRequestId_fkey`
  FOREIGN KEY (`commissionRequestId`) REFERENCES `CommissionRequest`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `CommissionAttachment`
  ADD CONSTRAINT `CommissionAttachment_uploadedByUserId_fkey`
  FOREIGN KEY (`uploadedByUserId`) REFERENCES `User`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
