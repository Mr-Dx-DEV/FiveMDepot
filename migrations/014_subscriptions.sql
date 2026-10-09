-- ============================================================
-- FiveMDepot — 014 Subscriptions: mirror of Paddle customers and subscriptions (pricing page plans).
-- Filled by the Paddle webhook (transaction.completed, subscription.*, customer.*) — never by hand.
-- Plan prices are NOT stored here: they live in Paddle, and the price IDs are in js/pricing-tiers.js.
-- Run after 013. Safe to re-run; creates new tables only and changes nothing existing.
-- ============================================================

SET NAMES utf8mb4;

-- One row per Paddle customer (ctm_…), linked to a site account when we can match it
CREATE TABLE IF NOT EXISTS `paddle_customers` (
  `customer_id` VARCHAR(50) NOT NULL,
  `user_id` VARCHAR(36) DEFAULT NULL,
  `email` VARCHAR(255) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`customer_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One row per Paddle subscription (sub_…). Access = status 'active' or 'trialing'.
-- A scheduled cancel/pause does not remove access until status actually changes.
CREATE TABLE IF NOT EXISTS `subscriptions` (
  `subscription_id` VARCHAR(50) NOT NULL,
  `customer_id` VARCHAR(50) NOT NULL,
  `user_id` VARCHAR(36) DEFAULT NULL,
  `status` VARCHAR(20) NOT NULL,                     -- trialing, active, past_due, paused, canceled
  `price_id` VARCHAR(50) NOT NULL,                   -- pri_… (which tier and month/year)
  `product_id` VARCHAR(50) NOT NULL,                 -- pro_… (Starter / Pro / Advanced)
  `current_period_end` DATETIME DEFAULT NULL,
  `scheduled_change_action` VARCHAR(20) DEFAULT NULL, -- cancel, pause, resume
  `scheduled_change_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`subscription_id`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_user_status` (`user_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
