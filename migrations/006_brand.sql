-- ============================================================
-- FiveMDepot — 006 Brand colour + new hero + "Everything you need" features section
-- Run after 005. Safe to re-run. Your own homepage texts are never overwritten
-- (the hero is only updated while it still has the original default headline).
-- ============================================================

SET NAMES utf8mb4;

INSERT IGNORE INTO `site_settings` (`id`, `key`, `value`, `description`) VALUES
('s0000000-0000-0000-0000-000000000050', 'brand_color', 'crimson', 'Brand colour: crimson, orange, blue, green or purple'),
('s0000000-0000-0000-0000-000000000051', 'discord_server_name', '', 'Name shown on the Discord card (optional)');

-- New-style hero (only if the hero still has the first default headline)
UPDATE `homepage_sections`
SET `content` = '{"badge":"Premium Marketplace Now Live","headline":"*FiveM* Premium|*Scripts*, MLOs &|Server Packs","subtitle":"**Since 2024** — the **trusted** FiveM marketplace for QBCore, ESX and QBox: server packs, jobs, MLO maps, vehicles, clothing and more.","checks":["100% Legal","Instant Download","Lifetime Updates"],"primary_text":"Explore Marketplace","primary_link":"category.html?c=all","secondary_text":"View Server Packs","secondary_link":"server-packs.html","discord_text":"Live support, update alerts and a community of server owners."}'
WHERE `key` = 'hero' AND `content` LIKE '%The Trusted FiveM Marketplace%';

-- "Everything you need" features grid, placed right after the categories
UPDATE `homepage_sections` SET `sort_order` = `sort_order` + 1
WHERE `sort_order` >= 4 AND NOT EXISTS (SELECT 1 FROM `migrations` WHERE `name` = '006_brand');

INSERT IGNORE INTO `homepage_sections` (`id`, `key`, `title`, `is_enabled`, `sort_order`, `content`) VALUES
('h0000000-0000-0000-0000-000000000012', 'features', 'Why our resources', 1, 4,
 '{"heading":"Everything You Need to Build *Epic* FiveM Servers","subheading":"Our premium resources are built with performance, security, and configurability at their core.","items":[{"icon":"users","title":"Player Management","text":"Character creation, multi-characters, jobs and seamless player data handling."},{"icon":"database","title":"Database Integration","text":"Optimised oxmysql queries for zero data loss and lightning-fast load times."},{"icon":"zap","title":"Event System","text":"Secure client-server events that prevent exploits and stay in sync."},{"icon":"shield","title":"Anti-Cheat Ready","text":"Security first: server-side checks on every critical action."},{"icon":"activity","title":"High Performance","text":"Resources idle at 0.00ms — optimised loops, rendering and distance checks."},{"icon":"sliders","title":"Highly Configurable","text":"Clean config files for economy, translations and features — no code edits."},{"icon":"globe","title":"Multi Language","text":"Locale support so you can translate everything to your language."},{"icon":"layers","title":"Plug & Play","text":"Drag-and-drop resources that fit the standard QBCore, ESX and QBox ecosystem."}]}');

INSERT IGNORE INTO `migrations` (`name`) VALUES ('006_brand');
