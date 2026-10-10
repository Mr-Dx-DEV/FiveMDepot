-- FiveMDepot — 017 Footer tagline without "marketplace" (Paddle does not accept marketplaces). Safe to re-run.
-- phpMyAdmin: select the fivemdepot database -> SQL tab -> paste this file -> Go.
UPDATE `site_settings` SET `value` = 'Premium FiveM scripts, MLOs, vehicles, clothing and complete server packs.' WHERE `key` = 'site_tagline';
