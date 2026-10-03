<?php
/**
 * Auth: me, login, register, logout, change password
 */

function dashboard_url(string $role): string
{
  return ['ADMIN' => 'admin/', 'SELLER' => 'dashboard/seller.html'][$role] ?? 'dashboard/buyer.html';
}

// Who am I + CSRF token for the next request
route('GET', 'auth/me', function () {
  $u = current_user();
  ok([
    'user' => $u ? $u + ['dashboard' => dashboard_url($u['role'])] : null,
    'csrf' => csrf_token(),
  ]);
});

route('POST', 'auth/login', function () {
  rate_limit('login', 10, 300);
  $email = strtolower(str_in('email'));
  $password = (string)input('password', '');
  if ($email === '' || $password === '') fail(422, 'Email and password are required');

  $u = Db::one("SELECT id, name, email, password, role, login_attempts, locked_until, is_banned FROM users WHERE email = ?", [$email]);
  if ($u && $u['locked_until'] && strtotime($u['locked_until']) > time()) {
    fail(429, 'Too many failed logins. Try again in ' . ceil((strtotime($u['locked_until']) - time()) / 60) . ' minutes.');
  }
  if (!$u || !$u['password'] || !password_verify($password, $u['password'])) {
    if ($u) {
      $attempts = (int)$u['login_attempts'] + 1;
      $lock = $attempts >= MAX_LOGIN_ATTEMPTS ? date('Y-m-d H:i:s', time() + LOGIN_LOCKOUT_TIME) : null;
      Db::pdo()->prepare("UPDATE users SET login_attempts = ?, locked_until = ? WHERE id = ?")
        ->execute([$lock ? 0 : $attempts, $lock, $u['id']]);
    }
    fail(401, 'Wrong email or password');
  }
  if ((int)$u['is_banned']) fail(403, 'This account has been suspended. Contact support.');

  if (password_needs_rehash($u['password'], PASSWORD_DEFAULT)) {
    Db::pdo()->prepare("UPDATE users SET password = ? WHERE id = ?")->execute([password_hash($password, PASSWORD_DEFAULT), $u['id']]);
  }
  Db::pdo()->prepare("UPDATE users SET login_attempts = 0, locked_until = NULL, last_login_at = NOW() WHERE id = ?")->execute([$u['id']]);

  start_session();
  session_regenerate_id(true);
  $_SESSION['user_id'] = $u['id'];
  $_SESSION['user_email'] = $u['email'];   // kept for the legacy api/*.php endpoints
  $_SESSION['user_role'] = $u['role'];
  $_SESSION['logged_in_at'] = time();
  unset($_SESSION['csrf_token']);
  audit('login', 'user', $u['id']);

  ok([
    'user' => ['id' => $u['id'], 'name' => $u['name'], 'email' => $u['email'], 'role' => $u['role'], 'dashboard' => dashboard_url($u['role'])],
    'csrf' => csrf_token(),
    'redirect' => dashboard_url($u['role']),
  ]);
});

route('POST', 'auth/register', function () {
  rate_limit('register', 5, 600);
  $name = str_in('name', 100);
  $email = strtolower(str_in('email'));
  $password = (string)input('password', '');
  $errors = [];
  if (mb_strlen($name) < 2) $errors['name'] = 'Enter your name';
  if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $errors['email'] = 'Enter a valid email';
  if (strlen($password) < max(8, PASSWORD_MIN_LENGTH)) $errors['password'] = 'Use at least ' . max(8, PASSWORD_MIN_LENGTH) . ' characters';
  if (input('confirm_password') !== null && input('confirm_password') !== $password) $errors['confirm_password'] = 'Passwords do not match';
  if ($errors) fail(422, 'Please fix the highlighted fields', $errors);
  if (Db::value("SELECT COUNT(*) FROM users WHERE email = ?", [$email])) fail(422, 'An account with this email already exists', ['email' => 'Already registered']);

  $id = uuid();
  Db::pdo()->prepare("INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, 'BUYER')")
    ->execute([$id, $name, $email, password_hash($password, PASSWORD_DEFAULT)]);

  if (bool_in('want_seller')) {
    $auto = setting('seller_auto_approve', '0') === '1';
    Db::pdo()->prepare("INSERT INTO seller_profiles (id, user_id, status, approved_at) VALUES (?, ?, ?, ?)")
      ->execute([uuid(), $id, $auto ? 'APPROVED' : 'PENDING', $auto ? date('Y-m-d H:i:s') : null]);
    if ($auto) Db::pdo()->prepare("UPDATE users SET role = 'SELLER' WHERE id = ?")->execute([$id]);
  }

  start_session();
  session_regenerate_id(true);
  $_SESSION['user_id'] = $id;
  $_SESSION['user_email'] = $email;
  $role = Db::value("SELECT role FROM users WHERE id = ?", [$id]);
  $_SESSION['user_role'] = $role;
  unset($_SESSION['csrf_token']);
  audit('register', 'user', $id);

  ok([
    'user' => ['id' => $id, 'name' => $name, 'email' => $email, 'role' => $role, 'dashboard' => dashboard_url($role)],
    'csrf' => csrf_token(),
    'redirect' => dashboard_url($role),
  ], [], 201);
});

route('POST', 'auth/logout', function () {
  start_session();
  $_SESSION = [];
  if (ini_get('session.use_cookies')) {
    $p = session_get_cookie_params();
    setcookie(session_name(), '', time() - 3600, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
  }
  session_destroy();
  ok(['redirect' => 'index.html']);
});

route('POST', 'auth/password', function () {
  $u = require_user();
  $current = (string)input('current_password', '');
  $new = (string)input('new_password', '');
  $hash = Db::value("SELECT password FROM users WHERE id = ?", [$u['id']]);
  if ($hash && !password_verify($current, $hash)) fail(422, 'Current password is wrong', ['current_password' => 'Wrong password']);
  if (strlen($new) < 8) fail(422, 'Use at least 8 characters', ['new_password' => 'Too short']);
  Db::pdo()->prepare("UPDATE users SET password = ? WHERE id = ?")->execute([password_hash($new, PASSWORD_DEFAULT), $u['id']]);
  audit('password_changed', 'user', $u['id']);
  ok(['message' => 'Password updated']);
});

route('POST', 'auth/profile', function () {
  $u = require_user();
  $name = str_in('name', 100);
  if (mb_strlen($name) < 2) fail(422, 'Enter your name', ['name' => 'Required']);
  Db::pdo()->prepare("UPDATE users SET name = ? WHERE id = ?")->execute([$name, $u['id']]);
  ok(['name' => $name]);
});
