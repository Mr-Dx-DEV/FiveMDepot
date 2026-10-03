<?php
/**
 * Google sign-in (OAuth 2.0 / OpenID Connect, authorization-code flow).
 * Enable by defining GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in config.local.php.
 * Authorized redirect URI to register in Google Cloud Console:
 *   https://<your-domain>/api/google-callback.php
 */
require_once __DIR__ . '/http.php';

function google_enabled(): bool
{
  return defined('GOOGLE_CLIENT_ID') && GOOGLE_CLIENT_ID !== '' && defined('GOOGLE_CLIENT_SECRET') && GOOGLE_CLIENT_SECRET !== '';
}

function google_redirect_uri(): string
{
  return site_root_url() . 'api/google-callback.php';
}

/**
 * Find or create the local user for a verified Google profile and return the user row.
 * Order: same google_id → same email (links the Google account) → new BUYER account.
 */
function google_find_or_create_user(array $profile): array
{
  $sub = (string)($profile['sub'] ?? '');
  $email = strtolower(trim((string)($profile['email'] ?? '')));
  if ($sub === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) throw new RuntimeException('Google did not return an email address');
  if (empty($profile['email_verified'])) throw new RuntimeException('Your Google email address is not verified');

  $u = Db::one("SELECT id, name, email, role, is_banned FROM users WHERE google_id = ?", [$sub]);
  if (!$u) {
    $u = Db::one("SELECT id, name, email, role, is_banned, google_id FROM users WHERE email = ?", [$email]);
    if ($u) {
      if (!empty($u['google_id']) && $u['google_id'] !== $sub) throw new RuntimeException('This email is linked to a different Google account');
      Db::pdo()->prepare("UPDATE users SET google_id = ?, email_verified_at = COALESCE(email_verified_at, NOW()) WHERE id = ?")->execute([$sub, $u['id']]);
    } else {
      $id = uuid();
      $name = mb_substr(trim((string)($profile['name'] ?? '')) ?: strstr($email, '@', true), 0, 100);
      $pic = (string)($profile['picture'] ?? '');
      Db::pdo()->prepare("INSERT INTO users (id, name, email, password, role, google_id, image, email_verified_at) VALUES (?, ?, ?, NULL, 'BUYER', ?, ?, NOW())")
        ->execute([$id, $name, $email, $sub, preg_match('#^https://#', $pic) ? mb_substr($pic, 0, 500) : null]);
      $u = ['id' => $id, 'name' => $name, 'email' => $email, 'role' => 'BUYER', 'is_banned' => 0];
      audit('register_google', 'user', $id);
    }
  }
  if ((int)$u['is_banned']) throw new RuntimeException('This account has been suspended. Contact support.');
  return $u;
}

function login_user_session(array $u): void
{
  start_session();
  session_regenerate_id(true);
  $_SESSION['user_id'] = $u['id'];
  $_SESSION['user_email'] = $u['email'];
  $_SESSION['user_role'] = $u['role'];
  $_SESSION['logged_in_at'] = time();
  unset($_SESSION['csrf_token']);
  Db::pdo()->prepare("UPDATE users SET last_login_at = NOW(), login_attempts = 0, locked_until = NULL WHERE id = ?")->execute([$u['id']]);
}
