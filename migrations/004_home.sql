-- ============================================================
-- FiveMDepot — 004 Homepage: customer reviews + Discord community sections
-- Run after 003. Safe to re-run. Your existing section order is only changed
-- if it is still the default one.
-- ============================================================

SET NAMES utf8mb4;

INSERT IGNORE INTO `homepage_sections` (`id`, `key`, `title`, `is_enabled`, `sort_order`, `content`) VALUES
('h0000000-0000-0000-0000-000000000010', 'reviews', 'Customer reviews', 1, 8,
 '{"heading":"Loved by server owners","subheading":"Real reviews from verified buyers"}'),
('h0000000-0000-0000-0000-000000000011', 'community', 'Discord community', 1, 11,
 '{"heading":"Join the FiveMDepot community","text":"Get support, early access to new releases, giveaways and help from other server owners.","button":"Join our Discord"}');

-- keep About and FAQ after the reviews when the default order is still in place
UPDATE `homepage_sections` SET `sort_order` = 9 WHERE `key` = 'about' AND `sort_order` = 8;
UPDATE `homepage_sections` SET `sort_order` = 10 WHERE `key` = 'faq' AND `sort_order` = 9;

-- New / Free now live as tabs inside the product showcase; hide the duplicate rows
-- (only if 004 has not run before — re-enable them any time in Admin -> Homepage)
UPDATE `homepage_sections` SET `is_enabled` = 0
WHERE `key` IN ('new', 'free') AND NOT EXISTS (SELECT 1 FROM `migrations` WHERE `name` = '004_home');

INSERT IGNORE INTO `migrations` (`name`) VALUES ('004_home');
