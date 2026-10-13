-- FiveMDepot — 018 Paddle domain review clean-up. Safe to re-run; nothing is deleted.
-- Paddle's Acceptable Use Policy bans products that infringe others' rights. Product names must not use
-- other people's brands (NoPixel, iPhone/iOS, WhatsApp, App Store), and in-game "fake ID / forgery" and
-- "vape" items read as prohibited goods to a reviewer.
-- phpMyAdmin: select the fivemdepot database -> SQL tab -> paste this file -> Go.

SET NAMES utf8mb4;

-- 1. Hide (Draft) — buyers who already own them keep access. Set back to Published in Admin -> Products if Paddle approves them.
UPDATE `products` SET `status` = 'DRAFT', `featured` = 0
WHERE `slug` IN ('nopixel-4-clone-full-qbcore-rp-server', 'qbcore-fake-id-card-qb-forgery', 'qb-vape');

-- 2. Remove third-party brand names from titles, descriptions, features and SEO text
UPDATE `products` SET
  `title` = 'Custom QBUS Server with Monthly Updates',
  `description` = REPLACE(`description`, ' inspired by NoPixel 4.0', ''),
  `seo_title` = NULLIF(REPLACE(REPLACE(COALESCE(`seo_title`, ''), ' (NoPixel 4.0 Inspired)', ''), 'NoPixel 4.0', ''), ''),
  `seo_description` = NULLIF(REPLACE(COALESCE(`seo_description`, ''), ' inspired by NoPixel 4.0', ''), '')
WHERE `slug` = 'custom-qbus-server-monthly-updates';

UPDATE `products` SET
  `title` = 'Clean Manor Mansion MLO (Updated)',
  `description` = REPLACE(`description`, 'updated in the NoPixel 4.0 style', 'freshly updated'),
  `seo_title` = NULLIF(REPLACE(COALESCE(`seo_title`, ''), ' (NoPixel 4.0 Updated)', ' (Updated)'), ''),
  `seo_description` = NULLIF(REPLACE(COALESCE(`seo_description`, ''), 'updated in the NoPixel 4.0 style', 'freshly updated'), '')
WHERE `slug` = 'clean-manor-mansion-mlo';

UPDATE `products` SET
  `title` = '[QBCore/ESX] SmartPhone – Open Source',
  `seo_title` = NULLIF(REPLACE(COALESCE(`seo_title`, ''), ' (iPhone 14 Inspired)', ''), '')
WHERE `slug` = 'qbcore-esx-smartphone-open-source';

UPDATE `products` SET
  `title` = 'QBCore Phone – Modern Smartphone UI (Open Source)',
  `description` = REPLACE(`description`, 'in an iOS 16 style', 'with a modern smartphone design'),
  `features` = REPLACE(REPLACE(REPLACE(`features`, 'iOS 16 style design', 'Modern smartphone design'),
                 'App Store with sound effects', 'app store with sound effects'), 'WhatsApp-style messaging', 'chat messaging'),
  `seo_title` = NULLIF(REPLACE(COALESCE(`seo_title`, ''), ' (iPhone 13 Pro Max Style)', ''), ''),
  `seo_description` = NULLIF(REPLACE(COALESCE(`seo_description`, ''), 'in an iOS 16 style', 'with a modern smartphone design'), '')
WHERE `slug` = 'qbcore-phone-13-pro-max-open-source';

-- 3. Any other published text still naming NoPixel (e.g. pack features)
UPDATE `products` SET
  `features` = REPLACE(REPLACE(`features`, 'NoPixel 4.0 styled UI', 'Custom styled UI'), 'NoPixel 4.0 ', ''),
  `pack_meta` = REPLACE(REPLACE(`pack_meta`, 'NoPixel 4.0 styled UI', 'Custom styled UI'), 'NoPixel 4.0 ', '')
WHERE `status` = 'PUBLISHED' AND (`features` LIKE '%NoPixel%' OR `pack_meta` LIKE '%NoPixel%');

-- Check: should return no rows
SELECT `slug`, `title` FROM `products`
WHERE `status` = 'PUBLISHED' AND CONCAT_WS(' ', `title`, `description`, `features`, `seo_title`, `seo_description`, `pack_meta`)
  REGEXP 'nopixel|iphone|ios 16|whatsapp|forg|fake id|vape';
