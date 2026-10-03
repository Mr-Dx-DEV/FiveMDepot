<?php
/**
 * Start "Continue with Discord": redirect to Discord's consent screen.
 *   api/discord-login.php?next=checkout.html
 *   api/discord-login.php?link=1      (logged-in user connects Discord in Account settings)
 */
require_once __DIR__ . '/../core/bootstrap.php';
require_once __DIR__ . '/../core/discord.php';

$root = site_root_url();
if (!discord_enabled()) {
  header('Location: ' . $root . 'auth.html?error=' . rawurlencode('Discord sign-in is not set up yet.'));
  exit;
}

start_session();
$link = !empty($_GET['link']) && current_user();
$state = bin2hex(random_bytes(24));
$_SESSION['discord_oauth'] = ['state' => $state, 'next' => safe_next($_GET['next'] ?? null), 'link' => $link, 'at' => time()];

header('Location: https://discord.com/oauth2/authorize?' . http_build_query([
  'client_id' => DISCORD_CLIENT_ID,
  'redirect_uri' => discord_redirect_uri(),
  'response_type' => 'code',
  'scope' => 'identify email',
  'state' => $state,
  'prompt' => 'none', // skip the consent screen when the user already approved the app
]));
exit;
