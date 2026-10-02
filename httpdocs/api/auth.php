<?php
/**
 * FiveMDepot — Authentication API
 * Handles login, register, logout, and OAuth redirects
 */

require_once __DIR__ . '/../config.php';

// Start session
ini_set('session.cookie_httponly', 1);
ini_set('session.use_strict_mode', 1);
ini_set('session.cookie_secure', 0); // Set to 1 when using HTTPS
ini_set('session.cookie_samesite', 'Lax');
session_name(SESSION_NAME);
session_start();

// Set charset
mysqli_set_charset($GLOBALS['___mysqli_stash'] ?? new mysqli(), DB_CHARSET);

header('Content-Type: application/json; charset=utf-8');

$action = $_GET['action'] ?? $_POST['action'] ?? '';

switch($action) {
  case 'login':
    handleLogin();
    break;
  case 'register':
    handleRegister();
    break;
  case 'logout':
    handleLogout();
    break;
  case 'discord':
    handleDiscordOAuth();
    break;
  case 'google':
    handleGoogleOAuth();
    break;
  case 'status':
    handleStatus();
    break;
  default:
    http_response_code(400);
    echo json_encode(['error' => 'Invalid action']);
}

/**
 * Handle login
 */
function handleLogin() {
  if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    return;
  }

  // Verify CSRF
  if (!verifyCSRF($_POST['csrf_token'] ?? '')) {
    http_response_code(403);
    echo json_encode(['error' => 'Invalid security token']);
    return;
  }

  $email = sanitizeInput($_POST['email'] ?? '');
  $password = $_POST['password'] ?? '';

  if (empty($email) || empty($password)) {
    http_response_code(400);
    echo json_encode(['error' => 'Email and password are required']);
    return;
  }

  // Check login lockout
  $conn = getDB();
  $lockCheck = $conn->prepare("SELECT locked_until, login_attempts FROM users WHERE email = ?");
  $lockCheck->bind_param('s', $email);
  $lockCheck->execute();
  $lockResult = $lockCheck->get_result();

  if ($lockResult->num_rows > 0) {
    $row = $lockResult->fetch_assoc();
    if ($row['locked_until'] && strtotime($row['locked_until']) > time()) {
      http_response_code(429);
      echo json_encode(['error' => 'Account temporarily locked. Try again later.']);
      return;
    }
    // Reset lockout if expired
    if ($row['locked_until'] && strtotime($row['locked_until']) <= time()) {
      $reset = $conn->prepare("UPDATE users SET login_attempts = 0, locked_until = NULL WHERE email = ?");
      $reset->bind_param('s', $email);
      $reset->execute();
    }
  }

  // Find user
  $user = $conn->prepare("SELECT * FROM users WHERE email = ?");
  $user->bind_param('s', $email);
  $user->execute();
  $result = $user->get_result();

  if ($result->num_rows === 0) {
    incrementLoginAttempts($conn, $email);
    http_response_code(401);
    echo json_encode(['error' => 'Invalid email or password']);
    return;
  }

  $userData = $result->fetch_assoc();

  // Verify password
  if (!password_verify($password, $userData['password'])) {
    incrementLoginAttempts($conn, $email);
    http_response_code(401);
    echo json_encode(['error' => 'Invalid email or password']);
    return;
  }

  // Check if account is locked
  if ($userData['locked_until'] && strtotime($userData['locked_until']) > time()) {
    http_response_code(429);
    echo json_encode(['error' => 'Account temporarily locked. Try again later.']);
    return;
  }

  // Reset login attempts on success
  $resetAttempts = $conn->prepare("UPDATE users SET login_attempts = 0, locked_until = NULL, last_login_at = NOW() WHERE id = ?");
  $resetAttempts->bind_param('s', $userData['id']);
  $resetAttempts->execute();

  // Create session
  $_SESSION['user_id'] = $userData['id'];
  $_SESSION['user_email'] = $userData['email'];
  $_SESSION['user_role'] = $userData['role'];
  $_SESSION['logged_in_at'] = time();
  $_SESSION['csrf_token'] = generateCSRFToken();

  logActivity($conn, $userData['id'], 'login', 'user', $userData['id'], 'Successful login');

  echo json_encode([
    'success' => true,
    'redirect' => getDashboardURL($userData['role']),
    'user' => [
      'id' => $userData['id'],
      'name' => $userData['name'],
      'email' => $userData['email'],
      'role' => $userData['role']
    ]
  ]);
}

/**
 * Handle registration
 */
function handleRegister() {
  if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    return;
  }

  // Verify CSRF
  if (!verifyCSRF($_POST['csrf_token'] ?? '')) {
    http_response_code(403);
    echo json_encode(['error' => 'Invalid security token']);
    return;
  }

  $name = sanitizeInput($_POST['name'] ?? '');
  $email = sanitizeInput($_POST['email'] ?? '');
  $password = $_POST['password'] ?? '';
  $confirmPassword = $_POST['confirm_password'] ?? '';
  $wantSeller = isset($_POST['want_seller']);

  // Validation
  if (empty($name) || empty($email) || empty($password)) {
    http_response_code(400);
    echo json_encode(['error' => 'All fields are required']);
    return;
  }

  if (strlen($password) < PASSWORD_MIN_LENGTH) {
    http_response_code(400);
    echo json_encode(['error' => 'Password must be at least ' . PASSWORD_MIN_LENGTH . ' characters']);
    return;
  }

  if ($password !== $confirmPassword) {
    http_response_code(400);
    echo json_encode(['error' => 'Passwords do not match']);
    return;
  }

  if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid email address']);
    return;
  }

  $conn = getDB();

  // Check if email exists
  $check = $conn->prepare("SELECT id FROM users WHERE email = ?");
  $check->bind_param('s', $email);
  $check->execute();
  if ($check->get_result()->num_rows > 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Email already registered']);
    return;
  }

  // Hash password
  $hashedPassword = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
  $userId = bin2hex(random_bytes(16));
  $userId = sprintf('%s-%s-%s-%s-%s',
    substr($userId, 0, 8), substr($userId, 8, 4), '4' . substr($userId, 12, 3),
    substr($userId, 16, 4), substr($userId, 20, 12)
  );

  // Create user
  $insert = $conn->prepare("INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, 'BUYER')");
  $insert->bind_param('ssss', $userId, $name, $email, $hashedPassword);

  if (!$insert->execute()) {
    http_response_code(500);
    echo json_encode(['error' => 'Registration failed. Please try again.']);
    return;
  }

  // Create seller profile if requested
  $sellerStatus = 'PENDING';
  $autoApprove = getSitting($conn, 'seller_auto_approve', '0');
  if ($wantSeller && $autoApprove === '1') {
    $sellerStatus = 'APPROVED';
  }

  if ($wantSeller) {
    $sellerId = bin2hex(random_bytes(16));
    $sellerId = sprintf('%s-%s-%s-%s-%s',
      substr($sellerId, 0, 8), substr($sellerId, 8, 4), '4' . substr($sellerId, 12, 3),
      substr($sellerId, 16, 4), substr($sellerId, 20, 12)
    );
    $sellerInsert = $conn->prepare("INSERT INTO seller_profiles (id, user_id, status) VALUES (?, ?, ?)");
    $sellerInsert->bind_param('sss', $sellerId, $userId, $sellerStatus);
    $sellerInsert->execute();

    // If auto-approved, update user role
    if ($sellerStatus === 'APPROVED') {
      $roleUpdate = $conn->prepare("UPDATE users SET role = 'SELLER' WHERE id = ?");
      $roleUpdate->bind_param('s', $userId);
      $roleUpdate->execute();
    }
  }

  logActivity($conn, $userId, 'register', 'user', $userId, 'New user registered');

  // Auto-login
  $_SESSION['user_id'] = $userId;
  $_SESSION['user_email'] = $email;
  $_SESSION['user_role'] = 'BUYER';
  $_SESSION['logged_in_at'] = time();
  $_SESSION['csrf_token'] = generateCSRFToken();

  echo json_encode([
    'success' => true,
    'redirect' => getDashboardURL('BUYER'),
    'user' => [
      'id' => $userId,
      'name' => $name,
      'email' => $email,
      'role' => 'BUYER'
    ]
  ]);
}

/**
 * Handle logout
 */
function handleLogout() {
  session_destroy();
  setcookie(SESSION_NAME, '', time() - 3600, '/');
  echo json_encode(['success' => true, 'redirect' => '/']);
}

/**
 * Handle Discord OAuth redirect
 */
function handleDiscordOAuth() {
  $clientId = defined('DISCORD_CLIENT_ID') ? DISCORD_CLIENT_ID : null;
  $redirectUri = SITE_URL . '/api/auth.php?action=discord/callback';

  if (!$clientId) {
    http_response_code(503);
    echo json_encode([
      'error' => 'Discord OAuth is not configured. Add DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET to config.php.',
      'needed' => [
        'DISCORD_CLIENT_ID' => 'Your Discord Application ID',
        'DISCORD_CLIENT_SECRET' => 'Your Discord Application Secret'
      ]
    ]);
    return;
  }

  $params = http_build_query([
    'response_type' => 'code',
    'client_id' => $clientId,
    'redirect_uri' => $redirectUri,
    'scope' => 'identify email',
  ]);

  header('Location: https://discord.com/api/oauth2/authorize?' . $params);
  exit;
}

/**
 * Handle Google OAuth redirect
 */
function handleGoogleOAuth() {
  $clientId = defined('GOOGLE_CLIENT_ID') ? GOOGLE_CLIENT_ID : null;
  $redirectUri = SITE_URL . '/api/auth.php?action=google/callback';

  if (!$clientId) {
    http_response_code(503);
    echo json_encode([
      'error' => 'Google OAuth is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to config.php.',
      'needed' => [
        'GOOGLE_CLIENT_ID' => 'Your Google Client ID',
        'GOOGLE_CLIENT_SECRET' => 'Your Google Client Secret'
      ]
    ]);
    return;
  }

  $params = http_build_query([
    'response_type' => 'code',
    'client_id' => $clientId,
    'redirect_uri' => $redirectUri,
    'scope' => 'email profile',
    'access_type' => 'offline',
    'prompt' => 'consent',
  ]);

  header('Location: https://accounts.google.com/o/oauth2/v2/auth?' . $params);
  exit;
}

/**
 * Check login status
 */
function handleStatus() {
  if (isset($_SESSION['user_id'])) {
    echo json_encode([
      'authenticated' => true,
      'user' => [
        'id' => $_SESSION['user_id'],
        'email' => $_SESSION['user_email'],
        'role' => $_SESSION['user_role'] ?? 'BUYER'
      ]
    ]);
  } else {
    echo json_encode(['authenticated' => false]);
  }
}

// ============================================
// Helper Functions
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

function generateCSRFToken() {
  if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(CSRF_TOKEN_LENGTH));
  }
  return $_SESSION['csrf_token'];
}

function verifyCSRF($token) {
  return !empty($token) && !empty($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token);
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

function getDashboardURL($role) {
  switch($role) {
    case 'ADMIN': return '/dashboard/admin.html';
    case 'SELLER': return '/dashboard/seller.html';
    default: return '/dashboard/buyer.html';
  }
}

function getSitting($conn, $key, $default = '') {
  $stmt = $conn->prepare("SELECT value FROM site_settings WHERE key = ?");
  $stmt->bind_param('s', $key);
  $stmt->execute();
  $result = $stmt->get_result();
  if ($result->num_rows > 0) {
    return $result->fetch_assoc()['value'];
  }
  return $default;
}

function incrementLoginAttempts($conn, $email) {
  $stmt = $conn->prepare("UPDATE users SET login_attempts = login_attempts + 1 WHERE email = ?");
  $stmt->bind_param('s', $email);
  $stmt->execute();

  // Lock account after max attempts
  $check = $conn->prepare("SELECT login_attempts FROM users WHERE email = ?");
  $check->bind_param('s', $email);
  $check->execute();
  $result = $check->get_result();
  $row = $result->fetch_assoc();

  if ($row['login_attempts'] >= MAX_LOGIN_ATTEMPTS) {
    $lockUntil = date('Y-m-d H:i:s', time() + LOGIN_LOCKOUT_TIME);
    $lock = $conn->prepare("UPDATE users SET locked_until = ? WHERE email = ?");
    $lock->bind_param('ss', $lockUntil, $email);
    $lock->execute();
  }
}

function logActivity($conn, $userId, $action, $entityType = null, $entityId = null, $details = null) {
  $stmt = $conn->prepare("INSERT INTO activity_log (user_id, action, entity_type, entity_id, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)");
  $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
  $ua = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
  $stmt->bind_param('sssssss', $userId, $action, $entityType, $entityId, $details, $ip, $ua);
  $stmt->execute();
}
