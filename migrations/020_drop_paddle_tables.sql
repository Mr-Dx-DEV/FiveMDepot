-- FiveMDepot — 020 (OPTIONAL) remove what is left of Paddle. Run it yourself, only after 019 and once
-- Lemon Squeezy works. It permanently deletes the old Paddle tables, which only held Paddle test data
-- (Paddle never took a live payment). Back up the database first (phpMyAdmin -> Export).
-- Payment history in `payment_events` and `orders` is kept.
-- phpMyAdmin: select the fivemdepot database -> SQL tab -> paste this file -> Go.

DROP TABLE IF EXISTS `paddle_customers`;
DROP TABLE IF EXISTS `subscriptions`;
DELETE FROM `site_settings` WHERE `key` = 'pay_paddle_enabled';
