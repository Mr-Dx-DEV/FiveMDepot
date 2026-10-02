<?php
/**
 * FiveMDepot — Admin API
 * Handles admin operations: seller approval, stats, settings
 */

require_once __DIR__ . '/../config.php';

ini_set('session.cookie_httponly', 1);
session_name(SESSION_NAME);
session_start();

header('Content-Type: application/json; charset=utf-8');

$action = $_GET['action'] ?? $_POST['action'] ?? '';

// Require admin
$user = requireAdmin();
$conn = getDB();

switch($action) {
  case 'stats':
    getStats($conn);
    break;
  case 'sellers':
    listSellers($conn);
    break;
  case 'approve-seller':
    approveSeller($conn);
    break;
  case 'reject-seller':
    rejectSeller($conn);
    break;
  case 'products':
    listProducts($conn);
    break;
  case 'orders':
    listOrders($conn);
    break;
  case 'users':
    listUsers($conn);
    break;
  case 'settings':
    handleSettings($conn);
    break;
  case 'withdrawals':
    listWithdrawals($conn);
    break;
  case 'approve-withdrawal':
    approveWithdrawal($conn);
    break;
  case 'categories':
    handleCategories($conn);
    break;
  case 'analytics':
    getAnalytics($conn);
    break;
  default:
    http_response_code(400);
    echo json_encode(['error' => 'Invalid action']);
}

/**
 * Get dashboard statistics
 */
function getStats($conn) {
  $stats = [];

  // Total users
  $result = $conn->query("SELECT COUNT(*) as count FROM users");
  $stats['total_users'] = (int)$result->fetch_assoc()['count'];

  // Active buyers
  $result = $conn->query("SELECT COUNT(*) as count FROM users WHERE role = 'BUYER'");
  $stats['total_buyers'] = (int)$result->fetch_assoc()['count'];

  // Total sellers
  $result = $conn->query("SELECT COUNT(*) as count FROM users WHERE role = 'SELLER'");
  $stats['total_sellers'] = (int)$result->fetch_assoc()['count'];

  // Pending sellers
  $result = $conn->query("SELECT COUNT(*) as count FROM seller_profiles WHERE status = 'PENDING'");
  $stats['pending_sellers'] = (int)$result->fetch_assoc()['count'];

  // Total products
  $result = $conn->query("SELECT COUNT(*) as count FROM products WHERE status = 'PUBLISHED'");
  $stats['total_products'] = (int)$result->fetch_assoc()['count'];

  // Pending products
  $result = $conn->query("SELECT COUNT(*) as count FROM products WHERE status = 'PENDING'");
  $stats['pending_products'] = (int)$result->fetch_assoc()['count'];

  // Total orders
  $result = $conn->query("SELECT COUNT(*) as count FROM orders");
  $stats['total_orders'] = (int)$result->fetch_assoc()['count'];

  // Pending orders
  $result = $conn->query("SELECT COUNT(*) as count FROM orders WHERE status = 'PENDING'");
  $stats['pending_orders'] = (int)$result->fetch_assoc()['count'];

  // Verified orders
  $result = $conn->query("SELECT COUNT(*) as count FROM orders WHERE status = 'VERIFIED'");
  $stats['verified_orders'] = (int)$result->fetch_assoc()['count'];

  // Revenue
  $result = $conn->query("SELECT SUM(total_amount) as total FROM orders WHERE status IN ('VERIFIED', 'COMPLETED')");
  $row = $result->fetch_assoc();
  $stats['total_revenue'] = $row['total'] ? (float)$row['total'] : 0;

  // Monthly revenue
  $result = $conn->query("SELECT SUM(total_amount) as total FROM orders WHERE status IN ('VERIFIED', 'COMPLETED') AND MONTH(created_at) = MONTH(CURRENT_DATE()) AND YEAR(created_at) = YEAR(CURRENT_DATE())");
  $row = $result->fetch_assoc();
  $stats['monthly_revenue'] = $row['total'] ? (float)$row['total'] : 0;

  // Pending earnings (sellers' pending withdrawals)
  $result = $conn->query("SELECT SUM(amount) as total FROM withdrawals WHERE status = 'PENDING'");
  $row = $result->fetch_assoc();
  $stats['pending_withdrawals'] = $row['total'] ? (float)$row['total'] : 0;

  // Category breakdown
  $result = $conn->query("SELECT category, COUNT(*) as count FROM products WHERE status = 'PUBLISHED' GROUP BY category");
  $stats['categories'] = [];
  while ($row = $result->fetch_assoc()) {
    $stats['categories'][] = $row;
  }

  // Recent orders
  $result = $conn->query("SELECT o.*, u.name as buyer_name FROM orders o JOIN users u ON o.user_id = u.id ORDER BY o.created_at DESC LIMIT 10");
  $stats['recent_orders'] = [];
  while ($row = $result->fetch_assoc()) {
    $stats['recent_orders'][] = [
      'id' => $row['id'],
      'buyer_name' => $row['buyer_name'],
      'total_amount' => (float)$row['total_amount'],
      'status' => $row['status'],
      'created_at' => $row['created_at']
    ];
  }

  // Recent sellers
  $result = $conn->query("SELECT sp.*, u.name, u.email FROM seller_profiles sp JOIN users u ON sp.user_id = u.id ORDER BY sp.created_at DESC LIMIT 10");
  $stats['recent_sellers'] = [];
  while ($row = $result->fetch_assoc()) {
    $stats['recent_sellers'][] = [
      'id' => $row['id'],
      'name' => $row['name'],
      'email' => $row['email'],
      'status' => $row['status'],
      'created_at' => $row['created_at']
    ];
  }

  echo json_encode(['stats' => $stats]);
}

/**
 * List seller applications
 */
function listSellers($conn) {
  $status = $_GET['status'] ?? 'all';

  if ($status === 'all') {
    $query = "SELECT sp.*, u.name, u.email, u.role FROM seller_profiles sp JOIN users u ON sp.user_id = u.id ORDER BY sp.created_at DESC LIMIT 100";
  } else {
    $query = "SELECT sp.*, u.name, u.email FROM seller_profiles sp JOIN users u ON sp.user_id = u.id WHERE sp.status = ? ORDER BY sp.created_at DESC LIMIT 100";
    $stmt = $conn->prepare($query);
    $stmt->bind_param('s', $status);
    $stmt->execute();
    $result = $stmt->get_result();
  }

  if (!isset($result)) {
    $result = $conn->query($query);
  }

  $sellers = [];
  while ($row = $result->fetch_assoc()) {
    $sellers[] = [
      'id' => $row['id'],
      'user_id' => $row['user_id'],
      'name' => $row['name'],
      'email' => $row['email'],
      'discord_tag' => $row['discord_tag'],
      'bio' => $row['bio'],
      'status' => $row['status'],
      'created_at' => $row['created_at']
    ];
  }

  echo json_encode(['sellers' => $sellers]);
}

/**
 * Approve seller application
 */
function approveSeller($conn) {
  $body = json_decode(file_get_contents('php://input'), true) ?? $_POST;
  $sellerId = sanitizeInput($body['id'] ?? '');

  // Get seller's user_id
  $stmt = $conn->prepare("SELECT user_id FROM seller_profiles WHERE id = ?");
  $stmt->bind_param('s', $sellerId);
  $stmt->execute();
  $result = $stmt->get_result();
  if ($result->num_rows === 0) {
    http_response_code(404);
    echo json_encode(['error' => 'Seller application not found']);
    return;
  }

  $seller = $result->fetch_assoc();

  // Update seller profile
  $update = $conn->prepare("UPDATE seller_profiles SET status = 'APPROVED', approved_by = ?, approved_at = NOW() WHERE id = ?");
  $update->bind_param('ss', $_SESSION['user_id'], $sellerId);
  $update->execute();

  // Update user role
  $roleUpdate = $conn->prepare("UPDATE users SET role = 'SELLER' WHERE id = ? AND role = 'BUYER'");
  $roleUpdate->bind_param('s', $seller['user_id']);
  $roleUpdate->execute();

  logActivity($conn, $_SESSION['user_id'], 'seller_approved', 'seller_profile', $sellerId, 'Seller ' . $seller['user_id'] . ' approved');

  echo json_encode(['success' => true, 'message' => 'Seller approved successfully']);
}

/**
 * Reject seller application
 */
function rejectSeller($conn) {
  $body = json_decode(file_get_contents('php://input'), true) ?? $_POST;
  $sellerId = sanitizeInput($body['id'] ?? '');
  $reason = sanitizeInput($body['reason'] ?? '');

  $update = $conn->prepare("UPDATE seller_profiles SET status = 'REJECTED', approved_by = ?, approved_at = NOW(), rejection_reason = ? WHERE id = ?");
  $update->bind_param('sss', $_SESSION['user_id'], $reason, $sellerId);
  $update->execute();

  logActivity($conn, $_SESSION['user_id'], 'seller_rejected', 'seller_profile', $sellerId, $reason);

  echo json_encode(['success' => true, 'message' => 'Seller application rejected']);
}

/**
 * List products (admin view)
 */
function listProducts($conn) {
  $status = $_GET['status'] ?? 'all';
  $search = sanitizeInput($_GET['search'] ?? '');

  $where = [];
  $params = [];
  $types = '';

  if ($status !== 'all') {
    $where[] = "p.status = ?";
    $params[] = $status;
    $types .= 's';
  }

  if ($search) {
    $where[] = "p.title LIKE ?";
    $params[] = '%' . $search . '%';
    $types .= 's';
  }

  $whereClause = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

  $query = "SELECT p.*, u.name as seller_name FROM products p JOIN users u ON p.user_id = u.id $whereClause ORDER BY p.created_at DESC LIMIT 100";

  $stmt = $conn->prepare($query);
  if (!empty($params)) {
    $stmt->bind_param($types, ...$params);
  }
  $stmt->execute();
  $result = $stmt->get_result();

  $products = [];
  while ($row = $result->fetch_assoc()) {
    $products[] = [
      'id' => $row['id'],
      'slug' => $row['slug'],
      'title' => $row['title'],
      'category' => $row['category'],
      'price' => (float)$row['price'],
      'status' => $row['status'],
      'downloads' => (int)$row['downloads'],
      'featured' => (bool)$row['featured'],
      'seller_name' => $row['seller_name'],
      'created_at' => $row['created_at']
    ];
  }

  echo json_encode(['products' => $products]);
}

/**
 * List orders (admin view)
 */
function listOrders($conn) {
  $status = $_GET['status'] ?? 'all';

  if ($status === 'all') {
    $query = "SELECT o.*, u.name as buyer_name, u.email as buyer_email
              FROM orders o JOIN users u ON o.user_id = u.id
              ORDER BY o.created_at DESC LIMIT 100";
    $result = $conn->query($query);
  } else {
    $query = "SELECT o.*, u.name as buyer_name, u.email as buyer_email
              FROM orders o JOIN users u ON o.user_id = u.id
              WHERE o.status = ? ORDER BY o.created_at DESC LIMIT 100";
    $stmt = $conn->prepare($query);
    $stmt->bind_param('s', $status);
    $stmt->execute();
    $result = $stmt->get_result();
  }

  $orders = [];
  while ($row = $result->fetch_assoc()) {
    $orders[] = [
      'id' => $row['id'],
      'buyer_name' => $row['buyer_name'],
      'buyer_email' => $row['buyer_email'],
      'total_amount' => (float)$row['total_amount'],
      'status' => $row['status'],
      'payment_method' => $row['payment_method'],
      'transaction_id' => $row['transaction_id'],
      'download_code' => $row['download_code'],
      'admin_note' => $row['admin_note'],
      'created_at' => $row['created_at']
    ];
  }

  echo json_encode(['orders' => $orders]);
}

/**
 * List users
 */
function listUsers($conn) {
  $role = $_GET['role'] ?? 'all';
  $search = sanitizeInput($_GET['search'] ?? '');

  $where = [];
  $params = [];
  $types = '';

  if ($role !== 'all') {
    $where[] = "u.role = ?";
    $params[] = $role;
    $types .= 's';
  }

  if ($search) {
    $where[] = "(u.name LIKE ? OR u.email LIKE ?)";
    $searchParam = '%' . $search . '%';
    $params[] = $searchParam;
    $params[] = $searchParam;
    $types .= 'ss';
  }

  $whereClause = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

  $query = "SELECT u.*, sp.status as seller_status FROM users u LEFT JOIN seller_profiles sp ON u.id = sp.user_id $whereClause ORDER BY u.created_at DESC LIMIT 100";

  $stmt = $conn->prepare($query);
  if (!empty($params)) {
    $stmt->bind_param($types, ...$params);
  }
  $stmt->execute();
  $result = $stmt->get_result();

  $users = [];
  while ($row = $result->fetch_assoc()) {
    $users[] = [
      'id' => $row['id'],
      'name' => $row['name'],
      'email' => $row['email'],
      'role' => $row['role'],
      'seller_status' => $row['seller_status'],
      'wallet_balance' => (float)$row['wallet_balance'],
      'created_at' => $row['created_at']
    ];
  }

  echo json_encode(['users' => $users]);
}

/**
 * Handle site settings
 */
function handleSettings($conn) {
  if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Get all settings
    $result = $conn->query("SELECT key, value, description FROM site_settings");
    $settings = [];
    while ($row = $result->fetch_assoc()) {
      $settings[$row['key']] = [
        'value' => $row['value'],
        'description' => $row['description']
      ];
    }
    echo json_encode(['settings' => $settings]);
    return;
  }

  // Update settings
  $body = json_decode(file_get_contents('php://input'), true) ?? $_POST;
  $updated = [];

  foreach ($body as $key => $value) {
    if ($key === 'csrf_token' || $key === 'action') continue;

    $stmt = $conn->prepare("UPDATE site_settings SET value = ?, updated_at = NOW() WHERE key = ?");
    $stmt->bind_param('ss', $value, $key);
    $stmt->execute();
    $updated[] = $key;
  }

  echo json_encode(['success' => true, 'updated' => $updated]);
}

/**
 * Handle categories (CRUD)
 */
function handleCategories($conn) {
  if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // List all categories
    $result = $conn->query("SELECT * FROM categories ORDER BY `order` ASC");
    $categories = [];
    while ($row = $result->fetch_assoc()) {
      // Count products in category
      $count = $conn->query("SELECT COUNT(*) as cnt FROM products WHERE category = '" . $row['slug'] . "'")->fetch_assoc()['cnt'];
      $row['product_count'] = (int)$count;
      $categories[] = $row;
    }
    echo json_encode(['categories' => $categories]);
    return;
  }

  $action = $_POST['action'] ?? $_GET['action'] ?? '';

  if ($action === 'create') {
    $name = sanitizeInput($_POST['name'] ?? '');
    $slug = sanitizeInput($_POST['slug'] ?? '');
    $icon = sanitizeInput($_POST['icon'] ?? 'folder');
    $description = $_POST['description'] ?? '';
    $order = intval($_POST['order'] ?? 0);

    if (empty($name) || empty($slug)) {
      http_response_code(400);
      echo json_encode(['error' => 'Name and slug are required']);
      return;
    }

    // Check duplicate slug
    $check = $conn->prepare("SELECT id FROM categories WHERE slug = ?");
    $check->bind_param('s', $slug);
    $check->execute();
    if ($check->get_result()->num_rows > 0) {
      http_response_code(400);
      echo json_encode(['error' => 'Slug already exists']);
      return;
    }

    $catId = bin2hex(random_bytes(16));
    $catId = sprintf('%s-%s-%s-%s-%s',
      substr($catId, 0, 8), substr($catId, 8, 4), '4' . substr($catId, 12, 3),
      substr($catId, 16, 4), substr($catId, 20, 12)
    );

    $insert = $conn->prepare("INSERT INTO categories (id, name, slug, icon, description, `order`) VALUES (?, ?, ?, ?, ?, ?)");
    $insert->bind_param('sssssi', $catId, $name, $slug, $icon, $description, $order);
    $insert->execute();

    logActivity($conn, $_SESSION['user_id'], 'category_created', 'category', $catId, 'Category created: ' . $name);

    echo json_encode(['success' => true, 'id' => $catId]);

  } elseif ($action === 'update') {
    $id = sanitizeInput($_POST['id'] ?? '');
    $name = sanitizeInput($_POST['name'] ?? '');
    $icon = sanitizeInput($_POST['icon'] ?? 'folder');
    $description = $_POST['description'] ?? '';
    $order = intval($_POST['order'] ?? 0);
    $isActive = isset($_POST['is_active']) ? 1 : 0;

    if (empty($id) || empty($name)) {
      http_response_code(400);
      echo json_encode(['error' => 'ID and name are required']);
      return;
    }

    $update = $conn->prepare("UPDATE categories SET name = ?, icon = ?, description = ?, `order` = ?, is_active = ?, updated_at = NOW() WHERE id = ?");
    $update->bind_param('sssiii', $name, $icon, $description, $order, $isActive, $id);
    $update->execute();

    logActivity($conn, $_SESSION['user_id'], 'category_updated', 'category', $id, 'Category updated: ' . $name);

    echo json_encode(['success' => true]);

  } elseif ($action === 'delete') {
    $id = sanitizeInput($_POST['id'] ?? '');

    // Check if category has products
    $check = $conn->prepare("SELECT COUNT(*) as cnt FROM products WHERE category_id = ?");
    $check->bind_param('s', $id);
    $check->execute();
    $count = $check->get_result()->fetch_assoc()['cnt'];
    if ($count > 0) {
      http_response_code(400);
      echo json_encode(['error' => 'Cannot delete category with products. Move or delete products first.']);
      return;
    }

    $delete = $conn->prepare("DELETE FROM categories WHERE id = ?");
    $delete->bind_param('s', $id);
    $delete->execute();

    logActivity($conn, $_SESSION['user_id'], 'category_deleted', 'category', $id);

    echo json_encode(['success' => true]);
  }
}

/**
 * Get analytics data
 */
function getAnalytics($conn) {
  $analytics = [];

  // Revenue over time (last 30 days)
  $result = $conn->query("
    SELECT DATE(created_at) as date, SUM(total_amount) as revenue, COUNT(*) as orders
    FROM orders
    WHERE status IN ('VERIFIED', 'COMPLETED')
    AND created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  ");
  $revenueData = [];
  while ($row = $result->fetch_assoc()) {
    $revenueData[] = [
      'date' => $row['date'],
      'revenue' => (float)$row['revenue'],
      'orders' => (int)$row['orders']
    ];
  }
  $analytics['revenue_chart'] = $revenueData;

  // Product sales by category
  $result = $conn->query("
    SELECT p.category, COUNT(op.product_id) as sales, SUM(op.price_paid) as revenue
    FROM order_products op
    JOIN products p ON op.product_id = p.id
    JOIN orders o ON op.order_id = o.id
    WHERE o.status IN ('VERIFIED', 'COMPLETED')
    GROUP BY p.category
    ORDER BY revenue DESC
  ");
  $analytics['category_sales'] = [];
  while ($row = $result->fetch_assoc()) {
    $analytics['category_sales'][] = [
      'category' => $row['category'],
      'sales' => (int)$row['sales'],
      'revenue' => (float)$row['revenue']
    ];
  }

  // Top products
  $result = $conn->query("
    SELECT p.title, p.slug, p.category, COUNT(op.product_id) as times_sold, SUM(op.price_paid) as revenue
    FROM order_products op
    JOIN products p ON op.product_id = p.id
    JOIN orders o ON op.order_id = o.id
    WHERE o.status IN ('VERIFIED', 'COMPLETED')
    GROUP BY p.id
    ORDER BY times_sold DESC
    LIMIT 10
  ");
  $analytics['top_products'] = [];
  while ($row = $result->fetch_assoc()) {
    $analytics['top_products'][] = [
      'title' => $row['title'],
      'slug' => $row['slug'],
      'category' => $row['category'],
      'times_sold' => (int)$row['times_sold'],
      'revenue' => (float)$row['revenue']
    ];
  }

  // New users over time
  $result = $conn->query("
    SELECT DATE(created_at) as date, COUNT(*) as users
    FROM users
    WHERE created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  ");
  $userData = [];
  while ($row = $result->fetch_assoc()) {
    $userData[] = ['date' => $row['date'], 'users' => (int)$row['users']];
  }
  $analytics['user_growth'] = $userData;

  // Seller earnings summary
  $result = $conn->query("
    SELECT u.id, u.name, u.email,
    COALESCE(SUM(op.price_paid) * 0.8, 0) as earnings
    FROM users u
    JOIN products p ON u.id = p.user_id
    JOIN order_products op ON p.id = op.product_id
    JOIN orders o ON op.order_id = o.id
    WHERE u.role = 'SELLER' AND o.status IN ('VERIFIED', 'COMPLETED')
    GROUP BY u.id
    ORDER BY earnings DESC
    LIMIT 10
  ");
  $analytics['seller_earnings'] = [];
  while ($row = $result->fetch_assoc()) {
    $analytics['seller_earnings'][] = [
      'name' => $row['name'],
      'email' => $row['email'],
      'earnings' => (float)$row['earnings']
    ];
  }

  // Platform stats
  $analytics['platform'] = [
    'total_users' => (int)$conn->query("SELECT COUNT(*) as cnt FROM users")->fetch_assoc()['cnt'],
    'total_sellers' => (int)$conn->query("SELECT COUNT(*) as cnt FROM users WHERE role = 'SELLER'")->fetch_assoc()['cnt'],
    'total_products' => (int)$conn->query("SELECT COUNT(*) as cnt FROM products WHERE status = 'PUBLISHED'")->fetch_assoc()['cnt'],
    'total_orders' => (int)$conn->query("SELECT COUNT(*) as cnt FROM orders WHERE status IN ('VERIFIED', 'COMPLETED')")->fetch_assoc()['cnt'],
    'total_revenue' => (float)($conn->query("SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status IN ('VERIFIED', 'COMPLETED')")->fetch_assoc()['total']),
    'monthly_revenue' => (float)($conn->query("SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status IN ('VERIFIED', 'COMPLETED') AND MONTH(created_at) = MONTH(CURRENT_DATE()) AND YEAR(created_at) = YEAR(CURRENT_DATE())")->fetch_assoc()['total']),
    'avg_order_value' => 0
  ];

  // Calculate avg order value
  $avgResult = $conn->query("SELECT AVG(total_amount) as avg_val FROM orders WHERE status IN ('VERIFIED', 'COMPLETED')");
  $avgRow = $avgResult->fetch_assoc();
  $analytics['platform']['avg_order_value'] = $avgRow['avg_val'] ? (float)$avgRow['avg_val'] : 0;

  echo json_encode(['analytics' => $analytics]);
}

/**
 * List withdrawal requests
 */
function listWithdrawals($conn) {
  $status = $_GET['status'] ?? 'all';

  if ($status === 'all') {
    $query = "SELECT w.*, u.name, u.email FROM withdrawals w JOIN users u ON w.user_id = u.id ORDER BY w.created_at DESC LIMIT 100";
  } else {
    $query = "SELECT w.*, u.name, u.email FROM withdrawals w JOIN users u ON w.user_id = u.id WHERE w.status = ? ORDER BY w.created_at DESC LIMIT 100";
    $stmt = $conn->prepare($query);
    $stmt->bind_param('s', $status);
    $stmt->execute();
    $result = $stmt->get_result();
  }

  if (!isset($result)) {
    $result = $conn->query($query);
  }

  $withdrawals = [];
  while ($row = $result->fetch_assoc()) {
    $withdrawals[] = $row;
  }

  echo json_encode(['withdrawals' => $withdrawals]);
}

/**
 * Approve withdrawal
 */
function approveWithdrawal($conn) {
  $body = json_decode(file_get_contents('php://input'), true) ?? $_POST;
  $withdrawalId = sanitizeInput($body['id'] ?? '');
  $action = sanitizeInput($body['action'] ?? '');

  if ($action === 'approve') {
    $update = $conn->prepare("UPDATE withdrawals SET status = 'PAID', approved_by = ?, approved_at = NOW(), paid_at = NOW() WHERE id = ?");
    $update->bind_param('ss', $_SESSION['user_id'], $withdrawalId);
    $update->execute();
  } else {
    $reason = sanitizeInput($body['reason'] ?? '');
    $update = $conn->prepare("UPDATE withdrawals SET status = 'REJECTED', rejected_reason = ? WHERE id = ?");
    $update->bind_param('ss', $reason, $withdrawalId);
    $update->execute();
  }

  logActivity($conn, $_SESSION['user_id'], 'withdrawal_' . $action, 'withdrawal', $withdrawalId);

  echo json_encode(['success' => true]);
}

// ============================================
// Helpers
// ============================================

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

function requireAdmin() {
  if (!isset($_SESSION['user_id']) || ($_SESSION['user_role'] ?? 'BUYER') !== 'ADMIN') {
    http_response_code(403);
    echo json_encode(['error' => 'Admin access required']);
    exit;
  }
  return ['id' => $_SESSION['user_id'], 'email' => $_SESSION['user_email'], 'role' => 'ADMIN'];
}

function logActivity($conn, $userId, $action, $entityType = null, $entityId = null, $details = null) {
  $stmt = $conn->prepare("INSERT INTO activity_log (user_id, action, entity_type, entity_id, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)");
  $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
  $ua = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
  $stmt->bind_param('sssssss', $userId, $action, $entityType, $entityId, $details, $ip, $ua);
  $stmt->execute();
}
