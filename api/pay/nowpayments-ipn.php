<?php
/**
 * NOWPayments IPN (instant payment notification). The URL is sent automatically with
 * each invoice; set your IPN secret in NOWPayments → Settings → Payments → IPN.
 */
require_once __DIR__ . '/../../core/bootstrap.php';
require_once __DIR__ . '/../../core/gateways.php';
require_once __DIR__ . '/../../core/mail.php';

$payload = file_get_contents('php://input');
$data = json_decode($payload, true);
$sig = $_SERVER['HTTP_X_NOWPAYMENTS_SIG'] ?? '';
if (!is_array($data) || !defined('NOWPAYMENTS_IPN_SECRET') || !$sig
    || !hash_equals(nowpayments_signature($data, NOWPAYMENTS_IPN_SECRET), $sig)) {
  http_response_code(400);
  exit('bad signature');
}

$orderId = (string)($data['order_id'] ?? '');
$status = (string)($data['payment_status'] ?? '');
$eventId = ($data['payment_id'] ?? 'x') . ':' . $status;
if (!record_payment_event('CRYPTO', $eventId, $orderId ?: null, 'ipn', $status, $data['price_amount'] ?? null, strtoupper((string)($data['price_currency'] ?? '')), $payload)) {
  exit('duplicate');
}

$o = Db::one("SELECT id, total_amount, payment_method FROM orders WHERE id = ?", [$orderId]);
if (!$o || $o['payment_method'] !== 'CRYPTO') { error_log("[nowpayments] unknown order $orderId"); exit('ok'); }

if ($status === 'finished') {
  $priceAmount = (float)($data['price_amount'] ?? 0);
  if (strtolower((string)($data['price_currency'] ?? '')) !== 'usd' || !money_eq($priceAmount, (float)$o['total_amount'])) {
    error_log("[nowpayments] amount mismatch for $orderId");
    Db::pdo()->prepare("UPDATE orders SET admin_note = ? WHERE id = ?")->execute(['Crypto payment amount mismatch — check NOWPayments', $orderId]);
    exit('ok');
  }
  if (fulfil_order($orderId, null, 'Paid with crypto (' . strtoupper((string)($data['pay_currency'] ?? '')) . ')',
      ['ref' => (string)($data['payment_id'] ?? ''), 'amount' => $priceAmount, 'currency' => 'USD'])) {
    audit('order_paid_crypto', 'order', $orderId);
    mail_order_approved($orderId);
  }
} elseif ($status === 'partially_paid') {
  Db::pdo()->prepare("UPDATE orders SET admin_note = ? WHERE id = ? AND status = 'AWAITING_PAYMENT'")
    ->execute(['Crypto: partially paid (' . ($data['actually_paid'] ?? '?') . ' ' . strtoupper((string)($data['pay_currency'] ?? '')) . ') — contact the customer', $orderId]);
} elseif (in_array($status, ['failed', 'expired'], true)) {
  Db::pdo()->prepare("UPDATE orders SET status = 'CANCELLED', admin_note = ? WHERE id = ? AND status = 'AWAITING_PAYMENT'")
    ->execute(['Crypto payment ' . $status, $orderId]);
}
echo 'ok';
