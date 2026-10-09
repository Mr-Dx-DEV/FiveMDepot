-- ============================================================
-- FiveMDepot — 015 Subscriptions: Paddle's own "updated_at" on each mirrored row, so a late/older
-- webhook delivery never overwrites newer state (Paddle can deliver events out of order).
-- Run after 014. Safe to re-run.
-- ============================================================

SET NAMES utf8mb4;

ALTER TABLE `paddle_customers` ADD COLUMN IF NOT EXISTS `paddle_updated_at` DATETIME(3) DEFAULT NULL AFTER `email`;
ALTER TABLE `subscriptions` ADD COLUMN IF NOT EXISTS `paddle_updated_at` DATETIME(3) DEFAULT NULL AFTER `scheduled_change_at`;
