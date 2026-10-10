-- ============================================================
-- FiveMDepot — 017 Footer tagline: "Premium FiveM Marketplace" -> describes our own store
-- (Paddle does not accept marketplaces; follows 011). Safe to re-run.
-- ============================================================

SET NAMES utf8mb4;

UPDATE `site_settings`
SET `value` = 'Premium FiveM scripts, MLOs, vehicles, clothing and complete server packs.'
WHERE `key` = 'site_tagline' AND `value` LIKE '%arketplace%';
