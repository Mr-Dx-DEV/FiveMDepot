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

// ---- Payments (leave empty to hide a method). Webhook URLs are shown in Admin -> Settings.
// Stripe (cards): Dashboard -> Developers -> API keys / Webhooks. Use sk_test_... while testing.
defined('STRIPE_SECRET_KEY') || define('STRIPE_SECRET_KEY', '');
defined('STRIPE_WEBHOOK_SECRET') || define('STRIPE_WEBHOOK_SECRET', '');   // whsec_...
// NOWPayments (crypto): Settings -> API keys and Settings -> Payments -> IPN secret
defined('NOWPAYMENTS_API_KEY') || define('NOWPAYMENTS_API_KEY', '');
defined('NOWPAYMENTS_IPN_SECRET') || define('NOWPAYMENTS_IPN_SECRET', '');
defined('NOWPAYMENTS_SANDBOX') || define('NOWPAYMENTS_SANDBOX', false);
// SSLCommerz: store ID / password from your merchant panel (sandbox account first)
defined('SSLCZ_STORE_ID') || define('SSLCZ_STORE_ID', '');
defined('SSLCZ_STORE_PASSWORD') || define('SSLCZ_STORE_PASSWORD', '');
defined('SSLCZ_SANDBOX') || define('SSLCZ_SANDBOX', true);

// ---- Email (optional but recommended: emails from PHP mail() often land in spam)
// Plesk: Mail -> create e.g. noreply@your-domain, then use its login here.
// defined('SMTP_HOST') || define('SMTP_HOST', 'mail.your-domain.com');
// defined('SMTP_PORT') || define('SMTP_PORT', 587);          // 587 = STARTTLS, 465 = SSL
// defined('SMTP_USER') || define('SMTP_USER', 'noreply@your-domain.com');
// defined('SMTP_PASS') || define('SMTP_PASS', 'mailbox-password');
