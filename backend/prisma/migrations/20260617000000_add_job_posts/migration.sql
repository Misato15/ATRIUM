CREATE TABLE `JobPost` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `clientUserId` INTEGER NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `description` TEXT NOT NULL,
  `categoryId` INTEGER NULL,
  `budgetMin` VARCHAR(191) NULL,
  `budgetMax` VARCHAR(191) NULL,
  `desiredDeadline` DATETIME(3) NULL,
  `isFlexibleDeadline` BOOLEAN NOT NULL DEFAULT false,
  `serviceMode` ENUM('ONLINE', 'IN_PERSON', 'BOTH') NULL,
  `location` VARCHAR(191) NULL,
  `status` ENUM('OPEN', 'IN_REVIEW', 'ASSIGNED', 'CLOSED', 'CANCELLED') NOT NULL DEFAULT 'OPEN',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `JobPost_clientUserId_idx`(`clientUserId`),
  INDEX `JobPost_status_createdAt_idx`(`status`, `createdAt`),
  INDEX `JobPost_categoryId_idx`(`categoryId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `JobApplication` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `jobPostId` INTEGER NOT NULL,
  `artistProfileId` INTEGER NOT NULL,
  `commissionRequestId` INTEGER NULL,
  `message` TEXT NOT NULL,
  `proposedPrice` VARCHAR(191) NOT NULL,
  `estimatedTimeline` VARCHAR(191) NULL,
  `portfolioLinks` TEXT NULL,
  `status` ENUM('PENDING', 'SHORTLISTED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN') NOT NULL DEFAULT 'PENDING',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `JobApplication_commissionRequestId_key`(`commissionRequestId`),
  UNIQUE INDEX `JobApplication_jobPostId_artistProfileId_key`(`jobPostId`, `artistProfileId`),
  INDEX `JobApplication_artistProfileId_idx`(`artistProfileId`),
  INDEX `JobApplication_status_createdAt_idx`(`status`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `JobPost`
  ADD CONSTRAINT `JobPost_clientUserId_fkey`
  FOREIGN KEY (`clientUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `JobPost`
  ADD CONSTRAINT `JobPost_categoryId_fkey`
  FOREIGN KEY (`categoryId`) REFERENCES `ArtistCategory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `JobApplication`
  ADD CONSTRAINT `JobApplication_jobPostId_fkey`
  FOREIGN KEY (`jobPostId`) REFERENCES `JobPost`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `JobApplication`
  ADD CONSTRAINT `JobApplication_artistProfileId_fkey`
  FOREIGN KEY (`artistProfileId`) REFERENCES `ArtistProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `JobApplication`
  ADD CONSTRAINT `JobApplication_commissionRequestId_fkey`
  FOREIGN KEY (`commissionRequestId`) REFERENCES `CommissionRequest`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
