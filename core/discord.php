<?php
/**
 * Discord sign-in (OAuth 2.0 authorization-code flow, scopes: identify email).
 * Enable by defining DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET in config.local.php.
 * Redirect URI to add in the Discord Developer Portal (OAuth2 → Redirects):
 *   https://<your-domain>/api/discord-callback.php
 */
require_once __DIR__ . '/http.php';
require_once __DIR__ . '/google.php'; // login_user_session()

function discord_enabled(): bool
{
  return defined('DISCORD_CLIENT_ID') && DISCORD_CLIENT_ID !== '' && defined('DISCORD_CLIENT_SECRET') && DISCORD_CLIENT_SECRET !== '';
}

function discord_redirect_uri(): string
{
  return site_root_url() . 'api/discord-callback.php';
}

/** "name" for new-style usernames, "name#1234" for old ones */
function discord_handle(array $p): string
{
  $name = (string)($p['username'] ?? '');
  $disc = (string)($p['discriminator'] ?? '0');
  return mb_substr($disc !== '' && $disc !== '0' ? $name . '#' . $disc : $name, 0, 100);
}

function discord_avatar(array $p): ?string
{
  return !empty($p['avatar']) && preg_match('/^\d+$/', (string)$p['id']) && preg_match('/^[a-z0-9_]+$/i', (string)$p['avatar'])
    ? 'https://cdn.discordapp.com/avatars/' . $p['id'] . '/' . $p['avatar'] . '.png?size=256' : null;
}

/**
 * Find or create the local user for a Discord profile and return the user row.
 * Order: same discord_id → same verified email (links Discord to that account) → new BUYER account.
 */
function discord_find_or_create_user(array $p): array
{
  $did = (string)($p['id'] ?? '');
  if (!preg_match('/^\d{5,25}$/', $did)) throw new RuntimeException('Discord did not return your account details');
  $email = strtolower(trim((string)($p['email'] ?? '')));
  $handle = discord_handle($p);

  $u = Db::one("SELECT id, name, email, role, is_banned FROM users WHERE discord_id = ?", [$did]);
  if (!$u) {
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) throw new RuntimeException('Your Discord account has no email address. Add one in Discord (User Settings → My Account) and try again.');
    if (empty($p['verified'])) throw new RuntimeException('Verify your email address in Discord first, then try again.');
    $u = Db::one("SELECT id, name, email, role, is_banned, discord_id FROM users WHERE email = ?", [$email]);
    if ($u) {
      if (!empty($u['discord_id']) && $u['discord_id'] !== $did) throw new RuntimeException('This email is linked to a different Discord account');
      Db::pdo()->prepare("UPDATE users SET discord_id = ?, discord_username = ?, email_verified_at = COALESCE(email_verified_at, NOW()) WHERE id = ?")->execute([$did, $handle, $u['id']]);
    } else {
      $id = uuid();
      $name = mb_substr(trim((string)($p['global_name'] ?? '')) ?: ((string)($p['username'] ?? '') ?: strstr($email, '@', true)), 0, 100);
      Db::pdo()->prepare("INSERT INTO users (id, name, email, password, role, discord_id, discord_username, image, email_verified_at) VALUES (?, ?, ?, NULL, 'BUYER', ?, ?, ?, NOW())")
        ->execute([$id, $name, $email, $did, $handle, discord_avatar($p)]);
      $u = ['id' => $id, 'name' => $name, 'email' => $email, 'role' => 'BUYER', 'is_banned' => 0];
      audit('register_discord', 'user', $id);
    }
  } else {
    Db::pdo()->prepare("UPDATE users SET discord_username = ? WHERE id = ?")->execute([$handle, $u['id']]); // keep the handle fresh
  }
  if ((int)$u['is_banned']) throw new RuntimeException('This account has been suspended. Contact support.');
  return $u;
}

/** Link Discord to the logged-in user (Account settings → Connected accounts). */
function discord_link_user(string $userId, array $p): void
{
  $did = (string)($p['id'] ?? '');
  if (!preg_match('/^\d{5,25}$/', $did)) throw new RuntimeException('Discord did not return your account details');
  $other = Db::value("SELECT id FROM users WHERE discord_id = ? AND id <> ?", [$did, $userId]);
  if ($other) throw new RuntimeException('That Discord account is already linked to another FiveMDepot account');
  Db::pdo()->prepare("UPDATE users SET discord_id = ?, discord_username = ? WHERE id = ?")->execute([$did, discord_handle($p), $userId]);
  audit('discord_linked', 'user', $userId, discord_handle($p));
}
