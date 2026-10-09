<?php
/**
 * Orders: completing paid orders (shared by admin approval and the Paddle webhook),
 * and the list of payment methods available at checkout.
 */

/**
 * Mark an order as paid and deliver it: unlock downloads, count the promo use.
 * Idempotent — calling it again for a paid order does nothing and returns false.
 * Must be called inside a transaction when $inTransaction is true.
 */
function fulfil_order(string $orderId, ?string $actorId = null, ?string $note = null, array $payment = []): bool
{
  $pdo = Db::pdo();
  $own = !$pdo->inTransaction();
  if ($own) $pdo->beginTransaction();
  try {
    $o = Db::one("SELECT id, user_id, status, promo_id FROM orders WHERE id = ? FOR UPDATE", [$orderId]);
    if (!$o || in_array($o['status'], ['VERIFIED', 'COMPLETED', 'REFUNDED'], true)) {
      if ($own) $pdo->commit();
      return false;
    }
    $code = bin2hex(random_bytes(24));
    $days = max(1, (int)setting('download_expiry_days', '30'));
    $pdo->prepare("UPDATE orders SET status = 'VERIFIED', download_code = ?, verified_by = ?, verified_at = NOW(), admin_note = COALESCE(?, admin_note),
                   gateway_ref = COALESCE(?, gateway_ref), paid_amount = COALESCE(?, paid_amount), paid_currency = COALESCE(?, paid_currency), paid_at = NOW()
                   WHERE id = ?")
      ->execute([$code, $actorId, $note, $payment['ref'] ?? null, $payment['amount'] ?? null, $payment['currency'] ?? null, $orderId]);
    $pdo->prepare("INSERT INTO download_codes (id, order_id, user_id, code, expires_at) VALUES (?, ?, ?, ?, NOW() + INTERVAL ? DAY)
                   ON DUPLICATE KEY UPDATE code = VALUES(code), expires_at = VALUES(expires_at)")
      ->execute([uuid(), $orderId, $o['user_id'], $code, $days]);
    if ($o['promo_id']) $pdo->prepare("UPDATE promos SET uses_count = uses_count + 1 WHERE id = ?")->execute([$o['promo_id']]);
    $pdo->prepare("UPDATE payment_proofs SET status = 'APPROVED', reviewed_by = ?, reviewed_at = NOW(), review_note = ? WHERE order_id = ? AND status = 'PENDING'")
      ->execute([$actorId, $note, $orderId]);
    if ($own) $pdo->commit();
    return true;
  } catch (Throwable $e) {
    if ($own && $pdo->inTransaction()) $pdo->rollBack();
    throw $e;
  }
}

/** Gateway is switched on in Settings AND its keys exist in config.local.php. */
function gateway_ready(string $id): bool
{
  if ($id !== 'PADDLE') return false;
  require_once __DIR__ . '/gateways.php';
  return setting('pay_paddle_enabled', '1') === '1' && paddle_configured();
}

/** Payment methods shown at checkout. Paddle is the only processor (Merchant of Record). */
function payment_methods(): array
{
  if (!gateway_ready('PADDLE')) return [];
  return [['id' => 'PADDLE', 'type' => 'online', 'name' => 'Card, PayPal, Apple Pay, Google Pay', 'desc' => 'Secure checkout by Paddle · tax included where required']];
}
