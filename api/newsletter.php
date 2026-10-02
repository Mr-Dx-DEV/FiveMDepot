<?php
/**
 * FiveMDepot — Newsletter API
 */
require_once __DIR__ . '/../config.php';
ini_set('session.cookie_httponly', 1);
session_name(SESSION_NAME);
session_start();
header('Content-Type: application/json; charset=utf-8');

$action = $_GET['action'] ?? $_POST['action'] ?? '';

if ($action === 'subscribe') {
    $body = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $email = sanitizeInput($body['email'] ?? '');
    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['error' => 'Valid email required']);
        break;
    }
    // In production, integrate with Mailchimp/SendGrid/etc.
    // For now, store in database
    $conn = getDB();
    $stmt = $conn->prepare("INSERT IGNORE INTO newsletter_subscribers (id, email, subscribed_at) VALUES (UUID(), ?, NOW())");
    $stmt->bind_param('s', $email);
    $stmt->execute();
    $conn->close();
    echo json_encode(['success' => true, 'message' => 'Thank you for subscribing!']);
    break;
}

function getDB() {
    static $conn = null;
    if ($conn === null) {
        $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        if ($conn->connect_error) {
            error_log('DB error: ' . $conn->connect_error);
            http_response_code(500);
            echo json_encode(['error' => 'Database connection failed']);
            exit;
        }
        $conn->set_charset(DB_CHARSET);
    }
    return $conn;
}

function sanitizeInput($input) {
    return is_null($input) ? '' : htmlspecialchars(strip_tags(trim($input)), ENT_QUOTES, 'UTF-8');
}
?>
