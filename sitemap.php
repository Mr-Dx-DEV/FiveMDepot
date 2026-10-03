<?php
/**
 * FiveMDepot — XML sitemap (pages, categories, products, articles), generated from the database.
 * robots.txt points search engines here.
 */
require_once __DIR__ . '/core/Db.php';

header('Content-Type: application/xml; charset=utf-8');
header('Cache-Control: public, max-age=3600');

$base = rtrim(SITE_URL, '/') . '/';
$urls = [
  ['index.html', 'daily', '1.0', null],
  ['category.html?c=all', 'daily', '0.9', null],
  ['documentation.html?type=blog', 'weekly', '0.5', null],
  ['documentation.html?type=tutorial', 'weekly', '0.5', null],
  ['documentation.html?type=tool', 'weekly', '0.5', null],
  ['documentation.html?type=doc', 'monthly', '0.4', null],
];

try {
  foreach (Db::all("SELECT slug, updated_at FROM categories WHERE is_active = 1") as $c) {
    $urls[] = ['category.html?c=' . rawurlencode($c['slug']), 'daily', '0.8', $c['updated_at']];
  }
  foreach (Db::all("SELECT slug, updated_at FROM products WHERE status = 'PUBLISHED' ORDER BY updated_at DESC LIMIT 45000") as $p) {
    $urls[] = ['product.html?slug=' . rawurlencode($p['slug']), 'weekly', '0.7', $p['updated_at']];
  }
  foreach (Db::all("SELECT slug, type, updated_at FROM documentation WHERE is_published = 1") as $d) {
    $urls[] = ['documentation.html?type=' . rawurlencode($d['type']) . '&slug=' . rawurlencode($d['slug']), 'monthly', '0.5', $d['updated_at']];
  }
} catch (Throwable $e) {
  error_log('[sitemap] ' . $e->getMessage()); // still serve the static pages
}

echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
foreach ($urls as [$loc, $freq, $prio, $mod]) {
  echo '  <url><loc>' . htmlspecialchars($base . $loc, ENT_XML1) . '</loc>'
    . ($mod ? '<lastmod>' . date('Y-m-d', strtotime($mod)) . '</lastmod>' : '')
    . '<changefreq>' . $freq . '</changefreq><priority>' . $prio . '</priority></url>' . "\n";
}
echo '</urlset>' . "\n";
