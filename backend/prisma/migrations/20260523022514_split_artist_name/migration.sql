/*
  Warnings:

  - You are about to drop the column `displayName` on the `artistprofile` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `artistprofile` DROP COLUMN `displayName`,
    ADD COLUMN `artistName` VARCHAR(191) NULL,
    ADD COLUMN `fullName` VARCHAR(191) NULL;
