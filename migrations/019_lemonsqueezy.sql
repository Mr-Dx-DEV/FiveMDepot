-- FiveMDepot — 019 Lemon Squeezy replaces Paddle (Lemon Squeezy = Merchant of Record). Safe to re-run.
-- * New subscription tables for Lemon Squeezy (billing_customers, billing_subscriptions), filled by the webhook.
--   The old Paddle tables (paddle_customers, subscriptions) are left untouched and are no longer used;
--   they only hold Paddle test data and can be dropped by hand later.
-- * Checkout switch: pay_lemonsqueezy_enabled (the old pay_paddle_enabled is no longer read).
-- * Legal pages, docs and FAQ: every "Paddle" mention now names Lemon Squeezy (links included).
-- Run after 018. phpMyAdmin: select the fivemdepot database -> SQL tab -> paste this file -> Go.

SET NAMES utf8mb4;

-- 1. Lemon Squeezy customers and subscriptions
CREATE TABLE IF NOT EXISTS `billing_customers` (
  `customer_id` VARCHAR(50) NOT NULL,                -- Lemon Squeezy customer id
  `user_id` VARCHAR(36) DEFAULT NULL,
  `email` VARCHAR(255) NOT NULL,
  `provider_updated_at` DATETIME(3) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`customer_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `billing_subscriptions` (
  `subscription_id` VARCHAR(50) NOT NULL,            -- Lemon Squeezy subscription id
  `customer_id` VARCHAR(50) NOT NULL,
  `user_id` VARCHAR(36) DEFAULT NULL,
  `status` VARCHAR(20) NOT NULL,                     -- on_trial, active, past_due, unpaid, paused, cancelled, expired
  `variant_id` VARCHAR(50) NOT NULL,                 -- which plan and month/year (core/plans.php)
  `product_id` VARCHAR(50) NOT NULL,
  `current_period_end` DATETIME DEFAULT NULL,        -- renews_at (or trial end)
  `scheduled_change_action` VARCHAR(20) DEFAULT NULL, -- 'cancel' when cancelled but still in its paid period
  `scheduled_change_at` DATETIME DEFAULT NULL,       -- ends_at
  `provider_updated_at` DATETIME(3) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`subscription_id`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_user_status` (`user_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Checkout switch; open orders that were waiting for Paddle can be paid again with Lemon Squeezy
INSERT INTO `site_settings` (`id`, `key`, `value`, `description`) VALUES
('s0000000-0000-0000-0000-000000000094', 'pay_lemonsqueezy_enabled', '1', 'Lemon Squeezy checkout')
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`);
UPDATE `orders` SET `payment_method` = 'LEMONSQUEEZY', `gateway_ref` = NULL WHERE `payment_method` = 'PADDLE' AND `status` = 'AWAITING_PAYMENT';

-- 3. Wording: legal pages, docs, blog, FAQ, homepage and settings
UPDATE `documentation` SET `content` = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(`content`, 'Paddle provides all customer service inquiries and handles returns.', 'Lemon Squeezy handles payment, tax and billing questions; we handle product support and refunds.'), 'Paddle handles all returns and refunds:', 'Refunds are issued through Lemon Squeezy:'), 'Refunds are handled by Paddle', 'Refunds are issued through Lemon Squeezy'), 'we will arrange it with Paddle', 'we will refund it through Lemon Squeezy'), 'Paddle may refuse refunds where', 'We may refuse refunds where'), 'Paddle shares with us', 'Lemon Squeezy shares with us'), 'the Paddle transaction reference', 'the Lemon Squeezy order reference'), 'depending on what Paddle offers in your country', 'depending on what Lemon Squeezy offers in your country'), 'https://www.paddle.com/legal/checkout-buyer-terms', 'https://www.lemonsqueezy.com/buyer-terms'), 'Paddle Buyer Terms', 'Lemon Squeezy Buyer Terms'), 'https://www.paddle.com/legal/privacy', 'https://www.lemonsqueezy.com/privacy'), 'Paddle Privacy Notice', 'Lemon Squeezy Privacy Policy'), 'https://paddle.net', 'https://app.lemonsqueezy.com/my-orders'), 'paddle.net', 'app.lemonsqueezy.com/my-orders'), 'Paddle.com', 'Lemon Squeezy'), 'Paddle’s', 'Lemon Squeezy’s'), 'Paddle''s', 'Lemon Squeezy''s'), 'Paddle', 'Lemon Squeezy'),
  `excerpt` = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(`excerpt`, 'Paddle provides all customer service inquiries and handles returns.', 'Lemon Squeezy handles payment, tax and billing questions; we handle product support and refunds.'), 'Paddle handles all returns and refunds:', 'Refunds are issued through Lemon Squeezy:'), 'Refunds are handled by Paddle', 'Refunds are issued through Lemon Squeezy'), 'we will arrange it with Paddle', 'we will refund it through Lemon Squeezy'), 'Paddle may refuse refunds where', 'We may refuse refunds where'), 'Paddle shares with us', 'Lemon Squeezy shares with us'), 'the Paddle transaction reference', 'the Lemon Squeezy order reference'), 'depending on what Paddle offers in your country', 'depending on what Lemon Squeezy offers in your country'), 'https://www.paddle.com/legal/checkout-buyer-terms', 'https://www.lemonsqueezy.com/buyer-terms'), 'Paddle Buyer Terms', 'Lemon Squeezy Buyer Terms'), 'https://www.paddle.com/legal/privacy', 'https://www.lemonsqueezy.com/privacy'), 'Paddle Privacy Notice', 'Lemon Squeezy Privacy Policy'), 'https://paddle.net', 'https://app.lemonsqueezy.com/my-orders'), 'paddle.net', 'app.lemonsqueezy.com/my-orders'), 'Paddle.com', 'Lemon Squeezy'), 'Paddle’s', 'Lemon Squeezy’s'), 'Paddle''s', 'Lemon Squeezy''s'), 'Paddle', 'Lemon Squeezy')
WHERE `content` LIKE '%Paddle%' OR `excerpt` LIKE '%Paddle%' OR `content` LIKE '%paddle.%';

UPDATE `faqs` SET `answer` = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(`answer`, 'Paddle provides all customer service inquiries and handles returns.', 'Lemon Squeezy handles payment, tax and billing questions; we handle product support and refunds.'), 'Paddle handles all returns and refunds:', 'Refunds are issued through Lemon Squeezy:'), 'Refunds are handled by Paddle', 'Refunds are issued through Lemon Squeezy'), 'we will arrange it with Paddle', 'we will refund it through Lemon Squeezy'), 'Paddle may refuse refunds where', 'We may refuse refunds where'), 'Paddle shares with us', 'Lemon Squeezy shares with us'), 'the Paddle transaction reference', 'the Lemon Squeezy order reference'), 'depending on what Paddle offers in your country', 'depending on what Lemon Squeezy offers in your country'), 'https://www.paddle.com/legal/checkout-buyer-terms', 'https://www.lemonsqueezy.com/buyer-terms'), 'Paddle Buyer Terms', 'Lemon Squeezy Buyer Terms'), 'https://www.paddle.com/legal/privacy', 'https://www.lemonsqueezy.com/privacy'), 'Paddle Privacy Notice', 'Lemon Squeezy Privacy Policy'), 'https://paddle.net', 'https://app.lemonsqueezy.com/my-orders'), 'paddle.net', 'app.lemonsqueezy.com/my-orders'), 'Paddle.com', 'Lemon Squeezy'), 'Paddle’s', 'Lemon Squeezy’s'), 'Paddle''s', 'Lemon Squeezy''s'), 'Paddle', 'Lemon Squeezy'),
  `question` = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(`question`, 'Paddle provides all customer service inquiries and handles returns.', 'Lemon Squeezy handles payment, tax and billing questions; we handle product support and refunds.'), 'Paddle handles all returns and refunds:', 'Refunds are issued through Lemon Squeezy:'), 'Refunds are handled by Paddle', 'Refunds are issued through Lemon Squeezy'), 'we will arrange it with Paddle', 'we will refund it through Lemon Squeezy'), 'Paddle may refuse refunds where', 'We may refuse refunds where'), 'Paddle shares with us', 'Lemon Squeezy shares with us'), 'the Paddle transaction reference', 'the Lemon Squeezy order reference'), 'depending on what Paddle offers in your country', 'depending on what Lemon Squeezy offers in your country'), 'https://www.paddle.com/legal/checkout-buyer-terms', 'https://www.lemonsqueezy.com/buyer-terms'), 'Paddle Buyer Terms', 'Lemon Squeezy Buyer Terms'), 'https://www.paddle.com/legal/privacy', 'https://www.lemonsqueezy.com/privacy'), 'Paddle Privacy Notice', 'Lemon Squeezy Privacy Policy'), 'https://paddle.net', 'https://app.lemonsqueezy.com/my-orders'), 'paddle.net', 'app.lemonsqueezy.com/my-orders'), 'Paddle.com', 'Lemon Squeezy'), 'Paddle’s', 'Lemon Squeezy’s'), 'Paddle''s', 'Lemon Squeezy''s'), 'Paddle', 'Lemon Squeezy')
WHERE `answer` LIKE '%Paddle%' OR `question` LIKE '%Paddle%';

UPDATE `homepage_sections` SET `content` = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(`content`, 'Paddle provides all customer service inquiries and handles returns.', 'Lemon Squeezy handles payment, tax and billing questions; we handle product support and refunds.'), 'Paddle handles all returns and refunds:', 'Refunds are issued through Lemon Squeezy:'), 'Refunds are handled by Paddle', 'Refunds are issued through Lemon Squeezy'), 'we will arrange it with Paddle', 'we will refund it through Lemon Squeezy'), 'Paddle may refuse refunds where', 'We may refuse refunds where'), 'Paddle shares with us', 'Lemon Squeezy shares with us'), 'the Paddle transaction reference', 'the Lemon Squeezy order reference'), 'depending on what Paddle offers in your country', 'depending on what Lemon Squeezy offers in your country'), 'https://www.paddle.com/legal/checkout-buyer-terms', 'https://www.lemonsqueezy.com/buyer-terms'), 'Paddle Buyer Terms', 'Lemon Squeezy Buyer Terms'), 'https://www.paddle.com/legal/privacy', 'https://www.lemonsqueezy.com/privacy'), 'Paddle Privacy Notice', 'Lemon Squeezy Privacy Policy'), 'https://paddle.net', 'https://app.lemonsqueezy.com/my-orders'), 'paddle.net', 'app.lemonsqueezy.com/my-orders'), 'Paddle.com', 'Lemon Squeezy'), 'Paddle’s', 'Lemon Squeezy’s'), 'Paddle''s', 'Lemon Squeezy''s'), 'Paddle', 'Lemon Squeezy')
WHERE `content` LIKE '%Paddle%';

UPDATE `site_settings` SET `value` = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(`value`, 'Paddle provides all customer service inquiries and handles returns.', 'Lemon Squeezy handles payment, tax and billing questions; we handle product support and refunds.'), 'Paddle handles all returns and refunds:', 'Refunds are issued through Lemon Squeezy:'), 'Refunds are handled by Paddle', 'Refunds are issued through Lemon Squeezy'), 'we will arrange it with Paddle', 'we will refund it through Lemon Squeezy'), 'Paddle may refuse refunds where', 'We may refuse refunds where'), 'Paddle shares with us', 'Lemon Squeezy shares with us'), 'the Paddle transaction reference', 'the Lemon Squeezy order reference'), 'depending on what Paddle offers in your country', 'depending on what Lemon Squeezy offers in your country'), 'https://www.paddle.com/legal/checkout-buyer-terms', 'https://www.lemonsqueezy.com/buyer-terms'), 'Paddle Buyer Terms', 'Lemon Squeezy Buyer Terms'), 'https://www.paddle.com/legal/privacy', 'https://www.lemonsqueezy.com/privacy'), 'Paddle Privacy Notice', 'Lemon Squeezy Privacy Policy'), 'https://paddle.net', 'https://app.lemonsqueezy.com/my-orders'), 'paddle.net', 'app.lemonsqueezy.com/my-orders'), 'Paddle.com', 'Lemon Squeezy'), 'Paddle’s', 'Lemon Squeezy’s'), 'Paddle''s', 'Lemon Squeezy''s'), 'Paddle', 'Lemon Squeezy')
WHERE `value` LIKE '%Paddle%' AND `key` <> 'pay_paddle_enabled';

-- Check: should return 0
SELECT (SELECT COUNT(*) FROM `documentation` WHERE `content` LIKE '%Paddle%' OR `excerpt` LIKE '%Paddle%')
     + (SELECT COUNT(*) FROM `faqs` WHERE `answer` LIKE '%Paddle%')
     + (SELECT COUNT(*) FROM `homepage_sections` WHERE `content` LIKE '%Paddle%') AS paddle_mentions_left;
