<?php
/**
 * FiveMDepot — Refund API
 */
require_once __DIR__ . '/../config.php';
ini_set('session.cookie_httponly', 1);
session_name(SESSION_NAME);
session_start();
header('Content-Type: application/json; charset=utf-8');

$action = $_GET['action'] ?? $_POST['action'] ?? '';
$user = requireAuth();
$conn = getDB();

switch($action) {
  case 'request':
    $body = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $orderId = sanitizeInput($body['order_id'] ?? '');
    $reason = sanitizeInput($body['reason'] ?? '');
    if (empty($orderId) || empty($reason)) { http_response_code(400); echo json_encode(['error' => 'Order ID and reason required']); break; }
    $check = $conn->prepare("SELECT id FROM orders WHERE id = ? AND user_id = ? AND status = 'VERIFIED'");
    $check->bind_param('ss', $orderId, $user['id']);
    $check->execute();
    if ($check->get_result()->num_rows === 0) { http_response_code(400); echo json_encode(['error' => 'Invalid or ineligible order']); break; }
    $refundId = bin2hex(random_bytes(16));
    $refundId = sprintf('%s-%s-%s-%s-%s', substr($refundId,0,8), substr($refundId,8,4), '4'.substr($refundId,12,3), substr($refundId,16,4), substr($refundId,20,12));
    $insert = $conn->prepare("INSERT INTO refunds (id, order_id, user_id, reason) VALUES (?, ?, ?, ?)");
    $insert->bind_param('ssss', $refundId, $orderId, $user['id'], $reason);
    $insert->execute();
    echo json_encode(['success' => true, 'refund_id' => $refundId]);
    break;

  case 'list':
    $stmt = $conn->prepare("SELECT r.*, o.total_amount, o.payment_method FROM refunds r JOIN orders o ON r.order_id = o.id WHERE r.user_id = ? ORDER BY r.created_at DESC LIMIT 20");
    $stmt->bind_param('s', $user['id']);
    $stmt->execute();
    $result = $stmt->get_result();
    $refunds = [];
    while ($row = $result->fetch_assoc()) { $refunds[] = $row; }
    echo json_encode(['refunds' => $refunds]);
    break;

  case 'process':
    $admin = requireRole(['ADMIN']);
    $body = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $refundId = sanitizeInput($body['refund_id'] ?? '');
    $status = sanitizeInput($body['status'] ?? '');
    $adminNote = sanitizeInput($body['admin_note'] ?? '');
    if (!in_array($status, ['approved', 'rejected'])) { http_response_code(400); echo json_encode(['error' => 'Invalid status']); break; }
    $update = $conn->prepare("UPDATE refunds SET status = ?, admin_note = ?, resolved_at = NOW() WHERE id = ?");
    $update->bind_param('sss', $status, $adminNote, $refundId);
    $update->execute();
    echo json_encode(['success' => true]);
    break;

  default:
    http_response_code(400); echo json_encode(['error' => 'Invalid action']);
}

function getDB() {
  static $conn = null;
  if ($conn === null) {
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    if ($conn->connect_error) { error_log('DB error: ' . $conn->connect_error); http_response_code(500); echo json_encode(['error' => 'Database connection failed']); exit; }
    $conn->set_charset(DB_CHARSET);
  }
  return $conn;
}

function sanitizeInput($input) { return is_null($input) ? '' : htmlspecialchars(strip_tags(trim($input)), ENT_QUOTES, 'UTF-8'); }

function requireAuth() {
  if (!isset($_SESSION['user_id'])) { http_response_code(401); echo json_encode(['error' => 'Authentication required']); exit; }
  return ['id' => $_SESSION['user_id'], 'email' => $_SESSION['user_email'], 'role' => $_SESSION['user_role'] ?? 'BUYER'];
}

function requireRole($roles) {
  $user = requireAuth();
  if (!in_array($user['role'], $roles)) { http_response_code(403); echo json_encode(['error' => 'Insufficient permissions']); exit; }
  return $user;
}
?>
