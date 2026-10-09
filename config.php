<?php
/**
 * FiveMDepot — Configuration
 *
 * This file is in Git: never put passwords or keys here.
 * Secrets go in config.local.php (not in Git) — copy config.local.example.php to create it.
 */

// === Paddle settings from environment variables (see .env.example) — these win over config.local.php ===
foreach (['PADDLE_ENVIRONMENT', 'PADDLE_CLIENT_TOKEN', 'PADDLE_API_KEY', 'PADDLE_WEBHOOK_SECRET'] as $k) {
  $v = getenv($k);
  if ($v !== false && $v !== '' && !defined($k)) define($k, $v);
}

// === Database (MariaDB) ===
// Real credentials live in config.local.php (not in git). Copy config.local.example.php to create it.
if (is_file(__DIR__ . '/config.local.php')) {
  require_once __DIR__ . '/config.local.php';
}
defined('DB_HOST') || define('DB_HOST', 'localhost:3306');
defined('DB_NAME') || define('DB_NAME', 'fivemdepot');
defined('DB_USER') || define('DB_USER', 'fivemdepot');
if (!defined('DB_PASS')) {
  // No default on purpose: the password must come from config.local.php
  error_log('[config] DB_PASS is not set — add it to config.local.php');
  define('DB_PASS', '');
}
define('DB_CHARSET', 'utf8mb4');

// === Site ===
define('SITE_NAME', 'FiveMDepot');
define('SITE_URL', 'https://fivemdepot.com');
define('SITE_EMAIL', 'fivemdepot@gmail.com');

// === Session ===
define('SESSION_LIFETIME', 86400); // 24 hours in seconds
define('SESSION_NAME', 'fivemdepot_session');

// === Upload Limits ===
define('MAX_UPLOAD_SIZE', 5242880); // 5MB
define('ALLOWED_UPLOAD_TYPES', ['image/jpeg','image/png','image/webp','application/zip']);

// === Security ===
define('CSRF_TOKEN_LENGTH', 32);
define('PASSWORD_MIN_LENGTH', 8);
define('MAX_LOGIN_ATTEMPTS', 5);
define('LOGIN_LOCKOUT_TIME', 900); // 15 minutes

// === Error Reporting (disable in production) ===
// error_reporting(E_ALL);
// ini_set('display_errors', 1);
