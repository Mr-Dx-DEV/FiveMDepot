-- ============================================================
-- FiveMDepot — 002 Admin panel support
-- Run AFTER 001_store_rebuild.sql (phpMyAdmin → Import).
-- Safe to run more than once. Deletes nothing.
-- ============================================================

SET NAMES utf8mb4;

-- Ban users from the admin panel
ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `is_banned` TINYINT(1) NOT NULL DEFAULT '0',
  ADD COLUMN IF NOT EXISTS `ban_reason` VARCHAR(255) DEFAULT NULL;

-- Product extras used by the new product editor
ALTER TABLE `products`
  ADD COLUMN IF NOT EXISTS `features` LONGTEXT DEFAULT NULL COMMENT 'JSON array of feature bullet points',
  ADD COLUMN IF NOT EXISTS `install_guide` LONGTEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `published_at` DATETIME DEFAULT NULL;

-- The old enum column is no longer the source of truth (tags are);
-- make it optional so new products don't need it.
ALTER TABLE `products` MODIFY `category` ENUM('SCRIPT','MLO','VEHICLE') NULL DEFAULT NULL;

-- Reviews can be hidden by moderators
ALTER TABLE `reviews`
  ADD COLUMN IF NOT EXISTS `is_hidden` TINYINT(1) NOT NULL DEFAULT '0';

-- Faster admin lists
ALTER TABLE `orders` ADD INDEX IF NOT EXISTS `idx_status_created` (`status`, `created_at`);
ALTER TABLE `products` ADD INDEX IF NOT EXISTS `idx_status_created` (`status`, `created_at`);

INSERT IGNORE INTO `site_settings` (`id`, `key`, `value`, `description`) VALUES
('s0000000-0000-0000-0000-000000000030', 'topbar_text', '', 'Announcement bar text (empty = hidden)'),
('s0000000-0000-0000-0000-000000000031', 'topbar_link', '', 'Announcement bar link'),
('s0000000-0000-0000-0000-000000000032', 'currency_symbol', '$', 'Currency symbol shown on prices'),
('s0000000-0000-0000-0000-000000000033', 'download_expiry_days', '30', 'Days a download link stays valid'),
('s0000000-0000-0000-0000-000000000034', 'platform_fee_percent', '0', 'Percent the store keeps from seller sales');

INSERT IGNORE INTO `migrations` (`name`) VALUES ('002_admin');
