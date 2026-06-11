-- CreateTable
CREATE TABLE `CommissionRequest` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `artistProfileId` INTEGER NOT NULL,
    `clientName` VARCHAR(191) NOT NULL,
    `clientEmail` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `budget` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'REVIEWED', 'ACCEPTED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CommissionRequest` ADD CONSTRAINT `CommissionRequest_artistProfileId_fkey` FOREIGN KEY (`artistProfileId`) REFERENCES `ArtistProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
