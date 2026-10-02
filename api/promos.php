<?php
/**
 * FiveMDepot — Promo Code API
 */
require_once __DIR__ . '/../config.php';
ini_set('session.cookie_httponly', 1);
session_name(SESSION_NAME);
session_start();
header('Content-Type: application/json; charset=utf-8');

$action = $_GET['action'] ?? $_POST['action'] ?? '';
$conn = getDB();

switch($action) {
  case 'validate':
    $body = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $code = sanitizeInput($body['code'] ?? '');
    $total = floatval($body['total'] ?? 0);
    $stmt = $conn->prepare("SELECT * FROM promos WHERE code = ? AND is_active = 1");
    $stmt->bind_param('s', $code);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result->num_rows === 0) { http_response_code(404); echo json_encode(['error' => 'Invalid promo code']); break; }
    $promo = $result->fetch_assoc();
    if ($promo['expires_at'] && strtotime($promo['expires_at']) < time()) { echo json_encode(['error' => 'Promo code expired']); break; }
    if ($promo['max_uses'] > 0 && $promo['uses_count'] >= $promo['max_uses']) { echo json_encode(['error' => 'Promo code usage limit reached']); break; }
    if ($total < $promo['min_amount']) { echo json_encode(['error' => 'Minimum order: $'.number_format($promo['min_amount'], 2)]); break; }
    $discount = $promo['type'] === 'percent' ? ($total * $promo['value'] / 100) : min($promo['value'], $total);
    echo json_encode(['valid' => true, 'discount' => $discount, 'type' => $promo['type'], 'value' => $promo['value']]);
    break;

  case 'apply':
    $user = requireAuth();
    $body = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $code = sanitizeInput($body['code'] ?? '');
    $stmt = $conn->prepare("SELECT * FROM promos WHERE code = ? AND is_active = 1");
    $stmt->bind_param('s', $code);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result->num_rows === 0) { http_response_code(404); echo json_encode(['error' => 'Invalid promo code']); break; }
    $promo = $result->fetch_assoc();
    $update = $conn->prepare("UPDATE promos SET uses_count = uses_count + 1 WHERE id = ?");
    $update->bind_param('s', $promo['id']);
    $update->execute();
    echo json_encode(['success' => true, 'code' => $code]);
    break;

  case 'active':
    $result = $conn->query("SELECT * FROM promos WHERE is_active = 1 AND (expires_at IS NULL OR expires_at > NOW()) ORDER BY created_at DESC LIMIT 10");
    $promos = [];
    while ($row = $result->fetch_assoc()) { $promos[] = $row; }
    echo json_encode(['promos' => $promos]);
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
?>
