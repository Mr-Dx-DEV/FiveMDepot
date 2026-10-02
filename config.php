<?php
/**
 * FiveMDepot — Configuration
 *
 * IMPORTANT: Fill in your database credentials below.
 * This file must NOT be committed to Git with real credentials.
 */

// === Database (MariaDB) ===
define('DB_HOST', 'localhost:3306');
define('DB_NAME', 'fivemdepot');
define('DB_USER', 'fivemdepot');       // Change to your database username
define('DB_PASS', 'FIVVEM@22316');           // Change to your database password
define('DB_CHARSET', 'utf8mb4');

// === Site ===
define('SITE_NAME', 'FiveMDepot');
define('SITE_URL', 'https://fivemdepot.com');
define('SITE_EMAIL', 'info@fivemdepot.com');

// === Session ===
define('SESSION_LIFETIME', 86400); // 24 hours in seconds
define('SESSION_NAME', 'fivemdepot_session');

// === Payment Settings (configurable via admin panel later) ===
define('PAYMENT_BKASH_NUMBER', '01XXXXXXXXX');
define('PAYMENT_NAGAD_NUMBER', '01XXXXXXXXX');
define('PAYMENT_BANK_NAME', 'DBBL');
define('PAYMENT_BANK_ACCOUNT', '0000000000000');
define('PAYMENT_BANK_BRANCH', 'Dhaka');

// === Upload Limits ===
define('MAX_UPLOAD_SIZE', 5242880); // 5MB
define('ALLOWED_UPLOAD_TYPES', ['image/jpeg','image/png','image/webp','application/zip']);

// === Security ===
define('CSRF_TOKEN_LENGTH', 32);
define('PASSWORD_MIN_LENGTH', 6);
define('MAX_LOGIN_ATTEMPTS', 5);
define('LOGIN_LOCKOUT_TIME', 900); // 15 minutes

// === Error Reporting (disable in production) ===
// error_reporting(E_ALL);
// ini_set('display_errors', 1);
