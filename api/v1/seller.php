<?php
/**
 * Seller area: overview, own products (create/edit → review queue), withdrawals
 * Product validation/saving is shared with the admin editor (admin_catalog.php).
 */
require_once __DIR__ . '/../../core/catalog.php';
require_once __DIR__ . '/admin_catalog.php';

function require_seller(): array
{
  $u = require_role('SELLER', 'ADMIN');
  if ($u['role'] === 'SELLER') {
    $st = Db::value("SELECT status FROM seller_profiles WHERE user_id = ?", [$u['id']]);
    if ($st !== null && $st !== 'APPROVED') fail(403, 'Your seller account is not approved yet');
  }
  return $u;
}

route('GET', 'seller/overview', function () {
  $u = require_seller();
  $paid = "o.status IN ('VERIFIED','COMPLETED')";
  $sales = Db::one("SELECT COUNT(*) c, COALESCE(SUM(op.price_paid), 0) s FROM order_products op JOIN orders o ON o.id = op.order_id AND $paid
                    JOIN products p ON p.id = op.product_id WHERE p.user_id = ?", [$u['id']]);
  $byDay = Db::all("SELECT DATE(o.created_at) d, SUM(op.price_paid) r FROM order_products op JOIN orders o ON o.id = op.order_id AND $paid
                    JOIN products p ON p.id = op.product_id WHERE p.user_id = ? AND o.created_at >= CURDATE() - INTERVAL 29 DAY GROUP BY DATE(o.created_at)", [$u['id']]);
  $map = array_column($byDay, 'r', 'd');
  $chart = [];
  for ($i = 29; $i >= 0; $i--) { $d = date('Y-m-d', strtotime("-$i day")); $chart[] = ['date' => $d, 'revenue' => (float)($map[$d] ?? 0)]; }
  ok([
    'profile' => Db::one("SELECT bio, discord_tag, status FROM seller_profiles WHERE user_id = ?", [$u['id']]),
    'wallet' => (float)Db::value("SELECT wallet_balance FROM users WHERE id = ?", [$u['id']]),
    'fee_percent' => (float)setting('platform_fee_percent', '0'),
    'sales' => (int)$sales['c'],
    'revenue' => (float)$sales['s'],
    'pending_withdrawals' => (float)Db::value("SELECT COALESCE(SUM(amount), 0) FROM withdrawals WHERE user_id = ? AND status IN ('PENDING','APPROVED')", [$u['id']]),
    'chart' => $chart,
  ]);
});

route('GET', 'seller/products', function () {
  $u = require_seller();
  $rows = Db::all("SELECT p.id, p.title, p.slug, p.price, p.sale_price, p.status, p.reject_reason, p.screenshots, p.version, p.updated_at, p.downloads,
                          (SELECT COUNT(*) FROM order_products op JOIN orders o ON o.id = op.order_id AND o.status IN ('VERIFIED','COMPLETED') WHERE op.product_id = p.id) AS sales
                   FROM products p WHERE p.user_id = ? ORDER BY p.updated_at DESC", [$u['id']]);
  $tags = tags_for_products(array_column($rows, 'id'));
  foreach ($rows as &$r) {
    $r['image'] = json_col($r['screenshots'])[0] ?? null;
    unset($r['screenshots']);
    $r['tags'] = $tags[$r['id']] ?? [];
    $r['sales'] = (int)$r['sales'];
  }
  ok($rows);
});

route('GET', 'seller/products/{id}', function ($p) {
  $u = require_seller();
  $row = Db::one("SELECT p.*, u.name AS seller_name FROM products p JOIN users u ON u.id = p.user_id WHERE p.id = ? AND p.user_id = ?", [$p['id'], $u['id']]);
  if (!$row) fail(404, 'Product not found');
  ok(product_out($row));
});

route('GET', 'seller/tags', function () {
  require_seller();
  $rows = Db::all("SELECT t.id, t.name, t.slug, t.color, g.name AS group_name FROM tags t LEFT JOIN tag_groups g ON g.id = t.group_id ORDER BY g.sort_order IS NULL, g.sort_order, t.name");
  $owners = [];
  foreach (Db::all("SELECT ct.tag_id, c.name FROM category_tags ct JOIN categories c ON c.id = ct.category_id") as $r) $owners[$r['tag_id']][] = $r['name'];
  foreach ($rows as &$r) $r['categories'] = $owners[$r['id']] ?? [];
  ok($rows);
});

/**
 * Sellers can only save DRAFT or PENDING (product_payload enforces it), so editing
 * a live product sends it back to the review queue.
 */
function seller_save(?string $id, array $u): string
{
  return product_save($id, $u['id'], true);
}

route('POST', 'seller/products', function () {
  $u = require_seller();
  $id = seller_save(null, $u);
  audit('seller_product_created', 'product', $id);
  ok(['id' => $id], [], 201);
});

route('POST', 'seller/products/{id}', function ($p) {
  $u = require_seller();
  if (!Db::value("SELECT COUNT(*) FROM products WHERE id = ? AND user_id = ?", [$p['id'], $u['id']])) fail(404, 'Product not found');
  seller_save($p['id'], $u);
  audit('seller_product_updated', 'product', $p['id']);
  ok(['id' => $p['id']]);
});

// ---------- Withdrawals ----------
route('GET', 'seller/withdrawals', function () {
  $u = require_seller();
  ok(Db::all("SELECT id, amount, method, account_info, status, rejected_reason, created_at, paid_at FROM withdrawals WHERE user_id = ? ORDER BY created_at DESC", [$u['id']]));
});

route('POST', 'seller/withdrawals', function () {
  $u = require_seller();
  $amount = round((float)input('amount', 0), 2);
  $method = strtoupper(str_in('method', 20));
  $account = str_in('account_info', 500);
  $errors = [];
  if ($amount < 5) $errors['amount'] = 'Minimum withdrawal is $5';
  if (!in_array($method, ['BKASH', 'NAGAD', 'BANK_TRANSFER'], true)) $errors['method'] = 'Choose a method';
  if (mb_strlen($account) < 5) $errors['account_info'] = 'Enter your account number/details';
  if ($errors) fail(422, 'Please fix the highlighted fields', $errors);
  $pdo = Db::pdo();
  $pdo->beginTransaction();
  $bal = (float)Db::value("SELECT wallet_balance FROM users WHERE id = ? FOR UPDATE", [$u['id']]);
  if ($amount > $bal) { $pdo->rollBack(); fail(422, 'You only have $' . number_format($bal, 2) . ' available', ['amount' => 'More than your balance']); }
  // reserve the money now; it is returned if the admin rejects the request
  $pdo->prepare("UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ?")->execute([$amount, $u['id']]);
  $pdo->prepare("INSERT INTO withdrawals (id, user_id, amount, method, account_info) VALUES (?, ?, ?, ?, ?)")->execute([uuid(), $u['id'], $amount, $method, $account]);
  $pdo->commit();
  audit('withdrawal_requested', 'withdrawal', null, (string)$amount);
  ok(['requested' => $amount], [], 201);
});

route('POST', 'seller/profile', function () {
  $u = require_seller();
  Db::pdo()->prepare("UPDATE seller_profiles SET bio = ?, discord_tag = ? WHERE user_id = ?")->execute([str_in('bio', 1000) ?: null, str_in('discord_tag', 100) ?: null, $u['id']]);
  ok(['saved' => true]);
});
