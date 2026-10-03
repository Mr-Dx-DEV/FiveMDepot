-- ============================================================
-- FiveMDepot — 007 Buy Me a Coffee payments, support tickets, email settings
-- Run after 006. Safe to re-run. Deletes nothing.
-- ============================================================

SET NAMES utf8mb4;

-- Payment details typed by the buyer (Buy Me a Coffee has no screenshot)
ALTER TABLE `payment_proofs` MODIFY `file_path` VARCHAR(500) NULL DEFAULT NULL;
ALTER TABLE `payment_proofs`
  ADD COLUMN IF NOT EXISTS `payer_email` VARCHAR(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `note` TEXT DEFAULT NULL;

INSERT IGNORE INTO `site_settings` (`id`, `key`, `value`, `description`) VALUES
('s0000000-0000-0000-0000-000000000060', 'pay_bmc_enabled', '1', 'Buy Me a Coffee payments'),
('s0000000-0000-0000-0000-000000000061', 'bmc_link', 'https://buymeacoffee.com/dxfivem', 'Buy Me a Coffee page'),
('s0000000-0000-0000-0000-000000000062', 'verify_hours', '2–3 hours', 'How long manual payment checks usually take'),
('s0000000-0000-0000-0000-000000000063', 'mail_from', '', 'Sender address for emails (empty = info@ your domain)'),
('s0000000-0000-0000-0000-000000000064', 'admin_notify_email', '', 'Your email for new order / ticket alerts');

-- Discord support link (only if none was set yet)
UPDATE `site_settings` SET `value` = 'https://discord.gg/Us6mmb7dQ4' WHERE `key` = 'social_discord' AND (`value` IS NULL OR `value` = '');
INSERT IGNORE INTO `site_settings` (`id`, `key`, `value`, `description`) VALUES
('s0000000-0000-0000-0000-000000000020', 'social_discord', 'https://discord.gg/Us6mmb7dQ4', 'Discord invite URL');

-- Support tickets
CREATE TABLE IF NOT EXISTS `support_tickets` (
  `id` VARCHAR(36) NOT NULL,
  `number` INT NOT NULL AUTO_INCREMENT,
  `user_id` VARCHAR(36) NOT NULL,
  `order_id` VARCHAR(36) DEFAULT NULL,
  `subject` VARCHAR(200) NOT NULL,
  `category` VARCHAR(30) NOT NULL DEFAULT 'general',
  `status` ENUM('open','answered','closed') NOT NULL DEFAULT 'open',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_number` (`number`),
  KEY `idx_user` (`user_id`),
  KEY `idx_status` (`status`, `updated_at`),
  CONSTRAINT `fk_ticket_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1001 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ticket_messages` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `ticket_id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) DEFAULT NULL,
  `is_staff` TINYINT(1) NOT NULL DEFAULT '0',
  `body` TEXT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ticket` (`ticket_id`),
  CONSTRAINT `fk_msg_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `support_tickets`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `migrations` (`name`) VALUES ('007_support');
