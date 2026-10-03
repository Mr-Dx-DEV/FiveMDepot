-- ============================================================
-- FiveMDepot — 008 Discord sign-in
-- Run after 007. Safe to re-run. Deletes nothing.
-- ============================================================

SET NAMES utf8mb4;

-- users.discord_id already exists (unique). Keep the Discord handle for support tickets.
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `discord_username` VARCHAR(100) DEFAULT NULL AFTER `discord_id`;

INSERT IGNORE INTO `migrations` (`name`) VALUES ('008_discord');
