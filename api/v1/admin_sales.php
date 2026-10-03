<?php
/**
 * Admin — orders & payment proofs, users, sellers, withdrawals, reviews, promo codes
 */

// ============================================================
// Orders
// ============================================================

route('GET', 'admin/orders', function () {
  require_role('ADMIN');
  [$page, $per, $off] = paging(25);
  $where = ['1 = 1'];
  $params = [];
  if (!empty($_GET['status'])) { $where[] = 'o.status = ?'; $params[] = strtoupper($_GET['status']); }
  if (!empty($_GET['q'])) {
    $where[] = '(o.id LIKE ? OR o.transaction_id LIKE ? OR u.email LIKE ? OR u.name LIKE ?)';
    $l = '%' . $_GET['q'] . '%';
    array_push($params, $_GET['q'] . '%', $l, $l, $l);
  }
  $w = implode(' AND ', $where);
  $total = (int)Db::value("SELECT COUNT(*) FROM orders o JOIN users u ON u.id = o.user_id WHERE $w", $params);
  $rows = Db::all(
    "SELECT o.id, o.total_amount, o.status, o.payment_method, o.transaction_id, o.created_at, o.verified_at,
            u.id AS user_id, u.name AS customer, u.email,
            (SELECT COUNT(*) FROM order_products op WHERE op.order_id = o.id) AS items
     FROM orders o JOIN users u ON u.id = o.user_id WHERE $w ORDER BY o.created_at DESC LIMIT $per OFFSET $off",
    $params
  );
  $counts = [];
  foreach (Db::all("SELECT status, COUNT(*) c FROM orders GROUP BY status") as $c) $counts[$c['status']] = (int)$c['c'];
  ok($rows, ['total' => $total, 'page' => $page, 'per_page' => $per, 'pages' => (int)ceil($total / $per), 'status_counts' => $counts]);
});

route('GET', 'admin/orders/{id}', function ($p) {
  require_role('ADMIN');
  $o = Db::one("SELECT o.*, u.name AS customer, u.email FROM orders o JOIN users u ON u.id = o.user_id WHERE o.id = ?", [$p['id']]);
  if (!$o) fail(404, 'Order not found');
  $o['items'] = Db::all("SELECT op.product_id, op.price_paid, p.title, p.slug FROM order_products op LEFT JOIN products p ON p.id = op.product_id WHERE op.order_id = ?", [$p['id']]);
  $o['proofs'] = Db::all("SELECT id, transaction_id, sender_number, amount, status, review_note, created_at FROM payment_proofs WHERE order_id = ? ORDER BY created_at DESC", [$p['id']]);
  unset($o['download_code'], $o['payment_proof'], $o['product_ids']);
  ok($o);
});

// Stream a payment proof image (proofs folder is not publicly readable)
route('GET', 'admin/proofs/{id}/file', function ($p) {
  require_role('ADMIN');
  $path = Db::value("SELECT file_path FROM payment_proofs WHERE id = ?", [$p['id']]);
  if (!$path) fail(404, 'Proof not found');
  $full = realpath(dirname(__DIR__, 2) . '/' . ltrim($path, '/'));
  $base = realpath(dirname(__DIR__, 2) . '/uploads');
  if (!$full || !$base || !str_starts_with($full, $base) || !is_file($full)) fail(404, 'File missing');
  header('Content-Type: ' . ((new finfo(FILEINFO_MIME_TYPE))->file($full) ?: 'application/octet-stream'));
  header('Content-Length: ' . filesize($full));
  header('Cache-Control: private, max-age=300');
  header('X-Content-Type-Options: nosniff');
  readfile($full);
  exit;
});

route('POST', 'admin/orders/{id}/verify', function ($p) {
  $admin = require_role('ADMIN');
  $decision = str_in('decision', 10);
  $note = str_in('note', 1000);
  if (!in_array($decision, ['approve', 'reject'], true)) fail(422, 'Choose approve or reject');
  if ($decision === 'reject' && $note === '') fail(422, 'Add a note for the customer', ['note' => 'Required']);

  $pdo = Db::pdo();
  $pdo->beginTransaction();
  $o = Db::one("SELECT id, user_id, status FROM orders WHERE id = ? FOR UPDATE", [$p['id']]);
  if (!$o) { $pdo->rollBack(); fail(404, 'Order not found'); }
  if ($o['status'] !== 'PENDING') { $pdo->rollBack(); fail(409, 'This order was already ' . strtolower($o['status'])); }

  if ($decision === 'approve') {
    $code = bin2hex(random_bytes(24));
    $days = max(1, (int)setting('download_expiry_days', '30'));
    $pdo->prepare("UPDATE orders SET status = 'VERIFIED', download_code = ?, verified_by = ?, verified_at = NOW(), admin_note = ? WHERE id = ?")
      ->execute([$code, $admin['id'], $note ?: null, $o['id']]);
    $pdo->prepare("INSERT INTO download_codes (id, order_id, user_id, code, expires_at) VALUES (?, ?, ?, ?, NOW() + INTERVAL ? DAY)
                   ON DUPLICATE KEY UPDATE code = VALUES(code), expires_at = VALUES(expires_at)")
      ->execute([uuid(), $o['id'], $o['user_id'], $code, $days]);
    // Credit sellers (not admin-owned products) minus the platform fee
    $fee = min(100, max(0, (float)setting('platform_fee_percent', '0')));
    $pdo->prepare("UPDATE users u JOIN (
                     SELECT p.user_id, SUM(op.price_paid) AS amt FROM order_products op JOIN products p ON p.id = op.product_id
                     JOIN users s ON s.id = p.user_id AND s.role <> 'ADMIN' WHERE op.order_id = ? GROUP BY p.user_id
                   ) x ON x.user_id = u.id SET u.wallet_balance = u.wallet_balance + ROUND(x.amt * (100 - ?) / 100, 2)")
      ->execute([$o['id'], $fee]);
  } else {
    $pdo->prepare("UPDATE orders SET status = 'REJECTED', verified_by = ?, verified_at = NOW(), admin_note = ? WHERE id = ?")
      ->execute([$admin['id'], $note, $o['id']]);
  }
  $pdo->prepare("UPDATE payment_proofs SET status = ?, reviewed_by = ?, reviewed_at = NOW(), review_note = ? WHERE order_id = ? AND status = 'PENDING'")
    ->execute([$decision === 'approve' ? 'APPROVED' : 'REJECTED', $admin['id'], $note ?: null, $o['id']]);
  $pdo->commit();
  audit('order_' . $decision . 'd', 'order', $o['id'], $note ?: null);
  ok(['status' => $decision === 'approve' ? 'VERIFIED' : 'REJECTED']);
});

// ============================================================
// Users
// ============================================================

route('GET', 'admin/users', function () {
  require_role('ADMIN');
  [$page, $per, $off] = paging(25);
  $where = ['1 = 1'];
  $params = [];
  if (!empty($_GET['role'])) { $where[] = 'u.role = ?'; $params[] = strtoupper($_GET['role']); }
  if (($_GET['banned'] ?? '') === '1') $where[] = 'u.is_banned = 1';
  if (!empty($_GET['q'])) { $where[] = '(u.name LIKE ? OR u.email LIKE ?)'; $l = '%' . $_GET['q'] . '%'; array_push($params, $l, $l); }
  $w = implode(' AND ', $where);
  $total = (int)Db::value("SELECT COUNT(*) FROM users u WHERE $w", $params);
  $rows = Db::all(
    "SELECT u.id, u.name, u.email, u.role, u.is_banned, u.ban_reason, u.wallet_balance, u.created_at, u.last_login_at,
            (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id AND o.status IN ('VERIFIED','COMPLETED')) AS orders,
            (SELECT COUNT(*) FROM products p WHERE p.user_id = u.id) AS products
     FROM users u WHERE $w ORDER BY u.created_at DESC LIMIT $per OFFSET $off",
    $params
  );
  foreach ($rows as &$r) $r['is_banned'] = (bool)$r['is_banned'];
  ok($rows, ['total' => $total, 'page' => $page, 'per_page' => $per, 'pages' => (int)ceil($total / $per)]);
});

route('POST', 'admin/users/{id}', function ($p) {
  $admin = require_role('ADMIN');
  $u = Db::one("SELECT id, role FROM users WHERE id = ?", [$p['id']]);
  if (!$u) fail(404, 'User not found');
  $role = strtoupper(str_in('role', 10) ?: $u['role']);
  if (!in_array($role, ['BUYER', 'SELLER', 'ADMIN'], true)) fail(422, 'Invalid role');
  $banned = bool_in('is_banned') ? 1 : 0;
  if ($p['id'] === $admin['id'] && ($role !== 'ADMIN' || $banned)) fail(422, 'You cannot remove your own admin access');
  if ($u['role'] === 'ADMIN' && $role !== 'ADMIN' && (int)Db::value("SELECT COUNT(*) FROM users WHERE role = 'ADMIN' AND is_banned = 0") <= 1) {
    fail(422, 'There must be at least one admin');
  }
  Db::pdo()->prepare("UPDATE users SET role = ?, is_banned = ?, ban_reason = ? WHERE id = ?")
    ->execute([$role, $banned, $banned ? (str_in('ban_reason', 255) ?: null) : null, $p['id']]);
  if ($role === 'SELLER') {
    Db::pdo()->prepare("INSERT INTO seller_profiles (id, user_id, status, approved_at, approved_by) VALUES (?, ?, 'APPROVED', NOW(), ?)
                        ON DUPLICATE KEY UPDATE status = 'APPROVED', approved_at = COALESCE(approved_at, NOW())")
      ->execute([uuid(), $p['id'], $admin['id']]);
  }
  audit('user_updated', 'user', $p['id'], "role=$role banned=$banned");
  ok(['id' => $p['id'], 'role' => $role, 'is_banned' => (bool)$banned]);
});

// ============================================================
// Seller applications
// ============================================================

route('GET', 'admin/sellers', function () {
  require_role('ADMIN');
  $status = strtoupper((string)($_GET['status'] ?? ''));
  $rows = Db::all(
    "SELECT sp.id, sp.user_id, sp.status, sp.bio, sp.discord_tag, sp.rejection_reason, sp.created_at, sp.approved_at,
            u.name, u.email, u.wallet_balance,
            (SELECT COUNT(*) FROM products p WHERE p.user_id = u.id AND p.status = 'PUBLISHED') AS products
     FROM seller_profiles sp JOIN users u ON u.id = sp.user_id"
    . ($status ? " WHERE sp.status = ?" : '') . " ORDER BY sp.status = 'PENDING' DESC, sp.created_at DESC",
    $status ? [$status] : []
  );
  ok($rows);
});

route('POST', 'admin/sellers/{id}/review', function ($p) {
  $admin = require_role('ADMIN');
  $decision = str_in('decision', 10);
  $sp = Db::one("SELECT id, user_id FROM seller_profiles WHERE id = ?", [$p['id']]);
  if (!$sp) fail(404, 'Application not found');
  if ($decision === 'approve') {
    Db::pdo()->prepare("UPDATE seller_profiles SET status = 'APPROVED', approved_at = NOW(), approved_by = ?, rejection_reason = NULL WHERE id = ?")->execute([$admin['id'], $sp['id']]);
    Db::pdo()->prepare("UPDATE users SET role = 'SELLER' WHERE id = ? AND role = 'BUYER'")->execute([$sp['user_id']]);
  } elseif ($decision === 'reject') {
    $reason = str_in('reason', 500);
    if ($reason === '') fail(422, 'Add a reason', ['reason' => 'Required']);
    Db::pdo()->prepare("UPDATE seller_profiles SET status = 'REJECTED', rejection_reason = ? WHERE id = ?")->execute([$reason, $sp['id']]);
  } else {
    fail(422, 'Choose approve or reject');
  }
  audit('seller_' . $decision . 'd', 'seller', $sp['user_id']);
  ok(['status' => $decision === 'approve' ? 'APPROVED' : 'REJECTED']);
});

// ============================================================
// Withdrawals
// ============================================================

route('GET', 'admin/withdrawals', function () {
  require_role('ADMIN');
  $status = strtoupper((string)($_GET['status'] ?? ''));
  ok(Db::all(
    "SELECT w.*, u.name, u.email, u.wallet_balance FROM withdrawals w JOIN users u ON u.id = w.user_id"
    . ($status ? " WHERE w.status = ?" : '') . " ORDER BY w.status = 'PENDING' DESC, w.created_at DESC LIMIT 200",
    $status ? [$status] : []
  ));
});

route('POST', 'admin/withdrawals/{id}', function ($p) {
  $admin = require_role('ADMIN');
  $status = strtoupper(str_in('status', 10));
  if (!in_array($status, ['APPROVED', 'PAID', 'REJECTED'], true)) fail(422, 'Invalid status');
  $pdo = Db::pdo();
  $pdo->beginTransaction();
  $w = Db::one("SELECT * FROM withdrawals WHERE id = ? FOR UPDATE", [$p['id']]);
  if (!$w) { $pdo->rollBack(); fail(404, 'Withdrawal not found'); }
  if (in_array($w['status'], ['PAID', 'REJECTED'], true)) { $pdo->rollBack(); fail(409, 'This request is already closed'); }
  if ($status === 'REJECTED') {
    $reason = str_in('reason', 500);
    if ($reason === '') { $pdo->rollBack(); fail(422, 'Add a reason', ['reason' => 'Required']); }
    // money was reserved when the seller requested it → give it back
    $pdo->prepare("UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?")->execute([$w['amount'], $w['user_id']]);
    $pdo->prepare("UPDATE withdrawals SET status = 'REJECTED', rejected_reason = ? WHERE id = ?")->execute([$reason, $w['id']]);
  } else {
    $pdo->prepare("UPDATE withdrawals SET status = ?, approved_by = ?, approved_at = COALESCE(approved_at, NOW()), paid_at = IF(? = 'PAID', NOW(), paid_at) WHERE id = ?")
      ->execute([$status, $admin['id'], $status, $w['id']]);
  }
  $pdo->commit();
  audit('withdrawal_' . strtolower($status), 'withdrawal', $w['id']);
  ok(['status' => $status]);
});

// ============================================================
// Reviews moderation
// ============================================================

route('GET', 'admin/reviews', function () {
  require_role('ADMIN');
  [$page, $per, $off] = paging(30);
  $total = (int)Db::value("SELECT COUNT(*) FROM reviews");
  $rows = Db::all("SELECT r.id, r.rating, r.comment, r.is_hidden, r.created_at, u.name AS user_name, p.title AS product, p.slug
                   FROM reviews r JOIN users u ON u.id = r.user_id JOIN products p ON p.id = r.product_id
                   ORDER BY r.created_at DESC LIMIT $per OFFSET $off");
  ok($rows, ['total' => $total, 'page' => $page, 'per_page' => $per, 'pages' => (int)ceil($total / $per)]);
});

route('POST', 'admin/reviews/{id}', function ($p) {
  require_role('ADMIN');
  if (bool_in('delete')) {
    Db::pdo()->prepare("DELETE FROM reviews WHERE id = ?")->execute([$p['id']]);
  } else {
    Db::pdo()->prepare("UPDATE reviews SET is_hidden = ? WHERE id = ?")->execute([bool_in('is_hidden') ? 1 : 0, $p['id']]);
  }
  audit('review_moderated', 'review', $p['id']);
  ok(['saved' => true]);
});

// ============================================================
// Promo codes
// ============================================================

route('GET', 'admin/promos', function () {
  require_role('ADMIN');
  ok(Db::all("SELECT * FROM promos ORDER BY created_at DESC"));
});

route('POST', 'admin/promos', function () {
  $admin = require_role('ADMIN');
  $id = str_in('id', 36) ?: null;
  $code = strtoupper(preg_replace('/[^A-Z0-9_-]/i', '', str_in('code', 50)));
  $type = input('type') === 'fixed' ? 'fixed' : 'percent';
  $value = (float)input('value', 0);
  $errors = [];
  if (strlen($code) < 3) $errors['code'] = 'Use 3+ letters/numbers';
  if ($value <= 0 || ($type === 'percent' && $value > 100)) $errors['value'] = $type === 'percent' ? 'Enter 1–100' : 'Enter an amount';
  if ($errors) fail(422, 'Please fix the highlighted fields', $errors);
  if (Db::value("SELECT COUNT(*) FROM promos WHERE code = ?" . ($id ? " AND id <> ?" : ''), $id ? [$code, $id] : [$code])) fail(422, 'Code already exists', ['code' => 'Duplicate']);
  $exp = str_in('expires_at', 30) ?: null;
  $vals = [$code, $type, $value, (float)input('min_amount', 0), int_in('max_uses'), $exp, bool_in('is_active', true) ? 1 : 0];
  if ($id) {
    Db::pdo()->prepare("UPDATE promos SET code = ?, type = ?, value = ?, min_amount = ?, max_uses = ?, expires_at = ?, is_active = ? WHERE id = ?")->execute(array_merge($vals, [$id]));
  } else {
    $id = uuid();
    Db::pdo()->prepare("INSERT INTO promos (code, type, value, min_amount, max_uses, expires_at, is_active, id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")->execute(array_merge($vals, [$id, $admin['id']]));
  }
  audit('promo_saved', 'promo', $id, $code);
  ok(['id' => $id]);
});

route('POST', 'admin/promos/{id}/delete', function ($p) {
  require_role('ADMIN');
  Db::pdo()->prepare("DELETE FROM promos WHERE id = ?")->execute([$p['id']]);
  ok(['deleted' => true]);
});
