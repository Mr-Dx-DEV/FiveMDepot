<?php
/**
 * Payments: Lemon Squeezy (Lemon Squeezy is the Merchant of Record — it charges the buyer, adds sales
 * tax/VAT and handles chargebacks). Keys come from config.local.php; setup in docs/LEMONSQUEEZY.md.
 *
 * Store orders: checkout creates an order → we create a Lemon Squeezy checkout for the single
 * "FiveMDepot order" variant with our own price (custom_price) and the order id in custom data → the
 * browser opens it with Lemon.js (overlay) → Lemon Squeezy calls the webhook
 * (api/pay/lemonsqueezy-webhook.php, signature verified) → the order is fulfilled.
 * Plans (pricing page): the same, for the plan's monthly / yearly variant (core/plans.php).
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
 * Everything the browser needs to open Lemon Squeezy checkout for an order.
 * Reuses the order's checkout while it is still valid, so "Pay now" never creates duplicates.
 */
function start_gateway_payment(array $o): array
{
  if ($o['payment_method'] !== 'LEMONSQUEEZY') fail(422, 'This payment method is not available');
  $successUrl = site_root_url() . 'checkout.html?order=' . rawurlencode($o['id']) . '&paid=1';
  $ref = json_decode((string)($o['gateway_ref'] ?? ''), true);
  if (!is_array($ref) || empty($ref['url']) || (int)($ref['expires'] ?? 0) < time() + 600) {
    $names = array_map(fn($l) => $l['title'] ?: 'FiveMDepot resource', $o['lines']);
    $ref = ls_create_checkout(LEMONSQUEEZY_ORDER_VARIANT_ID, [
      'custom_price' => (int)round((float)$o['total_amount'] * 100),
      'name' => mb_substr(count($names) === 1 ? $names[0] : 'FiveMDepot order (' . count($names) . ' items)', 0, 200),
      'description' => mb_substr(implode(' · ', $names), 0, 1000),
      'email' => $o['email'], 'user_name' => $o['name'] ?? '',
      'custom' => ['order_id' => $o['id']],
      'redirect_url' => $successUrl,
      'expires_in' => 86400,
    ]);
    Db::pdo()->prepare("UPDATE orders SET gateway_ref = ? WHERE id = ?")->execute([json_encode($ref), $o['id']]);
  }
  return ['checkout' => ['url' => $ref['url'], 'success_url' => $successUrl]];
}

// ============================================================
// Lemon Squeezy
// ============================================================
/** Test mode (test API key + test products) unless LEMONSQUEEZY_TEST_MODE is explicitly false. */
function ls_test_mode(): bool
{
  return !defined('LEMONSQUEEZY_TEST_MODE') || (bool)LEMONSQUEEZY_TEST_MODE;
}

function ls_configured(): bool
{
  $c = fn($k) => defined($k) && (string)constant($k) !== '';
  return $c('LEMONSQUEEZY_API_KEY') && $c('LEMONSQUEEZY_STORE_ID') && $c('LEMONSQUEEZY_WEBHOOK_SECRET') && $c('LEMONSQUEEZY_ORDER_VARIANT_ID');
}

/** Call the Lemon Squeezy API (JSON:API). Returns [status, decodedJson]. */
function ls_api(string $method, string $path, ?array $body = null): array
{
  [$status, $res] = http_request($method, 'https://api.lemonsqueezy.com/v1/' . ltrim($path, '/'), [], [
    'Accept: application/vnd.api+json', 'Content-Type: application/vnd.api+json',
    'Authorization: Bearer ' . LEMONSQUEEZY_API_KEY,
  ], $body !== null ? json_encode($body) : null);
  return [$status, $res];
}

/**
 * Create a checkout for a variant. $o: custom_price (cents), name, description, email, user_name,
 * custom (array, comes back in the webhook's meta.custom_data), redirect_url, expires_in (seconds).
 * Returns ['id', 'url', 'expires' (unix time)].
 */
function ls_create_checkout(string $variantId, array $o): array
{
  $productOptions = array_filter([
    'name' => $o['name'] ?? null,
    'description' => $o['description'] ?? null,
    'redirect_url' => $o['redirect_url'] ?? null,
    'enabled_variants' => [(int)$variantId],
  ], fn($v) => $v !== null && $v !== '');
  $checkoutData = array_filter([
    'email' => $o['email'] ?? null,
    'name' => $o['user_name'] ?? null,
    'custom' => array_map('strval', $o['custom'] ?? []),
  ], fn($v) => $v !== null && $v !== '' && $v !== []);
  $expires = time() + (int)($o['expires_in'] ?? 86400);
  $attrs = [
    'product_options' => $productOptions,
    'checkout_options' => ['embed' => true, 'media' => false, 'logo' => true],
    'checkout_data' => $checkoutData,
    'expires_at' => gmdate('Y-m-d\TH:i:s\Z', $expires),
    'test_mode' => ls_test_mode(),
  ];
  if (isset($o['custom_price'])) $attrs['custom_price'] = (int)$o['custom_price'];
  [$status, $res] = ls_api('POST', 'checkouts', ['data' => [
    'type' => 'checkouts',
    'attributes' => $attrs,
    'relationships' => [
      'store' => ['data' => ['type' => 'stores', 'id' => (string)LEMONSQUEEZY_STORE_ID]],
      'variant' => ['data' => ['type' => 'variants', 'id' => (string)$variantId]],
    ],
  ]]);
  $url = (string)($res['data']['attributes']['url'] ?? '');
  if ($status !== 201 || $url === '') {
    error_log('[lemonsqueezy] checkout failed: ' . $status . ' ' . json_encode($res['errors'] ?? $res));
    fail(502, 'Checkout is unavailable right now. Please try again in a few minutes.');
  }
  return ['id' => (string)$res['data']['id'], 'url' => $url, 'expires' => $expires];
}

/** Verify the X-Signature header: hex HMAC-SHA256 of the raw body with the webhook signing secret. */
function ls_verify(string $payload, string $signature, string $secret): bool
{
  if ($signature === '' || $secret === '') return false;
  return hash_equals(hash_hmac('sha256', $payload, $secret), strtolower(trim($signature)));
}
