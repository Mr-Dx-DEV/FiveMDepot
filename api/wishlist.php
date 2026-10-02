<?php
/**
 * FiveMDepot — Wishlist API
 */
require_once __DIR__ . '/../config.php';
ini_set('session.cookie_httponly', 1);
session_name(SESSION_NAME);
session_start();
header('Content-Type: application/json; charset=utf-8');

$action = $_GET['action'] ?? $_POST['action'] ?? '';

switch($action) {
  case 'list':
    $user = requireAuth();
    $conn = getDB();
    $stmt = $conn->prepare("SELECT w.*, p.title, p.slug, p.price, p.screenshots, p.category
      FROM wishlist w JOIN products p ON w.product_id = p.id
      WHERE w.user_id = ? ORDER BY w.added_at DESC");
    $stmt->bind_param('s', $user['id']);
    $stmt->execute();
    $result = $stmt->get_result();
    $items = [];
    while ($row = $result->fetch_assoc()) {
      $items[] = [
        'id' => $row['product_id'],
        'slug' => $row['slug'],
        'title' => $row['title'],
        'price' => (float)$row['price'],
        'image' => json_decode($row['screenshots'] ?? '[]', true)[0] ?? '',
        'category' => $row['category']
      ];
    }
    echo json_encode(['wishlist' => $items]);
    break;

  case 'add':
    $user = requireAuth();
    $conn = getDB();
    $body = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $productId = sanitizeInput($body['product_id'] ?? '');
    if (empty($productId)) { http_response_code(400); echo json_encode(['error' => 'Product ID required']); break; }

    // Check if already in wishlist
    $check = $conn->prepare("SELECT id FROM wishlist WHERE user_id = ? AND product_id = ?");
    $check->bind_param('ss', $user['id'], $productId);
    $check->execute();
    if ($check->get_result()->num_rows > 0) {
      http_response_code(409); echo json_encode(['error' => 'Already in wishlist']); break;
    }

    $wishId = bin2hex(random_bytes(16));
    $wishId = sprintf('%s-%s-%s-%s-%s', substr($wishId,0,8), substr($wishId,8,4), '4'.substr($wishId,12,3), substr($wishId,16,4), substr($wishId,20,12));
    $insert = $conn->prepare("INSERT INTO wishlist (id, user_id, product_id) VALUES (?, ?, ?)");
    $insert->bind_param('sss', $wishId, $user['id'], $productId);
    $insert->execute();
    echo json_encode(['success' => true]);
    break;

  case 'remove':
    $user = requireAuth();
    $conn = getDB();
    $body = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $productId = sanitizeInput($body['product_id'] ?? '');
    $delete = $conn->prepare("DELETE FROM wishlist WHERE user_id = ? AND product_id = ?");
    $delete->bind_param('ss', $user['id'], $productId);
    $delete->execute();
    echo json_encode(['success' => true]);
    break;

  case 'is_in_wishlist':
    $user = requireAuth();
    $conn = getDB();
    $body = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $productId = sanitizeInput($body['product_id'] ?? '');
    $check = $conn->prepare("SELECT id FROM wishlist WHERE user_id = ? AND product_id = ?");
    $check->bind_param('ss', $user['id'], $productId);
    $check->execute();
    echo json_encode(['in_wishlist' => $check->get_result()->num_rows > 0]);
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
