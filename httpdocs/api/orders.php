<?php
/**
 * FiveMDepot — Orders API
 * Handles order submission, verification, and download link generation
 */

require_once __DIR__ . '/../config.php';

ini_set('session.cookie_httponly', 1);
session_name(SESSION_NAME);
session_start();

header('Content-Type: application/json; charset=utf-8');

$action = $_GET['action'] ?? $_POST['action'] ?? '';

// Route requests
if ($action === 'submit' && $_SERVER['REQUEST_METHOD'] === 'POST') {
  submitOrder();
} elseif ($action === 'list' && $_SERVER['REQUEST_METHOD'] === 'GET') {
  listOrders();
} elseif ($action === 'verify' && $_SERVER['REQUEST_METHOD'] === 'POST') {
  verifyOrder();
} elseif ($action === 'download' && $_SERVER['REQUEST_METHOD'] === 'GET') {
  downloadFile();
} elseif ($action === 'get' && $_SERVER['REQUEST_METHOD'] === 'GET') {
  getOrder();
} else {
  http_response_code(400);
  echo json_encode(['error' => 'Invalid action']);
}

/**
 * Submit a new order (checkout)
 */
function submitOrder() {
  $user = requireAuth();

  if (!verifyCSRF($_POST['csrf_token'] ?? '')) {
    http_response_code(403);
    echo json_encode(['error' => 'Invalid security token']);
    return;
  }

  $name = sanitizeInput($_POST['name'] ?? '');
  $email = sanitizeInput($_POST['email'] ?? '');
  $paymentMethod = sanitizeInput($_POST['payment_method'] ?? '');
  $transactionId = sanitizeInput($_POST['transaction_id'] ?? '');
  $itemsRaw = $_POST['items'] ?? '[]';
  $total = floatval($_POST['total'] ?? 0);

  // Validate
  if (empty($name) || empty($email) || empty($paymentMethod) || empty($transactionId) || $total <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'All fields are required']);
    return;
  }

  if (!isset($_FILES['proof']) || $_FILES['proof']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['error' => 'Payment proof image is required']);
    return;
  }

  $conn = getDB();

  // Validate upload
  $file = $_FILES['proof'];
  if ($file['size'] > MAX_UPLOAD_SIZE) {
    http_response_code(400);
    echo json_encode(['error' => 'File too large. Maximum ' . (MAX_UPLOAD_SIZE / 1024 / 1024) . 'MB']);
    return;
  }

  $finfo = finfo_open(FILEINFO_MIME_TYPE);
  $mime = finfo_file($finfo, $file['tmp_name']);
  finfo_close($finfo);

  if (!in_array($mime, ALLOWED_UPLOAD_TYPES)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid file type. Only images are allowed']);
    return;
  }

  // Save proof file
  $uploadDir = __DIR__ . '/../uploads/proofs/';
  if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
  }

  $ext = match($mime) {
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/webp' => 'webp',
    default => 'jpg'
  };

  $fileName = 'proof_' . bin2hex(random_bytes(8)) . '.' . $ext;
  $filePath = $uploadDir . $fileName;

  if (!move_uploaded_file($file['tmp_name'], $filePath)) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to save proof file']);
    return;
  }

  $proofPath = '/uploads/proofs/' . $fileName;

  // Parse items
  $items = json_decode($itemsRaw, true);
  if (!is_array($items) || empty($items)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid cart items']);
    return;
  }

  $productIds = json_encode(array_column($items, 'id'));

  // Create order
  $orderId = bin2hex(random_bytes(16));
  $orderId = sprintf('%s-%s-%s-%s-%s',
    substr($orderId, 0, 8), substr($orderId, 8, 4), '4' . substr($orderId, 12, 3),
    substr($orderId, 16, 4), substr($orderId, 20, 12)
  );

  $insertOrder = $conn->prepare("INSERT INTO orders (id, user_id, product_ids, total_amount, payment_method, transaction_id, status) VALUES (?, ?, ?, ?, ?, ?, 'PENDING')");
  $paymentMethodEnum = match($paymentMethod) {
    'bkash' => 'BKASH',
    'nagad' => 'NAGAD',
    'bank' => 'BANK_TRANSFER',
    default => 'BKASH'
  };
  $insertOrder->bind_param('ssssss', $orderId, $user['id'], $productIds, $total, $paymentMethodEnum, $transactionId);
  $insertOrder->execute();

  // Save order products
  foreach ($items as $item) {
    $insertProduct = $conn->prepare("INSERT INTO order_products (id, order_id, product_id, price_paid) VALUES (UUID(), ?, ?, ?)");
    $prodId = bin2hex(random_bytes(16));
    $prodId = sprintf('%s-%s-%s-%s-%s',
      substr($prodId, 0, 8), substr($prodId, 8, 4), '4' . substr($prodId, 12, 3),
      substr($prodId, 16, 4), substr($prodId, 20, 12)
    );
    $insertProduct->bind_param('ssd', $orderId, $item['id'], $item['price']);
    $insertProduct->execute();
  }

  // Save payment proof record
  $proofId = bin2hex(random_bytes(16));
  $proofId = sprintf('%s-%s-%s-%s-%s',
    substr($proofId, 0, 8), substr($proofId, 8, 4), '4' . substr($proofId, 12, 3),
    substr($proofId, 16, 4), substr($proofId, 20, 12)
  );
  $insertProof = $conn->prepare("INSERT INTO payment_proofs (id, order_id, file_path, transaction_id, sender_number, amount, status) VALUES (?, ?, ?, ?, ?, ?, 'PENDING')");
  $insertProof->bind_param('sssssd', $proofId, $orderId, $proofPath, $transactionId, '', $total);
  $insertProof->execute();

  logActivity($conn, $user['id'], 'order_submitted', 'order', $orderId, 'Order submitted with ' . $paymentMethod . ' payment');

  // Clear cart
  unset($_SESSION['cart_items']);

  echo json_encode([
    'success' => true,
    'orderId' => $orderId,
    'message' => 'Payment proof submitted. Awaiting admin verification.'
  ]);
}

/**
 * List orders for a user
 */
function listOrders() {
  $user = requireAuth();
  $conn = getDB();

  $type = $_GET['type'] ?? 'all'; // all, pending, verified, completed

  if ($user['role'] === 'ADMIN') {
    // Admin sees all orders
    $query = "SELECT o.*, u.name as buyer_name, u.email as buyer_email,
              JSON_ARRAYAGG(JSON_OBJECT('id', op.product_id, 'title', p.title, 'price', op.price_paid)) as products
              FROM orders o
              JOIN users u ON o.user_id = u.id
              JOIN order_products op ON o.id = op.order_id
              JOIN products p ON op.product_id = p.id
              WHERE o.status = ? OR ? = 'all'
              GROUP BY o.id
              ORDER BY o.created_at DESC LIMIT 50";
    $stmt = $conn->prepare($query);
    $status = $type === 'all' ? '' : strtoupper($type);
    $stmt->bind_param('ss', $status, $status);
  } else {
    // User sees their own orders
    $query = "SELECT o.*,
              JSON_ARRAYAGG(JSON_OBJECT('id', op.product_id, 'title', p.title, 'price', op.price_paid)) as products
              FROM orders o
              JOIN order_products op ON o.id = op.order_id
              JOIN products p ON op.product_id = p.id
              WHERE o.user_id = ?
              GROUP BY o.id
              ORDER BY o.created_at DESC LIMIT 50";
    $stmt = $conn->prepare($query);
    $stmt->bind_param('s', $user['id']);
  }

  $stmt->execute();
  $result = $stmt->get_result();
  $orders = [];

  while ($row = $result->fetch_assoc()) {
    $orders[] = [
      'id' => $row['id'],
      'buyer_name' => $row['buyer_name'] ?? null,
      'buyer_email' => $row['buyer_email'] ?? null,
      'products' => json_decode($row['products'] ?? '[]', true),
      'total_amount' => (float)$row['total_amount'],
      'status' => $row['status'],
      'payment_method' => $row['payment_method'],
      'transaction_id' => $row['transaction_id'],
      'admin_note' => $row['admin_note'],
      'download_code' => $row['download_code'],
      'verified_at' => $row['verified_at'],
      'created_at' => $row['created_at']
    ];
  }

  echo json_encode(['orders' => $orders]);
}

/**
 * Verify (approve/reject) an order — admin only
 */
function verifyOrder() {
  $admin = requireRole(['ADMIN']);
  $conn = getDB();

  $body = json_decode(file_get_contents('php://input'), true) ?? $_POST;
  $orderId = sanitizeInput($body['order_id'] ?? '');
  $action = sanitizeInput($body['action'] ?? '');
  $adminNote = sanitizeInput($body['admin_note'] ?? '');

  if (empty($orderId) || !in_array($action, ['approve', 'reject'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid request']);
    return;
  }

  // Get order
  $order = $conn->prepare("SELECT * FROM orders WHERE id = ?");
  $order->bind_param('s', $orderId);
  $order->execute();
  $result = $order->get_result();

  if ($result->num_rows === 0) {
    http_response_code(404);
    echo json_encode(['error' => 'Order not found']);
    return;
  }

  $orderData = $result->fetch_assoc();

  // Prevent duplicate approval
  if ($action === 'approve' && $orderData['status'] === 'VERIFIED') {
    http_response_code(400);
    echo json_encode(['error' => 'Order already verified']);
    return;
  }

  if ($action === 'approve') {
    // Generate download code
    $downloadCode = bin2hex(random_bytes(32));
    $expiresAt = date('Y-m-d H:i:s', time() + (30 * 24 * 60 * 60)); // 30 days

    // Update order
    $update = $conn->prepare("UPDATE orders SET status = 'VERIFIED', download_code = ?, verified_by = ?, verified_at = NOW(), admin_note = ? WHERE id = ?");
    $update->bind_param('ssss', $downloadCode, $admin['id'], $adminNote, $orderId);
    $update->execute();

    // Update payment proofs
    $updateProof = $conn->prepare("UPDATE payment_proofs SET status = 'APPROVED', reviewed_by = ?, review_note = ?, reviewed_at = NOW() WHERE order_id = ?");
    $updateProof->bind_param('sss', $admin['id'], $adminNote, $orderId);
    $updateProof->execute();

    // Create download code record
    $downloadId = bin2hex(random_bytes(16));
    $downloadId = sprintf('%s-%s-%s-%s-%s',
      substr($downloadId, 0, 8), substr($downloadId, 8, 4), '4' . substr($downloadId, 12, 3),
      substr($downloadId, 16, 4), substr($downloadId, 20, 12)
    );
    $insertDownload = $conn->prepare("INSERT INTO download_codes (id, order_id, user_id, code, expires_at) VALUES (?, ?, ?, ?, ?)");
    $insertDownload->bind_param('sssss', $downloadId, $orderId, $orderData['user_id'], $downloadCode, $expiresAt);
    $insertDownload->execute();

    logActivity($conn, $admin['id'], 'order_approved', 'order', $orderId, 'Order approved, download code generated');

    echo json_encode([
      'success' => true,
      'downloadCode' => $downloadCode,
      'message' => 'Order approved. Download code generated.'
    ]);

  } else {
    // Reject
    $update = $conn->prepare("UPDATE orders SET status = 'REJECTED', verified_by = ?, verified_at = NOW(), admin_note = ? WHERE id = ?");
    $update->bind_param('sss', $admin['id'], $adminNote, $orderId);
    $update->execute();

    // Update payment proofs
    $updateProof = $conn->prepare("UPDATE payment_proofs SET status = 'REJECTED', reviewed_by = ?, review_note = ?, reviewed_at = NOW() WHERE order_id = ?");
    $updateProof->bind_param('sss', $admin['id'], $adminNote, $orderId);
    $updateProof->execute();

    logActivity($conn, $admin['id'], 'order_rejected', 'order', $orderId, 'Order rejected: ' . $adminNote);

    echo json_encode(['success' => true, 'message' => 'Order rejected.']);
  }
}

/**
 * Download a file via download code
 */
function downloadFile() {
  $code = sanitizeInput($_GET['code'] ?? '');
  $conn = getDB();

  if (empty($code)) {
    http_response_code(400);
    echo json_encode(['error' => 'Download code required']);
    return;
  }

  // Find download code
  $stmt = $conn->prepare("SELECT dc.*, o.user_id, o.status FROM download_codes dc JOIN orders o ON dc.order_id = o.id WHERE dc.code = ? AND dc.is_used = 0 AND dc.expires_at > NOW()");
  $stmt->bind_param('s', $code);
  $stmt->execute();
  $result = $stmt->get_result();

  if ($result->num_rows === 0) {
    http_response_code(404);
    echo json_encode(['error' => 'Invalid or expired download code']);
    return;
  }

  $download = $result->fetch_assoc();

  // Mark as used
  $markUsed = $conn->prepare("UPDATE download_codes SET is_used = 1 WHERE code = ?");
  $markUsed->bind_param('s', $code);
  $markUsed->execute();

  // Increment product downloads
  $increment = $conn->prepare("UPDATE products SET downloads = downloads + 1 WHERE id IN (SELECT product_id FROM order_products WHERE order_id = (SELECT order_id FROM download_codes WHERE code = ?))");
  $increment->bind_param('s', $code);
  $increment->execute();

  // Return file list for this order
  $products = $conn->prepare("SELECT p.title, p.files, op.price_paid FROM order_products op JOIN products p ON op.product_id = p.id WHERE op.order_id = (SELECT order_id FROM download_codes WHERE code = ?)");
  $products->bind_param('s', $code);
  $products->execute();
  $productResult = $products->get_result();

  $files = [];
  while ($row = $productResult->fetch_assoc()) {
    $files[] = [
      'title' => $row['title'],
      'path' => $row['files'],
      'price' => (float)$row['price_paid']
    ];
  }

  echo json_encode([
    'success' => true,
    'files' => $files,
    'expiresAt' => $download['expires_at']
  ]);
}

/**
 * Get single order details
 */
function getOrder() {
  $user = requireAuth();
  $conn = getDB();
  $orderId = sanitizeInput($_GET['id'] ?? '');

  if ($user['role'] !== 'ADMIN') {
    $stmt = $conn->prepare("SELECT * FROM orders WHERE id = ? AND user_id = ?");
    $stmt->bind_param('ss', $orderId, $user['id']);
  } else {
    $stmt = $conn->prepare("SELECT * FROM orders WHERE id = ?");
    $stmt->bind_param('s', $orderId);
  }

  $stmt->execute();
  $result = $stmt->get_result();

  if ($result->num_rows === 0) {
    http_response_code(404);
    echo json_encode(['error' => 'Order not found']);
    return;
  }

  $order = $result->fetch_assoc();

  // Get products
  $prodStmt = $conn->prepare("SELECT p.id, p.title, p.slug, p.category, op.price_paid FROM order_products op JOIN products p ON op.product_id = p.id WHERE op.order_id = ?");
  $prodStmt->bind_param('s', $orderId);
  $prodStmt->execute();
  $prodResult = $prodStmt->get_result();
  $products = [];
  while ($row = $prodResult->fetch_assoc()) {
    $products[] = $row;
  }

  echo json_encode([
    'order' => $order,
    'products' => $products
  ]);
}

// Reuse helper functions from auth.php
function getDB() {
  static $conn = null;
  if ($conn === null) {
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    if ($conn->connect_error) {
      error_log('Database connection failed: ' . $conn->connect_error);
      http_response_code(500);
      echo json_encode(['error' => 'Database connection failed']);
      exit;
    }
    $conn->set_charset(DB_CHARSET);
  }
  return $conn;
}

function sanitizeInput($input) {
  if (is_null($input)) return '';
  return htmlspecialchars(strip_tags(trim($input)), ENT_QUOTES, 'UTF-8');
}

function requireAuth() {
  if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Authentication required']);
    exit;
  }
  return [
    'id' => $_SESSION['user_id'],
    'email' => $_SESSION['user_email'],
    'role' => $_SESSION['user_role'] ?? 'BUYER'
  ];
}

function requireRole($roles) {
  $user = requireAuth();
  if (!in_array($user['role'], $roles)) {
    http_response_code(403);
    echo json_encode(['error' => 'Insufficient permissions']);
    exit;
  }
  return $user;
}

function verifyCSRF($token) {
  return !empty($token) && !empty($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token);
}

function logActivity($conn, $userId, $action, $entityType = null, $entityId = null, $details = null) {
  $stmt = $conn->prepare("INSERT INTO activity_log (user_id, action, entity_type, entity_id, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)");
  $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
  $ua = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
  $stmt->bind_param('sssssss', $userId, $action, $entityType, $entityId, $details, $ip, $ua);
  $stmt->execute();
}
