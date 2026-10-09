-- ============================================================
-- FiveMDepot — 012 Product images moved from uploads/products/ to images/products/
-- (images/ is part of the site files, so the pictures deploy together with the code).
-- Only touches the imported catalogue. Safe to re-run.
-- ============================================================

SET NAMES utf8mb4;

UPDATE `products` SET `screenshots` = REPLACE(`screenshots`, 'uploads/products/', 'images/products/')
WHERE `id` LIKE 'p0000000-0000-0000-0000-%';

INSERT IGNORE INTO `migrations` (`name`) VALUES ('012_product_images');
