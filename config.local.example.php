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
