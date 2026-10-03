<?php
/**
 * Google sign-in (OAuth 2.0 / OpenID Connect, authorization-code flow).
 * Enable by defining GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in config.local.php.
 * Authorized redirect URI to register in Google Cloud Console:
 *   https://<your-domain>/api/google-callback.php
 */

function google_enabled(): bool
{
  return defined('GOOGLE_CLIENT_ID') && GOOGLE_CLIENT_ID !== '' && defined('GOOGLE_CLIENT_SECRET') && GOOGLE_CLIENT_SECRET !== '';
}

/** Absolute URL of the site root (folder that contains api/), based on the current request. */
function site_root_url(): string
{
  $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
  $host = $_SERVER['HTTP_HOST'] ?? parse_url(SITE_URL, PHP_URL_HOST);
  $dir = rtrim(str_replace('\\', '/', dirname(dirname($_SERVER['SCRIPT_NAME'] ?? '/api/x.php'))), '/');
  return ($https ? 'https' : 'http') . '://' . $host . $dir . '/';
}

function google_redirect_uri(): string
{
  return site_root_url() . 'api/google-callback.php';
}

/** Only allow redirects back to pages on this site. */
function safe_next(?string $next): ?string
{
  $next = (string)$next;
  if ($next === '' || preg_match('#^[a-z][a-z0-9+.-]*:#i', $next) || strpos($next, '//') === 0 || strpos($next, '\\') !== false) return null;
  return ltrim($next, '/');
}

function http_request(string $method, string $url, array $form = [], array $headers = []): array
{
  if (function_exists('curl_init')) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
      CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 15, CURLOPT_HTTPHEADER => $headers,
      CURLOPT_CUSTOMREQUEST => $method,
    ]);
    if ($form) curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($form));
    $body = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
  } else {
    $ctx = stream_context_create(['http' => [
      'method' => $method, 'timeout' => 15, 'ignore_errors' => true,
      'header' => implode("\r\n", array_merge($headers, $form ? ['Content-Type: application/x-www-form-urlencoded'] : [])),
      'content' => $form ? http_build_query($form) : null,
    ]]);
    $body = @file_get_contents($url, false, $ctx);
    $status = 0;
    foreach ($http_response_header ?? [] as $h) if (preg_match('#^HTTP/\S+ (\d+)#', $h, $m)) $status = (int)$m[1];
  }
  return [$status, is_string($body) ? (json_decode($body, true) ?: []) : []];
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
