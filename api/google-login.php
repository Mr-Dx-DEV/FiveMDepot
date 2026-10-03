<?php
/**
 * Start "Continue with Google": redirect to Google's consent screen.
 *   api/google-login.php?next=checkout.html
 */
require_once __DIR__ . '/../core/bootstrap.php';
require_once __DIR__ . '/../core/google.php';

$root = site_root_url();
if (!google_enabled()) {
  header('Location: ' . $root . 'auth.html?error=' . rawurlencode('Google sign-in is not set up yet.'));
  exit;
}

start_session();
$state = bin2hex(random_bytes(24));
$_SESSION['google_oauth'] = ['state' => $state, 'next' => safe_next($_GET['next'] ?? null), 'at' => time()];

header('Location: https://accounts.google.com/o/oauth2/v2/auth?' . http_build_query([
  'client_id' => GOOGLE_CLIENT_ID,
  'redirect_uri' => google_redirect_uri(),
  'response_type' => 'code',
  'scope' => 'openid email profile',
  'state' => $state,
  'prompt' => 'select_account',
]));
exit;
