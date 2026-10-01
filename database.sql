-- =============================================
-- FiveMDepot Database Schema
-- MariaDB/MySQL — Import via phpMyAdmin
-- Database: fivemdepot
-- =============================================

-- =============================================
-- TABLES
-- =============================================

-- Users
CREATE TABLE IF NOT EXISTS `User` (
  `id` VARCHAR(36) PRIMARY KEY,
  `name` VARCHAR(255) NULL,
  `email` VARCHAR(255) UNIQUE NOT NULL,
  `emailVerified` DATETIME NULL,
  `password` VARCHAR(255) NULL,
  `image` VARCHAR(500) NULL,
  `role` ENUM('BUYER','SELLER','ADMIN') NOT NULL DEFAULT 'BUYER',
  `discordId` VARCHAR(255) UNIQUE NULL,
  `googleId` VARCHAR(255) UNIQUE NULL,
  `walletBalance` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `User_email_idx` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- OAuth Accounts
CREATE TABLE IF NOT EXISTS `Account` (
  `id` VARCHAR(36) PRIMARY KEY,
  `userId` VARCHAR(36) NOT NULL,
  `type` VARCHAR(255) NOT NULL,
  `provider` VARCHAR(255) NOT NULL,
  `providerAccountId` VARCHAR(255) NOT NULL,
  `refresh_token` TEXT NULL,
  `access_token` TEXT NULL,
  `expires_at` INT NULL,
  `token_type` VARCHAR(255) NULL,
  `scope` VARCHAR(255) NULL,
  `id_token` TEXT NULL,
  `session_state` VARCHAR(255) NULL,
  UNIQUE KEY `Account_provider_providerAccountId` (`provider`, `providerAccountId`),
  INDEX `Account_userId_idx` (`userId`),
  CONSTRAINT `Account_userId_fk` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sessions
CREATE TABLE IF NOT EXISTS `Session` (
  `id` VARCHAR(36) PRIMARY KEY,
  `sessionToken` VARCHAR(255) UNIQUE NOT NULL,
  `userId` VARCHAR(36) NOT NULL,
  `expires` DATETIME NOT NULL,
  INDEX `Session_userId_idx` (`userId`),
  CONSTRAINT `Session_userId_fk` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seller Profiles
CREATE TABLE IF NOT EXISTS `SellerProfile` (
  `id` VARCHAR(36) PRIMARY KEY,
  `userId` VARCHAR(36) UNIQUE NOT NULL,
  `bio` TEXT NULL,
  `discordTag` VARCHAR(255) NULL,
  `status` ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  `approvedAt` DATETIME NULL,
  `payoutInfo` TEXT NULL,
  INDEX `SellerProfile_userId_idx` (`userId`),
  CONSTRAINT `SellerProfile_userId_fk` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Categories
CREATE TABLE IF NOT EXISTS `Category` (
  `id` VARCHAR(36) PRIMARY KEY,
  `name` VARCHAR(100) UNIQUE NOT NULL,
  `slug` VARCHAR(100) UNIQUE NOT NULL,
  `icon` VARCHAR(50) NOT NULL,
  `order` INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Products
CREATE TABLE IF NOT EXISTS `Product` (
  `id` VARCHAR(36) PRIMARY KEY,
  `userId` VARCHAR(36) NOT NULL,
  `slug` VARCHAR(255) UNIQUE NOT NULL,
  `title` VARCHAR(500) NOT NULL,
  `description` LONGTEXT NULL,
  `category` ENUM('SCRIPT','MLO','VEHICLE') NOT NULL,
  `price` DECIMAL(10,2) NOT NULL,
  `screenshots` JSON NULL,
  `files` VARCHAR(500) NOT NULL,
  `tags` JSON NULL,
  `version` VARCHAR(50) NOT NULL DEFAULT '1.0.0',
  `compatibility` JSON NULL,
  `categoryId` VARCHAR(36) NULL,
  `status` ENUM('DRAFT','PUBLISHED','REJECTED') NOT NULL DEFAULT 'DRAFT',
  `downloads` INT NOT NULL DEFAULT 0,
  `featured` TINYINT(1) NOT NULL DEFAULT 0,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `Product_slug_idx` (`slug`),
  INDEX `Product_categoryId_status_idx` (`categoryId`, `status`),
  INDEX `Product_featured_status_idx` (`featured`, `status`),
  CONSTRAINT `Product_userId_fk` FOREIGN KEY (`userId`) REFERENCES `User`(`id`),
  CONSTRAINT `Product_categoryId_fk` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Orders
CREATE TABLE IF NOT EXISTS `Order` (
  `id` VARCHAR(36) PRIMARY KEY,
  `userId` VARCHAR(36) NOT NULL,
  `productId` VARCHAR(36) NOT NULL,
  `status` ENUM('PENDING','VERIFIED','REJECTED','COMPLETED') NOT NULL DEFAULT 'PENDING',
  `amount` DECIMAL(10,2) NOT NULL,
  `paymentProof` VARCHAR(500) NULL,
  `adminNote` TEXT NULL,
  `downloadCode` VARCHAR(64) UNIQUE NULL,
  `verifiedBy` VARCHAR(36) NULL,
  `verifiedAt` DATETIME NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `Order_userId_status_idx` (`userId`, `status`),
  INDEX `Order_productId_status_idx` (`productId`, `status`),
  CONSTRAINT `Order_userId_fk` FOREIGN KEY (`userId`) REFERENCES `User`(`id`),
  CONSTRAINT `Order_productId_fk` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`),
  CONSTRAINT `Order_verifiedBy_fk` FOREIGN KEY (`verifiedBy`) REFERENCES `User`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reviews
CREATE TABLE IF NOT EXISTS `Review` (
  `id` VARCHAR(36) PRIMARY KEY,
  `userId` VARCHAR(36) NOT NULL,
  `productId` VARCHAR(36) NOT NULL,
  `rating` INT NOT NULL,
  `comment` TEXT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `Review_userId_productId` (`userId`, `productId`),
  INDEX `Review_productId_idx` (`productId`),
  CONSTRAINT `Review_userId_fk` FOREIGN KEY (`userId`) REFERENCES `User`(`id`),
  CONSTRAINT `Review_productId_fk` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Download Codes
CREATE TABLE IF NOT EXISTS `DownloadCode` (
  `id` VARCHAR(36) PRIMARY KEY,
  `orderId` VARCHAR(36) UNIQUE NOT NULL,
  `userId` VARCHAR(36) NOT NULL,
  `code` VARCHAR(64) UNIQUE NOT NULL,
  `expiresAt` DATETIME NOT NULL,
  `isUsed` TINYINT(1) NOT NULL DEFAULT 0,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `DownloadCode_code_idx` (`code`),
  INDEX `DownloadCode_expiresAt_idx` (`expiresAt`),
  CONSTRAINT `DownloadCode_orderId_fk` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`),
  CONSTRAINT `DownloadCode_userId_fk` FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verification Tokens
CREATE TABLE IF NOT EXISTS `VerificationToken` (
  `identifier` VARCHAR(255) NOT NULL,
  `token` VARCHAR(255) UNIQUE NOT NULL,
  `expires` DATETIME NOT NULL,
  PRIMARY KEY (`identifier`, `token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- SEED DATA — Default Categories
-- =============================================
INSERT INTO `Category` (`id`, `name`, `slug`, `icon`, `order`) VALUES
  ('cat-scripts',    'Scripts',         'script',    'FaCode',      1),
  ('cat-mlos',       'MLOs & Maps',     'mlo',       'FaMapMarkedAlt', 2),
  ('cat-vehicles',   'Vehicles',        'vehicle',   'FaCar',       3);

-- =============================================
-- END
-- =============================================
