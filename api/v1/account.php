<?php
/**
 * Customer account: overview, orders, downloads, reviews, wishlist, refunds
 * Checkout: quote + place order (prices always come from the database)
 */
require_once __DIR__ . '/../../core/catalog.php';
require_once __DIR__ . '/../../core/gateways.php';
require_once __DIR__ . '/../../core/mail.php';

/** Product ids this user can download (paid orders, own products, or free products). */
function owned_product_ids(string $userId): array
{
  return array_column(Db::all(
    "SELECT DISTINCT op.product_id FROM order_products op JOIN orders o ON o.id = op.order_id
     WHERE o.user_id = ? AND o.status IN ('VERIFIED','COMPLETED')", [$userId]), 'product_id');
}

function user_can_download(array $u, array $product): bool
{
  if ($u['role'] === 'ADMIN' || $product['user_id'] === $u['id']) return true;
  if ((float)$product['price'] == 0 && $product['status'] === 'PUBLISHED') return true;
  return (bool)Db::value(
    "SELECT COUNT(*) FROM order_products op JOIN orders o ON o.id = op.order_id
     WHERE o.user_id = ? AND op.product_id = ? AND o.status IN ('VERIFIED','COMPLETED')", [$u['id'], $product['id']]);
}

// ============================================================
// Overview + orders
// ============================================================
route('GET', 'account/overview', function () {
  $u = require_user();
  ok([
    'user' => $u,
    'stats' => [
      'purchases' => count(owned_product_ids($u['id'])),
      'spent' => (float)Db::value("SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE user_id = ? AND status IN ('VERIFIED','COMPLETED')", [$u['id']]),
      'pending' => (int)Db::value("SELECT COUNT(*) FROM orders WHERE user_id = ? AND status = 'PENDING'", [$u['id']]),
      'wishlist' => (int)Db::value("SELECT COUNT(*) FROM wishlist WHERE user_id = ?", [$u['id']]),
    ],
  ]);
});

route('GET', 'account/orders', function () {
  $u = require_user();
  $orders = Db::all("SELECT id, total_amount, status, payment_method, transaction_id, admin_note, created_at, verified_at
                     FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 100", [$u['id']]);
  $items = [];
  if ($orders) {
    $ids = array_column($orders, 'id');
    foreach (Db::all("SELECT op.order_id, op.product_id, op.price_paid, p.title, p.slug, p.screenshots, p.version
                      FROM order_products op LEFT JOIN products p ON p.id = op.product_id
                      WHERE op.order_id IN (" . Db::in($ids) . ")", $ids) as $r) {
      $r['image'] = json_col($r['screenshots'])[0] ?? null;
      unset($r['screenshots']);
      $items[$r['order_id']][] = $r;
    }
  }
  foreach ($orders as &$o) $o['items'] = $items[$o['id']] ?? [];
  ok($orders);
});

// Everything the user can download (one row per product)
route('GET', 'account/library', function () {
  $u = require_user();
  $ids = owned_product_ids($u['id']);
  if (!$ids) ok([]);
  $rows = Db::all("SELECT p.id, p.title, p.slug, p.version, p.changelog, p.screenshots, p.updated_at, p.files IS NOT NULL AND p.files <> '' AS has_file,
                          (SELECT r.rating FROM reviews r WHERE r.product_id = p.id AND r.user_id = ?) AS my_rating
                   FROM products p WHERE p.id IN (" . Db::in($ids) . ") ORDER BY p.title", array_merge([$u['id']], $ids));
  foreach ($rows as &$r) {
    $r['image'] = json_col($r['screenshots'])[0] ?? null;
    unset($r['screenshots']);
    $r['has_file'] = (bool)$r['has_file'];
    $r['my_rating'] = $r['my_rating'] !== null ? (int)$r['my_rating'] : null;
  }
  ok($rows);
});

// Stream a product file to its owner. Files live in uploads/files (not web-readable).
route('GET', 'account/download/{id}', function ($p) {
  $u = current_user();
  if (!$u) { header('Location: ../auth.html?next=' . rawurlencode('dashboard/buyer.html')); exit; }
  $product = Db::one("SELECT id, user_id, title, slug, version, price, status, files FROM products WHERE id = ?", [$p['id']]);
  if (!$product) fail(404, 'Product not found');
  if (!user_can_download($u, $product)) fail(403, 'Buy this product to download it');
  $file = trim((string)$product['files']);
  if ($file === '') fail(404, 'The seller has not uploaded a file yet. Please contact support.');

  Db::pdo()->prepare("UPDATE products SET downloads = downloads + 1 WHERE id = ?")->execute([$product['id']]);
  audit('download', 'product', $product['id']);

  if (preg_match('#^https://#i', $file)) { header('Location: ' . $file); exit; } // externally hosted file
  $root = realpath(dirname(__DIR__, 2) . '/uploads');
  $full = realpath(dirname(__DIR__, 2) . '/' . ltrim($file, '/'));
  if (!$root || !$full || !str_starts_with($full, $root) || !is_file($full)) fail(404, 'File missing on the server. Please contact support.');
  $ext = pathinfo($full, PATHINFO_EXTENSION);
  $name = $product['slug'] . '-v' . preg_replace('/[^0-9a-z.]/i', '', (string)$product['version']) . ($ext ? '.' . $ext : '');
  while (ob_get_level()) ob_end_clean();
  header('Content-Type: application/octet-stream');
  header('Content-Disposition: attachment; filename="' . $name . '"');
  header('Content-Length: ' . filesize($full));
  header('X-Content-Type-Options: nosniff');
  header('Cache-Control: private, no-store');
  readfile($full);
  exit;
});

// ============================================================
// Reviews (only for owned products)
// ============================================================
route('POST', 'account/reviews', function () {
  $u = require_user();
  $pid = str_in('product_id', 36);
  $rating = int_in('rating');
  $comment = str_in('comment', 2000);
  if ($rating < 1 || $rating > 5) fail(422, 'Choose 1 to 5 stars', ['rating' => 'Required']);
  $product = Db::one("SELECT id, user_id, price, status FROM products WHERE id = ?", [$pid]);
  if (!$product) fail(404, 'Product not found');
  if ($product['user_id'] === $u['id']) fail(403, 'You cannot review your own product');
  if (!in_array($pid, owned_product_ids($u['id']), true) && (float)$product['price'] > 0) fail(403, 'Only buyers can review this product');
  Db::pdo()->prepare("INSERT INTO reviews (id, user_id, product_id, rating, comment) VALUES (?, ?, ?, ?, ?)
                      ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment), created_at = NOW()")
    ->execute([uuid(), $u['id'], $pid, $rating, $comment ?: null]);
  ok(['saved' => true]);
});

// ============================================================
// Wishlist
// ============================================================
route('GET', 'account/wishlist', function () {
  $u = require_user();
  $rows = Db::all("SELECT p.id, p.slug, p.title, p.price, p.sale_price, p.screenshots, p.status, w.added_at
                   FROM wishlist w JOIN products p ON p.id = w.product_id WHERE w.user_id = ? ORDER BY w.added_at DESC", [$u['id']]);
  foreach ($rows as &$r) {
    $r['image'] = json_col($r['screenshots'])[0] ?? null;
    unset($r['screenshots']);
    $r['price'] = (float)$r['price'];
    $r['sale_price'] = $r['sale_price'] !== null ? (float)$r['sale_price'] : null;
  }
  ok($rows);
});

route('POST', 'account/wishlist/{id}', function ($p) {
  $u = require_user();
  if (!Db::value("SELECT COUNT(*) FROM products WHERE id = ?", [$p['id']])) fail(404, 'Product not found');
  $on = bool_in('on', true);
  if ($on) {
    Db::pdo()->prepare("INSERT IGNORE INTO wishlist (id, user_id, product_id) VALUES (?, ?, ?)")->execute([uuid(), $u['id'], $p['id']]);
  } else {
    Db::pdo()->prepare("DELETE FROM wishlist WHERE user_id = ? AND product_id = ?")->execute([$u['id'], $p['id']]);
  }
  ok(['on' => $on]);
});

// Which of these products does the user own / wishlist? (product page + cards)
route('GET', 'account/status', function () {
  $u = current_user();
  $ids = array_values(array_filter(explode(',', (string)($_GET['ids'] ?? ''))));
  if (!$u || !$ids) ok(['owned' => [], 'wishlist' => []]);
  $ids = array_slice($ids, 0, 100);
  $owned = array_values(array_intersect($ids, owned_product_ids($u['id'])));
  $wish = array_column(Db::all("SELECT product_id FROM wishlist WHERE user_id = ? AND product_id IN (" . Db::in($ids) . ")", array_merge([$u['id']], $ids)), 'product_id');
  ok(['owned' => $owned, 'wishlist' => $wish]);
});

// ============================================================
// Refunds
// ============================================================
route('POST', 'account/refunds', function () {
  $u = require_user();
  $orderId = str_in('order_id', 36);
  $reason = str_in('reason', 2000);
  if (mb_strlen($reason) < 10) fail(422, 'Please explain the problem (10+ characters)', ['reason' => 'Too short']);
  $o = Db::one("SELECT id, status FROM orders WHERE id = ? AND user_id = ?", [$orderId, $u['id']]);
  if (!$o) fail(404, 'Order not found');
  if (!in_array($o['status'], ['VERIFIED', 'COMPLETED'], true)) fail(422, 'Only paid orders can be refunded');
  if (Db::value("SELECT COUNT(*) FROM refunds WHERE order_id = ? AND status = 'pending'", [$orderId])) fail(409, 'A refund request is already open for this order');
  Db::pdo()->prepare("INSERT INTO refunds (id, order_id, user_id, reason) VALUES (?, ?, ?, ?)")->execute([uuid(), $orderId, $u['id'], $reason]);
  audit('refund_requested', 'order', $orderId);
  ok(['requested' => true], [], 201);
});

// ============================================================
// Checkout
// ============================================================

/** Price a cart from the database. Returns [lines, subtotal, discount, total, promo]. */
function price_cart(array $productIds, string $promoCode, ?array $user): array
{
  $productIds = array_values(array_unique(array_filter($productIds, 'is_string')));
  if (!$productIds) fail(422, 'Your cart is empty');
  if (count($productIds) > 50) fail(422, 'Too many items in one order');
  $rows = Db::all("SELECT id, user_id, title, slug, price, sale_price, screenshots, status FROM products WHERE id IN (" . Db::in($productIds) . ")", $productIds);
  $lines = [];
  $owned = $user ? owned_product_ids($user['id']) : [];
  foreach ($rows as $r) {
    if ($r['status'] !== 'PUBLISHED') continue;
    $price = $r['sale_price'] !== null ? (float)$r['sale_price'] : (float)$r['price'];
    $lines[] = [
      'id' => $r['id'], 'title' => $r['title'], 'slug' => $r['slug'], 'price' => $price, 'original' => (float)$r['price'], 'seller_id' => $r['user_id'],
      'image' => json_col($r['screenshots'])[0] ?? null,
      'owned' => in_array($r['id'], $owned, true) || ($user && $r['user_id'] === $user['id']),
    ];
  }
  $subtotal = round(array_sum(array_map(fn($l) => $l['owned'] ? 0 : $l['price'], $lines)), 2);
  $discount = 0.0;
  $promo = null;
  if ($promoCode !== '') {
    $pr = Db::one("SELECT * FROM promos WHERE code = ? AND is_active = 1", [strtoupper($promoCode)]);
    $err = null;
    if (!$pr) $err = 'This promo code is not valid';
    elseif ($pr['expires_at'] && strtotime($pr['expires_at']) < time()) $err = 'This promo code has expired';
    elseif ((int)$pr['max_uses'] > 0 && (int)$pr['uses_count'] >= (int)$pr['max_uses']) $err = 'This promo code has been used up';
    elseif ($subtotal < (float)$pr['min_amount']) $err = 'Spend at least $' . number_format((float)$pr['min_amount'], 2) . ' to use this code';
    if ($err) fail(422, $err, ['promo_code' => $err]);
    $discount = $pr['type'] === 'percent' ? round($subtotal * (float)$pr['value'] / 100, 2) : min($subtotal, (float)$pr['value']);
    $promo = ['id' => $pr['id'], 'code' => $pr['code'], 'type' => $pr['type'], 'value' => (float)$pr['value']];
  }
  return [$lines, $subtotal, $discount, max(0, round($subtotal - $discount, 2)), $promo];
}

route('POST', 'checkout/quote', function () {
  [$lines, $subtotal, $discount, $total, $promo] = price_cart(arr_in('ids'), str_in('promo_code', 50), current_user());
  ok(['items' => array_map(function ($l) { unset($l['seller_id']); return $l; }, $lines), 'subtotal' => $subtotal,
      'discount' => $discount, 'total' => $total, 'promo' => $promo, 'methods' => payment_methods(),
      'support' => ['discord' => setting('social_discord'), 'email' => setting('support_email', 'fivemdepot@gmail.com')]]);
});

route('POST', 'checkout/order', function () {
  $u = require_user();
  rate_limit('checkout', 10, 600);
  [$lines, $subtotal, $discount, $total, $promo] = price_cart(arr_in('ids'), str_in('promo_code', 50), $u);
  $lines = array_values(array_filter($lines, fn($l) => !$l['owned']));
  if (!$lines) fail(422, 'You already own everything in your cart');

  $free = $total <= 0;
  if (!$free && !gateway_ready('PADDLE')) fail(422, 'Checkout is not available right now. Please contact support.');

  // Spread the discount over the items so price_paid adds up to the total
  $remaining = $discount;
  foreach ($lines as $i => &$l) {
    $share = $i === count($lines) - 1 ? $remaining : round($subtotal > 0 ? $discount * $l['price'] / $subtotal : 0, 2);
    $l['paid'] = max(0, round($l['price'] - $share, 2));
    $remaining = round($remaining - $share, 2);
  }
  unset($l);

  $pdo = Db::pdo();
  $pdo->beginTransaction();
  $orderId = uuid();
  $status = $free ? 'PENDING' : 'AWAITING_PAYMENT';
  $pdo->prepare("INSERT INTO orders (id, user_id, product_ids, total_amount, status, payment_method, promo_id) VALUES (?, ?, ?, ?, ?, ?, ?)")
    ->execute([$orderId, $u['id'], json_encode(array_column($lines, 'id')), $total, $status, $free ? 'FREE' : 'PADDLE', $promo['id'] ?? null]);
  $ins = $pdo->prepare("INSERT INTO order_products (id, order_id, product_id, price_paid) VALUES (?, ?, ?, ?)");
  foreach ($lines as $l) $ins->execute([uuid(), $orderId, $l['id'], $l['paid']]);
  if ($free) {
    fulfil_order($orderId, null, 'Free order'); // same delivery path as paid orders
    $status = 'VERIFIED';
  }
  $pdo->commit();
  audit('order_placed', 'order', $orderId, ($free ? 'free' : 'paddle') . ' ' . $total);

  if ($free) ok(['order_id' => $orderId, 'status' => $status, 'total' => $total], [], 201);
  // Paid: the browser opens Paddle checkout for this order's transaction
  ok(['order_id' => $orderId, 'status' => $status, 'total' => $total] + start_gateway_payment(order_for_payment($orderId)), [], 201);
});

// One order of the current user (checkout polls this after returning from a gateway)
route('GET', 'account/orders/{id}', function ($p) {
  $u = require_user();
  $o = Db::one("SELECT id, total_amount, status, payment_method, admin_note, created_at, paid_at FROM orders WHERE id = ? AND user_id = ?", [$p['id'], $u['id']]);
  if (!$o) fail(404, 'Order not found');
  ok($o);
});

// Resume an unfinished payment ("Pay now" in My account → Orders)
route('POST', 'account/orders/{id}/pay', function ($p) {
  $u = require_user();
  rate_limit('pay', 10, 600);
  $o = order_for_payment($p['id']);
  if (!$o || $o['user_id'] !== $u['id']) fail(404, 'Order not found');
  if ($o['status'] !== 'AWAITING_PAYMENT') fail(409, 'This order does not need payment');
  if (!gateway_ready('PADDLE')) fail(422, 'Checkout is not available right now. Please contact support.');
  if ($o['payment_method'] !== 'PADDLE') {
    Db::pdo()->prepare("UPDATE orders SET payment_method = 'PADDLE', gateway_ref = NULL WHERE id = ?")->execute([$o['id']]);
    $o['payment_method'] = 'PADDLE'; $o['gateway_ref'] = null;
  }
  ok(start_gateway_payment($o));
});

route('POST', 'account/orders/{id}/cancel', function ($p) {
  $u = require_user();
  $st = Db::pdo()->prepare("UPDATE orders SET status = 'CANCELLED' WHERE id = ? AND user_id = ? AND status = 'AWAITING_PAYMENT'");
  $st->execute([$p['id'], $u['id']]);
  if (!$st->rowCount()) fail(409, 'This order cannot be cancelled');
  ok(['status' => 'CANCELLED']);
});
