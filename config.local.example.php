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

// ---- Payments: Paddle Billing (Merchant of Record). Leave empty to hide checkout.
// Paddle -> Developer tools -> Authentication: API key (server side) + client-side token.
// Paddle -> Developer tools -> Notifications -> New destination: https://YOUR-DOMAIN/api/pay/paddle-webhook.php
//   events transaction.completed, adjustment.created, adjustment.updated -> copy its secret key here.
// Test with a sandbox account first (sandbox-vendors.paddle.com): its API key contains "_sdbx_" and the client token starts with "test_".
defined('PADDLE_API_KEY') || define('PADDLE_API_KEY', '');
defined('PADDLE_CLIENT_TOKEN') || define('PADDLE_CLIENT_TOKEN', '');
defined('PADDLE_WEBHOOK_SECRET') || define('PADDLE_WEBHOOK_SECRET', '');   // pdl_ntfset_...
// defined('PADDLE_SANDBOX') || define('PADDLE_SANDBOX', true);            // optional: force sandbox/live

// ---- Email (optional but recommended: emails from PHP mail() often land in spam)
// Plesk: Mail -> create e.g. noreply@your-domain, then use its login here.
// defined('SMTP_HOST') || define('SMTP_HOST', 'mail.your-domain.com');
// defined('SMTP_PORT') || define('SMTP_PORT', 587);          // 587 = STARTTLS, 465 = SSL
// defined('SMTP_USER') || define('SMTP_USER', 'noreply@your-domain.com');
// defined('SMTP_PASS') || define('SMTP_PASS', 'mailbox-password');
