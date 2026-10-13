<?php
/**
 * FiveMDepot — EXAMPLE — copy to config.local.php and fill in
 * Upload this file to the server next to config.php.
 */
defined('DB_HOST') || define('DB_HOST', 'localhost:3306');
defined('DB_NAME') || define('DB_NAME', 'fivemdepot');
defined('DB_USER') || define('DB_USER', 'fivemdepot');
defined('DB_PASS') || define('DB_PASS', 'your-database-password');

// Optional: "Continue with Google" — create an OAuth client (Web application) in Google Cloud Console
// and add the redirect URI  https://YOUR-DOMAIN/api/google-callback.php
defined('GOOGLE_CLIENT_ID') || define('GOOGLE_CLIENT_ID', '');
defined('GOOGLE_CLIENT_SECRET') || define('GOOGLE_CLIENT_SECRET', '');

// ---- Discord sign-in (optional): discord.com/developers/applications -> New Application -> OAuth2
// Copy the Client ID + Client Secret and add the redirect  https://YOUR-DOMAIN/api/discord-callback.php
defined('DISCORD_CLIENT_ID') || define('DISCORD_CLIENT_ID', '');
defined('DISCORD_CLIENT_SECRET') || define('DISCORD_CLIENT_SECRET', '');

// ---- Payments: Lemon Squeezy (Merchant of Record). Leave the key empty to hide checkout.
// Full setup: docs/LEMONSQUEEZY.md. Plan variant IDs (monthly / yearly) go in core/plans.php.
// Test mode first: create a TEST API key and test products, keep LEMONSQUEEZY_TEST_MODE = true.
// Webhook: Settings -> Webhooks -> https://YOUR-DOMAIN/api/pay/lemonsqueezy-webhook.php
//   events: order_created, order_refunded, subscription_created, subscription_updated, subscription_cancelled,
//   subscription_resumed, subscription_expired, subscription_paused, subscription_unpaused
defined('LEMONSQUEEZY_TEST_MODE') || define('LEMONSQUEEZY_TEST_MODE', true);          // false once the store is activated (live key)
defined('LEMONSQUEEZY_API_KEY') || define('LEMONSQUEEZY_API_KEY', '');                // server only — never sent to the browser
defined('LEMONSQUEEZY_STORE_ID') || define('LEMONSQUEEZY_STORE_ID', '');              // Settings -> Stores (the number)
defined('LEMONSQUEEZY_WEBHOOK_SECRET') || define('LEMONSQUEEZY_WEBHOOK_SECRET', '');  // the signing secret you typed for the webhook
defined('LEMONSQUEEZY_ORDER_VARIANT_ID') || define('LEMONSQUEEZY_ORDER_VARIANT_ID', ''); // variant of the one "FiveMDepot order" product (store items)

// ---- Email (optional but recommended: emails from PHP mail() often land in spam)
// Plesk: Mail -> create e.g. noreply@your-domain, then use its login here.
// defined('SMTP_HOST') || define('SMTP_HOST', 'mail.your-domain.com');
// defined('SMTP_PORT') || define('SMTP_PORT', 587);          // 587 = STARTTLS, 465 = SSL
// defined('SMTP_USER') || define('SMTP_USER', 'noreply@your-domain.com');
// defined('SMTP_PASS') || define('SMTP_PASS', 'mailbox-password');
