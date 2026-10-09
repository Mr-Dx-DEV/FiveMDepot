<?php
/**
 * Admin — catalog: categories, tags, tag groups, products, review queue, uploads
 */
require_once __DIR__ . '/../../core/catalog.php';

// ============================================================
// Categories
// ============================================================

function category_payload(?string $id = null): array
{
  $name = str_in('name', 100);
  if ($name === '') fail(422, 'Category name is required', ['name' => 'Required']);
  $parent = str_in('parent_id', 36) ?: null;
  if ($parent) {
    if (!Db::value("SELECT COUNT(*) FROM categories WHERE id = ?", [$parent])) fail(422, 'Parent category not found');
    if ($id && ($parent === $id || in_array($id, array_column(cat_path($parent), 'id'), true))) {
      fail(422, 'A category cannot be placed inside itself', ['parent_id' => 'Invalid parent']);
    }
  }
  $slugIn = str_in('slug', 100);
  return [
    'name' => $name,
    'slug' => unique_slug('categories', $slugIn !== '' ? $slugIn : $name, $id),
    'parent_id' => $parent,
    'icon' => str_in('icon', 50),
    'description' => str_in('description', 2000) ?: null,
    'banner_url' => str_in('banner_url', 500) ?: null,
    'seo_title' => str_in('seo_title', 255) ?: null,
    'seo_description' => str_in('seo_description', 500) ?: null,
    'show_in_nav' => bool_in('show_in_nav') ? 1 : 0,
    'is_active' => bool_in('is_active', true) ? 1 : 0,
  ];
}

route('GET', 'admin/categories', function () {
  require_role('ADMIN');
  $cats = cat_all();
  // published product count per category (own tags + descendants)
  $tagProducts = [];
  foreach (Db::all("SELECT pt.tag_id, pt.product_id FROM product_tags pt JOIN products p ON p.id = pt.product_id AND p.status = 'PUBLISHED'") as $r) {
    $tagProducts[$r['tag_id']][$r['product_id']] = true;
  }
  $children = [];
  foreach ($cats as $c) $children[$c['parent_id'] ?? ''][] = $c['id'];
  $allTags = function ($id) use (&$allTags, $cats, $children) {
    $t = $cats[$id]['tag_ids'];
    foreach ($children[$id] ?? [] as $k) $t = array_merge($t, $allTags($k));
    return $t;
  };
  $out = [];
  foreach ($cats as $c) {
    $p = [];
    foreach (array_unique($allTags($c['id'])) as $t) $p += $tagProducts[$t] ?? [];
    $out[] = [
      'id' => $c['id'], 'parent_id' => $c['parent_id'], 'name' => $c['name'], 'slug' => $c['slug'], 'icon' => $c['icon'],
      'description' => $c['description'], 'banner_url' => $c['banner_url'], 'seo_title' => $c['seo_title'],
      'seo_description' => $c['seo_description'], 'show_in_nav' => (bool)$c['show_in_nav'], 'is_active' => (bool)$c['is_active'],
      'order' => (int)$c['order'], 'tag_ids' => $c['tag_ids'], 'product_count' => count($p),
    ];
  }
  ok($out);
});

route('POST', 'admin/categories', function () {
  require_role('ADMIN');
  $d = category_payload();
  $id = uuid();
  $order = (int)Db::value("SELECT COALESCE(MAX(`order`), 0) + 1 FROM categories WHERE parent_id <=> ?", [$d['parent_id']]);
  Db::pdo()->prepare("INSERT INTO categories (id, parent_id, name, slug, icon, description, banner_url, seo_title, seo_description, show_in_nav, is_active, `order`)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    ->execute([$id, $d['parent_id'], $d['name'], $d['slug'], $d['icon'], $d['description'], $d['banner_url'], $d['seo_title'], $d['seo_description'], $d['show_in_nav'], $d['is_active'], $order]);
  set_category_tags($id, arr_in('tag_ids'));
  audit('category_created', 'category', $id, $d['name']);
  ok(['id' => $id, 'slug' => $d['slug']], [], 201);
});

route('POST', 'admin/categories/reorder', function () {
  require_role('ADMIN');
  $items = arr_in('items'); // [{id, parent_id, order}]
  $cats = cat_all();
  $parentOf = [];
  foreach ($cats as $c) $parentOf[$c['id']] = $c['parent_id'];
  foreach ($items as $it) {
    if (!isset($cats[$it['id'] ?? ''])) fail(422, 'Unknown category in reorder');
    $p = $it['parent_id'] ?? null;
    if ($p !== null && !isset($cats[$p])) fail(422, 'Unknown parent in reorder');
    $parentOf[$it['id']] = $p;
  }
  // reject cycles
  foreach (array_keys($parentOf) as $id) {
    $seen = [];
    for ($x = $id; $x !== null; $x = $parentOf[$x] ?? null) {
      if (isset($seen[$x])) fail(422, 'That move would put a category inside itself');
      $seen[$x] = true;
    }
  }
  $pdo = Db::pdo();
  $pdo->beginTransaction();
  $st = $pdo->prepare("UPDATE categories SET parent_id = ?, `order` = ? WHERE id = ?");
  foreach ($items as $it) $st->execute([$it['parent_id'] ?? null, (int)($it['order'] ?? 0), $it['id']]);
  $pdo->commit();
  audit('categories_reordered', 'category', null, count($items) . ' items');
  ok(['saved' => count($items)]);
});

route('POST', 'admin/categories/{id}', function ($p) {
  require_role('ADMIN');
  if (!Db::value("SELECT COUNT(*) FROM categories WHERE id = ?", [$p['id']])) fail(404, 'Category not found');
  $d = category_payload($p['id']);
  Db::pdo()->prepare("UPDATE categories SET parent_id = ?, name = ?, slug = ?, icon = ?, description = ?, banner_url = ?, seo_title = ?, seo_description = ?, show_in_nav = ?, is_active = ? WHERE id = ?")
    ->execute([$d['parent_id'], $d['name'], $d['slug'], $d['icon'], $d['description'], $d['banner_url'], $d['seo_title'], $d['seo_description'], $d['show_in_nav'], $d['is_active'], $p['id']]);
  if (input('tag_ids') !== null) set_category_tags($p['id'], arr_in('tag_ids'));
  audit('category_updated', 'category', $p['id'], $d['name']);
  ok(['id' => $p['id'], 'slug' => $d['slug']]);
});

// Product screenshots inside a category (and its sub-categories) — to pick a banner from
route('GET', 'admin/categories/{id}/images', function ($p) {
  require_role('ADMIN');
  $cats = cat_all();
  if (!isset($cats[$p['id']])) fail(404, 'Category not found');
  $ids = [$p['id']];
  for ($i = 0; $i < count($ids); $i++) foreach ($cats as $c) if ($c['parent_id'] === $ids[$i]) $ids[] = $c['id'];
  $tagIds = [];
  foreach ($ids as $cid) $tagIds = array_merge($tagIds, $cats[$cid]['tag_ids']);
  $tagIds = array_values(array_unique($tagIds));
  if (!$tagIds) ok(['auto' => null, 'images' => []]);
  $rows = Db::all("SELECT p.id, p.title, p.screenshots FROM products p
                   WHERE p.status = 'PUBLISHED' AND p.screenshots IS NOT NULL
                     AND EXISTS (SELECT 1 FROM product_tags pt WHERE pt.product_id = p.id AND pt.tag_id IN (" . Db::in($tagIds) . "))
                   ORDER BY p.featured DESC, p.updated_at DESC LIMIT 30", $tagIds);
  $images = [];
  foreach ($rows as $r) {
    foreach (array_slice(json_col($r['screenshots']), 0, 3) as $img) {
      if (is_string($img) && $img !== '') $images[] = ['url' => $img, 'product' => $r['title']];
    }
  }
  // "auto" = what the store shows when no banner is set (first image of the top product)
  $auto = null;
  foreach ($rows as $r) { $first = json_col($r['screenshots'])[0] ?? null; if ($first) { $auto = $first; break; } }
  ok(['auto' => $auto, 'images' => array_slice($images, 0, 36)]);
});

route('POST', 'admin/categories/{id}/delete', function ($p) {
  require_role('ADMIN');
  $name = Db::value("SELECT name FROM categories WHERE id = ?", [$p['id']]);
  if ($name === null) fail(404, 'Category not found');
  $kids = (int)Db::value("SELECT COUNT(*) FROM categories WHERE parent_id = ?", [$p['id']]);
  if ($kids) fail(409, "Move or delete its $kids sub-categories first");
  Db::pdo()->prepare("DELETE FROM categories WHERE id = ?")->execute([$p['id']]); // category_tags cascade; products untouched
  audit('category_deleted', 'category', $p['id'], $name);
  ok(['deleted' => true]);
});

// ============================================================
// Tag groups
// ============================================================

route('GET', 'admin/tag-groups', function () {
  require_role('ADMIN');
  ok(Db::all("SELECT g.*, (SELECT COUNT(*) FROM tags t WHERE t.group_id = g.id) AS tag_count FROM tag_groups g ORDER BY sort_order, name"));
});

route('POST', 'admin/tag-groups', function () {
  require_role('ADMIN');
  $name = str_in('name', 100);
  if ($name === '') fail(422, 'Group name is required', ['name' => 'Required']);
  $id = uuid();
  Db::pdo()->prepare("INSERT INTO tag_groups (id, name, slug, show_as_filter, sort_order) VALUES (?, ?, ?, ?, ?)")
    ->execute([$id, $name, unique_slug('tag_groups', $name), bool_in('show_as_filter', true) ? 1 : 0, int_in('sort_order')]);
  ok(['id' => $id], [], 201);
});

route('POST', 'admin/tag-groups/{id}', function ($p) {
  require_role('ADMIN');
  $name = str_in('name', 100);
  if ($name === '') fail(422, 'Group name is required', ['name' => 'Required']);
  Db::pdo()->prepare("UPDATE tag_groups SET name = ?, show_as_filter = ?, sort_order = ? WHERE id = ?")
    ->execute([$name, bool_in('show_as_filter', true) ? 1 : 0, int_in('sort_order'), $p['id']]);
  ok(['id' => $p['id']]);
});

route('POST', 'admin/tag-groups/{id}/delete', function ($p) {
  require_role('ADMIN');
  Db::pdo()->prepare("DELETE FROM tag_groups WHERE id = ?")->execute([$p['id']]); // tags keep existing, group_id → NULL
  ok(['deleted' => true]);
});

// ============================================================
// Tags
// ============================================================

route('GET', 'admin/tags', function () {
  require_role('ADMIN');
  $rows = Db::all(
    "SELECT t.id, t.name, t.slug, t.color, t.group_id, g.name AS group_name,
            (SELECT COUNT(*) FROM product_tags pt WHERE pt.tag_id = t.id) AS product_count
     FROM tags t LEFT JOIN tag_groups g ON g.id = t.group_id
     ORDER BY g.sort_order IS NULL, g.sort_order, t.name"
  );
  $owners = [];
  foreach (Db::all("SELECT ct.tag_id, c.name FROM category_tags ct JOIN categories c ON c.id = ct.category_id ORDER BY c.name") as $r) {
    $owners[$r['tag_id']][] = $r['name'];
  }
  foreach ($rows as &$r) {
    $r['product_count'] = (int)$r['product_count'];
    $r['categories'] = $owners[$r['id']] ?? [];
  }
  ok($rows);
});

function tag_payload(?string $id = null): array
{
  $name = str_in('name', 100);
  if ($name === '') fail(422, 'Tag name is required', ['name' => 'Required']);
  $slug = slugify(str_in('slug', 100) ?: $name);
  $dupe = Db::value("SELECT id FROM tags WHERE slug = ?" . ($id ? " AND id <> ?" : ''), $id ? [$slug, $id] : [$slug]);
  if ($dupe) fail(422, 'A tag with this name already exists', ['name' => 'Duplicate']);
  $color = str_in('color', 20);
  if ($color !== '' && !preg_match('/^#[0-9a-f]{3,8}$/i', $color)) fail(422, 'Color must be a hex value like #f97316', ['color' => 'Invalid']);
  $group = str_in('group_id', 36) ?: null;
  return ['name' => $name, 'slug' => $slug, 'color' => $color ?: null, 'group_id' => $group];
}

route('POST', 'admin/tags', function () {
  require_role('ADMIN');
  $d = tag_payload();
  $id = uuid();
  Db::pdo()->prepare("INSERT INTO tags (id, group_id, name, slug, color) VALUES (?, ?, ?, ?, ?)")
    ->execute([$id, $d['group_id'], $d['name'], $d['slug'], $d['color']]);
  // optionally attach to categories right away
  foreach (arr_in('category_ids') as $cid) {
    Db::pdo()->prepare("INSERT IGNORE INTO category_tags (category_id, tag_id) VALUES (?, ?)")->execute([$cid, $id]);
  }
  audit('tag_created', 'tag', $id, $d['name']);
  ok(['id' => $id] + $d, [], 201);
});

route('POST', 'admin/tags/merge', function () {
  require_role('ADMIN');
  $from = str_in('from_id', 36);
  $into = str_in('into_id', 36);
  if (!$from || !$into || $from === $into) fail(422, 'Choose two different tags');
  if ((int)Db::value("SELECT COUNT(*) FROM tags WHERE id IN (?, ?)", [$from, $into]) !== 2) fail(404, 'Tag not found');
  $pdo = Db::pdo();
  $pdo->beginTransaction();
  $pdo->prepare("INSERT IGNORE INTO product_tags (product_id, tag_id) SELECT product_id, ? FROM product_tags WHERE tag_id = ?")->execute([$into, $from]);
  $pdo->prepare("INSERT IGNORE INTO category_tags (category_id, tag_id) SELECT category_id, ? FROM category_tags WHERE tag_id = ?")->execute([$into, $from]);
  $pdo->prepare("DELETE FROM tags WHERE id = ?")->execute([$from]);
  $pdo->commit();
  audit('tags_merged', 'tag', $into, "merged $from");
  ok(['merged' => true]);
});

route('POST', 'admin/tags/{id}', function ($p) {
  require_role('ADMIN');
  if (!Db::value("SELECT COUNT(*) FROM tags WHERE id = ?", [$p['id']])) fail(404, 'Tag not found');
  $d = tag_payload($p['id']);
  Db::pdo()->prepare("UPDATE tags SET group_id = ?, name = ?, slug = ?, color = ? WHERE id = ?")
    ->execute([$d['group_id'], $d['name'], $d['slug'], $d['color'], $p['id']]);
  ok(['id' => $p['id']] + $d);
});

route('POST', 'admin/tags/{id}/delete', function ($p) {
  require_role('ADMIN');
  $name = Db::value("SELECT name FROM tags WHERE id = ?", [$p['id']]);
  if ($name === null) fail(404, 'Tag not found');
  Db::pdo()->prepare("DELETE FROM tags WHERE id = ?")->execute([$p['id']]); // links cascade
  audit('tag_deleted', 'tag', $p['id'], $name);
  ok(['deleted' => true]);
});

// Live preview for the product editor
route('GET', 'admin/catalog/categories-for-tags', function () {
  require_role('ADMIN');
  $ids = array_values(array_filter(explode(',', (string)($_GET['tag_ids'] ?? ''))));
  ok(categories_for_tags($ids));
});

// ============================================================
// Products
// ============================================================

function product_list_query(array $f): array
{
  $where = ['1 = 1'];
  $params = [];
  if (!empty($f['status'])) { $where[] = 'p.status = ?'; $params[] = strtoupper($f['status']); }
  if (!empty($f['type'])) { $where[] = 'p.type = ?'; $params[] = $f['type']; }
  if (!empty($f['seller'])) { $where[] = 'p.user_id = ?'; $params[] = $f['seller']; }
  if (($f['featured'] ?? '') !== '') { $where[] = 'p.featured = ?'; $params[] = (int)$f['featured']; }
  if (!empty($f['q'])) {
    $where[] = '(p.title LIKE ? OR p.slug LIKE ? OR u.name LIKE ?)';
    $like = '%' . $f['q'] . '%';
    array_push($params, $like, $like, $like);
  }
  if (!empty($f['tag'])) {
    $where[] = 'EXISTS (SELECT 1 FROM product_tags x WHERE x.product_id = p.id AND x.tag_id = ?)';
    $params[] = $f['tag'];
  }
  if (!empty($f['category'])) {
    $cats = cat_all();
    $ids = [$f['category']];
    // descendants
    for ($i = 0; $i < count($ids); $i++) foreach ($cats as $c) if ($c['parent_id'] === $ids[$i]) $ids[] = $c['id'];
    $tagIds = [];
    foreach ($ids as $cid) $tagIds = array_merge($tagIds, $cats[$cid]['tag_ids'] ?? []);
    if (!$tagIds) { $where[] = '0 = 1'; }
    else {
      $where[] = 'EXISTS (SELECT 1 FROM product_tags y WHERE y.product_id = p.id AND y.tag_id IN (' . Db::in($tagIds) . '))';
      array_push($params, ...array_values(array_unique($tagIds)));
    }
  }
  if (($f['untagged'] ?? '') === '1') $where[] = 'NOT EXISTS (SELECT 1 FROM product_tags z WHERE z.product_id = p.id)';
  return [implode(' AND ', $where), $params];
}

route('GET', 'admin/products', function () {
  require_role('ADMIN');
  [$page, $per, $off] = paging(25);
  [$where, $params] = product_list_query($_GET);
  $sort = [
    'newest' => 'p.created_at DESC', 'oldest' => 'p.created_at ASC', 'title' => 'p.title ASC',
    'price-high' => 'p.price DESC', 'price-low' => 'p.price ASC', 'sales' => 'sales DESC', 'updated' => 'p.updated_at DESC',
  ][$_GET['sort'] ?? ''] ?? 'p.created_at DESC';

  $total = (int)Db::value("SELECT COUNT(*) FROM products p JOIN users u ON u.id = p.user_id WHERE $where", $params);
  $rows = Db::all(
    "SELECT p.id, p.title, p.slug, p.price, p.sale_price, p.status, p.type, p.featured, p.screenshots, p.version,
            p.created_at, p.updated_at, p.reject_reason, u.id AS seller_id, u.name AS seller_name, u.role AS seller_role,
            (SELECT COUNT(*) FROM order_products op JOIN orders o ON o.id = op.order_id AND o.status IN ('VERIFIED','COMPLETED') WHERE op.product_id = p.id) AS sales
     FROM products p JOIN users u ON u.id = p.user_id
     WHERE $where ORDER BY $sort LIMIT $per OFFSET $off",
    $params
  );
  $tags = tags_for_products(array_column($rows, 'id'));
  foreach ($rows as &$r) {
    $r['tags'] = $tags[$r['id']] ?? [];
    $r['categories'] = array_column(array_filter(categories_for_tags(array_column($r['tags'], 'id')), fn($c) => $c['direct']), 'path');
    $r['image'] = json_col($r['screenshots'])[0] ?? null;
    unset($r['screenshots']);
    $r['price'] = (float)$r['price'];
    $r['sale_price'] = $r['sale_price'] !== null ? (float)$r['sale_price'] : null;
    $r['featured'] = (bool)$r['featured'];
    $r['sales'] = (int)$r['sales'];
  }
  $counts = [];
  foreach (Db::all("SELECT status, COUNT(*) c FROM products GROUP BY status") as $c) $counts[$c['status']] = (int)$c['c'];
  ok($rows, ['total' => $total, 'page' => $page, 'per_page' => $per, 'pages' => (int)ceil($total / $per), 'status_counts' => $counts]);
});

route('GET', 'admin/products/{id}', function ($p) {
  require_role('ADMIN');
  $row = Db::one("SELECT p.*, u.name AS seller_name FROM products p JOIN users u ON u.id = p.user_id WHERE p.id = ?", [$p['id']]);
  if (!$row) fail(404, 'Product not found');
  ok(product_out($row));
});

function product_out(array $row): array
{
  foreach (['screenshots', 'compatibility', 'features'] as $k) $row[$k] = json_col($row[$k] ?? null);
  $row['pack_meta'] = json_col($row['pack_meta'] ?? null) ?: new stdClass();
  $row['tags'] = tags_for_products([$row['id']])[$row['id']] ?? [];
  $row['tag_ids'] = array_column($row['tags'], 'id');
  $row['categories'] = categories_for_tags($row['tag_ids']);
  $row['price'] = (float)$row['price'];
  $row['sale_price'] = $row['sale_price'] !== null ? (float)$row['sale_price'] : null;
  $row['featured'] = (bool)$row['featured'];
  $row['has_file'] = !empty($row['files']);
  unset($row['files']); // private storage path
  return $row;
}

/**
 * Validate the product editor payload. $asSeller limits fields sellers may set.
 */
function product_payload(?string $id, bool $asSeller): array
{
  $title = str_in('title', 255);
  $errors = [];
  if (mb_strlen($title) < 3) $errors['title'] = 'Enter a title (3+ characters)';
  $price = (float)input('price', 0);
  if ($price < 0 || $price > 100000) $errors['price'] = 'Enter a valid price';
  $sale = input('sale_price');
  $sale = ($sale === null || $sale === '') ? null : (float)$sale;
  if ($sale !== null && ($sale < 0 || $sale >= $price)) $errors['sale_price'] = 'Sale price must be lower than the price';
  $type = input('type', 'standard') === 'server_pack' ? 'server_pack' : 'standard';
  $video = str_in('video_url', 500);
  if ($video !== '' && !preg_match('#^https://#i', $video)) $errors['video_url'] = 'Use an https:// link';
  if ($errors) fail(422, 'Please fix the highlighted fields', $errors);

  $statuses = $asSeller ? ['DRAFT', 'PENDING'] : ['DRAFT', 'PENDING', 'PUBLISHED', 'REJECTED'];
  $status = strtoupper(str_in('status', 20) ?: 'DRAFT');
  if (!in_array($status, $statuses, true)) $status = $asSeller ? 'PENDING' : 'DRAFT';

  $shots = array_values(array_filter(arr_in('screenshots'), fn($s) => is_string($s)
    && preg_match('#^(uploads/(products|categories|site)/[A-Za-z0-9._-]+|images/[A-Za-z0-9/._-]+|https://[^\s"\'<>]+)$#', $s)));
  $file = str_in('file_path', 500);
  // product files must be our own private uploads (or an external https link)
  if ($file !== '' && !preg_match('#^(uploads/files/[a-f0-9]{24}\.(zip|rar|7z)|https://[^\s"\'<>]+)$#', $file)) {
    fail(422, 'Invalid download file', ['file_path' => 'Upload the file again']);
  }
  $pack = arr_in('pack_meta');
  $packClean = $type === 'server_pack' ? [
    'resources' => (int)($pack['resources'] ?? 0),
    'resmon_idle_ms' => mb_substr((string)($pack['resmon_idle_ms'] ?? ''), 0, 20),
    'frameworks' => array_slice(array_map('strval', (array)($pack['frameworks'] ?? [])), 0, 10),
    'features' => array_slice(array_map(fn($x) => mb_substr((string)$x, 0, 200), (array)($pack['features'] ?? [])), 0, 100),
    'lifetime_updates' => !empty($pack['lifetime_updates']),
  ] : null;

  return [
    'title' => $title,
    'slug' => unique_slug('products', str_in('slug', 200) ?: $title, $id),
    'description' => clean_html((string)input('description', '')),
    'install_guide' => clean_html((string)input('install_guide', '')),
    'price' => round($price, 2),
    'sale_price' => $sale !== null ? round($sale, 2) : null,
    'type' => $type,
    'status' => $status,
    'featured' => $asSeller ? null : (bool_in('featured') ? 1 : 0),
    'version' => str_in('version', 50) ?: '1.0.0',
    'video_url' => $video ?: null,
    'changelog' => str_in('changelog', 20000) ?: null,
    'features' => json_encode(array_values(array_filter(array_map(fn($x) => mb_substr(trim((string)$x), 0, 200), arr_in('features'))))),
    'compatibility' => json_encode(array_values(array_map('strval', arr_in('compatibility')))),
    'screenshots' => json_encode($shots),
    'seo_title' => str_in('seo_title', 255) ?: null,
    'seo_description' => str_in('seo_description', 500) ?: null,
    'pack_meta' => $packClean ? json_encode($packClean) : null,
    'files' => $file ?: null,
  ];
}

function product_save(?string $id, string $ownerId, bool $asSeller): string
{
  $d = product_payload($id, $asSeller);
  $pdo = Db::pdo();
  $pdo->beginTransaction();
  if ($id === null) {
    $id = uuid();
    $pdo->prepare("INSERT INTO products (id, user_id, slug, title, description, install_guide, price, sale_price, type, status, featured, version, video_url,
                    changelog, features, compatibility, screenshots, seo_title, seo_description, pack_meta, files, published_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      ->execute([$id, $ownerId, $d['slug'], $d['title'], $d['description'], $d['install_guide'], $d['price'], $d['sale_price'], $d['type'],
                 $d['status'], $d['featured'] ?? 0, $d['version'], $d['video_url'], $d['changelog'], $d['features'], $d['compatibility'],
                 $d['screenshots'], $d['seo_title'], $d['seo_description'], $d['pack_meta'], $d['files'],
                 $d['status'] === 'PUBLISHED' ? date('Y-m-d H:i:s') : null]);
  } else {
    $sets = "slug = ?, title = ?, description = ?, install_guide = ?, price = ?, sale_price = ?, type = ?, status = ?, version = ?, video_url = ?,
             changelog = ?, features = ?, compatibility = ?, screenshots = ?, seo_title = ?, seo_description = ?, pack_meta = ?,
             published_at = IF(? = 'PUBLISHED' AND published_at IS NULL, NOW(), published_at)";
    $vals = [$d['slug'], $d['title'], $d['description'], $d['install_guide'], $d['price'], $d['sale_price'], $d['type'], $d['status'],
             $d['version'], $d['video_url'], $d['changelog'], $d['features'], $d['compatibility'], $d['screenshots'], $d['seo_title'],
             $d['seo_description'], $d['pack_meta'], $d['status']];
    if ($d['featured'] !== null) { $sets .= ', featured = ?'; $vals[] = $d['featured']; }
    if ($d['files'] !== null) { $sets .= ', files = ?'; $vals[] = $d['files']; }
    $vals[] = $id;
    $pdo->prepare("UPDATE products SET $sets WHERE id = ?")->execute($vals);
  }
  $tagIds = arr_in('tag_ids');
  // Server packs always carry the server-pack tag so they land in that category
  if ($d['type'] === 'server_pack') {
    $sp = Db::value("SELECT id FROM tags WHERE slug = 'server-pack'");
    if ($sp) $tagIds[] = $sp;
  }
  if ($d['price'] == 0) {
    $free = Db::value("SELECT id FROM tags WHERE slug = 'free'");
    if ($free) $tagIds[] = $free;
  }
  set_product_tags($id, $tagIds);
  $pdo->commit();
  return $id;
}

route('POST', 'admin/products', function () {
  $u = require_role('ADMIN');
  $owner = str_in('seller_id', 36) ?: $u['id'];
  if (!Db::value("SELECT COUNT(*) FROM users WHERE id = ?", [$owner])) fail(422, 'Seller not found');
  $id = product_save(null, $owner, false);
  audit('product_created', 'product', $id, str_in('title'));
  ok(['id' => $id], [], 201);
});

route('POST', 'admin/products/bulk', function () {
  require_role('ADMIN');
  $ids = array_values(array_filter(arr_in('ids'), 'is_string'));
  $action = str_in('action', 30);
  if (!$ids) fail(422, 'Select at least one product');
  $in = Db::in($ids);
  $pdo = Db::pdo();
  switch ($action) {
    case 'publish':
    case 'approve':
      $pdo->prepare("UPDATE products SET status = 'PUBLISHED', reject_reason = NULL, published_at = COALESCE(published_at, NOW()) WHERE id IN ($in)")->execute($ids);
      break;
    case 'reject':
      $reason = str_in('reason', 500) ?: 'Did not meet our guidelines';
      $pdo->prepare("UPDATE products SET status = 'REJECTED', reject_reason = ? WHERE id IN ($in)")->execute(array_merge([$reason], $ids));
      break;
    case 'draft':
      $pdo->prepare("UPDATE products SET status = 'DRAFT' WHERE id IN ($in)")->execute($ids);
      break;
    case 'feature':
    case 'unfeature':
      $pdo->prepare("UPDATE products SET featured = ? WHERE id IN ($in)")->execute(array_merge([$action === 'feature' ? 1 : 0], $ids));
      break;
    case 'add_tag':
    case 'remove_tag':
      $tag = str_in('tag_id', 36);
      if (!Db::value("SELECT COUNT(*) FROM tags WHERE id = ?", [$tag])) fail(422, 'Choose a tag');
      $st = $pdo->prepare($action === 'add_tag'
        ? "INSERT IGNORE INTO product_tags (product_id, tag_id) VALUES (?, ?)"
        : "DELETE FROM product_tags WHERE product_id = ? AND tag_id = ?");
      foreach ($ids as $pid) $st->execute([$pid, $tag]);
      break;
    case 'delete':
      $sold = (int)Db::value("SELECT COUNT(*) FROM order_products WHERE product_id IN ($in)", $ids);
      if ($sold) fail(409, "Some of these products have been sold. Set them to Draft instead so buyers keep access.");
      $pdo->prepare("DELETE FROM products WHERE id IN ($in)")->execute($ids);
      break;
    default:
      fail(422, 'Unknown bulk action');
  }
  audit('products_bulk_' . $action, 'product', null, count($ids) . ' products');
  ok(['updated' => count($ids)]);
});

route('POST', 'admin/products/{id}', function ($p) {
  require_role('ADMIN');
  if (!Db::value("SELECT COUNT(*) FROM products WHERE id = ?", [$p['id']])) fail(404, 'Product not found');
  product_save($p['id'], '', false);
  audit('product_updated', 'product', $p['id'], str_in('title'));
  ok(['id' => $p['id']]);
});

route('POST', 'admin/products/{id}/review', function ($p) {
  require_role('ADMIN');
  $decision = str_in('decision', 10);
  if (!in_array($decision, ['approve', 'reject'], true)) fail(422, 'Choose approve or reject');
  $reason = str_in('reason', 500);
  if ($decision === 'reject' && $reason === '') fail(422, 'Tell the seller why it was rejected', ['reason' => 'Required']);
  $st = Db::pdo()->prepare($decision === 'approve'
    ? "UPDATE products SET status = 'PUBLISHED', reject_reason = NULL, published_at = COALESCE(published_at, NOW()) WHERE id = ?"
    : "UPDATE products SET status = 'REJECTED', reject_reason = ? WHERE id = ?");
  $st->execute($decision === 'approve' ? [$p['id']] : [$reason, $p['id']]);
  if (!$st->rowCount() && !Db::value("SELECT COUNT(*) FROM products WHERE id = ?", [$p['id']])) fail(404, 'Product not found');
  audit('product_' . $decision . 'd', 'product', $p['id'], $reason ?: null);
  ok(['status' => $decision === 'approve' ? 'PUBLISHED' : 'REJECTED']);
});

// ============================================================
// Uploads (images for products/categories/homepage, product archives)
// ============================================================

route('POST', 'admin/upload', function () {
  $u = require_role('ADMIN');
  rate_limit('upload', 60, 300);
  $kind = in_array(input('kind', 'image'), ['archive', 'video'], true) ? input('kind') : 'image';
  if ($kind === 'video' && $u['role'] !== 'ADMIN') $kind = 'image'; // background videos are a site setting
  $dir = ['products' => 'products', 'categories' => 'categories', 'site' => 'site'][input('dir', 'products')] ?? 'products';
  if ($u['role'] === 'SELLER') $dir = 'products';
  if (empty($_FILES['file'])) fail(422, 'Choose a file to upload');
  $path = save_upload($_FILES['file'], $kind === 'archive' ? 'files' : $dir, $kind);
  ok(['path' => $path, 'url' => $kind === 'archive' ? null : $path]);
});
