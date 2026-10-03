<?php
/**
 * SSLCommerz callbacks (URLs are sent automatically with each payment):
 *   ?action=ipn      server-to-server notification
 *   ?action=success  customer returns after paying   (browser POST)
 *   ?action=fail / cancel
 * A payment is only accepted after the SSLCommerz validation API confirms it.
 */
require_once __DIR__ . '/../../core/bootstrap.php';
require_once __DIR__ . '/../../core/gateways.php';

$action = $_GET['action'] ?? '';
$orderId = (string)($_POST['tran_id'] ?? $_POST['value_a'] ?? '');
$root = site_root_url();
$back = $root . 'checkout.html?order=' . rawurlencode($orderId);

/** Validate with SSLCommerz and fulfil. Returns true when the order is (now) paid. */
function sslcz_confirm(string $orderId): bool
{
  $valId = (string)($_POST['val_id'] ?? '');
  if ($valId === '' || $orderId === '') return false;
  $v = sslcommerz_validate($valId);
  if (!$v || ($v['tran_id'] ?? '') !== $orderId) return false;
  record_payment_event('SSLCOMMERZ', $valId, $orderId, 'validation', $v['status'], $v['currency_amount'] ?? null, $v['currency_type'] ?? null, json_encode($v));
  $o = Db::one("SELECT id, total_amount, payment_method, status FROM orders WHERE id = ?", [$orderId]);
  if (!$o || $o['payment_method'] !== 'SSLCOMMERZ') return false;
  if (in_array($o['status'], ['VERIFIED', 'COMPLETED'], true)) return true;
  if (strtoupper((string)($v['currency_type'] ?? '')) !== 'USD' || !money_eq((float)($v['currency_amount'] ?? 0), (float)$o['total_amount'])) {
    error_log("[sslcommerz] amount mismatch for $orderId");
    Db::pdo()->prepare("UPDATE orders SET admin_note = ? WHERE id = ?")->execute(['SSLCommerz amount mismatch — check manually', $orderId]);
    return false;
  }
  if (fulfil_order($orderId, null, 'Paid via SSLCommerz (' . ($v['card_type'] ?? 'online') . ')',
      ['ref' => $v['bank_tran_id'] ?? $valId, 'amount' => (float)$v['currency_amount'], 'currency' => 'USD'])) {
    audit('order_paid_sslcommerz', 'order', $orderId);
  }
  return true;
}

switch ($action) {
  case 'ipn':
    if (!sslcz_confirm($orderId)) { http_response_code(400); exit('not valid'); }
    exit('ok');
  case 'success':
    header('Location: ' . $back . (sslcz_confirm($orderId) ? '&paid=1' : '&failed=1'));
    exit;
  case 'fail':
    header('Location: ' . $back . '&failed=1');
    exit;
  case 'cancel':
  default:
    header('Location: ' . $back . '&cancelled=1');
    exit;
}
