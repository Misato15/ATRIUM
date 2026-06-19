CREATE TABLE `DigitalProduct` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `artistProfileId` INTEGER NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `description` TEXT NOT NULL,
  `price` VARCHAR(191) NOT NULL,
  `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
  `coverImageUrl` TEXT NULL,
  `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `DigitalProductAsset` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `digitalProductId` INTEGER NOT NULL,
  `kind` ENUM('PREVIEW', 'DOWNLOAD') NOT NULL,
  `url` TEXT NOT NULL,
  `publicId` VARCHAR(191) NULL,
  `resourceType` VARCHAR(191) NULL,
  `deliveryType` VARCHAR(191) NULL,
  `name` VARCHAR(191) NULL,
  `mimeType` VARCHAR(191) NULL,
  `size` INTEGER NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `DigitalProductPurchase` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `digitalProductId` INTEGER NOT NULL,
  `buyerUserId` INTEGER NOT NULL,
  `amount` VARCHAR(191) NOT NULL,
  `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
  `status` ENUM('PENDING', 'PAID', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
  `provider` VARCHAR(191) NOT NULL DEFAULT 'PAYPAL',
  `providerOrderId` VARCHAR(191) NULL,
  `paidAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `DigitalProductPurchase_providerOrderId_key`(`providerOrderId`),
  UNIQUE INDEX `DigitalProductPurchase_digitalProductId_buyerUserId_key`(`digitalProductId`, `buyerUserId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `DigitalProduct_artistProfileId_idx` ON `DigitalProduct`(`artistProfileId`);
CREATE INDEX `DigitalProduct_status_idx` ON `DigitalProduct`(`status`);
CREATE INDEX `DigitalProductAsset_digitalProductId_idx` ON `DigitalProductAsset`(`digitalProductId`);
CREATE INDEX `DigitalProductAsset_kind_idx` ON `DigitalProductAsset`(`kind`);
CREATE INDEX `DigitalProductPurchase_buyerUserId_idx` ON `DigitalProductPurchase`(`buyerUserId`);
CREATE INDEX `DigitalProductPurchase_status_idx` ON `DigitalProductPurchase`(`status`);

ALTER TABLE `DigitalProduct`
  ADD CONSTRAINT `DigitalProduct_artistProfileId_fkey`
  FOREIGN KEY (`artistProfileId`) REFERENCES `ArtistProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `DigitalProductAsset`
  ADD CONSTRAINT `DigitalProductAsset_digitalProductId_fkey`
  FOREIGN KEY (`digitalProductId`) REFERENCES `DigitalProduct`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `DigitalProductPurchase`
  ADD CONSTRAINT `DigitalProductPurchase_digitalProductId_fkey`
  FOREIGN KEY (`digitalProductId`) REFERENCES `DigitalProduct`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `DigitalProductPurchase`
  ADD CONSTRAINT `DigitalProductPurchase_buyerUserId_fkey`
  FOREIGN KEY (`buyerUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
