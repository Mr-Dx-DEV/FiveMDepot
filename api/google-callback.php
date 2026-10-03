<?php
/**
 * Google redirects here after the user approves. Exchanges the code, loads the
 * profile, finds or creates the account, logs in and redirects back to the site.
 */
require_once __DIR__ . '/../core/bootstrap.php';
require_once __DIR__ . '/../core/google.php';

$root = site_root_url();
$fail = function (string $msg) use ($root) {
  header('Location: ' . $root . 'auth.html?error=' . rawurlencode($msg));
  exit;
};

if (!google_enabled()) $fail('Google sign-in is not set up yet.');
start_session();
$saved = $_SESSION['google_oauth'] ?? null;
unset($_SESSION['google_oauth']);

if (!empty($_GET['error'])) $fail('Google sign-in was cancelled.');
if (!$saved || empty($_GET['state']) || !hash_equals($saved['state'], (string)$_GET['state']) || time() - $saved['at'] > 600) {
  $fail('Your sign-in link expired. Please try again.');
}
if (empty($_GET['code'])) $fail('Google sign-in failed. Please try again.');

[$status, $token] = http_request('POST', 'https://oauth2.googleapis.com/token', [
  'code' => (string)$_GET['code'],
  'client_id' => GOOGLE_CLIENT_ID,
  'client_secret' => GOOGLE_CLIENT_SECRET,
  'redirect_uri' => google_redirect_uri(),
  'grant_type' => 'authorization_code',
]);
if ($status !== 200 || empty($token['access_token'])) {
  error_log('[google] token exchange failed: ' . $status . ' ' . json_encode($token));
  $fail('Could not sign in with Google. Please try again.');
}

[$status, $profile] = http_request('GET', 'https://openidconnect.googleapis.com/v1/userinfo', [], ['Authorization: Bearer ' . $token['access_token']]);
if ($status !== 200) $fail('Could not read your Google profile. Please try again.');

try {
  $user = google_find_or_create_user($profile);
} catch (RuntimeException $e) {
  $fail($e->getMessage());
}
login_user_session($user);
audit('login_google', 'user', $user['id']);

header('Location: ' . $root . ($saved['next'] ?: dashboard_url($user['role'])));
exit;
