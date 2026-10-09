<?php
/**
 * Paddle webhook — add this URL in Paddle → Developer tools → Notifications → New destination:
 *   https://YOUR-DOMAIN/api/pay/paddle-webhook.php
 * Events: transaction.completed, adjustment.created, adjustment.updated (store orders) and
 *         subscription.created/updated/canceled, customer.created/updated (pricing page plans)
 * Copy the destination's secret key into PADDLE_WEBHOOK_SECRET (env var or config.local.php).
 * Anything other than a 2xx makes Paddle retry, so failures must not answer 200.
 */
require_once __DIR__ . '/../../core/bootstrap.php';
require_once __DIR__ . '/../../core/gateways.php';
require_once __DIR__ . '/../../core/mail.php';
require_once __DIR__ . '/../../core/subscriptions.php';

// Only Paddle's published sender IPs (fetched from Paddle's /ips endpoint, cached) may deliver here.
// 403 (not 2xx) so a genuine delivery that was wrongly blocked is retried by Paddle.
if (!paddle_source_allowed()) {
  http_response_code(403);
  exit('forbidden');
}

$payload = file_get_contents('php://input');
$sig = $_SERVER['HTTP_PADDLE_SIGNATURE'] ?? '';
if (!defined('PADDLE_WEBHOOK_SECRET') || PADDLE_WEBHOOK_SECRET === '' || !paddle_verify($payload, $sig, PADDLE_WEBHOOK_SECRET)) {
  http_response_code(400);
  exit('bad signature');
}
$event = json_decode($payload, true) ?: [];
$type = (string)($event['event_type'] ?? '');
$d = $event['data'] ?? [];

// Plans (pricing page): upserts keyed on Paddle IDs are idempotent and ignore older payloads, so they run
// on every delivery — a failure throws (500) and Paddle retries. The event is logged after success.
if (sub_handle_event($type, $d)) {
  record_payment_event('PADDLE', (string)($event['event_id'] ?? uniqid('evt_', true)), null, $type, $d['status'] ?? null, null, null, $payload);
  exit('ok');
}
// A plan's transaction.completed: the subscription.* events carry the state, nothing else to do
if ($type === 'transaction.completed' && !empty($d['subscription_id'])) {
  record_payment_event('PADDLE', (string)($event['event_id'] ?? uniqid('evt_', true)), null, $type, $d['status'] ?? null, null, null, $payload);
  exit('ok');
}

$isAdjustment = strpos($type, 'adjustment.') === 0;
$txnId = (string)($isAdjustment ? ($d['transaction_id'] ?? '') : ($d['id'] ?? ''));
$o = $txnId !== '' ? Db::one("SELECT id, status, payment_method FROM orders WHERE gateway_ref = ?", [$txnId]) : null;
$currency = strtoupper((string)($d['currency_code'] ?? ''));
$amount = isset($d['details']['totals']['grand_total']) ? (int)$d['details']['totals']['grand_total'] / 100
        : (isset($d['totals']['total']) ? (int)$d['totals']['total'] / 100 : null);

// Paddle retries until it gets a 2xx; the same event is only processed once
if (!record_payment_event('PADDLE', (string)($event['event_id'] ?? uniqid('evt_', true)), $o['id'] ?? null, $type, $d['status'] ?? null, $amount, $currency ?: null, $payload)) {
  exit('duplicate');
}
if (!$o || $o['payment_method'] !== 'PADDLE') { error_log("[paddle] no order for $type $txnId"); exit('ok'); }

// Paid: the transaction id was created by us with our own prices, so it is trusted once it matches the order
if ($type === 'transaction.completed' && ($d['status'] ?? '') === 'completed') {
  if (fulfil_order($o['id'], null, 'Paid via Paddle', ['ref' => $txnId, 'amount' => $amount, 'currency' => $currency])) {
    audit('order_paid_paddle', 'order', $o['id']);
    mail_order_approved($o['id']);
  }
}

// Refund or chargeback approved by Paddle: the licence ends and downloads are removed from the library
if ($isAdjustment && in_array($d['action'] ?? '', ['refund', 'chargeback'], true) && ($d['status'] ?? '') === 'approved'
    && ($d['type'] ?? 'full') === 'full' && in_array($o['status'], ['VERIFIED', 'COMPLETED'], true)) {
  $pdo = Db::pdo();
  $pdo->prepare("UPDATE orders SET status = 'REFUNDED', admin_note = ? WHERE id = ?")
    ->execute(['Paddle ' . $d['action'] . ' ' . ($d['id'] ?? ''), $o['id']]);
  $pdo->prepare("DELETE FROM download_codes WHERE order_id = ?")->execute([$o['id']]);
  audit('order_' . $d['action'] . '_paddle', 'order', $o['id']);
}
echo 'ok';
