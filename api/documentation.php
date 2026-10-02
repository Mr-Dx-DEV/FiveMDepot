<?php
/**
 * FiveMDepot — Documentation API
 */
require_once __DIR__ . '/../config.php';
ini_set('session.cookie_httponly', 1);
session_name(SESSION_NAME);
session_start();
header('Content-Type: application/json; charset=utf-8');

$action = $_GET['action'] ?? $_POST['action'] ?? '';
$conn = getDB();

switch($action) {
  case 'list':
    $category = sanitizeInput($_GET['category'] ?? 'all');
    $search = sanitizeInput($_GET['search'] ?? '');
    $where = [];
    $params = [];
    $types = '';
    if ($category !== 'all') { $where[] = "d.category = ?"; $params[] = $category; $types .= 's'; }
    if ($search) { $where[] = "(d.title LIKE ? OR d.content LIKE ?)"; $params[] = '%'.$search.'%'; $params[] = '%'.$search.'%'; $types .= 'ss'; }
    $whereClause = !empty($where) ? 'WHERE '.implode(' AND ', $where) : '';
    $stmt = $conn->prepare("SELECT d.*, u.name as author_name FROM documentation d LEFT JOIN users u ON d.author_id = u.id $whereClause ORDER BY d.created_at DESC LIMIT 50");
    if (!empty($params)) { $stmt->bind_param($types, ...$params); }
    $stmt->execute();
    $result = $stmt->get_result();
    $docs = [];
    while ($row = $result->fetch_assoc()) { $docs[] = $row; }
    echo json_encode(['documentation' => $docs]);
    break;

  case 'get':
    $slug = sanitizeInput($_GET['slug'] ?? '');
    // Increment views
    $stmt = $conn->prepare("UPDATE documentation SET views = views + 1 WHERE slug = ?");
    $stmt->bind_param('s', $slug);
    $stmt->execute();
    // Get doc
    $stmt = $conn->prepare("SELECT d.*, u.name as author_name FROM documentation d LEFT JOIN users u ON d.author_id = u.id WHERE d.slug = ?");
    $stmt->bind_param('s', $slug);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result->num_rows === 0) { http_response_code(404); echo json_encode(['error' => 'Documentation not found']); break; }
    echo json_encode(['documentation' => $result->fetch_assoc()]);
    break;

  case 'categories':
    $result = $conn->query("SELECT DISTINCT category, COUNT(*) as count FROM documentation GROUP BY category ORDER BY count DESC");
    $cats = [];
    while ($row = $result->fetch_assoc()) { $cats[] = $row; }
    echo json_encode(['categories' => $cats]);
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
