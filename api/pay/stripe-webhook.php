<?php
/**
 * Stripe webhook — add this URL in Stripe Dashboard → Developers → Webhooks:
 *   https://YOUR-DOMAIN/api/pay/stripe-webhook.php
 * Events: checkout.session.completed, checkout.session.async_payment_succeeded
 */
require_once __DIR__ . '/../../core/bootstrap.php';
require_once __DIR__ . '/../../core/gateways.php';

$payload = file_get_contents('php://input');
$sig = $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '';
if (!defined('STRIPE_WEBHOOK_SECRET') || !stripe_verify($payload, $sig, STRIPE_WEBHOOK_SECRET)) {
  http_response_code(400);
  exit('bad signature');
}
$event = json_decode($payload, true) ?: [];
$type = (string)($event['type'] ?? '');
$s = $event['data']['object'] ?? [];
$orderId = (string)($s['client_reference_id'] ?? ($s['metadata']['order_id'] ?? ''));
$amount = isset($s['amount_total']) ? $s['amount_total'] / 100 : null;
$currency = strtoupper((string)($s['currency'] ?? ''));

if (!record_payment_event('STRIPE', (string)($event['id'] ?? uniqid('evt_', true)), $orderId ?: null, $type, $s['payment_status'] ?? null, $amount, $currency, $payload)) {
  exit('duplicate'); // already handled
}

if (in_array($type, ['checkout.session.completed', 'checkout.session.async_payment_succeeded'], true) && ($s['payment_status'] ?? '') === 'paid') {
  $o = Db::one("SELECT id, total_amount, payment_method FROM orders WHERE id = ?", [$orderId]);
  if (!$o || $o['payment_method'] !== 'STRIPE') { error_log("[stripe] unknown order $orderId"); exit('ok'); }
  if ($currency !== 'USD' || !money_eq((float)$amount, (float)$o['total_amount'])) {
    error_log("[stripe] amount mismatch for $orderId: $amount $currency vs {$o['total_amount']} USD");
    Db::pdo()->prepare("UPDATE orders SET admin_note = ? WHERE id = ?")->execute(["Stripe paid $amount $currency — amount mismatch, check manually", $orderId]);
    exit('ok');
  }
  if (fulfil_order($orderId, null, 'Paid by card (Stripe)', ['ref' => $s['id'] ?? null, 'amount' => $amount, 'currency' => $currency])) {
    audit('order_paid_stripe', 'order', $orderId);
  }
}
echo 'ok';
