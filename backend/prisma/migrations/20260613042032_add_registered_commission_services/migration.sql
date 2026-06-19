-- AlterTable
ALTER TABLE `artistprofile` ADD COLUMN `commissionTypes` TEXT NULL,
    ADD COLUMN `interests` TEXT NULL,
    ADD COLUMN `serviceArea` VARCHAR(191) NULL,
    ADD COLUMN `serviceDescription` TEXT NULL,
    ADD COLUMN `serviceMode` ENUM('ONLINE', 'IN_PERSON', 'BOTH') NOT NULL DEFAULT 'ONLINE',
    ADD COLUMN `servicePriceRange` VARCHAR(191) NULL,
    ADD COLUMN `startingPrice` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `commissionrequest` ADD COLUMN `budgetMax` VARCHAR(191) NULL,
    ADD COLUMN `budgetMin` VARCHAR(191) NULL,
    ADD COLUMN `clientUserId` INTEGER NULL,
    ADD COLUMN `desiredDeadline` DATETIME(3) NULL,
    ADD COLUMN `isFlexibleDeadline` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `projectTitle` VARCHAR(191) NULL,
    ADD COLUMN `serviceMode` ENUM('ONLINE', 'IN_PERSON', 'BOTH') NULL;

-- AddForeignKey
ALTER TABLE `CommissionRequest` ADD CONSTRAINT `CommissionRequest_clientUserId_fkey` FOREIGN KEY (`clientUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
