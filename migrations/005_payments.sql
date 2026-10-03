-- ============================================================
-- FiveMDepot — 005 International payments (Stripe, NOWPayments crypto, SSLCommerz)
-- Run after 004. Safe to re-run. Deletes nothing.
-- ============================================================

SET NAMES utf8mb4;

-- Any payment method name (BKASH, NAGAD, BANK_TRANSFER, STRIPE, CRYPTO, SSLCOMMERZ, FREE…)
ALTER TABLE `orders` MODIFY `payment_method` VARCHAR(30) NULL DEFAULT NULL;

-- New states for online payments
ALTER TABLE `orders` MODIFY `status`
  ENUM('AWAITING_PAYMENT','PENDING','VERIFIED','REJECTED','COMPLETED','REFUNDED','CANCELLED') NOT NULL DEFAULT 'PENDING';

ALTER TABLE `orders`
  ADD COLUMN IF NOT EXISTS `promo_id` VARCHAR(36) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `gateway_ref` VARCHAR(255) DEFAULT NULL COMMENT 'Stripe session / NOWPayments invoice / SSLCommerz transaction',
  ADD COLUMN IF NOT EXISTS `paid_amount` DECIMAL(12,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `paid_currency` VARCHAR(10) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `paid_at` DATETIME DEFAULT NULL,
  ADD INDEX IF NOT EXISTS `idx_gateway_ref` (`gateway_ref`);

-- Every notification received from a gateway (audit trail + duplicate protection)
CREATE TABLE IF NOT EXISTS `payment_events` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `order_id` VARCHAR(36) DEFAULT NULL,
  `gateway` VARCHAR(20) NOT NULL,
  `event_id` VARCHAR(191) NOT NULL,
  `event_type` VARCHAR(80) DEFAULT NULL,
  `status` VARCHAR(40) DEFAULT NULL,
  `amount` DECIMAL(12,2) DEFAULT NULL,
  `currency` VARCHAR(10) DEFAULT NULL,
  `payload` MEDIUMTEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_event` (`gateway`, `event_id`),
  KEY `idx_order` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- On/off switches (API keys live in config.local.php, never in the database)
INSERT IGNORE INTO `site_settings` (`id`, `key`, `value`, `description`) VALUES
('s0000000-0000-0000-0000-000000000040', 'pay_stripe_enabled', '1', 'Card payments via Stripe'),
('s0000000-0000-0000-0000-000000000041', 'pay_crypto_enabled', '1', 'Crypto payments via NOWPayments'),
('s0000000-0000-0000-0000-000000000042', 'pay_sslcommerz_enabled', '1', 'Cards / mobile banking via SSLCommerz'),
('s0000000-0000-0000-0000-000000000043', 'pay_manual_enabled', '1', 'Manual bKash / Nagad / bank transfer with payment proof');

INSERT IGNORE INTO `migrations` (`name`) VALUES ('005_payments');
