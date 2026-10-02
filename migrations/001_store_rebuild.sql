-- ============================================================
-- FiveMDepot — 001 Store Rebuild (categories, tags, server packs,
-- homepage builder, FAQ)
--
-- HOW TO RUN: phpMyAdmin → select your fivemdepot database →
--   Import (or SQL tab) → run this whole file.
--
-- SAFE: does not delete any data or columns. Safe to run more than
-- once (everything is IF NOT EXISTS / INSERT IGNORE).
-- Old columns products.category / products.tags / products.category_id
-- are kept so the current site keeps working; a later migration
-- removes them after the new code is live.
--
-- Requires MariaDB 10.2+ (Plesk default is fine).
-- BACK UP YOUR DATABASE FIRST (phpMyAdmin → Export).
-- ============================================================

SET NAMES utf8mb4;

-- ------------------------------------------------------------
-- 0. Migration tracking
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `migrations` (
  `name` VARCHAR(150) NOT NULL,
  `applied_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 1. Columns from the earlier premium upgrade (in case missing)
-- ------------------------------------------------------------
ALTER TABLE `products`
  ADD COLUMN IF NOT EXISTS `video_url` TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `changelog` TEXT DEFAULT NULL;

ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `newsletter_opt_in` TINYINT(1) NOT NULL DEFAULT '0';

-- ------------------------------------------------------------
-- 2. Categories: sub-categories, banner, SEO, nav
-- ------------------------------------------------------------
ALTER TABLE `categories`
  ADD COLUMN IF NOT EXISTS `parent_id` VARCHAR(36) DEFAULT NULL AFTER `id`,
  ADD COLUMN IF NOT EXISTS `banner_url` VARCHAR(500) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `seo_title` VARCHAR(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `seo_description` VARCHAR(500) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `show_in_nav` TINYINT(1) NOT NULL DEFAULT '0',
  ADD COLUMN IF NOT EXISTS `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  ADD INDEX IF NOT EXISTS `idx_parent` (`parent_id`);

ALTER TABLE `categories`
  ADD CONSTRAINT `fk_categories_parent` FOREIGN KEY IF NOT EXISTS (`parent_id`)
  REFERENCES `categories`(`id`) ON DELETE RESTRICT;

-- ------------------------------------------------------------
-- 3. Tags
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `tag_groups` (
  `id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `slug` VARCHAR(100) NOT NULL,
  `show_as_filter` TINYINT(1) NOT NULL DEFAULT '1',
  `sort_order` INT NOT NULL DEFAULT '0',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tags` (
  `id` VARCHAR(36) NOT NULL,
  `group_id` VARCHAR(36) DEFAULT NULL,
  `name` VARCHAR(100) NOT NULL,
  `slug` VARCHAR(100) NOT NULL,
  `color` VARCHAR(20) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_slug` (`slug`),
  KEY `idx_group` (`group_id`),
  CONSTRAINT `fk_tags_group` FOREIGN KEY (`group_id`) REFERENCES `tag_groups`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Category owns tags: products with any of these tags appear in the category
CREATE TABLE IF NOT EXISTS `category_tags` (
  `category_id` VARCHAR(36) NOT NULL,
  `tag_id` VARCHAR(36) NOT NULL,
  PRIMARY KEY (`category_id`, `tag_id`),
  KEY `idx_tag` (`tag_id`),
  CONSTRAINT `fk_ct_category` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ct_tag` FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `product_tags` (
  `product_id` VARCHAR(36) NOT NULL,
  `tag_id` VARCHAR(36) NOT NULL,
  PRIMARY KEY (`product_id`, `tag_id`),
  KEY `idx_tag` (`tag_id`),
  CONSTRAINT `fk_pt_product` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pt_tag` FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 4. Products: type, sale price, SEO, server pack data
-- ------------------------------------------------------------
ALTER TABLE `products`
  ADD COLUMN IF NOT EXISTS `type` ENUM('standard','server_pack') NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS `sale_price` DECIMAL(10,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `seo_title` VARCHAR(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `seo_description` VARCHAR(500) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `reject_reason` TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `pack_meta` LONGTEXT DEFAULT NULL COMMENT 'JSON: resources[], resmon_idle_ms, frameworks[], features[], lifetime_updates',
  ADD INDEX IF NOT EXISTS `idx_type_status` (`type`, `status`);

-- ------------------------------------------------------------
-- 5. Documentation: blog / tutorial / tool / doc
-- ------------------------------------------------------------
ALTER TABLE `documentation`
  ADD COLUMN IF NOT EXISTS `type` ENUM('blog','tutorial','tool','doc') NOT NULL DEFAULT 'doc',
  ADD COLUMN IF NOT EXISTS `excerpt` VARCHAR(500) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `is_published` TINYINT(1) NOT NULL DEFAULT '1',
  ADD INDEX IF NOT EXISTS `idx_type` (`type`);

-- ------------------------------------------------------------
-- 6. Homepage builder + FAQ
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `homepage_sections` (
  `id` VARCHAR(36) NOT NULL,
  `key` VARCHAR(50) NOT NULL,
  `title` VARCHAR(150) NOT NULL,
  `is_enabled` TINYINT(1) NOT NULL DEFAULT '1',
  `sort_order` INT NOT NULL DEFAULT '0',
  `content` LONGTEXT DEFAULT NULL COMMENT 'JSON settings for this section',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `faqs` (
  `id` VARCHAR(36) NOT NULL,
  `question` VARCHAR(500) NOT NULL,
  `answer` TEXT NOT NULL,
  `sort_order` INT NOT NULL DEFAULT '0',
  `is_active` TINYINT(1) NOT NULL DEFAULT '1',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_active_order` (`is_active`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- SEED DATA
-- ============================================================

-- Tag groups (become shop filters)
INSERT IGNORE INTO `tag_groups` (`id`, `name`, `slug`, `show_as_filter`, `sort_order`) VALUES
('g0000000-0000-0000-0000-000000000001', 'Type',      'type',      1, 1),
('g0000000-0000-0000-0000-000000000002', 'Framework', 'framework', 1, 2),
('g0000000-0000-0000-0000-000000000003', 'Pricing',   'pricing',   1, 3);

-- Core tags
INSERT IGNORE INTO `tags` (`id`, `group_id`, `name`, `slug`, `color`) VALUES
('t0000000-0000-0000-0000-000000000001', 'g0000000-0000-0000-0000-000000000001', 'Script',      'script',      '#f97316'),
('t0000000-0000-0000-0000-000000000002', 'g0000000-0000-0000-0000-000000000001', 'MLO',         'mlo',         '#22c55e'),
('t0000000-0000-0000-0000-000000000003', 'g0000000-0000-0000-0000-000000000001', 'Map',         'map',         '#14b8a6'),
('t0000000-0000-0000-0000-000000000004', 'g0000000-0000-0000-0000-000000000001', 'Vehicle',     'vehicle',     '#3b82f6'),
('t0000000-0000-0000-0000-000000000005', 'g0000000-0000-0000-0000-000000000001', 'Clothing',    'clothing',    '#ec4899'),
('t0000000-0000-0000-0000-000000000006', 'g0000000-0000-0000-0000-000000000001', 'Server Pack', 'server-pack', '#eab308'),
('t0000000-0000-0000-0000-000000000007', 'g0000000-0000-0000-0000-000000000001', 'UI',          'ui',          '#a855f7'),
('t0000000-0000-0000-0000-000000000011', 'g0000000-0000-0000-0000-000000000002', 'QBCore',      'qbcore',      '#ef4444'),
('t0000000-0000-0000-0000-000000000012', 'g0000000-0000-0000-0000-000000000002', 'ESX',         'esx',         '#0ea5e9'),
('t0000000-0000-0000-0000-000000000013', 'g0000000-0000-0000-0000-000000000002', 'QBox',        'qbox',        '#8b5cf6'),
('t0000000-0000-0000-0000-000000000014', 'g0000000-0000-0000-0000-000000000002', 'Standalone',  'standalone',  '#64748b'),
('t0000000-0000-0000-0000-000000000021', 'g0000000-0000-0000-0000-000000000003', 'Free',        'free',        '#10b981');

-- Categories (existing ones are kept; INSERT IGNORE skips slugs that exist)
INSERT IGNORE INTO `categories` (`id`, `name`, `slug`, `icon`, `description`, `order`, `show_in_nav`) VALUES
('c0000000-0000-0000-0000-000000000010', 'Complete Server Pack', 'server-packs', '&#128230;', 'Ready-to-launch FiveM server packs with hundreds of optimized systems.', 0, 1),
('c0000000-0000-0000-0000-000000000001', 'Scripts',              'scripts',      '&#128187;', 'Jobs, economy, UI, police, EMS and more.', 1, 1),
('c0000000-0000-0000-0000-000000000011', 'Clothes',              'clothing',     '&#128085;', 'EUP, streetwear and custom clothing packs.', 2, 1),
('c0000000-0000-0000-0000-000000000003', 'Vehicles',             'vehicles',     '&#128663;', 'Optimized add-on and replace vehicles.', 3, 1),
('c0000000-0000-0000-0000-000000000002', 'Maps & MLOs',          'mlos-maps',    '&#127960;', 'Interiors, MLOs and map edits.', 4, 1),
('c0000000-0000-0000-0000-000000000012', 'Free Assets',          'free-assets',  '&#127873;', 'Free scripts, maps and vehicles.', 9, 0);

-- Put the main categories in the top menu (keeps your custom names)
UPDATE `categories` SET `show_in_nav` = 1
WHERE `slug` IN ('server-packs', 'scripts', 'clothing', 'vehicles', 'mlos-maps');

-- Which tags each category owns (auto-categorization)
INSERT IGNORE INTO `category_tags` (`category_id`, `tag_id`)
SELECT c.id, t.id FROM `categories` c JOIN `tags` t ON
     (c.slug = 'scripts'      AND t.slug = 'script')
  OR (c.slug = 'mlos-maps'    AND t.slug IN ('mlo', 'map'))
  OR (c.slug = 'maps'         AND t.slug = 'map')
  OR (c.slug = 'vehicles'     AND t.slug = 'vehicle')
  OR (c.slug = 'clothing'     AND t.slug = 'clothing')
  OR (c.slug = 'server-packs' AND t.slug = 'server-pack')
  OR (c.slug = 'ui-packs'     AND t.slug = 'ui')
  OR (c.slug = 'free-assets'  AND t.slug = 'free');

-- ============================================================
-- DATA MIGRATION: old product category/tags → new tag system
-- ============================================================

-- a) Old type (SCRIPT / MLO / VEHICLE) → type tag
INSERT IGNORE INTO `product_tags` (`product_id`, `tag_id`)
SELECT p.id, t.id FROM `products` p
JOIN `tags` t ON t.slug = CASE p.category
  WHEN 'SCRIPT'  THEN 'script'
  WHEN 'MLO'     THEN 'mlo'
  WHEN 'VEHICLE' THEN 'vehicle'
END;

-- b) Free products → "free" tag
INSERT IGNORE INTO `product_tags` (`product_id`, `tag_id`)
SELECT p.id, t.id FROM `products` p JOIN `tags` t ON t.slug = 'free'
WHERE p.price = 0;

-- c) Old JSON tags (e.g. ["police","qbcore"]) → real tags
CREATE TABLE IF NOT EXISTS `_seq` (`n` INT NOT NULL PRIMARY KEY) ENGINE=InnoDB;
INSERT IGNORE INTO `_seq` (`n`)
SELECT a.n + b.n * 8 FROM
  (SELECT 0 n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7) a
  CROSS JOIN
  (SELECT 0 n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7) b;

CREATE TABLE IF NOT EXISTS `_old_tags` (
  `product_id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `slug` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`product_id`, `slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `_old_tags` (`product_id`, `name`, `slug`)
SELECT x.product_id, LEFT(x.name, 100),
       LEFT(LOWER(REPLACE(REPLACE(REPLACE(x.name, '#', ''), '_', '-'), ' ', '-')), 100)
FROM (
  SELECT p.id AS product_id,
         TRIM(JSON_UNQUOTE(JSON_EXTRACT(p.tags, CONCAT('$[', s.n, ']')))) AS name
  FROM `products` p
  JOIN `_seq` s ON s.n < JSON_LENGTH(p.tags)
  WHERE p.tags IS NOT NULL AND JSON_VALID(p.tags)
) x
WHERE x.name IS NOT NULL AND x.name <> '' AND x.name <> 'null';

-- create any tags that don't exist yet (no group; organize later in admin)
INSERT IGNORE INTO `tags` (`id`, `name`, `slug`)
SELECT UUID(), MIN(o.name), o.slug FROM `_old_tags` o
WHERE o.slug <> ''
GROUP BY o.slug;

INSERT IGNORE INTO `product_tags` (`product_id`, `tag_id`)
SELECT o.product_id, t.id FROM `_old_tags` o JOIN `tags` t ON t.slug = o.slug;

DROP TABLE IF EXISTS `_old_tags`;
DROP TABLE IF EXISTS `_seq`;

-- ============================================================
-- Homepage sections (edit later in Admin → Homepage builder)
-- ============================================================
INSERT IGNORE INTO `homepage_sections` (`id`, `key`, `title`, `is_enabled`, `sort_order`, `content`) VALUES
('h0000000-0000-0000-0000-000000000001', 'hero', 'Hero', 1, 1,
 '{"badge":"Premium Marketplace Now Live","headline":"The Trusted FiveM Marketplace","subtitle":"Premium scripts, MLOs, vehicles, clothing and complete server packs for QBCore, ESX and QBox.","primary_text":"Explore Marketplace","primary_link":"/shop.html","secondary_text":"View Server Packs","secondary_link":"/category/server-packs"}'),
('h0000000-0000-0000-0000-000000000002', 'trust', 'Trust stats', 1, 2,
 '{"items":[{"value":"4.9/5","label":"Customer rating"},{"value":"10K+","label":"Discord members"},{"value":"98%","label":"Satisfaction rate"},{"value":"500+","label":"Premium resources"}]}'),
('h0000000-0000-0000-0000-000000000003', 'categories', 'Shop by category', 1, 3,
 '{"heading":"Shop by Category","subheading":"Everything you need to build your server"}'),
('h0000000-0000-0000-0000-000000000004', 'featured', 'Featured products', 1, 4,
 '{"heading":"Featured Resources","limit":8}'),
('h0000000-0000-0000-0000-000000000005', 'server_pack', 'Server pack showcase', 1, 5,
 '{"heading":"Complete Server Packs","subheading":"Launch a full server in minutes","stats":[{"value":"400+","label":"Systems included"},{"value":"0.4-0.6ms","label":"Idle resmon"}],"benefits":["Lifetime Access","No Hidden Fees","Free Updates","Setup Support"],"cta_text":"View Server Packs","cta_link":"/category/server-packs"}'),
('h0000000-0000-0000-0000-000000000006', 'new', 'New releases', 1, 6,
 '{"heading":"New Releases","limit":8}'),
('h0000000-0000-0000-0000-000000000007', 'free', 'Free assets', 1, 7,
 '{"heading":"Free Assets","limit":4}'),
('h0000000-0000-0000-0000-000000000008', 'about', 'About', 1, 8,
 '{"heading":"About FiveMDepot","body":"FiveMDepot serves FiveM server owners running QBCore, ESX, QBox or hybrid setups, with complete server packs, job and economy scripts, MLO interiors, vehicle packs and clothing."}'),
('h0000000-0000-0000-0000-000000000009', 'faq', 'FAQ', 1, 9,
 '{"heading":"Frequently Asked Questions"}');

INSERT IGNORE INTO `faqs` (`id`, `question`, `answer`, `sort_order`) VALUES
('f0000000-0000-0000-0000-000000000001', 'How do I receive my purchase?', 'After your payment is verified, the download becomes available in your dashboard under My Purchases.', 1),
('f0000000-0000-0000-0000-000000000002', 'Which payment methods do you accept?', 'bKash, Nagad and bank transfer. Upload your payment proof at checkout and we verify it quickly.', 2),
('f0000000-0000-0000-0000-000000000003', 'Do resources work with QBCore and ESX?', 'Each product lists its supported frameworks (QBCore, ESX, QBox or standalone) on the product page.', 3),
('f0000000-0000-0000-0000-000000000004', 'Do I get updates?', 'Yes. Updates for purchased resources are free and appear in your dashboard.', 4),
('f0000000-0000-0000-0000-000000000005', 'Can I get help installing?', 'Yes. Every product includes install instructions, and support is available on our Discord.', 5),
('f0000000-0000-0000-0000-000000000006', 'Are the resources optimized?', 'Resources are reviewed before publishing and must run at low idle resmon.', 6);

-- Social links (used in the header/footer)
INSERT IGNORE INTO `site_settings` (`id`, `key`, `value`, `description`) VALUES
('s0000000-0000-0000-0000-000000000020', 'social_discord', '', 'Discord invite URL'),
('s0000000-0000-0000-0000-000000000021', 'social_github',  '', 'GitHub URL'),
('s0000000-0000-0000-0000-000000000022', 'social_youtube', '', 'YouTube URL'),
('s0000000-0000-0000-0000-000000000023', 'since_year',     '2024', 'Year shown in footer badge');

INSERT IGNORE INTO `migrations` (`name`) VALUES ('001_store_rebuild');

-- ============================================================
-- CHECK (optional): every product should have at least 1 tag.
-- Run this after; it should return 0 rows:
--   SELECT id, title FROM products
--   WHERE id NOT IN (SELECT product_id FROM product_tags);
-- ============================================================
