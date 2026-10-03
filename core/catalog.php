<?php
/**
 * Catalog helpers shared by the admin, seller and store APIs.
 * Rule: a product is in category C when it has a tag owned by C or by any descendant of C.
 */

/** All categories as id => row (with own tag ids). Pass $fresh after writes in the same request. */
function cat_all(bool $fresh = false): array
{
  static $cats = null;
  if ($cats !== null && !$fresh) return $cats;
  $cats = [];
  foreach (Db::all("SELECT * FROM categories ORDER BY `order`, name") as $c) {
    $c['tag_ids'] = [];
    $cats[$c['id']] = $c;
  }
  foreach (Db::all("SELECT category_id, tag_id FROM category_tags") as $r) {
    if (isset($cats[$r['category_id']])) $cats[$r['category_id']]['tag_ids'][] = $r['tag_id'];
  }
  return $cats;
}

/** Ancestor chain root → $id (names). */
function cat_path(string $id): array
{
  $cats = cat_all();
  $path = [];
  $seen = [];
  while ($id && isset($cats[$id]) && !isset($seen[$id])) {
    $seen[$id] = true;
    array_unshift($path, ['id' => $id, 'name' => $cats[$id]['name'], 'slug' => $cats[$id]['slug']]);
    $id = $cats[$id]['parent_id'];
  }
  return $path;
}

/**
 * Categories a product with these tags appears in: categories owning one of the tags (direct)
 * plus all of their ancestors. Returns [{id, name, slug, path:"Scripts › Jobs", direct:bool}].
 */
function categories_for_tags(array $tagIds): array
{
  $want = array_flip($tagIds);
  $out = [];
  foreach (cat_all() as $c) {
    if (!array_intersect_key(array_flip($c['tag_ids']), $want)) continue;
    $chain = cat_path($c['id']);
    foreach ($chain as $i => $p) {
      $isDirect = $p['id'] === $c['id'];
      $out[$p['id']] = [
        'id' => $p['id'], 'name' => $p['name'], 'slug' => $p['slug'],
        'path' => implode(' › ', array_column(array_slice($chain, 0, $i + 1), 'name')),
        'direct' => $isDirect || ($out[$p['id']]['direct'] ?? false),
      ];
    }
  }
  usort($out, fn($a, $b) => strcmp($a['path'], $b['path']));
  return array_values($out);
}

/** product_id => [tag rows] for many products. */
function tags_for_products(array $productIds): array
{
  if (!$productIds) return [];
  $out = [];
  foreach (Db::all(
    "SELECT pt.product_id, t.id, t.name, t.slug, t.color, t.group_id
     FROM product_tags pt JOIN tags t ON t.id = pt.tag_id
     WHERE pt.product_id IN (" . Db::in($productIds) . ") ORDER BY t.name",
    array_values($productIds)
  ) as $r) {
    $pid = $r['product_id'];
    unset($r['product_id']);
    $out[$pid][] = $r;
  }
  return $out;
}

/** Replace a product's tags (only ids that exist are kept). */
function set_product_tags(string $productId, array $tagIds): void
{
  $tagIds = array_values(array_unique(array_filter($tagIds, 'is_string')));
  $valid = $tagIds ? array_column(Db::all("SELECT id FROM tags WHERE id IN (" . Db::in($tagIds) . ")", $tagIds), 'id') : [];
  $pdo = Db::pdo();
  $pdo->prepare("DELETE FROM product_tags WHERE product_id = ?")->execute([$productId]);
  $ins = $pdo->prepare("INSERT INTO product_tags (product_id, tag_id) VALUES (?, ?)");
  foreach ($valid as $t) $ins->execute([$productId, $t]);
}

function set_category_tags(string $categoryId, array $tagIds): void
{
  $tagIds = array_values(array_unique(array_filter($tagIds, 'is_string')));
  $valid = $tagIds ? array_column(Db::all("SELECT id FROM tags WHERE id IN (" . Db::in($tagIds) . ")", $tagIds), 'id') : [];
  $pdo = Db::pdo();
  $pdo->prepare("DELETE FROM category_tags WHERE category_id = ?")->execute([$categoryId]);
  $ins = $pdo->prepare("INSERT INTO category_tags (category_id, tag_id) VALUES (?, ?)");
  foreach ($valid as $t) $ins->execute([$categoryId, $t]);
}

/**
 * Keep a safe subset of HTML for rich descriptions.
 * Allowed: p br b strong i em u s h2 h3 h4 ul ol li blockquote code pre a(href) img(src, alt) hr.
 */
function clean_html(string $html): string
{
  $html = trim($html);
  if ($html === '') return '';
  if (!class_exists('DOMDocument')) {
    return nl2br(htmlspecialchars(strip_tags($html), ENT_QUOTES, 'UTF-8'));
  }
  $allowed = ['p', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'a', 'img', 'hr'];
  $doc = new DOMDocument();
  libxml_use_internal_errors(true);
  $doc->loadHTML('<?xml encoding="UTF-8"><div id="__root">' . $html . '</div>', LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
  libxml_clear_errors();
  $root = $doc->getElementById('__root');
  if (!$root) return '';

  $walk = function (DOMNode $node) use (&$walk, $allowed, $doc) {
    for ($i = $node->childNodes->length - 1; $i >= 0; $i--) {
      $child = $node->childNodes->item($i);
      if ($child instanceof DOMComment) { $node->removeChild($child); continue; }
      if (!($child instanceof DOMElement)) continue;
      $tag = strtolower($child->tagName);
      if (in_array($tag, ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'svg', 'math'], true)) {
        $node->removeChild($child);
        continue;
      }
      $walk($child);
      if (!in_array($tag, $allowed, true)) {
        while ($child->firstChild) $node->insertBefore($child->firstChild, $child);
        $node->removeChild($child);
        continue;
      }
      $keep = ['a' => ['href'], 'img' => ['src', 'alt']][$tag] ?? [];
      for ($a = $child->attributes->length - 1; $a >= 0; $a--) {
        $attr = $child->attributes->item($a);
        $name = strtolower($attr->name);
        $val = trim($attr->value);
        // allow http(s), mailto (links only) and relative URLs with no scheme at all (blocks javascript:, data:, etc.)
        $safeUrl = !in_array($name, ['href', 'src'], true)
          || preg_match('#^https?://#i', $val)
          || ($name === 'href' && preg_match('#^mailto:#i', $val))
          || ($val !== '' && !preg_match('#^[^/?\#]*:#', $val) && strpos($val, '//') !== 0);
        if (!in_array($name, $keep, true) || !$safeUrl) $child->removeAttribute($attr->name);
      }
      if ($tag === 'a' && preg_match('#^https?://#i', $child->getAttribute('href'))) {
        $child->setAttribute('rel', 'noopener nofollow'); // external links open in a new tab
        $child->setAttribute('target', '_blank');
      }
    }
  };
  $walk($root);

  $out = '';
  foreach ($root->childNodes as $c) $out .= $doc->saveHTML($c);
  return $out;
}
