UPDATE `PortfolioItem` SET `mediaType` = 'IMAGE' WHERE `mediaType` IN ('AUDIO', 'EMBED');
UPDATE `PortfolioAsset` SET `mediaType` = 'IMAGE' WHERE `mediaType` IN ('AUDIO', 'EMBED');

ALTER TABLE `PortfolioItem`
  MODIFY `mediaType` ENUM('IMAGE', 'VIDEO', 'PDF') NOT NULL;

ALTER TABLE `PortfolioAsset`
  MODIFY `mediaType` ENUM('IMAGE', 'VIDEO', 'PDF') NOT NULL;
