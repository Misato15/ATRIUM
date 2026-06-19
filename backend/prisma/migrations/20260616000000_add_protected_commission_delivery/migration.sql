ALTER TABLE `CommissionRequest`
ADD COLUMN `deliveryPreviewUrl` VARCHAR(191) NULL,
ADD COLUMN `finalFileUrl` VARCHAR(191) NULL,
ADD COLUMN `clientResponseDeadline` DATETIME(3) NULL,
ADD COLUMN `autoApprovedAt` DATETIME(3) NULL;

ALTER TABLE `PaymentTransaction`
ADD COLUMN `releasedAt` DATETIME(3) NULL;
