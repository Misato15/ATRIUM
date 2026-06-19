ALTER TABLE `User`
ADD COLUMN `googleId` VARCHAR(191) NULL,
ADD COLUMN `emailVerifiedAt` DATETIME(3) NULL,
ADD COLUMN `emailVerificationToken` VARCHAR(191) NULL,
ADD COLUMN `emailVerificationExpiresAt` DATETIME(3) NULL;

UPDATE `User`
SET `emailVerifiedAt` = CURRENT_TIMESTAMP(3)
WHERE `emailVerifiedAt` IS NULL;

CREATE UNIQUE INDEX `User_googleId_key` ON `User`(`googleId`);
CREATE UNIQUE INDEX `User_emailVerificationToken_key` ON `User`(`emailVerificationToken`);
