ALTER TABLE `CommissionAttachment`
  ADD COLUMN `publicId` VARCHAR(191) NULL,
  ADD COLUMN `resourceType` VARCHAR(191) NULL,
  ADD COLUMN `deliveryType` VARCHAR(191) NULL,
  ADD COLUMN `previewUrl` TEXT NULL;
