<?php
/**
 * Admin — dashboard, homepage builder, FAQ, settings, global search, activity log
 */
require_once __DIR__ . '/../../core/catalog.php';

route('GET', 'admin/dashboard', function () {
  require_role('ADMIN');
  $paid = "o.status IN ('VERIFIED','COMPLETED')";
  $stats = [
    'revenue_total'    => (float)Db::value("SELECT COALESCE(SUM(total_amount), 0) FROM orders o WHERE $paid"),
    'revenue_30d'      => (float)Db::value("SELECT COALESCE(SUM(total_amount), 0) FROM orders o WHERE $paid AND o.created_at >= NOW() - INTERVAL 30 DAY"),
    'revenue_prev_30d' => (float)Db::value("SELECT COALESCE(SUM(total_amount), 0) FROM orders o WHERE $paid AND o.created_at >= NOW() - INTERVAL 60 DAY AND o.created_at < NOW() - INTERVAL 30 DAY"),
    'orders_30d'       => (int)Db::value("SELECT COUNT(*) FROM orders o WHERE $paid AND o.created_at >= NOW() - INTERVAL 30 DAY"),
    'orders_pending'   => (int)Db::value("SELECT COUNT(*) FROM orders WHERE status = 'PENDING'"),
    'products_pending' => (int)Db::value("SELECT COUNT(*) FROM products WHERE status = 'PENDING'"),
    'products_live'    => (int)Db::value("SELECT COUNT(*) FROM products WHERE status = 'PUBLISHED'"),
    'users_total'      => (int)Db::value("SELECT COUNT(*) FROM users"),
    'users_30d'        => (int)Db::value("SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL 30 DAY"),
    'sellers_pending'  => (int)Db::value("SELECT COUNT(*) FROM seller_profiles WHERE status = 'PENDING'"),
    'withdrawals_pending' => (int)Db::value("SELECT COUNT(*) FROM withdrawals WHERE status = 'PENDING'"),
    'tickets_open' => (int)Db::value("SELECT COUNT(*) FROM support_tickets WHERE status = 'open'"),
    'untagged_products'   => (int)Db::value("SELECT COUNT(*) FROM products p WHERE NOT EXISTS (SELECT 1 FROM product_tags t WHERE t.product_id = p.id)"),
  ];

  // Revenue + orders per day, last 30 days (zero-filled)
  $byDay = [];
  foreach (Db::all("SELECT DATE(o.created_at) d, SUM(o.total_amount) r, COUNT(*) c FROM orders o
                    WHERE $paid AND o.created_at >= CURDATE() - INTERVAL 29 DAY GROUP BY DATE(o.created_at)") as $r) {
    $byDay[$r['d']] = ['revenue' => (float)$r['r'], 'orders' => (int)$r['c']];
  }
  $chart = [];
  for ($i = 29; $i >= 0; $i--) {
    $d = date('Y-m-d', strtotime("-$i day"));
    $chart[] = ['date' => $d] + ($byDay[$d] ?? ['revenue' => 0, 'orders' => 0]);
  }

  $top = Db::all("SELECT p.id, p.title, p.slug, COUNT(*) sales, SUM(op.price_paid) revenue
                  FROM order_products op JOIN orders o ON o.id = op.order_id AND $paid
                  JOIN products p ON p.id = op.product_id
                  GROUP BY p.id, p.title, p.slug ORDER BY revenue DESC LIMIT 5");

  // Revenue by top-level category (via tags)
  $catRevenue = [];
  $productRev = Db::all("SELECT op.product_id, op.price_paid FROM order_products op JOIN orders o ON o.id = op.order_id AND $paid");
  $tagsByProduct = tags_for_products(array_values(array_unique(array_column($productRev, 'product_id'))));
  foreach ($productRev as $r) {
    $roots = [];
    foreach (categories_for_tags(array_column($tagsByProduct[$r['product_id']] ?? [], 'id')) as $c) {
      $root = explode(' › ', $c['path'])[0];
      $roots[$root] = true;
    }
    foreach (array_keys($roots) as $root) $catRevenue[$root] = ($catRevenue[$root] ?? 0) + (float)$r['price_paid'];
  }
  arsort($catRevenue);

  $recent = Db::all("SELECT o.id, o.total_amount, o.status, o.payment_method, o.created_at, u.name AS customer
                     FROM orders o JOIN users u ON u.id = o.user_id ORDER BY o.created_at DESC LIMIT 6");

  ok([
    'stats' => $stats,
    'chart' => $chart,
    'top_products' => $top,
    'category_revenue' => array_map(fn($k, $v) => ['name' => $k, 'revenue' => round($v, 2)], array_keys($catRevenue), $catRevenue),
    'recent_orders' => $recent,
  ]);
});

// ---------- Homepage builder ----------
const HOMEPAGE_KEYS = ['hero', 'trust', 'categories', 'features', 'featured', 'server_pack', 'new', 'free', 'reviews', 'about', 'faq', 'community'];

route('GET', 'admin/homepage', function () {
  require_role('ADMIN');
  $rows = Db::all("SELECT `key`, title, is_enabled, sort_order, content FROM homepage_sections ORDER BY sort_order");
  foreach ($rows as &$r) {
    $r['is_enabled'] = (bool)$r['is_enabled'];
    $r['content'] = json_col($r['content']) ?: new stdClass();
  }
  ok($rows);
});

route('POST', 'admin/homepage', function () {
  require_role('ADMIN');
  $sections = arr_in('sections');
  $pdo = Db::pdo();
  $pdo->beginTransaction();
  $st = $pdo->prepare("INSERT INTO homepage_sections (id, `key`, title, is_enabled, sort_order, content) VALUES (?, ?, ?, ?, ?, ?)
                       ON DUPLICATE KEY UPDATE is_enabled = VALUES(is_enabled), sort_order = VALUES(sort_order), content = VALUES(content)");
  foreach ($sections as $i => $s) {
    $key = (string)($s['key'] ?? '');
    if (!in_array($key, HOMEPAGE_KEYS, true)) continue;
    $content = is_array($s['content'] ?? null) ? $s['content'] : [];
    // strings only, bounded size
    array_walk_recursive($content, function (&$v) { if (is_string($v)) $v = mb_substr(trim($v), 0, 2000); });
    $st->execute([uuid(), $key, ucfirst(str_replace('_', ' ', $key)), !empty($s['is_enabled']) ? 1 : 0, $i + 1, json_encode($content, JSON_UNESCAPED_UNICODE)]);
  }
  $pdo->commit();
  audit('homepage_updated', 'homepage');
  ok(['saved' => true]);
});

// ---------- FAQ (saved as a whole list) ----------
route('GET', 'admin/faqs', function () {
  require_role('ADMIN');
  ok(Db::all("SELECT id, question, answer, is_active FROM faqs ORDER BY sort_order"));
});

route('POST', 'admin/faqs', function () {
  require_role('ADMIN');
  $items = arr_in('items');
  $pdo = Db::pdo();
  $pdo->beginTransaction();
  $pdo->exec("DELETE FROM faqs");
  $st = $pdo->prepare("INSERT INTO faqs (id, question, answer, sort_order, is_active) VALUES (?, ?, ?, ?, ?)");
  $n = 0;
  foreach ($items as $it) {
    $q = mb_substr(trim((string)($it['question'] ?? '')), 0, 500);
    $a = mb_substr(trim((string)($it['answer'] ?? '')), 0, 5000);
    if ($q === '' || $a === '') continue;
    $st->execute([uuid(), $q, $a, ++$n, !isset($it['is_active']) || $it['is_active'] ? 1 : 0]);
  }
  $pdo->commit();
  audit('faqs_updated', 'faq', null, "$n items");
  ok(['saved' => $n]);
});

// ---------- Settings (allow-listed keys) ----------
const SETTING_KEYS = [
  'brand_color', 'discord_server_name', 'site_name', 'site_tagline', 'since_year', 'currency_symbol', 'topbar_text', 'topbar_link',
  'social_discord', 'social_github', 'social_youtube', 'discord_widget_server_id',
  'bkash_number', 'nagad_number', 'bank_name', 'bank_account', 'bank_branch',
  'seller_auto_approve', 'platform_fee_percent', 'pay_stripe_enabled', 'pay_crypto_enabled', 'pay_sslcommerz_enabled', 'pay_manual_enabled', 'pay_bmc_enabled', 'bmc_link', 'verify_hours', 'mail_from', 'admin_notify_email', 'newsletter_enabled', 'free_assets_enabled', 'cookie_consent_text', 'download_expiry_days',
];

route('GET', 'admin/settings', function () {
  require_role('ADMIN');
  $out = array_fill_keys(SETTING_KEYS, '');
  foreach (Db::all("SELECT `key`, `value` FROM site_settings") as $r) {
    if (array_key_exists($r['key'], $out)) $out[$r['key']] = (string)$r['value'];
  }
  ok($out);
});

route('POST', 'admin/settings', function () {
  require_role('ADMIN');
  $st = Db::pdo()->prepare("INSERT INTO site_settings (id, `key`, `value`) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)");
  $n = 0;
  foreach (SETTING_KEYS as $k) {
    if (input($k) === null) continue;
    $v = mb_substr(trim((string)input($k)), 0, 1000);
    if (str_starts_with($k, 'social_') && $v !== '' && !preg_match('#^https://#i', $v)) fail(422, 'Social links must start with https://', [$k => 'Invalid link']);
    $st->execute([uuid(), $k, $v]);
    $n++;
  }
  audit('settings_updated', 'settings', null, "$n keys");
  ok(['saved' => $n]);
});

// ---------- Global search (Ctrl+K) ----------
route('GET', 'admin/search', function () {
  require_role('ADMIN');
  $q = trim((string)($_GET['q'] ?? ''));
  if (mb_strlen($q) < 2) ok([]);
  $like = '%' . $q . '%';
  $out = [];
  foreach (Db::all("SELECT id, title, status FROM products WHERE title LIKE ? OR slug LIKE ? LIMIT 6", [$like, $like]) as $r)
    $out[] = ['type' => 'product', 'id' => $r['id'], 'label' => $r['title'], 'sub' => $r['status']];
  foreach (Db::all("SELECT id, name, slug FROM categories WHERE name LIKE ? LIMIT 4", [$like]) as $r)
    $out[] = ['type' => 'category', 'id' => $r['id'], 'label' => $r['name'], 'sub' => $r['slug']];
  foreach (Db::all("SELECT id, name FROM tags WHERE name LIKE ? LIMIT 4", [$like]) as $r)
    $out[] = ['type' => 'tag', 'id' => $r['id'], 'label' => $r['name'], 'sub' => 'Tag'];
  foreach (Db::all("SELECT id, name, email, role FROM users WHERE name LIKE ? OR email LIKE ? LIMIT 5", [$like, $like]) as $r)
    $out[] = ['type' => 'user', 'id' => $r['id'], 'label' => $r['name'], 'sub' => $r['email'] . ' · ' . $r['role']];
  foreach (Db::all("SELECT o.id, o.total_amount, o.status FROM orders o WHERE o.id LIKE ? OR o.transaction_id LIKE ? LIMIT 5", [$q . '%', $like]) as $r)
    $out[] = ['type' => 'order', 'id' => $r['id'], 'label' => 'Order ' . substr($r['id'], 0, 8), 'sub' => $r['status'] . ' · ' . $r['total_amount']];
  ok($out);
});

// ---------- Activity log ----------
route('GET', 'admin/activity', function () {
  require_role('ADMIN');
  [$page, $per, $off] = paging(50);
  $where = '1 = 1';
  $params = [];
  if (!empty($_GET['q'])) { $where = '(a.action LIKE ? OR a.details LIKE ? OR u.name LIKE ?)'; $l = '%' . $_GET['q'] . '%'; $params = [$l, $l, $l]; }
  $total = (int)Db::value("SELECT COUNT(*) FROM activity_log a LEFT JOIN users u ON u.id = a.user_id WHERE $where", $params);
  $rows = Db::all("SELECT a.id, a.action, a.entity_type, a.entity_id, a.details, a.ip_address, a.created_at, u.name AS user_name
                   FROM activity_log a LEFT JOIN users u ON u.id = a.user_id WHERE $where ORDER BY a.id DESC LIMIT $per OFFSET $off", $params);
  ok($rows, ['total' => $total, 'page' => $page, 'per_page' => $per, 'pages' => (int)ceil($total / $per)]);
});

// Which payment gateways have keys in config.local.php (keys themselves are never sent)
route('GET', 'admin/payments/status', function () {
  require_role('ADMIN');
  require_once __DIR__ . '/../../core/orders.php';
  $has = fn($k) => defined($k) && constant($k) !== '';
  ok([
    'STRIPE' => ['configured' => $has('STRIPE_SECRET_KEY') && $has('STRIPE_WEBHOOK_SECRET'), 'live' => gateway_ready('STRIPE'),
                 'test_mode' => $has('STRIPE_SECRET_KEY') && str_starts_with(STRIPE_SECRET_KEY, 'sk_test'), 'webhook' => site_root_url() . 'api/pay/stripe-webhook.php'],
    'CRYPTO' => ['configured' => $has('NOWPAYMENTS_API_KEY') && $has('NOWPAYMENTS_IPN_SECRET'), 'live' => gateway_ready('CRYPTO'),
                 'test_mode' => defined('NOWPAYMENTS_SANDBOX') && NOWPAYMENTS_SANDBOX, 'webhook' => site_root_url() . 'api/pay/nowpayments-ipn.php'],
    'SSLCOMMERZ' => ['configured' => $has('SSLCZ_STORE_ID') && $has('SSLCZ_STORE_PASSWORD'), 'live' => gateway_ready('SSLCOMMERZ'),
                     'test_mode' => defined('SSLCZ_SANDBOX') && SSLCZ_SANDBOX, 'webhook' => site_root_url() . 'api/pay/sslcommerz.php?action=ipn'],
    'MANUAL' => ['configured' => true, 'live' => gateway_ready('MANUAL')],
    'BMC' => ['configured' => true, 'live' => gateway_ready('BMC')],
  ]);
});
