ALTER TABLE `CommissionAttachment`
  MODIFY `type` ENUM(
    'CLIENT_REFERENCE',
    'ARTIST_PREVIEW',
    'ARTIST_FINAL',
    'DISPUTE_EVIDENCE'
  ) NOT NULL;

ALTER TABLE `PaymentTransaction`
  ADD COLUMN `purpose` ENUM('COMMISSION', 'REVISION_EXTRA') NOT NULL DEFAULT 'COMMISSION',
  ADD COLUMN `description` VARCHAR(191) NULL;

CREATE TABLE `CommissionDispute` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `commissionRequestId` INTEGER NOT NULL,
  `openedByUserId` INTEGER NOT NULL,
  `resolvedByUserId` INTEGER NULL,
  `reason` TEXT NOT NULL,
  `status` ENUM('OPEN', 'RESOLVED') NOT NULL DEFAULT 'OPEN',
  `resolution` TEXT NULL,
  `resolvedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `CommissionDispute`
  ADD CONSTRAINT `CommissionDispute_commissionRequestId_fkey`
  FOREIGN KEY (`commissionRequestId`) REFERENCES `CommissionRequest`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `CommissionDispute`
  ADD CONSTRAINT `CommissionDispute_openedByUserId_fkey`
  FOREIGN KEY (`openedByUserId`) REFERENCES `User`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `CommissionDispute`
  ADD CONSTRAINT `CommissionDispute_resolvedByUserId_fkey`
  FOREIGN KEY (`resolvedByUserId`) REFERENCES `User`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
