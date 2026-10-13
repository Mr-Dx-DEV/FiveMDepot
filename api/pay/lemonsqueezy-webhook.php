<?php
/**
 * Lemon Squeezy webhook — add it in Lemon Squeezy → Settings → Webhooks:
 *   URL: https://YOUR-DOMAIN/api/pay/lemonsqueezy-webhook.php
 *   Signing secret: any long random string → also put it in LEMONSQUEEZY_WEBHOOK_SECRET (env var or config.local.php)
 *   Events: order_created, order_refunded (store orders) and subscription_created, subscription_updated,
 *           subscription_cancelled, subscription_resumed, subscription_expired, subscription_paused,
 *           subscription_unpaused (pricing page plans)
 * Anything other than a 2xx makes Lemon Squeezy retry, so failures must not answer 200.
 */
require_once __DIR__ . '/../../core/bootstrap.php';
require_once __DIR__ . '/../../core/gateways.php';
require_once __DIR__ . '/../../core/mail.php';
require_once __DIR__ . '/../../core/subscriptions.php';

$payload = file_get_contents('php://input');
$sig = $_SERVER['HTTP_X_SIGNATURE'] ?? '';
if (!defined('LEMONSQUEEZY_WEBHOOK_SECRET') || !ls_verify($payload, $sig, (string)LEMONSQUEEZY_WEBHOOK_SECRET)) {
  http_response_code(400);
  exit('bad signature');
}
$event = json_decode($payload, true) ?: [];
$meta = $event['meta'] ?? [];
$type = (string)($meta['event_name'] ?? ($_SERVER['HTTP_X_EVENT_NAME'] ?? ''));
$custom = is_array($meta['custom_data'] ?? null) ? $meta['custom_data'] : [];
$data = $event['data'] ?? [];
$a = $data['attributes'] ?? [];
// Lemon Squeezy has no event id: the resource id + event + update time identifies one delivery
$eventId = 'ls_' . $type . '_' . ($data['id'] ?? '') . '_' . ($a['updated_at'] ?? '');

// Test-mode events never touch a live site (and live events never touch a test-mode site).
// Orders and subscriptions carry test_mode in their attributes; meta.test_mode is the fallback.
if ((bool)($a['test_mode'] ?? $meta['test_mode'] ?? false) !== ls_test_mode()) {
  error_log("[lemonsqueezy] ignored $type: test_mode mismatch");
  exit('ignored');
}

// Plans (pricing page): upserts are idempotent and ignore older payloads, so they run on every
// delivery — a failure throws (500) and Lemon Squeezy retries. The event is logged after success.
if (sub_handle_event($type, $data, $custom)) {
  record_payment_event('LEMONSQUEEZY', $eventId, null, $type, $a['status'] ?? null, null, null, $payload);
  exit('ok');
}
if ($type !== 'order_created' && $type !== 'order_refunded') exit('ok');

// The first order of a plan subscription: the subscription_* events carry the state
$orderId = (string)($custom['order_id'] ?? '');
$lsOrderId = (string)($data['id'] ?? '');
if ($orderId === '' && $type === 'order_created') {
  record_payment_event('LEMONSQUEEZY', $eventId, null, $type, $a['status'] ?? null, null, null, $payload);
  exit('ok');
}

$o = $orderId !== '' ? Db::one("SELECT id, status, payment_method, total_amount FROM orders WHERE id = ?", [$orderId])
   : Db::one("SELECT id, status, payment_method, total_amount FROM orders WHERE gateway_ref = ?", [$lsOrderId]);
$currency = strtoupper((string)($a['currency'] ?? ''));
$amount = isset($a['total']) ? (int)$a['total'] / 100 : null;

// Lemon Squeezy retries until it gets a 2xx; the same event is only processed once
if (!record_payment_event('LEMONSQUEEZY', $eventId, $o['id'] ?? null, $type, $a['status'] ?? null, $amount, $currency ?: null, $payload)) {
  exit('duplicate');
}
if (!$o || $o['payment_method'] !== 'LEMONSQUEEZY') { error_log("[lemonsqueezy] no order for $type $lsOrderId"); exit('ok'); }

// Paid: the checkout was created by us for our order variant with our own price — check both before delivering
if ($type === 'order_created' && ($a['status'] ?? '') === 'paid') {
  $variantOk = (string)($a['first_order_item']['variant_id'] ?? '') === (string)LEMONSQUEEZY_ORDER_VARIANT_ID;
  $expected = (int)round((float)$o['total_amount'] * 100);
  $paidUsd = (int)($a['subtotal_usd'] ?? 0) - (int)($a['discount_total_usd'] ?? 0);
  if (!$variantOk || $paidUsd < $expected - 1) {
    error_log("[lemonsqueezy] order {$o['id']} not fulfilled: variant ok=" . (int)$variantOk . " paid=$paidUsd expected=$expected");
    audit('order_payment_mismatch', 'order', $o['id']);
    exit('ok');
  }
  if (fulfil_order($o['id'], null, 'Paid via Lemon Squeezy', ['ref' => $lsOrderId, 'amount' => $amount, 'currency' => $currency])) {
    audit('order_paid_lemonsqueezy', 'order', $o['id']);
    mail_order_approved($o['id']);
  }
}

// Full refund in Lemon Squeezy: the licence ends and downloads are removed from the library
if ($type === 'order_refunded' && (($a['status'] ?? '') === 'refunded' || !empty($a['refunded']))
    && in_array($o['status'], ['VERIFIED', 'COMPLETED'], true)) {
  $pdo = Db::pdo();
  $pdo->prepare("UPDATE orders SET status = 'REFUNDED', admin_note = ? WHERE id = ?")
    ->execute(['Lemon Squeezy refund ' . $lsOrderId, $o['id']]);
  $pdo->prepare("DELETE FROM download_codes WHERE order_id = ?")->execute([$o['id']]);
  audit('order_refund_lemonsqueezy', 'order', $o['id']);
}
echo 'ok';
