<?php
/**
 * FiveMDepot — Products API
 * Handles product listing, creation, and admin management
 */

require_once __DIR__ . '/../config.php';

ini_set('session.cookie_httponly', 1);
session_name(SESSION_NAME);
session_start();

header('Content-Type: application/json; charset=utf-8');

$action = $_GET['action'] ?? $_POST['action'] ?? '';

switch($action) {
  case 'list':
    listProducts();
    break;
  case 'get':
    getProduct();
    break;
  case 'create':
    createProduct();
    break;
  case 'update':
    updateProduct();
    break;
  case 'delete':
    deleteProduct();
    break;
  case 'featured':
    setFeatured();
    break;
  case 'approve':
    approveProduct();
    break;
  case 'reject':
    rejectProduct();
    break;
  case 'free':
    listFreeProducts();
    break;
  case 'categories':
    listCategories();
    break;
  default:
    // Default: list all products
    listProducts();
}

/**
 * List products (public)
 */
function listProducts() {
  $conn = getDB();

  $category = sanitizeInput($_GET['category'] ?? 'all');
  $search = sanitizeInput($_GET['search'] ?? '');
  $sort = sanitizeInput($_GET['sort'] ?? 'featured');

  $where = ["p.status = 'PUBLISHED'"];
  $params = [];
  $types = '';

  if ($category !== 'all') {
    $where[] = "p.category = ?";
    $params[] = strtoupper($category);
    $types .= 's';
  }

  if ($search) {
    $where[] = "(p.title LIKE ? OR JSON_UNQUOTE(JSON_EXTRACT(p.tags, CONCAT('$[*]'))) LIKE ?)";
    $searchParam = '%' . $search . '%';
    $where[] = "p.title LIKE ?";
    $params[] = $searchParam;
    $types .= 's';
  }

  $whereClause = 'WHERE ' . implode(' AND ', $where);

  // Sorting
  $orderBy = 'p.featured DESC, p.created_at DESC';
  switch($sort) {
    case 'newest': $orderBy = 'p.created_at DESC'; break;
    case 'price-low': $orderBy = 'p.price ASC'; break;
    case 'price-high': $orderBy = 'p.price DESC'; break;
    case 'popular': $orderBy = 'p.downloads DESC'; break;
  }

  $query = "SELECT p.*, u.name as seller_name, u.image as seller_image,
            JSON_LENGTH(p.screenshots) as screenshot_count
            FROM products p
            JOIN users u ON p.user_id = u.id
            $whereClause
            ORDER BY $orderBy";

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
      'description' => $row['description'],
      'category' => $row['category'],
      'price' => (float)$row['price'],
      'screenshots' => json_decode($row['screenshots'] ?? '[]', true),
      'tags' => json_decode($row['tags'] ?? '[]', true),
      'version' => $row['version'],
      'compatibility' => json_decode($row['compatibility'] ?? '[]', true),
      'downloads' => (int)$row['downloads'],
      'featured' => (bool)$row['featured'],
      'seller' => [
        'name' => $row['seller_name'],
        'image' => $row['seller_image']
      ],
      'created_at' => $row['created_at'],
      'screenshot_count' => (int)$row['screenshot_count']
    ];
  }

  echo json_encode(['products' => $products]);
}

/**
 * Get single product by slug
 */
function getProduct() {
  $conn = getDB();
  $slug = sanitizeInput($_GET['slug'] ?? '');

  $stmt = $conn->prepare("SELECT p.*, u.name as seller_name, u.image as seller_image,
            sp.bio as seller_bio, sp.discord_tag as seller_discord
            FROM products p
            JOIN users u ON p.user_id = u.id
            LEFT JOIN seller_profiles sp ON p.user_id = sp.user_id
            WHERE p.slug = ? AND p.status = 'PUBLISHED'");
  $stmt->bind_param('s', $slug);
  $stmt->execute();
  $result = $stmt->get_result();

  if ($result->num_rows === 0) {
    http_response_code(404);
    echo json_encode(['error' => 'Product not found']);
    return;
  }

  $product = $result->fetch_assoc();
  $product['screenshots'] = json_decode($product['screenshots'] ?? '[]', true);
  $product['tags'] = json_decode($product['tags'] ?? '[]', true);
  $product['compatibility'] = json_decode($product['compatibility'] ?? '[]', true);
  $product['seller'] = [
    'name' => $product['seller_name'],
    'image' => $product['seller_image'],
    'bio' => $product['seller_bio'],
    'discord' => $product['seller_discord']
  ];

  // Get reviews
  $reviewStmt = $conn->prepare("SELECT r.*, u.name as reviewer_name, u.image as reviewer_image
                                 FROM reviews r
                                 JOIN users u ON r.user_id = u.id
                                 WHERE r.product_id = ?
                                 ORDER BY r.created_at DESC LIMIT 20");
  $reviewStmt->bind_param('s', $product['id']);
  $reviewStmt->execute();
  $reviewResult = $reviewStmt->get_result();
  $reviews = [];
  while ($row = $reviewResult->fetch_assoc()) {
    $reviews[] = [
      'id' => $row['id'],
      'rating' => (int)$row['rating'],
      'comment' => $row['comment'],
      'reviewer' => ['name' => $row['reviewer_name'], 'image' => $row['reviewer_image']],
      'created_at' => $row['created_at']
    ];
  }
  $product['reviews'] = $reviews;
  $product['avg_rating'] = count($reviews) > 0 ? array_sum(array_column($reviews, 'rating')) / count($reviews) : 0;

  // Get related products
  $relatedStmt = $conn->prepare("SELECT id, slug, title, price, screenshots FROM products
                                  WHERE category = ? AND status = 'PUBLISHED' AND id != ?
                                  ORDER BY featured DESC, downloads DESC LIMIT 4");
  $relatedStmt->bind_param('ss', $product['category'], $product['id']);
  $relatedStmt->execute();
  $relatedResult = $relatedStmt->get_result();
  $related = [];
  while ($row = $relatedResult->fetch_assoc()) {
    $related[] = $row;
  }
  $product['related'] = $related;

  echo json_encode(['product' => $product]);
}

/**
 * Create product (seller only)
 */
function createProduct() {
  $user = requireRole(['SELLER', 'ADMIN']);
  $conn = getDB();

  $title = sanitizeInput($_POST['title'] ?? '');
  $description = $_POST['description'] ?? '';
  $category = sanitizeInput($_POST['category'] ?? 'SCRIPT');
  $price = floatval($_POST['price'] ?? 0);
  $tagsRaw = sanitizeInput($_POST['tags'] ?? '');
  $version = sanitizeInput($_POST['version'] ?? '1.0.0');
  $compatibilityRaw = sanitizeInput($_POST['compatibility'] ?? '');

  if (empty($title) || $price <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Title and price are required']);
    return;
  }

  // Generate slug
  $slug = generateSlug($title);
  $originalSlug = $slug;
  $counter = 1;
  while (true) {
    $check = $conn->prepare("SELECT id FROM products WHERE slug = ?");
    $check->bind_param('s', $slug);
    $check->execute();
    if ($check->get_result()->num_rows === 0) break;
    $slug = $originalSlug . '-' . $counter++;
  }

  $tags = array_filter(array_map('trim', explode(',', $tagsRaw)));
  $compatibility = array_filter(array_map('trim', explode(',', $compatibilityRaw)));

  $userId = $user['id'];
  $productId = bin2hex(random_bytes(16));
  $productId = sprintf('%s-%s-%s-%s-%s',
    substr($productId, 0, 8), substr($productId, 8, 4), '4' . substr($productId, 12, 3),
    substr($productId, 16, 4), substr($productId, 20, 12)
  );

  $insert = $conn->prepare("INSERT INTO products (id, user_id, slug, title, description, category, price, tags, version, compatibility, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')");
  $tagsJSON = json_encode($tags);
  $compatJSON = json_encode($compatibility);
  $insert->bind_param('ssssssssss', $productId, $userId, $slug, $title, $description, $category, $price, $tagsJSON, $version, $compatJSON);
  $insert->execute();

  logActivity($conn, $userId, 'product_created', 'product', $productId, 'New product submitted: ' . $title);

  echo json_encode([
    'success' => true,
    'product' => ['id' => $productId, 'slug' => $slug, 'title' => $title, 'status' => 'PENDING']
  ]);
}

/**
 * Update product (owner or admin)
 */
function updateProduct() {
  $user = requireRole(['SELLER', 'ADMIN']);
  $conn = getDB();

  $body = json_decode(file_get_contents('php://input'), true) ?? $_POST;
  $productId = sanitizeInput($body['id'] ?? '');
  $title = sanitizeInput($body['title'] ?? '');
  $description = $body['description'] ?? '';
  $price = floatval($body['price'] ?? 0);
  $featured = isset($body['featured']) ? (bool)$body['featured'] : false;

  // Check ownership
  $check = $conn->prepare("SELECT user_id FROM products WHERE id = ?");
  $check->bind_param('s', $productId);
  $check->execute();
  $result = $check->get_result();
  if ($result->num_rows === 0) {
    http_response_code(404);
    echo json_encode(['error' => 'Product not found']);
    return;
  }
  $productUser = $result->fetch_assoc();
  if ($user['role'] !== 'ADMIN' && $productUser['user_id'] !== $user['id']) {
    http_response_code(403);
    echo json_encode(['error' => 'Not authorized']);
    return;
  }

  $update = $conn->prepare("UPDATE products SET title = ?, description = ?, price = ?, featured = ?, status = 'PENDING', updated_at = NOW() WHERE id = ?");
  $update->bind_param('ssds s', $title, $description, $price, $featured, $productId);
  $update->execute();

  logActivity($conn, $user['id'], 'product_updated', 'product', $productId, 'Product updated');

  echo json_encode(['success' => true]);
}

/**
 * Delete product (owner or admin)
 */
function deleteProduct() {
  $user = requireRole(['SELLER', 'ADMIN']);
  $conn = getDB();

  $body = json_decode(file_get_contents('php://input'), true) ?? $_POST;
  $productId = sanitizeInput($body['id'] ?? '');

  $check = $conn->prepare("SELECT user_id FROM products WHERE id = ?");
  $check->bind_param('s', $productId);
  $check->execute();
  $result = $check->get_result();
  if ($result->num_rows === 0) {
    http_response_code(404);
    echo json_encode(['error' => 'Product not found']);
    return;
  }

  if ($user['role'] !== 'ADMIN') {
    $productUser = $result->fetch_assoc();
    if ($productUser['user_id'] !== $user['id']) {
      http_response_code(403);
      echo json_encode(['error' => 'Not authorized']);
      return;
    }
  }

  $delete = $conn->prepare("DELETE FROM products WHERE id = ?");
  $delete->bind_param('s', $productId);
  $delete->execute();

  logActivity($conn, $user['id'], 'product_deleted', 'product', $productId);

  echo json_encode(['success' => true]);
}

/**
 * Set featured status (admin)
 */
function setFeatured() {
  $admin = requireRole(['ADMIN']);
  $conn = getDB();

  $body = json_decode(file_get_contents('php://input'), true) ?? $_POST;
  $productId = sanitizeInput($body['id'] ?? '');
  $featured = isset($body['featured']) ? (bool)$body['featured'] : false;

  $update = $conn->prepare("UPDATE products SET featured = ? WHERE id = ?");
  $update->bind_param('bs', $featured, $productId);
  $update->execute();

  echo json_encode(['success' => true]);
}

/**
 * Approve product (admin)
 */
function approveProduct() {
  $admin = requireRole(['ADMIN']);
  $conn = getDB();

  $body = json_decode(file_get_contents('php://input'), true) ?? $_POST;
  $productId = sanitizeInput($body['id'] ?? '');

  $update = $conn->prepare("UPDATE products SET status = 'PUBLISHED', updated_at = NOW() WHERE id = ?");
  $update->bind_param('s', $productId);
  $update->execute();

  logActivity($conn, $admin['id'], 'product_approved', 'product', $productId);

  echo json_encode(['success' => true]);
}

/**
 * Reject product (admin)
 */
function rejectProduct() {
  $admin = requireRole(['ADMIN']);
  $conn = getDB();

  $body = json_decode(file_get_contents('php://input'), true) ?? $_POST;
  $productId = sanitizeInput($body['id'] ?? '');
  $reason = sanitizeInput($body['reason'] ?? '');

  $update = $conn->prepare("UPDATE products SET status = 'REJECTED', admin_note = ?, updated_at = NOW() WHERE id = ?");
  $update->bind_param('ss', $reason, $productId);
  $update->execute();

  logActivity($conn, $admin['id'], 'product_rejected', 'product', $productId, $reason);

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

function requireAuth() {
  if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Authentication required']);
    exit;
  }
  return ['id' => $_SESSION['user_id'], 'email' => $_SESSION['user_email'], 'role' => $_SESSION['user_role'] ?? 'BUYER'];
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

function generateSlug($title) {
  $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $title), '-'));
  return $slug;
}

function logActivity($conn, $userId, $action, $entityType = null, $entityId = null, $details = null) {
  $stmt = $conn->prepare("INSERT INTO activity_log (user_id, action, entity_type, entity_id, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)");
  $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
  $ua = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
  $stmt->bind_param('sssssss', $userId, $action, $entityType, $entityId, $details, $ip, $ua);
  $stmt->execute();
}

/**
 * List free products
 */
function listFreeProducts() {
  $conn = getDB();
  $category = sanitizeInput($_GET['category'] ?? 'all');

  $where = "status = 'PUBLISHED' AND price = 0";
  $params = [];
  $types = '';
  if ($category !== 'all') {
    $where .= " AND category = ?";
    $params[] = $category;
    $types .= 's';
  }

  $sql = "SELECT p.*, u.name as seller_name FROM products p LEFT JOIN users u ON p.user_id = u.id WHERE $where ORDER BY p.created_at DESC LIMIT 100";
  $stmt = $conn->prepare($sql);
  if (!empty($params)) $stmt->bind_param($types, ...$params);
  $stmt->execute();
  $result = $stmt->get_result();
  $products = [];
  while ($row = $result->fetch_assoc()) {
    $products[] = [
      'id' => $row['id'], 'slug' => $row['slug'], 'title' => $row['title'],
      'price' => (float)$row['price'], 'screenshots' => $row['screenshots'],
      'category' => $row['category'], 'seller' => $row['seller_name']
    ];
  }
  echo json_encode(['products' => $products]);
}

/**
 * List categories
 */
function listCategories() {
  $conn = getDB();
  $result = $conn->query("SELECT category, COUNT(*) as count FROM products WHERE status = 'PUBLISHED' GROUP BY category ORDER BY count DESC");
  $categories = [];
  while ($row = $result->fetch_assoc()) {
    $categories[] = ['name' => $row['category'], 'count' => (int)$row['count']];
  }
  echo json_encode(['categories' => $categories]);
}
