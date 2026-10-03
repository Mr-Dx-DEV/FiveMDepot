<?php
/**
 * Admin — Articles: blog posts, tutorials, tools, docs & legal pages (documentation table)
 */
require_once __DIR__ . '/../../core/catalog.php';

const ARTICLE_TYPES = ['blog', 'tutorial', 'tool', 'doc'];

route('GET', 'admin/articles', function () {
  require_role('ADMIN');
  $type = in_array($_GET['type'] ?? '', ARTICLE_TYPES, true) ? $_GET['type'] : null;
  $rows = Db::all("SELECT d.id, d.title, d.slug, d.type, d.category, d.excerpt, d.thumbnail, d.views, d.is_published, d.created_at, d.updated_at, u.name AS author
                   FROM documentation d LEFT JOIN users u ON u.id = d.author_id"
                  . ($type ? " WHERE d.type = ?" : '') . " ORDER BY d.updated_at DESC", $type ? [$type] : []);
  $counts = array_fill_keys(ARTICLE_TYPES, 0);
  foreach (Db::all("SELECT type, COUNT(*) c FROM documentation GROUP BY type") as $c) $counts[$c['type']] = (int)$c['c'];
  foreach ($rows as &$r) $r['is_published'] = (bool)$r['is_published'];
  ok($rows, ['counts' => $counts]);
});

route('GET', 'admin/articles/{id}', function ($p) {
  require_role('ADMIN');
  $a = Db::one("SELECT * FROM documentation WHERE id = ?", [$p['id']]);
  if (!$a) fail(404, 'Article not found');
  $a['is_published'] = (bool)$a['is_published'];
  ok($a);
});

route('POST', 'admin/articles', function () {
  $u = require_role('ADMIN');
  $id = str_in('id', 36) ?: null;
  $title = str_in('title', 200);
  $type = str_in('type', 20);
  $errors = [];
  if (mb_strlen($title) < 3) $errors['title'] = 'Enter a title';
  if (!in_array($type, ARTICLE_TYPES, true)) $errors['type'] = 'Choose a type';
  if ($errors) fail(422, 'Please fix the highlighted fields', $errors);
  if ($id && !Db::value("SELECT COUNT(*) FROM documentation WHERE id = ?", [$id])) fail(404, 'Article not found');

  $thumb = str_in('thumbnail', 500);
  if ($thumb !== '' && !preg_match('#^(uploads/(site|products|categories)/[A-Za-z0-9._-]+|images/[A-Za-z0-9/._-]+|https://\S+)$#', $thumb)) {
    fail(422, 'Invalid image', ['thumbnail' => 'Upload the image again']);
  }
  $d = [
    'title' => $title,
    'slug' => unique_slug('documentation', str_in('slug', 200) ?: $title, $id),
    'type' => $type,
    'category' => str_in('category', 100) ?: 'general',
    'excerpt' => str_in('excerpt', 500) ?: null,
    'content' => clean_html((string)input('content', '')),
    'thumbnail' => $thumb ?: null,
    'is_published' => bool_in('is_published', true) ? 1 : 0,
  ];
  if ($id) {
    Db::pdo()->prepare("UPDATE documentation SET title = ?, slug = ?, type = ?, category = ?, excerpt = ?, content = ?, thumbnail = ?, is_published = ? WHERE id = ?")
      ->execute([$d['title'], $d['slug'], $d['type'], $d['category'], $d['excerpt'], $d['content'], $d['thumbnail'], $d['is_published'], $id]);
  } else {
    $id = uuid();
    Db::pdo()->prepare("INSERT INTO documentation (id, title, slug, type, category, excerpt, content, thumbnail, is_published, author_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      ->execute([$id, $d['title'], $d['slug'], $d['type'], $d['category'], $d['excerpt'], $d['content'], $d['thumbnail'], $d['is_published'], $u['id']]);
  }
  audit('article_saved', 'article', $id, $d['title']);
  ok(['id' => $id, 'slug' => $d['slug']]);
});

route('POST', 'admin/articles/{id}/delete', function ($p) {
  require_role('ADMIN');
  Db::pdo()->prepare("DELETE FROM documentation WHERE id = ?")->execute([$p['id']]);
  audit('article_deleted', 'article', $p['id']);
  ok(['deleted' => true]);
});
