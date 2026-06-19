ALTER TABLE `User`
  ADD COLUMN `isSuspended` BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE `ArtistProfile`
  ADD COLUMN `isHidden` BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE `PortfolioItem`
  ADD COLUMN `isHidden` BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX `User_isSuspended_idx` ON `User`(`isSuspended`);
CREATE INDEX `ArtistProfile_isHidden_idx` ON `ArtistProfile`(`isHidden`);
CREATE INDEX `PortfolioItem_isHidden_idx` ON `PortfolioItem`(`isHidden`);

CREATE TABLE `AdminActionLog` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `adminUserId` INTEGER NOT NULL,
  `action` VARCHAR(191) NOT NULL,
  `targetType` VARCHAR(191) NOT NULL,
  `targetId` INTEGER NULL,
  `metadata` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `AdminActionLog_adminUserId_idx`(`adminUserId`),
  INDEX `AdminActionLog_targetType_targetId_idx`(`targetType`, `targetId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `AdminActionLog`
  ADD CONSTRAINT `AdminActionLog_adminUserId_fkey`
  FOREIGN KEY (`adminUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
