/*
  Warnings:

  - You are about to drop the column `category` on the `artistprofile` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `artistprofile` DROP COLUMN `category`,
    ADD COLUMN `categoryId` INTEGER NULL;

-- CreateTable
CREATE TABLE `ArtistCategory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `ArtistCategory_name_key`(`name`),
    UNIQUE INDEX `ArtistCategory_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ArtistProfile` ADD CONSTRAINT `ArtistProfile_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `ArtistCategory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
