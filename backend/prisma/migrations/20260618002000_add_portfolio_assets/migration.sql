ALTER TABLE `PortfolioItem`
  MODIFY `mediaType` ENUM('IMAGE', 'VIDEO', 'AUDIO', 'PDF', 'EMBED') NOT NULL;

CREATE TABLE `PortfolioAsset` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `portfolioItemId` INTEGER NOT NULL,
  `mediaType` ENUM('IMAGE', 'VIDEO', 'AUDIO', 'PDF', 'EMBED') NOT NULL,
  `url` VARCHAR(191) NOT NULL,
  `thumbnailUrl` VARCHAR(191) NULL,
  `publicId` VARCHAR(191) NULL,
  `resourceType` VARCHAR(191) NULL,
  `deliveryType` VARCHAR(191) NULL,
  `name` VARCHAR(191) NULL,
  `mimeType` VARCHAR(191) NULL,
  `size` INTEGER NULL,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `PortfolioAsset_portfolioItemId_idx`(`portfolioItemId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `PortfolioAsset`
  ADD CONSTRAINT `PortfolioAsset_portfolioItemId_fkey`
  FOREIGN KEY (`portfolioItemId`) REFERENCES `PortfolioItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO `PortfolioAsset` (
  `portfolioItemId`,
  `mediaType`,
  `url`,
  `thumbnailUrl`,
  `sortOrder`,
  `createdAt`
)
SELECT
  `id`,
  `mediaType`,
  `mediaUrl`,
  `thumbnailUrl`,
  0,
  `createdAt`
FROM `PortfolioItem`
WHERE `mediaUrl` IS NOT NULL AND `mediaUrl` <> '';
