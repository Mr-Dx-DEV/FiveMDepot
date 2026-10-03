<?php
/**
 * FiveMDepot — API core
 * Session, JSON responses, auth/roles, CSRF, validation helpers, audit log.
 * Every v1 endpoint goes through api/v1.php which requires this file.
 */

require_once __DIR__ . '/Db.php';

// ---------- Errors: never leak details to the client ----------
ini_set('display_errors', '0');
mysqli_report(MYSQLI_REPORT_OFF);

final class ApiError extends Exception
{
  public array $fields;
  public function __construct(int $status, string $message, array $fields = [])
  {
    parent::__construct($message, $status);
    $this->fields = $fields;
  }
}

set_exception_handler(function (Throwable $e) {
  if ($e instanceof ApiError) {
    $status = $e->getCode();
    $body = ['error' => ['code' => $status, 'message' => $e->getMessage()] + ($e->fields ? ['fields' => $e->fields] : [])];
  } else {
    error_log('[api] ' . get_class($e) . ': ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    $status = 500;
    $body = ['error' => ['code' => 500, 'message' => 'Something went wrong. Please try again.']];
  }
  if (!headers_sent()) {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
  }
  echo json_encode($body);
});

// ---------- Session ----------
function start_session(): void
{
  if (session_status() === PHP_SESSION_ACTIVE) return;
  $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
    || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
  session_name(SESSION_NAME);
  session_set_cookie_params([
    'lifetime' => SESSION_LIFETIME,
    'path' => '/',
    'secure' => $https,
    'httponly' => true,
    'samesite' => 'Lax',
  ]);
  ini_set('session.use_strict_mode', '1');
  ini_set('session.gc_maxlifetime', (string)SESSION_LIFETIME);
  session_start();
}

// ---------- Responses ----------
function ok($data = null, array $meta = [], int $status = 200): void
{
  http_response_code($status);
  header('Content-Type: application/json; charset=utf-8');
  header('Cache-Control: no-store');
  $out = ['data' => $data];
  if ($meta) $out['meta'] = $meta;
  echo json_encode($out, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
  exit;
}

function fail(int $status, string $message, array $fields = []): void
{
  throw new ApiError($status, $message, $fields);
}

// ---------- Request ----------
function body(): array
{
  static $b = null;
  if ($b !== null) return $b;
  $type = $_SERVER['CONTENT_TYPE'] ?? '';
  if (stripos($type, 'application/json') !== false) {
    $b = json_decode(file_get_contents('php://input'), true);
    if (!is_array($b)) fail(400, 'Invalid JSON body');
  } else {
    $b = $_POST;
  }
  return $b;
}

function input(string $key, $default = null)
{
  $b = body();
  return array_key_exists($key, $b) ? $b[$key] : ($_GET[$key] ?? $default);
}

/** Trimmed string, or '' */
function str_in(string $key, int $max = 255): string
{
  $v = input($key, '');
  if (!is_scalar($v)) return '';
  return mb_substr(trim((string)$v), 0, $max);
}

function int_in(string $key, int $default = 0): int
{
  $v = input($key, $default);
  return is_numeric($v) ? (int)$v : $default;
}

function bool_in(string $key, bool $default = false): bool
{
  $v = input($key, $default);
  return filter_var($v, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? $default;
}

function arr_in(string $key): array
{
  $v = input($key, []);
  if (is_string($v)) $v = json_decode($v, true);
  return is_array($v) ? $v : [];
}

/** Paging from ?page=&per_page= */
function paging(int $defaultPer = 25): array
{
  $page = max(1, (int)($_GET['page'] ?? 1));
  $per = min(100, max(1, (int)($_GET['per_page'] ?? $defaultPer)));
  return [$page, $per, ($page - 1) * $per];
}

// ---------- Auth ----------
function current_user(): ?array
{
  static $user = false;
  if ($user !== false) return $user;
  start_session();
  $user = null;
  if (!empty($_SESSION['user_id'])) {
    $row = Db::one("SELECT id, name, email, role, image, is_banned FROM users WHERE id = ?", [$_SESSION['user_id']]);
    if ($row && !(int)$row['is_banned']) {
      $_SESSION['user_role'] = $row['role']; // role changes take effect immediately
      unset($row['is_banned']);
      $user = $row;
    } else {
      $_SESSION = [];
    }
  }
  return $user;
}

function require_user(): array
{
  $u = current_user();
  if (!$u) fail(401, 'Please log in to continue');
  return $u;
}

function require_role(string ...$roles): array
{
  $u = require_user();
  if (!in_array($u['role'], $roles, true)) fail(403, 'You do not have permission to do that');
  return $u;
}

// ---------- CSRF (header X-CSRF-Token on every non-GET request) ----------
function csrf_token(): string
{
  start_session();
  if (empty($_SESSION['csrf_token'])) $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
  return $_SESSION['csrf_token'];
}

function csrf_check(): void
{
  $sent = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? (string)(body()['csrf_token'] ?? '');
  if (!$sent || !hash_equals(csrf_token(), $sent)) fail(419, 'Your session expired. Please refresh the page.');
}

// ---------- Rate limit (per session + IP, in DB-free APCu or session fallback) ----------
function rate_limit(string $key, int $max, int $windowSec): void
{
  start_session();
  $k = 'rl_' . $key;
  $now = time();
  $hits = array_filter($_SESSION[$k] ?? [], fn($t) => $t > $now - $windowSec);
  if (count($hits) >= $max) fail(429, 'Too many attempts. Please wait a moment and try again.');
  $hits[] = $now;
  $_SESSION[$k] = array_values($hits);
}

// ---------- Helpers ----------
function uuid(): string
{
  $b = random_bytes(16);
  $b[6] = chr((ord($b[6]) & 0x0f) | 0x40);
  $b[8] = chr((ord($b[8]) & 0x3f) | 0x80);
  return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($b), 4));
}

function slugify(string $s): string
{
  $s = strtolower(trim($s));
  $s = preg_replace('/[^a-z0-9]+/', '-', $s);
  return trim($s, '-') ?: 'item';
}

/** Make a slug unique in $table.slug (optionally ignoring row $exceptId). */
function unique_slug(string $table, string $base, ?string $exceptId = null): string
{
  $slug = slugify($base);
  $try = $slug;
  for ($i = 2; ; $i++) {
    $exists = Db::value("SELECT COUNT(*) FROM `$table` WHERE slug = ?" . ($exceptId ? " AND id <> ?" : ''),
      $exceptId ? [$try, $exceptId] : [$try]);
    if (!(int)$exists) return $try;
    $try = $slug . '-' . $i;
  }
}

function setting(string $key, string $default = ''): string
{
  $v = Db::value("SELECT `value` FROM site_settings WHERE `key` = ?", [$key]);
  return $v === null ? $default : (string)$v;
}

function audit(string $action, ?string $entityType = null, ?string $entityId = null, ?string $details = null): void
{
  $u = current_user();
  Db::pdo()->prepare("INSERT INTO activity_log (user_id, action, entity_type, entity_id, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)")
    ->execute([
      $u['id'] ?? null, $action, $entityType, $entityId, $details ? mb_substr($details, 0, 1000) : null,
      $_SERVER['REMOTE_ADDR'] ?? null, mb_substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 500),
    ]);
}


// ---------- Uploads ----------
/**
 * Save an uploaded file from $_FILES[$field]. Returns the public path (e.g. "uploads/products/ab12.png").
 * $kind: 'image' (jpg/png/webp/gif) or 'archive' (zip/rar/7z).
 */
function save_upload(array $file, string $dir, string $kind = 'image', int $maxBytes = 0): string
{
  if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) fail(400, 'Upload failed (code ' . ($file['error'] ?? '?') . ')');
  $maxBytes = $maxBytes ?: ($kind === 'image' ? MAX_UPLOAD_SIZE : 200 * 1024 * 1024);
  if ($file['size'] > $maxBytes) fail(400, 'File is too large (max ' . round($maxBytes / 1048576) . ' MB)');

  $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
  $allowed = $kind === 'image'
    ? ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/gif' => 'gif']
    : ['application/zip' => 'zip', 'application/x-zip-compressed' => 'zip', 'application/x-rar' => 'rar',
       'application/vnd.rar' => 'rar', 'application/x-rar-compressed' => 'rar', 'application/x-7z-compressed' => '7z'];
  if (!isset($allowed[$mime])) fail(400, 'This file type is not allowed');

  $root = dirname(__DIR__);
  $target = $root . '/uploads/' . trim($dir, '/');
  if (!is_dir($target) && !mkdir($target, 0755, true)) fail(500, 'Could not create upload folder');
  $name = bin2hex(random_bytes(12)) . '.' . $allowed[$mime];
  if (!move_uploaded_file($file['tmp_name'], $target . '/' . $name)) fail(500, 'Could not save the file');
  return 'uploads/' . trim($dir, '/') . '/' . $name;
}
