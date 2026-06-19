-- CreateTable
CREATE TABLE `Review` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `artistProfileId` INTEGER NOT NULL,
    `commissionRequestId` INTEGER NOT NULL,
    `clientName` VARCHAR(191) NOT NULL,
    `rating` INTEGER NOT NULL,
    `comment` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Review_commissionRequestId_key`(`commissionRequestId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_artistProfileId_fkey` FOREIGN KEY (`artistProfileId`) REFERENCES `ArtistProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_commissionRequestId_fkey` FOREIGN KEY (`commissionRequestId`) REFERENCES `CommissionRequest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
