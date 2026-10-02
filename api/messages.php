<?php
/**
 * FiveMDepot — Messages API
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
  case 'list':
    $type = $_GET['type'] ?? 'inbox';
    if ($type === 'inbox') {
      $stmt = $conn->prepare("SELECT m.*, s.name as sender_name, s.image as sender_image, p.title as product_title
        FROM messages m JOIN users s ON m.sender_id = s.id LEFT JOIN products p ON m.product_id = p.id
        WHERE m.receiver_id = ? ORDER BY m.created_at DESC LIMIT 50");
      $stmt->bind_param('s', $user['id']);
    } else {
      $stmt = $conn->prepare("SELECT m.*, r.name as receiver_name, p.title as product_title
        FROM messages m JOIN users r ON m.receiver_id = r.id LEFT JOIN products p ON m.product_id = p.id
        WHERE m.sender_id = ? ORDER BY m.created_at DESC LIMIT 50");
      $stmt->bind_param('s', $user['id']);
    }
    $stmt->execute();
    $result = $stmt->get_result();
    $msgs = [];
    while ($row = $result->fetch_assoc()) { $msgs[] = $row; }
    echo json_encode(['messages' => $msgs]);
    break;

  case 'send':
    $body = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $receiverId = sanitizeInput($body['receiver_id'] ?? '');
    $productId = sanitizeInput($body['product_id'] ?? '');
    $subject = sanitizeInput($body['subject'] ?? '');
    $bodyText = $body['body'] ?? '';
    if (empty($receiverId) || empty($bodyText)) { http_response_code(400); echo json_encode(['error' => 'Recipient and message required']); break; }
    $msgId = bin2hex(random_bytes(16));
    $msgId = sprintf('%s-%s-%s-%s-%s', substr($msgId,0,8), substr($msgId,8,4), '4'.substr($msgId,12,3), substr($msgId,16,4), substr($msgId,20,12));
    $insert = $conn->prepare("INSERT INTO messages (id, sender_id, receiver_id, product_id, subject, body) VALUES (?, ?, ?, ?, ?, ?)");
    $insert->bind_param('ssssss', $msgId, $user['id'], $receiverId, $productId, $subject, $bodyText);
    $insert->execute();
    echo json_encode(['success' => true]);
    break;

  case 'mark_read':
    $body = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $msgId = sanitizeInput($body['message_id'] ?? '');
    $conn->prepare("UPDATE messages SET is_read = 1 WHERE id = ? AND receiver_id = ?")->bind_param('ss', $msgId, $user['id'])->execute();
    echo json_encode(['success' => true]);
    break;

  case 'unread_count':
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM messages WHERE receiver_id = ? AND is_read = 0");
    $stmt->bind_param('s', $user['id']);
    $stmt->execute();
    echo json_encode(['count' => (int)$stmt->get_result()->fetch_assoc()['count']]);
    break;

  case 'conversation':
    $otherId = sanitizeInput($_GET['user_id'] ?? '');
    $stmt = $conn->prepare("SELECT m.*, s.name as sender_name, s.image as sender_image FROM messages m JOIN users s ON m.sender_id = s.id WHERE ((m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)) ORDER BY m.created_at ASC");
    $stmt->bind_param('ssss', $user['id'], $otherId, $otherId, $user['id']);
    $stmt->execute();
    $result = $stmt->get_result();
    $msgs = [];
    while ($row = $result->fetch_assoc()) { $msgs[] = $row; }
    echo json_encode(['messages' => $msgs]);
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
