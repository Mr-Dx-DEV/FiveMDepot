<?php
/**
 * Payment gateways: Stripe Checkout (cards), NOWPayments (crypto), SSLCommerz.
 * Keys come from config.local.php. Every confirmation is verified (signature or
 * server-to-server validation) and the paid amount/currency must match the order.
 */
require_once __DIR__ . '/http.php';
require_once __DIR__ . '/orders.php';

function money_eq(float $a, float $b): bool { return abs($a - $b) < 0.01; }

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
  $o = Db::one("SELECT o.id, o.user_id, o.total_amount, o.status, o.payment_method, u.email, u.name
                FROM orders o JOIN users u ON u.id = o.user_id WHERE o.id = ?", [$orderId]);
  if (!$o) return null;
  $o['lines'] = Db::all("SELECT op.price_paid, p.title FROM order_products op LEFT JOIN products p ON p.id = op.product_id WHERE op.order_id = ?", [$orderId]);
  return $o;
}

/**
 * Create the hosted payment page for an order and return its URL.
 * Throws ApiError if the gateway refuses.
 */
function start_gateway_payment(array $o): string
{
  $root = site_root_url();
  $back = $root . 'checkout.html?order=' . rawurlencode($o['id']);
  switch ($o['payment_method']) {
    case 'STRIPE':  [$url, $ref] = stripe_create_session($o, $back); break;
    case 'CRYPTO':  [$url, $ref] = nowpayments_create_invoice($o, $back); break;
    case 'SSLCOMMERZ': [$url, $ref] = sslcommerz_create_session($o); break;
    default: fail(422, 'This payment method is not available');
  }
  Db::pdo()->prepare("UPDATE orders SET gateway_ref = ? WHERE id = ?")->execute([$ref, $o['id']]);
  return $url;
}

// ============================================================
// Stripe Checkout
// ============================================================
function stripe_base(): string { return defined('STRIPE_API_BASE') ? STRIPE_API_BASE : 'https://api.stripe.com'; }

function stripe_create_session(array $o, string $back): array
{
  $form = [
    'mode' => 'payment',
    'success_url' => $back . '&paid=1',
    'cancel_url' => $back . '&cancelled=1',
    'client_reference_id' => $o['id'],
    'customer_email' => $o['email'],
    'metadata[order_id]' => $o['id'],
    'payment_intent_data[metadata][order_id]' => $o['id'],
  ];
  foreach (array_values($o['lines']) as $i => $l) {
    $form["line_items[$i][quantity]"] = 1;
    $form["line_items[$i][price_data][currency]"] = 'usd';
    $form["line_items[$i][price_data][unit_amount]"] = (int)round((float)$l['price_paid'] * 100);
    $form["line_items[$i][price_data][product_data][name]"] = mb_substr($l['title'] ?: 'FiveMDepot resource', 0, 200);
  }
  [$status, $res] = http_request('POST', stripe_base() . '/v1/checkout/sessions', $form, ['Authorization: Bearer ' . STRIPE_SECRET_KEY]);
  if ($status !== 200 || empty($res['url'])) {
    error_log('[stripe] session failed: ' . $status . ' ' . json_encode($res['error'] ?? $res));
    fail(502, 'Card payment is unavailable right now. Please try another method.');
  }
  return [$res['url'], $res['id']];
}

/** Verify the Stripe-Signature header (HMAC-SHA256 of "timestamp.payload"), 5-minute tolerance. */
function stripe_verify(string $payload, string $header, string $secret, int $tolerance = 300): bool
{
  $t = null; $sigs = [];
  foreach (explode(',', $header) as $part) {
    [$k, $v] = array_pad(explode('=', trim($part), 2), 2, '');
    if ($k === 't') $t = (int)$v;
    if ($k === 'v1') $sigs[] = $v;
  }
  if (!$t || !$sigs || abs(time() - $t) > $tolerance) return false;
  $expected = hash_hmac('sha256', $t . '.' . $payload, $secret);
  foreach ($sigs as $s) if (hash_equals($expected, $s)) return true;
  return false;
}

// ============================================================
// NOWPayments (crypto)
// ============================================================
function nowpayments_base(): string
{
  if (defined('NOWPAYMENTS_API_BASE')) return NOWPAYMENTS_API_BASE;
  return (defined('NOWPAYMENTS_SANDBOX') && NOWPAYMENTS_SANDBOX) ? 'https://api-sandbox.nowpayments.io' : 'https://api.nowpayments.io';
}

function nowpayments_create_invoice(array $o, string $back): array
{
  $body = json_encode([
    'price_amount' => round((float)$o['total_amount'], 2),
    'price_currency' => 'usd',
    'order_id' => $o['id'],
    'order_description' => 'FiveMDepot order ' . substr($o['id'], 0, 8),
    'ipn_callback_url' => site_root_url() . 'api/pay/nowpayments-ipn.php',
    'success_url' => $back . '&paid=1',
    'cancel_url' => $back . '&cancelled=1',
  ]);
  [$status, $res] = http_request('POST', nowpayments_base() . '/v1/invoice', [], ['x-api-key: ' . NOWPAYMENTS_API_KEY, 'Content-Type: application/json'], $body);
  if ($status < 200 || $status >= 300 || empty($res['invoice_url'])) {
    error_log('[nowpayments] invoice failed: ' . $status . ' ' . json_encode($res));
    fail(502, 'Crypto payment is unavailable right now. Please try another method.');
  }
  return [$res['invoice_url'], (string)($res['id'] ?? '')];
}

/** NOWPayments IPN: HMAC-SHA512 of the JSON body with keys sorted recursively. */
function nowpayments_signature(array $data, string $secret): string
{
  $sort = function (array $a) use (&$sort): array {
    ksort($a);
    foreach ($a as $k => $v) if (is_array($v)) $a[$k] = $sort($v);
    return $a;
  };
  return hash_hmac('sha512', json_encode($sort($data), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE), $secret);
}

// ============================================================
// SSLCommerz
// ============================================================
function sslcommerz_base(): string
{
  if (defined('SSLCZ_API_BASE')) return SSLCZ_API_BASE;
  return (defined('SSLCZ_SANDBOX') && SSLCZ_SANDBOX) ? 'https://sandbox.sslcommerz.com' : 'https://securepay.sslcommerz.com';
}

function sslcommerz_create_session(array $o): array
{
  $cb = site_root_url() . 'api/pay/sslcommerz.php?action=';
  $form = [
    'store_id' => SSLCZ_STORE_ID, 'store_passwd' => SSLCZ_STORE_PASSWORD,
    'total_amount' => number_format((float)$o['total_amount'], 2, '.', ''), 'currency' => 'USD', 'tran_id' => $o['id'],
    'success_url' => $cb . 'success', 'fail_url' => $cb . 'fail', 'cancel_url' => $cb . 'cancel', 'ipn_url' => $cb . 'ipn',
    'cus_name' => mb_substr($o['name'] ?: 'Customer', 0, 50), 'cus_email' => $o['email'],
    'cus_add1' => 'N/A', 'cus_city' => 'N/A', 'cus_country' => 'N/A', 'cus_phone' => '0000000000',
    'shipping_method' => 'NO', 'num_of_item' => count($o['lines']),
    'product_name' => mb_substr(implode(', ', array_map(fn($l) => $l['title'] ?: 'Resource', $o['lines'])), 0, 250),
    'product_category' => 'Digital goods', 'product_profile' => 'non-physical-goods',
    'value_a' => $o['id'],
  ];
  [$status, $res] = http_request('POST', sslcommerz_base() . '/gwprocess/v4/api.php', $form);
  if ($status !== 200 || ($res['status'] ?? '') !== 'SUCCESS' || empty($res['GatewayPageURL'])) {
    error_log('[sslcommerz] session failed: ' . $status . ' ' . json_encode($res));
    fail(502, 'SSLCommerz is unavailable right now. Please try another method.');
  }
  return [$res['GatewayPageURL'], (string)($res['sessionkey'] ?? $o['id'])];
}

/** Ask SSLCommerz to confirm a payment (server-to-server). Returns the validation data or null. */
function sslcommerz_validate(string $valId): ?array
{
  $url = sslcommerz_base() . '/validator/api/validationserverAPI.php?' . http_build_query([
    'val_id' => $valId, 'store_id' => SSLCZ_STORE_ID, 'store_passwd' => SSLCZ_STORE_PASSWORD, 'v' => 1, 'format' => 'json',
  ]);
  [$status, $res] = http_request('GET', $url);
  if ($status !== 200 || !in_array($res['status'] ?? '', ['VALID', 'VALIDATED'], true)) return null;
  return $res;
}
