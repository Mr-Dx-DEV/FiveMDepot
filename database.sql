-- ============================================
-- FiveMDepot — MariaDB Database Schema
-- Import this into your MariaDB/MySQL database
-- ============================================

-- Create database
CREATE DATABASE IF NOT EXISTS `fivemdepot` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `fivemdepot`;

-- ============================================
-- Users
-- ============================================
CREATE TABLE `users` (
  `id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `password` VARCHAR(255) DEFAULT NULL,
  `email_verified_at` DATETIME DEFAULT NULL,
  `image` VARCHAR(500) DEFAULT NULL,
  `role` ENUM('BUYER','SELLER','ADMIN') NOT NULL DEFAULT 'BUYER',
  `discord_id` VARCHAR(100) DEFAULT NULL,
  `google_id` VARCHAR(100) DEFAULT NULL,
  `wallet_balance` DECIMAL(10,2) NOT NULL DEFAULT '0.00',
  `last_login_at` DATETIME DEFAULT NULL,
  `login_attempts` INT NOT NULL DEFAULT '0',
  `locked_until` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_email` (`email`),
  UNIQUE KEY `unique_discord` (`discord_id`),
  UNIQUE KEY `unique_google` (`google_id`),
  KEY `idx_email` (`email`),
  KEY `idx_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Sessions
-- ============================================
CREATE TABLE `sessions` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `session_token` VARCHAR(255) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `user_agent` VARCHAR(500) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_session_token` (`session_token`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_expires` (`expires_at`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Seller Profiles
-- ============================================
CREATE TABLE `seller_profiles` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `bio` TEXT DEFAULT NULL,
  `discord_tag` VARCHAR(100) DEFAULT NULL,
  `status` ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  `approved_at` DATETIME DEFAULT NULL,
  `approved_by` VARCHAR(36) DEFAULT NULL,
  `rejection_reason` TEXT DEFAULT NULL,
  `payout_info` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user` (`user_id`),
  KEY `idx_status` (`status`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Categories
-- ============================================
CREATE TABLE `categories` (
  `id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `slug` VARCHAR(100) NOT NULL,
  `icon` VARCHAR(50) NOT NULL DEFAULT '',
  `description` TEXT DEFAULT NULL,
  `order` INT NOT NULL DEFAULT '0',
  `is_active` TINYINT(1) NOT NULL DEFAULT '1',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_slug` (`slug`),
  KEY `idx_order` (`order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Products
-- ============================================
CREATE TABLE `products` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `category_id` VARCHAR(36) DEFAULT NULL,
  `slug` VARCHAR(255) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `category` ENUM('SCRIPT','MLO','VEHICLE') NOT NULL,
  `price` DECIMAL(10,2) NOT NULL,
  `screenshots` TEXT DEFAULT NULL COMMENT 'JSON array of image URLs',
  `files` TEXT DEFAULT NULL COMMENT 'Storage path to asset files',
  `tags` TEXT DEFAULT NULL COMMENT 'JSON array of tags',
  `version` VARCHAR(50) NOT NULL DEFAULT '1.0.0',
  `compatibility` TEXT DEFAULT NULL COMMENT 'JSON array of compatible frameworks',
  `status` ENUM('DRAFT','PENDING','APPROVED','REJECTED','PUBLISHED') NOT NULL DEFAULT 'PENDING',
  `downloads` INT NOT NULL DEFAULT '0',
  `featured` TINYINT(1) NOT NULL DEFAULT '0',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_slug` (`slug`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_category` (`category_id`),
  KEY `idx_category_status` (`category_id`,`status`),
  KEY `idx_featured_status` (`featured`,`status`),
  KEY `idx_status` (`status`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Orders
-- ============================================
CREATE TABLE `orders` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `product_ids` TEXT NOT NULL COMMENT 'JSON array of product IDs',
  `total_amount` DECIMAL(10,2) NOT NULL,
  `status` ENUM('PENDING','VERIFIED','REJECTED','COMPLETED','REFUNDED') NOT NULL DEFAULT 'PENDING',
  `payment_method` ENUM('BKASH','NAGAD','BANK_TRANSFER') DEFAULT NULL,
  `transaction_id` VARCHAR(100) DEFAULT NULL,
  `payment_proof` VARCHAR(500) DEFAULT NULL,
  `admin_note` TEXT DEFAULT NULL,
  `download_code` VARCHAR(64) DEFAULT NULL,
  `verified_by` VARCHAR(36) DEFAULT NULL,
  `verified_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_download_code` (`download_code`),
  KEY `idx_created` (`created_at`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`verified_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Order Products (many-to-many: order <-> product)
-- ============================================
CREATE TABLE `order_products` (
  `id` VARCHAR(36) NOT NULL,
  `order_id` VARCHAR(36) NOT NULL,
  `product_id` VARCHAR(36) NOT NULL,
  `price_paid` DECIMAL(10,2) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_order_product` (`order_id`,`product_id`),
  KEY `idx_order` (`order_id`),
  KEY `idx_product` (`product_id`),
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Download Codes
-- ============================================
CREATE TABLE `download_codes` (
  `id` VARCHAR(36) NOT NULL,
  `order_id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `code` VARCHAR(64) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `is_used` TINYINT(1) NOT NULL DEFAULT '0',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_code` (`code`),
  UNIQUE KEY `unique_order` (`order_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_expires` (`expires_at`),
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Reviews
-- ============================================
CREATE TABLE `reviews` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `product_id` VARCHAR(36) NOT NULL,
  `rating` INT NOT NULL CHECK (`rating` >= 1 AND `rating` <= 5),
  `comment` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_product` (`user_id`,`product_id`),
  KEY `idx_product` (`product_id`),
  KEY `idx_rating` (`rating`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Payment Proofs (audit trail)
-- ============================================
CREATE TABLE `payment_proofs` (
  `id` VARCHAR(36) NOT NULL,
  `order_id` VARCHAR(36) NOT NULL,
  `file_path` VARCHAR(500) NOT NULL,
  `transaction_id` VARCHAR(100) DEFAULT NULL,
  `sender_number` VARCHAR(50) DEFAULT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `status` ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  `reviewed_by` VARCHAR(36) DEFAULT NULL,
  `reviewed_at` DATETIME DEFAULT NULL,
  `review_note` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_order` (`order_id`),
  KEY `idx_status` (`status`),
  KEY `idx_reviewed` (`reviewed_by`),
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Withdrawal Requests (for sellers)
-- ============================================
CREATE TABLE `withdrawals` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `method` ENUM('BKASH','NAGAD','BANK_TRANSFER') NOT NULL,
  `account_info` TEXT NOT NULL,
  `status` ENUM('PENDING','APPROVED','PAID','REJECTED') NOT NULL DEFAULT 'PENDING',
  `rejected_reason` TEXT DEFAULT NULL,
  `approved_by` VARCHAR(36) DEFAULT NULL,
  `approved_at` DATETIME DEFAULT NULL,
  `paid_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_created` (`created_at`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Site Settings (admin configurable)
-- ============================================
CREATE TABLE `site_settings` (
  `id` VARCHAR(36) NOT NULL,
  `key` VARCHAR(100) NOT NULL,
  `value` TEXT DEFAULT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Activity Log (audit trail)
-- ============================================
CREATE TABLE `activity_log` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` VARCHAR(36) DEFAULT NULL,
  `action` VARCHAR(100) NOT NULL,
  `entity_type` VARCHAR(50) DEFAULT NULL,
  `entity_id` VARCHAR(36) DEFAULT NULL,
  `details` TEXT DEFAULT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `user_agent` VARCHAR(500) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_action` (`action`),
  KEY `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Seed Data — Default Admin User
-- Password: Admin@123 (CHANGE IMMEDIATELY!)
-- ============================================
INSERT INTO `users` (`id`, `name`, `email`, `password`, `role`) VALUES
('a0000000-0000-0000-0000-000000000001', 'Admin', 'admin@fivemdepot.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ADMIN');

-- ============================================
-- Seed Data — Default Categories
-- ============================================
INSERT INTO `categories` (`id`, `name`, `slug`, `icon`, `order`) VALUES
('c0000000-0000-0000-0000-000000000001', 'Scripts', 'scripts', '&#128187;', 1),
('c0000000-0000-0000-0000-000000000002', 'MLOs & Maps', 'mlos-maps', '&#127960;', 2),
('c0000000-0000-0000-0000-000000000003', 'Vehicles', 'vehicles', '&#128663;', 3),
('c0000000-0000-0000-0000-000000000004', 'UI Packs', 'ui-packs', '&#127912;', 4),
('c0000000-0000-0000-0000-000000000005', 'Maps', 'maps', '&#127769;', 5);

-- ============================================
-- Seed Data — Site Settings
-- ============================================
INSERT INTO `site_settings` (`id`, `key`, `value`, `description`) VALUES
('s0000000-0000-0000-0000-000000000001', 'site_name', 'FiveMDepot', 'Website name'),
('s0000000-0000-0000-0000-000000000002', 'site_tagline', 'Premium FiveM Marketplace', 'Website tagline'),
('s0000000-0000-0000-0000-000000000003', 'bkash_number', '01XXXXXXXXX', 'bKash payment number'),
('s0000000-0000-0000-0000-000000000004', 'nagad_number', '01XXXXXXXXX', 'Nagad payment number'),
('s0000000-0000-0000-0000-000000000005', 'bank_name', 'DBBL', 'Bank name'),
('s0000000-0000-0000-0000-000000000006', 'bank_account', '0000000000000', 'Bank account number'),
('s0000000-0000-0000-0000-000000000007', 'bank_branch', 'Dhaka', 'Bank branch'),
('s0000000-0000-0000-0000-000000000008', 'seller_auto_approve', '0', 'Auto-approve seller applications (0=off, 1=on)');
