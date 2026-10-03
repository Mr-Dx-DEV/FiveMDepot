<?php
/**
 * FiveMDepot — Public Store API (read-only)
 *
 *   GET api/store.php?r=nav                      categories tree + settings for header/footer
 *   GET api/store.php?r=home                     homepage sections, faqs, product rows
 *   GET api/store.php?r=category&slug=scripts    category page (slug=all for every product)
 *        &tags=qbcore,police  &min=0&max=50  &q=search  &sort=featured|newest|price-low|price-high|popular
 *        &page=1&per_page=24
 *   GET api/store.php?r=product&slug=police-job     product page
 *   GET api/store.php?r=seller&id=<user id>         public seller profile
 *   GET api/store.php?r=docs&type=blog[&slug=x]     blog / tutorials / tools / docs
 *
 * A product is in a category when it has a tag owned by that category
 * or by any of its sub-categories (see migrations/001_store_rebuild.sql).
 */

require_once __DIR__ . '/../core/Db.php';
require_once __DIR__ . '/../core/catalog.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=60');

try {
  switch ($_GET['r'] ?? '') {
    case 'nav':      $data = routeNav(); break;
    case 'home':     $data = routeHome(); break;
    case 'category': $data = routeCategory(); break;
    case 'product':  $data = routeProduct(); break;
    case 'seller':   $data = routeSeller(); break;
    case 'docs':     $data = routeDocs(); break;
    default:
      respondError(404, 'Unknown route');
  }
  echo json_encode(['data' => $data], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
  error_log('[store.php] ' . $e->getMessage());
  respondError(500, 'Store is temporarily unavailable');
}

function respondError(int $status, string $message): void
{
  http_response_code($status);
  header('Cache-Control: no-store');
  echo json_encode(['error' => ['code' => $status, 'message' => $message]]);
  exit;
}

// ============================================================
// Routes
// ============================================================

function routeNav(): array
{
  return [
    'categories' => categoryTree(),
    'settings'   => publicSettings(),
  ];
}

function routeHome(): array
{
  $sections = [];
  foreach (Db::all("SELECT `key`, title, content FROM homepage_sections WHERE is_enabled = 1 ORDER BY sort_order") as $s) {
    $sections[] = [
      'key'     => $s['key'],
      'title'   => $s['title'],
      'content' => json_decode($s['content'] ?? '{}', true) ?: new stdClass(),
    ];
  }

  $limit = fn(string $key, int $default) => sectionLimit($sections, $key, $default);

  return [
    'sections'   => $sections,
    'faqs'       => Db::all("SELECT question, answer FROM faqs WHERE is_active = 1 ORDER BY sort_order"),
    'featured'   => productRows("p.featured = 1", [], 'featured', $limit('featured', 8)),
    'new'        => productRows("1 = 1", [], 'newest', $limit('new', 8)),
    'free'       => productRows("p.price = 0", [], 'popular', $limit('free', 4)),
    'packs'      => productRows("p.type = 'server_pack'", [], 'featured', 3),
    'stats'      => [
      'products' => (int)Db::value("SELECT COUNT(*) FROM products WHERE status = 'PUBLISHED'"),
      'sellers'  => (int)Db::value("SELECT COUNT(DISTINCT user_id) FROM products WHERE status = 'PUBLISHED'"),
    ],
  ];
}

function routeCategory(): array
{
  $slug    = (string)($_GET['slug'] ?? 'all');
  $q       = trim((string)($_GET['q'] ?? ''));
  $sort    = (string)($_GET['sort'] ?? 'featured');
  $page    = max(1, (int)($_GET['page'] ?? 1));
  $perPage = min(60, max(1, (int)($_GET['per_page'] ?? 24)));
  $tagSlugs = array_values(array_filter(array_map('trim', explode(',', (string)($_GET['tags'] ?? '')))));

  $tree = categoryTree();
  $flat = flattenTree($tree);

  // --- Which category
  $category = null;
  $breadcrumb = [];
  $children = $tree;
  $where = ['1 = 1'];
  $params = [];

  if ($slug !== 'all') {
    $category = $flat[$slug] ?? null;
    if ($category === null) {
      respondError(404, 'Category not found');
    }
    $breadcrumb = $category['path'];
    $children = $category['children'];

    $tagIds = $category['all_tag_ids'];
    if (!$tagIds) {
      // Category owns no tags yet → empty listing
      $where[] = '0 = 1';
    } else {
      $where[] = "EXISTS (SELECT 1 FROM product_tags ct WHERE ct.product_id = p.id AND ct.tag_id IN (" . Db::in($tagIds) . "))";
      array_push($params, ...$tagIds);
    }
  }
  $baseWhere = $where;
  $baseParams = $params;

  // --- Search
  if ($q !== '') {
    $where[] = '(p.title LIKE ? OR p.description LIKE ?)';
    $like = '%' . $q . '%';
    array_push($params, $like, $like);
  }

  // --- Price
  if (isset($_GET['min']) && $_GET['min'] !== '') {
    $where[] = 'COALESCE(p.sale_price, p.price) >= ?';
    $params[] = (float)$_GET['min'];
  }
  if (isset($_GET['max']) && $_GET['max'] !== '') {
    $where[] = 'COALESCE(p.sale_price, p.price) <= ?';
    $params[] = (float)$_GET['max'];
  }

  // --- Tag filters: OR inside a group, AND across groups
  if ($tagSlugs) {
    $selected = Db::all("SELECT id, group_id FROM tags WHERE slug IN (" . Db::in($tagSlugs) . ")", $tagSlugs);
    $byGroup = [];
    foreach ($selected as $t) {
      $byGroup[$t['group_id'] ?? '_none'][] = $t['id'];
    }
    foreach ($byGroup as $ids) {
      $where[] = "EXISTS (SELECT 1 FROM product_tags ft WHERE ft.product_id = p.id AND ft.tag_id IN (" . Db::in($ids) . "))";
      array_push($params, ...$ids);
    }
  }

  $whereSql = implode(' AND ', $where);
  $total = (int)Db::value("SELECT COUNT(*) FROM products p WHERE p.status = 'PUBLISHED' AND $whereSql", $params);
  $products = productRows($whereSql, $params, $sort, $perPage, ($page - 1) * $perPage);

  return [
    'category'   => $category ? publicCategory($category) : [
      'name' => 'All Products', 'slug' => 'all', 'description' => 'Browse every resource in the store.',
      'icon' => '', 'banner_url' => null, 'seo_title' => null, 'seo_description' => null,
    ],
    'breadcrumb' => array_map(fn($c) => ['name' => $c['name'], 'slug' => $c['slug']], $breadcrumb),
    'children'   => array_map('publicCategory', $children),
    'filters'    => tagFilters(implode(' AND ', $baseWhere), $baseParams),
    'products'   => $products,
    'meta'       => ['total' => $total, 'page' => $page, 'per_page' => $perPage, 'pages' => (int)ceil($total / $perPage)],
  ];
}

// ============================================================
// Categories
// ============================================================

/**
 * Full active category tree. Each node has:
 * id, name, slug, icon, description, banner_url, seo_*, show_in_nav,
 * children[], path[] (root → node), all_tag_ids[] (own + descendants),
 * product_count (published products, deduplicated).
 */
function categoryTree(): array
{
  static $tree = null;
  if ($tree !== null) return $tree;

  $rows = Db::all("SELECT id, parent_id, name, slug, icon, description, banner_url, seo_title, seo_description, show_in_nav
                   FROM categories WHERE is_active = 1 ORDER BY `order`, name");

  $ownTags = [];
  foreach (Db::all("SELECT category_id, tag_id FROM category_tags") as $r) {
    $ownTags[$r['category_id']][] = $r['tag_id'];
  }

  // tag_id → [product_id, ...] for published products
  $tagProducts = [];
  foreach (Db::all("SELECT pt.tag_id, pt.product_id FROM product_tags pt
                    JOIN products p ON p.id = pt.product_id AND p.status = 'PUBLISHED'") as $r) {
    $tagProducts[$r['tag_id']][] = $r['product_id'];
  }

  $nodes = [];
  foreach ($rows as $r) {
    $r['show_in_nav'] = (bool)$r['show_in_nav'];
    $r['children'] = [];
    $nodes[$r['id']] = $r;
  }

  // Orphans (parent inactive or missing) are promoted to roots
  foreach ($nodes as $id => $n) {
    if ($n['parent_id'] !== null && !isset($nodes[$n['parent_id']])) {
      $nodes[$id]['parent_id'] = null;
    }
  }

  $build = function (?string $parentId, array $path) use (&$build, $nodes, $ownTags, $tagProducts): array {
    $out = [];
    foreach ($nodes as $n) {
      if ($n['parent_id'] !== $parentId) continue;
      $node = $n;
      $node['path'] = array_merge($path, [['name' => $n['name'], 'slug' => $n['slug']]]);
      $node['children'] = $build($n['id'], $node['path']);

      $tagIds = $ownTags[$n['id']] ?? [];
      foreach ($node['children'] as $c) {
        $tagIds = array_merge($tagIds, $c['all_tag_ids']);
      }
      $node['all_tag_ids'] = array_values(array_unique($tagIds));

      $products = [];
      foreach ($node['all_tag_ids'] as $t) {
        foreach ($tagProducts[$t] ?? [] as $pid) $products[$pid] = true;
      }
      $node['product_count'] = count($products);
      $out[] = $node;
    }
    return $out;
  };

  $tree = $build(null, []);
  return $tree;
}

function flattenTree(array $tree): array
{
  $flat = [];
  foreach ($tree as $n) {
    $flat[$n['slug']] = $n;
    $flat += flattenTree($n['children']);
  }
  return $flat;
}

function publicCategory(array $c): array
{
  return [
    'name'            => $c['name'],
    'slug'            => $c['slug'],
    'icon'            => $c['icon'],
    'description'     => $c['description'],
    'banner_url'      => $c['banner_url'],
    'seo_title'       => $c['seo_title'],
    'seo_description' => $c['seo_description'],
    'show_in_nav'     => $c['show_in_nav'],
    'product_count'   => $c['product_count'],
    'children'        => array_map('publicCategory', $c['children']),
  ];
}

// ============================================================
// Products
// ============================================================

function productRows(string $whereSql, array $params, string $sort, int $limit, int $offset = 0): array
{
  $orderBy = [
    'newest'     => 'p.created_at DESC',
    'price-low'  => 'COALESCE(p.sale_price, p.price) ASC',
    'price-high' => 'COALESCE(p.sale_price, p.price) DESC',
    'popular'    => 'p.downloads DESC',
    'rating'     => 'rating DESC',
  ][$sort] ?? 'p.featured DESC, p.created_at DESC';

  $limit = max(1, min(60, $limit));
  $offset = max(0, $offset);

  $rows = Db::all(
    "SELECT p.id, p.slug, p.title, p.description, p.price, p.sale_price, p.type, p.featured,
            p.screenshots, p.version, p.created_at, u.name AS seller_name,
            COALESCE(r.avg_rating, 0) AS rating, COALESCE(r.cnt, 0) AS review_count
     FROM products p
     JOIN users u ON u.id = p.user_id
     LEFT JOIN (SELECT product_id, AVG(rating) AS avg_rating, COUNT(*) AS cnt FROM reviews GROUP BY product_id) r
       ON r.product_id = p.id
     WHERE p.status = 'PUBLISHED' AND $whereSql
     ORDER BY $orderBy
     LIMIT $limit OFFSET $offset",
    $params
  );
  if (!$rows) return [];

  // Attach tags in one query
  $ids = array_column($rows, 'id');
  $tagsByProduct = [];
  foreach (Db::all(
    "SELECT pt.product_id, t.name, t.slug, t.color, g.slug AS group_slug
     FROM product_tags pt
     JOIN tags t ON t.id = pt.tag_id
     LEFT JOIN tag_groups g ON g.id = t.group_id
     WHERE pt.product_id IN (" . Db::in($ids) . ")
     ORDER BY t.name",
    $ids
  ) as $t) {
    $tagsByProduct[$t['product_id']][] = $t;
  }

  return array_map(function ($p) use ($tagsByProduct) {
    $tags = $tagsByProduct[$p['id']] ?? [];
    $shots = json_decode($p['screenshots'] ?? '[]', true) ?: [];
    $typeTag = null;
    $frameworks = [];
    $other = [];
    foreach ($tags as $t) {
      $item = ['name' => $t['name'], 'slug' => $t['slug'], 'color' => $t['color']];
      if ($t['group_slug'] === 'type' && $typeTag === null) $typeTag = $item;
      elseif ($t['group_slug'] === 'framework') $frameworks[] = $item;
      elseif ($t['group_slug'] !== 'pricing') $other[] = $item;
    }
    if ($p['type'] === 'server_pack') {
      $typeTag = ['name' => 'Server Pack', 'slug' => 'server-pack', 'color' => '#eab308'];
    }
    return [
      'id'           => $p['id'],
      'slug'         => $p['slug'],
      'title'        => $p['title'],
      'excerpt'      => mb_substr(trim(strip_tags(html_entity_decode($p['description'] ?? ''))), 0, 140),
      'price'        => (float)$p['price'],
      'sale_price'   => $p['sale_price'] !== null ? (float)$p['sale_price'] : null,
      'type'         => $p['type'],
      'badge'        => $typeTag,
      'frameworks'   => $frameworks,
      'tags'         => $other,
      'featured'     => (bool)$p['featured'],
      'image'        => $shots[0] ?? null,
      'version'      => $p['version'],
      'seller'       => $p['seller_name'],
      'rating'       => round((float)$p['rating'], 1),
      'review_count' => (int)$p['review_count'],
      'created_at'   => $p['created_at'],
    ];
  }, $rows);
}

/** Tag groups usable as filters, with counts inside the current listing. */
function tagFilters(string $whereSql, array $params): array
{
  $rows = Db::all(
    "SELECT g.name AS group_name, g.slug AS group_slug, t.name, t.slug, t.color, COUNT(DISTINCT p.id) AS cnt
     FROM tag_groups g
     JOIN tags t ON t.group_id = g.id
     JOIN product_tags pt ON pt.tag_id = t.id
     JOIN products p ON p.id = pt.product_id AND p.status = 'PUBLISHED'
     WHERE g.show_as_filter = 1 AND $whereSql
     GROUP BY g.id, g.name, g.slug, g.sort_order, t.id, t.name, t.slug, t.color
     ORDER BY g.sort_order, t.name",
    $params
  );
  $groups = [];
  foreach ($rows as $r) {
    $g = $r['group_slug'];
    $groups[$g] ??= ['name' => $r['group_name'], 'slug' => $g, 'tags' => []];
    $groups[$g]['tags'][] = ['name' => $r['name'], 'slug' => $r['slug'], 'color' => $r['color'], 'count' => (int)$r['cnt']];
  }
  return array_values($groups);
}

// ============================================================
// Product page, seller profile, docs
// ============================================================

/** Legacy descriptions were stored HTML-escaped plain text; new ones are sanitized HTML. */
function description_html(?string $d): string
{
  $d = (string)$d;
  if ($d === '') return '';
  if (!preg_match('/<[a-z][\s\S]*>/i', $d)) {
    return nl2br(htmlspecialchars(html_entity_decode($d, ENT_QUOTES, 'UTF-8'), ENT_QUOTES, 'UTF-8'));
  }
  return clean_html($d);
}

function video_embed(?string $url): ?string
{
  $url = (string)$url;
  if (preg_match('#(?:youtube\.com/(?:watch\?v=|shorts/|embed/)|youtu\.be/)([A-Za-z0-9_-]{6,15})#', $url, $m)) {
    return 'https://www.youtube-nocookie.com/embed/' . $m[1];
  }
  if (preg_match('#vimeo\.com/(\d+)#', $url, $m)) return 'https://player.vimeo.com/video/' . $m[1];
  return null;
}

function routeProduct(): array
{
  $slug = (string)($_GET['slug'] ?? '');
  $p = Db::one("SELECT p.*, u.name AS seller_name, u.role AS seller_role FROM products p JOIN users u ON u.id = p.user_id
                WHERE (p.slug = ? OR p.id = ?) AND p.status = 'PUBLISHED'", [$slug, $slug]);
  if (!$p) respondError(404, 'Product not found');

  $card = productRows('p.id = ?', [$p['id']], 'featured', 1)[0];
  $tagIds = array_column(Db::all("SELECT tag_id FROM product_tags WHERE product_id = ?", [$p['id']]), 'tag_id');
  $cats = array_values(array_filter(categories_for_tags($tagIds), fn($c) => $c['direct']));
  $breadcrumb = [];
  if ($cats) {
    $breadcrumb = array_map(fn($c) => ['name' => $c['name'], 'slug' => $c['slug']], cat_path($cats[0]['id']));
  }
  $reviews = Db::all("SELECT r.rating, r.comment, r.created_at, u.name FROM reviews r JOIN users u ON u.id = r.user_id
                      WHERE r.product_id = ? AND r.is_hidden = 0 ORDER BY r.created_at DESC LIMIT 30", [$p['id']]);
  $dist = array_fill(1, 5, 0);
  foreach (Db::all("SELECT rating, COUNT(*) c FROM reviews WHERE product_id = ? AND is_hidden = 0 GROUP BY rating", [$p['id']]) as $r) {
    $dist[(int)$r['rating']] = (int)$r['c'];
  }
  $related = [];
  if ($tagIds) {
    $related = productRows(
      "p.id <> ? AND p.id IN (SELECT product_id FROM product_tags WHERE tag_id IN (" . Db::in($tagIds) . "))",
      array_merge([$p['id']], $tagIds), 'popular', 4);
  }
  $seller = Db::one("SELECT sp.bio, (SELECT COUNT(*) FROM products x WHERE x.user_id = ? AND x.status = 'PUBLISHED') AS products
                     FROM seller_profiles sp WHERE sp.user_id = ?", [$p['user_id'], $p['user_id']]);

  return $card + [
    'description_html' => description_html($p['description']),
    'install_html' => description_html($p['install_guide'] ?? ''),
    'features' => json_col($p['features'] ?? null),
    'compatibility' => json_col($p['compatibility'] ?? null),
    'screenshots' => json_col($p['screenshots'] ?? null),
    'changelog' => (string)($p['changelog'] ?? ''),
    'video_embed' => video_embed($p['video_url'] ?? ''),
    'pack' => $p['type'] === 'server_pack' ? (json_col($p['pack_meta'] ?? null) ?: null) : null,
    'downloads' => (int)$p['downloads'],
    'updated_at' => $p['updated_at'],
    'seo_title' => $p['seo_title'] ?? null,
    'seo_description' => $p['seo_description'] ?? null,
    'seller_info' => [
      'id' => $p['user_id'], 'name' => $p['seller_name'], 'official' => $p['seller_role'] === 'ADMIN',
      'bio' => $seller['bio'] ?? null, 'products' => (int)($seller['products'] ?? 0),
    ],
    'categories' => array_map(fn($c) => ['name' => $c['name'], 'slug' => $c['slug'], 'path' => $c['path']], $cats),
    'breadcrumb' => $breadcrumb,
    'reviews' => $reviews,
    'rating_distribution' => $dist,
    'related' => $related,
  ];
}

function routeSeller(): array
{
  $id = (string)($_GET['id'] ?? '');
  $u = Db::one("SELECT u.id, u.name, u.role, u.created_at, sp.bio, sp.discord_tag FROM users u
                LEFT JOIN seller_profiles sp ON sp.user_id = u.id WHERE u.id = ? AND u.role IN ('SELLER','ADMIN')", [$id]);
  if (!$u) respondError(404, 'Seller not found');
  $rating = Db::one("SELECT AVG(r.rating) a, COUNT(*) c FROM reviews r JOIN products p ON p.id = r.product_id
                     WHERE p.user_id = ? AND r.is_hidden = 0", [$id]);
  return [
    'seller' => ['id' => $u['id'], 'name' => $u['name'], 'official' => $u['role'] === 'ADMIN', 'joined' => $u['created_at'],
                 'bio' => $u['bio'], 'discord' => $u['discord_tag'], 'rating' => round((float)$rating['a'], 1), 'reviews' => (int)$rating['c']],
    'products' => productRows('p.user_id = ?', [$id], 'popular', 60),
  ];
}

function routeDocs(): array
{
  $type = in_array($_GET['type'] ?? '', ['blog', 'tutorial', 'tool', 'doc'], true) ? $_GET['type'] : 'doc';
  $slug = (string)($_GET['slug'] ?? '');
  if ($slug !== '') {
    $d = Db::one("SELECT d.id, d.title, d.slug, d.type, d.category, d.content, d.thumbnail, d.views, d.created_at, d.updated_at, u.name AS author
                  FROM documentation d LEFT JOIN users u ON u.id = d.author_id WHERE d.slug = ? AND d.is_published = 1", [$slug]);
    if (!$d) respondError(404, 'Article not found');
    Db::pdo()->prepare("UPDATE documentation SET views = views + 1 WHERE id = ?")->execute([$d['id']]);
    $d['content_html'] = description_html($d['content']);
    unset($d['content']);
    return ['article' => $d];
  }
  $rows = Db::all("SELECT d.title, d.slug, d.type, d.category, d.excerpt, d.thumbnail, d.views, d.created_at, u.name AS author
                   FROM documentation d LEFT JOIN users u ON u.id = d.author_id WHERE d.type = ? AND d.is_published = 1
                   ORDER BY d.created_at DESC LIMIT 100", [$type]);
  return ['type' => $type, 'articles' => $rows];
}

// ============================================================
// Settings
// ============================================================

function publicSettings(): array
{
  $keys = ['site_name', 'site_tagline', 'social_discord', 'social_github', 'social_youtube', 'since_year'];
  $out = array_fill_keys($keys, '');
  foreach (Db::all("SELECT `key`, `value` FROM site_settings WHERE `key` IN (" . Db::in($keys) . ")", $keys) as $r) {
    $out[$r['key']] = (string)$r['value'];
  }
  return $out;
}

function sectionLimit(array $sections, string $key, int $default): int
{
  foreach ($sections as $s) {
    if ($s['key'] === $key) {
      $c = (array)$s['content'];
      return isset($c['limit']) ? max(1, min(24, (int)$c['limit'])) : $default;
    }
  }
  return $default;
}
