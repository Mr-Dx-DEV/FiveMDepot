<?php
/**
 * Support tickets — customers open tickets (optionally about an order), staff reply in the admin panel.
 * Status: open (waiting for staff) → answered (waiting for customer) → closed.
 */
require_once __DIR__ . '/../../core/mail.php';

const TICKET_CATEGORIES = ['payment' => 'Payment / order', 'download' => 'Download problem', 'install' => 'Installation help', 'refund' => 'Refund', 'general' => 'General question'];

function ticket_out(array $t): array
{
  $t['number'] = (int)$t['number'];
  $t['messages'] = Db::all("SELECT m.id, m.is_staff, m.body, m.created_at, u.name FROM ticket_messages m LEFT JOIN users u ON u.id = m.user_id
                            WHERE m.ticket_id = ? ORDER BY m.id", [$t['id']]);
  foreach ($t['messages'] as &$m) $m['is_staff'] = (bool)$m['is_staff'];
  return $t;
}

// ---------- Customer ----------
route('GET', 'account/tickets', function () {
  $u = require_user();
  ok(Db::all("SELECT t.id, t.number, t.subject, t.category, t.status, t.order_id, t.created_at, t.updated_at,
                     (SELECT COUNT(*) FROM ticket_messages m WHERE m.ticket_id = t.id) AS messages
              FROM support_tickets t WHERE t.user_id = ? ORDER BY t.updated_at DESC", [$u['id']]), ['categories' => TICKET_CATEGORIES]);
});

route('POST', 'account/tickets', function () {
  $u = require_user();
  rate_limit('ticket', 5, 3600);
  $subject = str_in('subject', 200);
  $body = trim((string)input('message', ''));
  $cat = array_key_exists((string)input('category'), TICKET_CATEGORIES) ? (string)input('category') : 'general';
  $orderId = str_in('order_id', 36) ?: null;
  $errors = [];
  if (mb_strlen($subject) < 4) $errors['subject'] = 'Add a short subject';
  if (mb_strlen($body) < 10) $errors['message'] = 'Describe the problem (10+ characters)';
  if (mb_strlen($body) > 5000) $errors['message'] = 'Message is too long (max 5000 characters)';
  if ($errors) fail(422, 'Please fix the highlighted fields', $errors);
  if ($orderId && !Db::value("SELECT COUNT(*) FROM orders WHERE id = ? AND user_id = ?", [$orderId, $u['id']])) $orderId = null;
  $id = uuid();
  $pdo = Db::pdo();
  $pdo->prepare("INSERT INTO support_tickets (id, user_id, order_id, subject, category) VALUES (?, ?, ?, ?, ?)")->execute([$id, $u['id'], $orderId, $subject, $cat]);
  $pdo->prepare("INSERT INTO ticket_messages (ticket_id, user_id, is_staff, body) VALUES (?, ?, 0, ?)")->execute([$id, $u['id'], $body]);
  audit('ticket_opened', 'ticket', $id, $subject);
  mail_admin_ticket($id, $body, true);
  ok(['id' => $id, 'number' => (int)Db::value("SELECT number FROM support_tickets WHERE id = ?", [$id])], [], 201);
});

route('GET', 'account/tickets/{id}', function ($p) {
  $u = require_user();
  $t = Db::one("SELECT * FROM support_tickets WHERE id = ? AND user_id = ?", [$p['id'], $u['id']]);
  if (!$t) fail(404, 'Ticket not found');
  ok(ticket_out($t));
});

route('POST', 'account/tickets/{id}/reply', function ($p) {
  $u = require_user();
  rate_limit('ticket_reply', 20, 600);
  $t = Db::one("SELECT id, status FROM support_tickets WHERE id = ? AND user_id = ?", [$p['id'], $u['id']]);
  if (!$t) fail(404, 'Ticket not found');
  $body = trim((string)input('message', ''));
  if (mb_strlen($body) < 2 || mb_strlen($body) > 5000) fail(422, 'Write a message (max 5000 characters)', ['message' => 'Required']);
  Db::pdo()->prepare("INSERT INTO ticket_messages (ticket_id, user_id, is_staff, body) VALUES (?, ?, 0, ?)")->execute([$t['id'], $u['id'], $body]);
  Db::pdo()->prepare("UPDATE support_tickets SET status = 'open' WHERE id = ?")->execute([$t['id']]); // reopens closed tickets too
  mail_admin_ticket($t['id'], $body, false);
  ok(['status' => 'open']);
});

route('POST', 'account/tickets/{id}/close', function ($p) {
  $u = require_user();
  $st = Db::pdo()->prepare("UPDATE support_tickets SET status = 'closed' WHERE id = ? AND user_id = ?");
  $st->execute([$p['id'], $u['id']]);
  if (!$st->rowCount()) fail(404, 'Ticket not found');
  ok(['status' => 'closed']);
});

// ---------- Staff ----------
route('GET', 'admin/tickets', function () {
  require_role('ADMIN');
  [$page, $per, $off] = paging(30);
  $status = in_array($_GET['status'] ?? '', ['open', 'answered', 'closed'], true) ? $_GET['status'] : '';
  $where = $status ? 't.status = ?' : '1 = 1';
  $params = $status ? [$status] : [];
  if (!empty($_GET['q'])) {
    $where .= ' AND (t.subject LIKE ? OR u.email LIKE ? OR u.name LIKE ? OR t.number = ?)';
    $l = '%' . $_GET['q'] . '%';
    array_push($params, $l, $l, $l, (int)$_GET['q']);
  }
  $total = (int)Db::value("SELECT COUNT(*) FROM support_tickets t JOIN users u ON u.id = t.user_id WHERE $where", $params);
  $rows = Db::all("SELECT t.id, t.number, t.subject, t.category, t.status, t.order_id, t.created_at, t.updated_at, u.name, u.email,
                          (SELECT COUNT(*) FROM ticket_messages m WHERE m.ticket_id = t.id) AS messages
                   FROM support_tickets t JOIN users u ON u.id = t.user_id WHERE $where
                   ORDER BY FIELD(t.status, 'open', 'answered', 'closed'), t.updated_at DESC LIMIT $per OFFSET $off", $params);
  $counts = [];
  foreach (Db::all("SELECT status, COUNT(*) c FROM support_tickets GROUP BY status") as $c) $counts[$c['status']] = (int)$c['c'];
  ok($rows, ['total' => $total, 'page' => $page, 'per_page' => $per, 'pages' => (int)ceil($total / $per), 'status_counts' => $counts, 'categories' => TICKET_CATEGORIES]);
});

route('GET', 'admin/tickets/{id}', function ($p) {
  require_role('ADMIN');
  $t = Db::one("SELECT t.*, u.name, u.email FROM support_tickets t JOIN users u ON u.id = t.user_id WHERE t.id = ?", [$p['id']]);
  if (!$t) fail(404, 'Ticket not found');
  $t = ticket_out($t);
  $t['orders'] = Db::all("SELECT id, total_amount, status, payment_method, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 5", [$t['user_id']]);
  ok($t);
});

route('POST', 'admin/tickets/{id}/reply', function ($p) {
  $admin = require_role('ADMIN');
  if (!Db::value("SELECT COUNT(*) FROM support_tickets WHERE id = ?", [$p['id']])) fail(404, 'Ticket not found');
  $body = trim((string)input('message', ''));
  if (mb_strlen($body) < 2 || mb_strlen($body) > 5000) fail(422, 'Write a reply', ['message' => 'Required']);
  $status = input('close') ? 'closed' : 'answered';
  Db::pdo()->prepare("INSERT INTO ticket_messages (ticket_id, user_id, is_staff, body) VALUES (?, ?, 1, ?)")->execute([$p['id'], $admin['id'], $body]);
  Db::pdo()->prepare("UPDATE support_tickets SET status = ? WHERE id = ?")->execute([$status, $p['id']]);
  audit('ticket_replied', 'ticket', $p['id']);
  mail_ticket_reply($p['id'], $body);
  ok(['status' => $status]);
});

route('POST', 'admin/tickets/{id}/status', function ($p) {
  require_role('ADMIN');
  $status = (string)input('status');
  if (!in_array($status, ['open', 'answered', 'closed'], true)) fail(422, 'Invalid status');
  Db::pdo()->prepare("UPDATE support_tickets SET status = ? WHERE id = ?")->execute([$status, $p['id']]);
  ok(['status' => $status]);
});
