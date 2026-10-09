<?php
/**
 * Payments: Paddle Billing (Paddle is the Merchant of Record — it charges the buyer, adds sales tax/VAT
 * and handles refunds and chargebacks). Keys come from config.local.php.
 *
 * Flow: checkout creates an order → we create a Paddle transaction with our own prices (non-catalog items)
 * → the browser opens Paddle.js overlay checkout for that transaction → Paddle calls the webhook
 * (api/pay/paddle-webhook.php, signature verified) → the order is fulfilled.
 */
require_once __DIR__ . '/http.php';
require_once __DIR__ . '/orders.php';

/** Store a gateway notification once. Returns false when it was already processed (duplicate). */
function record_payment_event(string $gateway, string $eventId, ?string $orderId, ?string $type, ?string $status, $amount, ?string $currency, string $payload): bool
{
  $st = Db::pdo()->prepare("INSERT IGNORE INTO payment_events (order_id, gateway, event_id, event_type, status, amount, currency, payload) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
  $st->execute([$orderId, $gateway, mb_substr($eventId, 0, 191), $type, $status, $amount, $currency, mb_substr($payload, 0, 60000)]);
  return $st->rowCount() > 0;
}

/** Order + its lines, for building a gateway payment. */
function order_for_payment(string $orderId): ?array
{
  $o = Db::one("SELECT o.id, o.user_id, o.total_amount, o.status, o.payment_method, o.gateway_ref, u.email, u.name
                FROM orders o JOIN users u ON u.id = o.user_id WHERE o.id = ?", [$orderId]);
  if (!$o) return null;
  $o['lines'] = Db::all("SELECT op.price_paid, p.title FROM order_products op LEFT JOIN products p ON p.id = op.product_id WHERE op.order_id = ?", [$orderId]);
  return $o;
}

/**
 * Everything the browser needs to open Paddle checkout for an order.
 * Reuses the order's open Paddle transaction, so "Pay now" never creates duplicates.
 */
function start_gateway_payment(array $o): array
{
  if ($o['payment_method'] !== 'PADDLE') fail(422, 'This payment method is not available');
  $txn = (string)($o['gateway_ref'] ?? '');
  if (strpos($txn, 'txn_') !== 0) {
    $txn = paddle_create_transaction($o);
    Db::pdo()->prepare("UPDATE orders SET gateway_ref = ? WHERE id = ?")->execute([$txn, $o['id']]);
  }
  return ['paddle' => [
    'transaction_id' => $txn,
    'client_token' => PADDLE_CLIENT_TOKEN,
    'environment' => paddle_sandbox() ? 'sandbox' : 'production',
    'email' => $o['email'],
    'success_url' => site_root_url() . 'checkout.html?order=' . rawurlencode($o['id']) . '&paid=1',
  ]];
}

// ============================================================
// Paddle Billing
// ============================================================
/**
 * 'sandbox' or 'production', from the PADDLE_ENVIRONMENT environment variable or config.local.php (see config.php).
 * Never guessed: throws when it is missing, invalid, or doesn't match the client-side token
 * (test_… = sandbox, live_… = production).
 */
function paddle_environment(): string
{
  $env = defined('PADDLE_ENVIRONMENT') ? (string)PADDLE_ENVIRONMENT : '';
  if ($env !== 'sandbox' && $env !== 'production') {
    throw new RuntimeException('PADDLE_ENVIRONMENT must be "sandbox" or "production" (env var or config.local.php)');
  }
  $token = defined('PADDLE_CLIENT_TOKEN') ? (string)PADDLE_CLIENT_TOKEN : '';
  if ($token === '') throw new RuntimeException('PADDLE_CLIENT_TOKEN is not set (env var or config.local.php)');
  $prefix = $env === 'sandbox' ? 'test_' : 'live_';
  if (strpos($token, $prefix) !== 0) {
    throw new RuntimeException("PADDLE_CLIENT_TOKEN does not match PADDLE_ENVIRONMENT={$env} (expected a {$prefix}… token)");
  }
  return $env;
}

function paddle_sandbox(): bool
{
  if (defined('PADDLE_ENVIRONMENT')) return paddle_environment() === 'sandbox';
  if (defined('PADDLE_SANDBOX')) return (bool)PADDLE_SANDBOX;
  return defined('PADDLE_API_KEY') && strpos((string)PADDLE_API_KEY, '_sdbx_') !== false;
}

function paddle_base(): string
{
  if (defined('PADDLE_API_BASE')) return PADDLE_API_BASE;
  return paddle_sandbox() ? 'https://sandbox-api.paddle.com' : 'https://api.paddle.com';
}

function paddle_configured(): bool
{
  $c = fn($k) => defined($k) && constant($k) !== '';
  return $c('PADDLE_API_KEY') && $c('PADDLE_CLIENT_TOKEN') && $c('PADDLE_WEBHOOK_SECRET');
}

/** Create a Paddle transaction priced from our order lines. Returns the txn_… id. */
function paddle_create_transaction(array $o): string
{
  $items = [];
  foreach ($o['lines'] as $l) {
    $name = mb_substr($l['title'] ?: 'FiveMDepot resource', 0, 200);
    $items[] = ['quantity' => 1, 'price' => [
      'description' => $name,
      'name' => $name,
      'unit_price' => ['amount' => (string)(int)round((float)$l['price_paid'] * 100), 'currency_code' => 'USD'],
      'product' => ['name' => $name, 'tax_category' => 'standard'], // standard digital goods
    ]];
  }
  $body = json_encode(['items' => $items, 'currency_code' => 'USD', 'collection_mode' => 'automatic', 'custom_data' => ['order_id' => $o['id']]]);
  [$status, $res] = http_request('POST', paddle_base() . '/transactions', [],
    ['Authorization: Bearer ' . PADDLE_API_KEY, 'Content-Type: application/json', 'Paddle-Version: 1'], $body);
  $id = (string)($res['data']['id'] ?? '');
  if ($status < 200 || $status >= 300 || strpos($id, 'txn_') !== 0) {
    error_log('[paddle] transaction failed: ' . $status . ' ' . json_encode($res['error'] ?? $res));
    fail(502, 'Checkout is unavailable right now. Please try again in a few minutes.');
  }
  return $id;
}

// ---------- Webhook source allowlist ----------
/** True when $ip is inside $cidr (IPv4 or IPv6). */
function ip_in_cidr(string $ip, string $cidr): bool
{
  [$net, $bits] = array_pad(explode('/', $cidr, 2), 2, null);
  $ipBin = @inet_pton($ip); $netBin = @inet_pton((string)$net);
  if ($ipBin === false || $netBin === false || strlen($ipBin) !== strlen($netBin)) return false;
  $bits = $bits === null ? strlen($ipBin) * 8 : (int)$bits;
  $bytes = intdiv($bits, 8); $rest = $bits % 8;
  if (substr($ipBin, 0, $bytes) !== substr($netBin, 0, $bytes)) return false;
  if ($rest === 0) return true;
  $mask = chr((0xFF << (8 - $rest)) & 0xFF);
  return ($ipBin[$bytes] & $mask) === ($netBin[$bytes] & $mask);
}

/** Fetch a remote list with a file cache; on failure fall back to the last good copy (or []). */
function cached_remote_list(string $key, int $ttl, callable $fetch): array
{
  $file = sys_get_temp_dir() . '/fivemdepot_' . preg_replace('/[^a-z0-9_]/i', '_', $key) . '.json';
  $cached = is_file($file) ? json_decode((string)@file_get_contents($file), true) : null;
  if (is_array($cached) && filemtime($file) > time() - $ttl) return $cached;
  $fresh = $fetch();
  if ($fresh) { @file_put_contents($file, json_encode($fresh), LOCK_EX); return $fresh; }
  return is_array($cached) ? $cached : [];
}

/** Paddle's webhook sender IPs for the current environment — from Paddle's /ips endpoint, never hard-coded. */
function paddle_webhook_cidrs(): array
{
  return cached_remote_list('paddle_ips_' . (paddle_sandbox() ? 'sandbox' : 'live'), 21600, function () {
    [$status, $res] = http_request('GET', paddle_base() . '/ips', [], ['Accept: application/json']);
    $list = $status === 200 ? ($res['data']['ipv4_cidrs'] ?? []) : [];
    if (!$list) error_log("[paddle] could not load webhook IPs ($status)");
    return array_values(array_filter($list, 'is_string'));
  });
}

/** Cloudflare edge ranges, so CF-Connecting-IP is only trusted when the request really came through Cloudflare. */
function cloudflare_cidrs(): array
{
  return cached_remote_list('cloudflare_ips', 86400, function () {
    $out = [];
    foreach (['https://www.cloudflare.com/ips-v4', 'https://www.cloudflare.com/ips-v6'] as $u) {
      [$status, , $raw] = http_request('GET', $u);
      if ($status === 200) $out = array_merge($out, preg_split('/\s+/', trim($raw)));
    }
    return array_values(array_filter($out));
  });
}

/** Real sender IP: Cloudflare's CF-Connecting-IP when the TCP peer is a Cloudflare edge, else REMOTE_ADDR. */
function request_source_ip(): string
{
  $peer = (string)($_SERVER['REMOTE_ADDR'] ?? '');
  $cf = (string)($_SERVER['HTTP_CF_CONNECTING_IP'] ?? '');
  if ($cf !== '') foreach (cloudflare_cidrs() as $c) if (ip_in_cidr($peer, $c)) return $cf;
  return $peer;
}

/** Is this webhook delivery coming from one of Paddle's published IPs? */
function paddle_source_allowed(): bool
{
  // Emergency switch in config.local.php if a proxy in front of the server hides the real IP
  if (defined('PADDLE_WEBHOOK_IP_CHECK') && !PADDLE_WEBHOOK_IP_CHECK) return true;
  $ip = request_source_ip();
  foreach (paddle_webhook_cidrs() as $c) if (ip_in_cidr($ip, $c)) return true;
  error_log("[paddle] webhook rejected from $ip (not a Paddle IP)");
  return false;
}

/** Verify the Paddle-Signature header ("ts=…;h1=…", HMAC-SHA256 of "ts:body"), 5-minute tolerance. */
function paddle_verify(string $payload, string $header, string $secret, int $tolerance = 300): bool
{
  $ts = null; $sigs = [];
  foreach (explode(';', $header) as $part) {
    [$k, $v] = array_pad(explode('=', trim($part), 2), 2, '');
    if ($k === 'ts') $ts = (int)$v;
    if ($k === 'h1') $sigs[] = $v;
  }
  if (!$ts || !$sigs || abs(time() - $ts) > $tolerance) return false;
  $expected = hash_hmac('sha256', $ts . ':' . $payload, $secret);
  foreach ($sigs as $s) if (hash_equals($expected, $s)) return true;
  return false;
}
