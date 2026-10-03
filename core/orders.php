<?php
/**
 * Orders: completing paid orders (shared by admin approval and payment gateways),
 * and the list of payment methods available at checkout.
 */

/**
 * Mark an order as paid and deliver it: unlock downloads, credit sellers, count the promo use.
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
    // Sellers (not admin-owned products) get their share minus the platform fee
    $fee = min(100, max(0, (float)setting('platform_fee_percent', '0')));
    $pdo->prepare("UPDATE users u JOIN (
                     SELECT p.user_id, SUM(op.price_paid) AS amt FROM order_products op JOIN products p ON p.id = op.product_id
                     JOIN users s ON s.id = p.user_id AND s.role <> 'ADMIN' WHERE op.order_id = ? GROUP BY p.user_id
                   ) x ON x.user_id = u.id SET u.wallet_balance = u.wallet_balance + ROUND(x.amt * (100 - ?) / 100, 2)")
      ->execute([$orderId, $fee]);
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
  $c = fn($k) => defined($k) && constant($k) !== '';
  switch ($id) {
    case 'STRIPE': return setting('pay_stripe_enabled', '1') === '1' && $c('STRIPE_SECRET_KEY') && $c('STRIPE_WEBHOOK_SECRET');
    case 'CRYPTO': return setting('pay_crypto_enabled', '1') === '1' && $c('NOWPAYMENTS_API_KEY') && $c('NOWPAYMENTS_IPN_SECRET');
    case 'SSLCOMMERZ': return setting('pay_sslcommerz_enabled', '1') === '1' && $c('SSLCZ_STORE_ID') && $c('SSLCZ_STORE_PASSWORD');
    case 'MANUAL': return setting('pay_manual_enabled', '1') === '1';
    case 'BMC': return setting('pay_bmc_enabled', '1') === '1' && preg_match('#^https://#', setting('bmc_link', 'https://buymeacoffee.com/dxfivem'));
  }
  return false;
}

/** Payment methods shown at checkout, in display order. */
function payment_methods(): array
{
  $all = [
    ['id' => 'STRIPE', 'type' => 'online', 'name' => 'Card', 'desc' => 'Visa, Mastercard, Amex, Apple Pay, Google Pay'],
    ['id' => 'CRYPTO', 'type' => 'online', 'name' => 'Crypto', 'desc' => 'USDT, BTC, ETH, LTC and 100+ coins'],
    ['id' => 'SSLCOMMERZ', 'type' => 'online', 'name' => 'SSLCommerz', 'desc' => 'International & local cards, bKash, Nagad, Rocket'],
  ];
  $out = array_values(array_filter($all, fn($m) => gateway_ready($m['id'])));
  if (gateway_ready('BMC')) {
    // Pay on the external page, then submit transaction id / email / amount / note for manual verification
    $out[] = ['id' => 'BMC', 'type' => 'external', 'name' => 'Buy Me a Coffee', 'desc' => 'Card, Apple Pay, Google Pay — verified by our team',
              'link' => setting('bmc_link', 'https://buymeacoffee.com/dxfivem')];
  }
  if (gateway_ready('MANUAL')) {
    foreach ([['BKASH', 'bKash', 'bkash_number'], ['NAGAD', 'Nagad', 'nagad_number'], ['BANK_TRANSFER', 'Bank transfer', 'bank_account']] as [$id, $name, $key]) {
      $v = setting($key);
      if ($v !== '' && !preg_match('/X{4,}|^0+$/', $v)) $out[] = ['id' => $id, 'type' => 'manual', 'name' => $name, 'desc' => 'Send money, then upload a screenshot'];
    }
  }
  return $out;
}
