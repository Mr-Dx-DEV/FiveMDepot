-- ============================================================
-- FiveMDepot — 011 Store wording: FiveMDepot sells its own products, it is not a marketplace
-- (Paddle does not accept marketplaces). Also hides the test products. Safe to re-run.
-- ============================================================

SET NAMES utf8mb4;

UPDATE `homepage_sections` SET `content` = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(`content`,
  'Premium Marketplace Now Live', 'Made in-house · Instant download'),
  'the **trusted** FiveM marketplace', '**our own** FiveM resources'),
  'Explore Marketplace', 'Browse the store'),
  '100% Legal', 'Secure checkout'),
  'marketplace', 'store')
WHERE `key` = 'hero';

UPDATE `homepage_sections`
SET `content` = '{"heading":"About FiveMDepot","body":"FiveMDepot is the official store for resources we make ourselves: complete server packs, job and economy scripts, MLO interiors, vehicle packs and clothing for QBCore, ESX and QBox servers. Every product is built and tested by our team, delivered instantly and updated for free."}'
WHERE `key` = 'about';

-- Test products created while building the store
UPDATE `products` SET `status` = 'DRAFT' WHERE `slug` IN ('sdfs', 'gnvnv');

INSERT IGNORE INTO `migrations` (`name`) VALUES ('011_store_wording');
