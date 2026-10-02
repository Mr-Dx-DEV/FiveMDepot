<?php
/**
 * FiveMDepot — Seller API
 */
require_once __DIR__ . '/../config.php';
ini_set('session.cookie_httponly', 1);
session_name(SESSION_NAME);
session_start();
header('Content-Type: application/json; charset=utf-8');

$action = $_GET['action'] ?? $_POST['action'] ?? '';
$conn = getDB();

switch($action) {
  case 'profile':
    $email = sanitizeInput($_GET['email'] ?? $_GET['slug'] ?? '');
    if (empty($email)) { http_response_code(400); echo json_encode(['error' => 'Email or slug required']); break; }

    // Get seller info
    $stmt = $conn->prepare("SELECT u.id, u.name, u.email, u.image, sp.bio, sp.discord_tag, sp.status, sr.total_sales, sr.total_earnings, sr.avg_rating, sr.response_hours, sr.verified_badge
      FROM users u
      LEFT JOIN seller_profiles sp ON u.id = sp.user_id
      LEFT JOIN seller_reputation sr ON u.id = sr.user_id
      WHERE u.email = ? LIMIT 1");
    $stmt->bind_param('s', $email);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result->num_rows === 0) { http_response_code(404); echo json_encode(['error' => 'Seller not found']); break; }
    $seller = $result->fetch_assoc();

    // Get seller's products
    $pStmt = $conn->prepare("SELECT id, slug, title, price, screenshots, downloads, featured FROM products WHERE user_id = ? AND status = 'PUBLISHED' ORDER BY featured DESC, created_at DESC LIMIT 20");
    $pStmt->bind_param('s', $seller['id']);
    $pStmt->execute();
    $pResult = $pStmt->get_result();
    $products = [];
    while ($row = $pResult->fetch_assoc()) {
      $products[] = [
        'id' => $row['id'], 'slug' => $row['slug'], 'title' => $row['title'],
        'price' => (float)$row['price'], 'image' => json_decode($row['screenshots'] ?? '[]', true)[0] ?? '',
        'downloads' => (int)$row['downloads'], 'featured' => (bool)$row['featured']
      ];
    }
    $seller['products'] = $products;
    echo json_encode(['seller' => $seller]);
    break;

  case 'stats':
    $userId = sanitizeInput($_GET['user_id'] ?? '');
    $stmt = $conn->prepare("SELECT sr.total_sales, sr.total_earnings, sr.avg_rating, sr.response_hours, sr.verified_badge,
      COUNT(DISTINCT p.id) as product_count, COUNT(DISTINCT o.id) as order_count
      FROM seller_reputation sr
      LEFT JOIN products p ON sr.user_id = p.user_id
      LEFT JOIN order_products op ON p.id = op.product_id
      LEFT JOIN orders o ON op.order_id = o.id
      WHERE sr.user_id = ?
      GROUP BY sr.user_id LIMIT 1");
    $stmt->bind_param('s', $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    echo json_encode(['stats' => $result->fetch_assoc() ?: []]);
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
?>
