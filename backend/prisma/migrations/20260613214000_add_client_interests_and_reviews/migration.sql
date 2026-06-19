ALTER TABLE `User`
ADD COLUMN `interests` TEXT NULL;

CREATE TABLE `ClientReview` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `clientUserId` INTEGER NOT NULL,
    `artistProfileId` INTEGER NOT NULL,
    `commissionRequestId` INTEGER NOT NULL,
    `rating` INTEGER NOT NULL,
    `comment` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ClientReview_commissionRequestId_key`(`commissionRequestId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ClientReview`
ADD CONSTRAINT `ClientReview_clientUserId_fkey`
FOREIGN KEY (`clientUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ClientReview`
ADD CONSTRAINT `ClientReview_artistProfileId_fkey`
FOREIGN KEY (`artistProfileId`) REFERENCES `ArtistProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ClientReview`
ADD CONSTRAINT `ClientReview_commissionRequestId_fkey`
FOREIGN KEY (`commissionRequestId`) REFERENCES `CommissionRequest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
