<?php
/**
 * Discord redirects here after the user approves. Exchanges the code, loads the
 * profile, then either links Discord to the logged-in account or finds/creates
 * the account, logs in and redirects back to the site.
 */
require_once __DIR__ . '/../core/bootstrap.php';
require_once __DIR__ . '/../core/discord.php';

$root = site_root_url();
start_session();
$saved = $_SESSION['discord_oauth'] ?? null;
unset($_SESSION['discord_oauth']);
$back = $saved && $saved['link'] ? 'dashboard/buyer.html?tab=settings&' : 'auth.html?';
$fail = function (string $msg) use ($root, &$back) {
  header('Location: ' . $root . $back . 'error=' . rawurlencode($msg));
  exit;
};

if (!discord_enabled()) $fail('Discord sign-in is not set up yet.');
if (!empty($_GET['error'])) $fail('Discord sign-in was cancelled.');
if (!$saved || empty($_GET['state']) || !hash_equals($saved['state'], (string)$_GET['state']) || time() - $saved['at'] > 600) {
  $fail('Your sign-in link expired. Please try again.');
}
if (empty($_GET['code'])) $fail('Discord sign-in failed. Please try again.');

[$status, $token] = http_request('POST', 'https://discord.com/api/oauth2/token', [
  'code' => (string)$_GET['code'],
  'client_id' => DISCORD_CLIENT_ID,
  'client_secret' => DISCORD_CLIENT_SECRET,
  'redirect_uri' => discord_redirect_uri(),
  'grant_type' => 'authorization_code',
], ['User-Agent: FiveMDepot (' . $root . ', 1.0)']);
if ($status !== 200 || empty($token['access_token'])) {
  error_log('[discord] token exchange failed: ' . $status . ' ' . json_encode($token));
  $fail('Could not sign in with Discord. Please try again.');
}

[$status, $profile] = http_request('GET', 'https://discord.com/api/users/@me', [], ['Authorization: Bearer ' . $token['access_token'], 'User-Agent: FiveMDepot (' . $root . ', 1.0)']);
if ($status !== 200 || !is_array($profile)) $fail('Could not read your Discord profile. Please try again.');

try {
  if ($saved['link']) {
    $me = current_user();
    if (!$me) $fail('Please log in again.');
    discord_link_user($me['id'], $profile);
    header('Location: ' . $root . 'dashboard/buyer.html?tab=settings&linked=discord');
    exit;
  }
  $user = discord_find_or_create_user($profile);
} catch (RuntimeException $e) {
  $fail($e->getMessage());
}
login_user_session($user);
audit('login_discord', 'user', $user['id']);

header('Location: ' . $root . ($saved['next'] ?: dashboard_url($user['role'])));
exit;
