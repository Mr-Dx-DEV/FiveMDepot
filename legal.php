<?php
/**
 * FiveMDepot — legal and contact pages, rendered on the server:
 *   /terms   /privacy   /refunds (also /refund-policy)   /contact
 * They read without JavaScript, so Paddle's domain review, crawlers and no-JS visitors get the full text.
 * Content comes from Admin → Articles (documentation table, type "doc"), same as documentation.html.
 * js/store.js still swaps in the live header and footer for normal visitors.
 */
require_once __DIR__ . '/core/Db.php';
require_once __DIR__ . '/core/catalog.php';

const LEGAL_PAGES = [
  'terms' => 'Terms of Service',
  'privacy' => 'Privacy Policy',
  'refunds' => 'Refund Policy',
  'contact' => 'Contact us',
];

$slug = (string)($_GET['slug'] ?? '');
if ($slug === 'refund-policy') $slug = 'refunds';

$doc = null;
$status = 404;
if (isset(LEGAL_PAGES[$slug])) {
  try {
    $doc = Db::one("SELECT title, content, updated_at FROM documentation WHERE slug = ? AND type = 'doc' AND is_published = 1", [$slug]);
    if ($doc) {
      $doc['content_html'] = description_html(business_tokens((string)$doc['content']));
      $status = 200;
    }
  } catch (Throwable $e) {
    error_log('[legal] ' . $e->getMessage());
    $status = 503;
  }
}

http_response_code($status);
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-cache');

$e = fn($s) => htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8');
$title = $doc ? $doc['title'] : ($status === 503 ? 'Temporarily unavailable' : 'Page not found');
$updated = $doc && $doc['updated_at'] ? date('j F Y', strtotime($doc['updated_at'])) : '';
?>
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <script>try{var d=document.documentElement;if(localStorage.getItem('fivedepot_theme')==='light')d.setAttribute('data-theme','light');d.setAttribute('data-accent',localStorage.getItem('fdm_accent')||'crimson')}catch(e){}</script>
  <link rel="icon" type="image/svg+xml" href="favicon.svg">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?= $e($title) ?> — FiveMDepot</title>
  <meta name="description" content="<?= $e($title) ?> for FiveMDepot (fivemdepot.com), FiveM scripts, MLOs, vehicles and server packs.">
<?php if ($doc): ?>
  <link rel="canonical" href="<?= $e(rtrim(SITE_URL, '/') . '/' . $slug) ?>">
<?php else: ?>
  <meta name="robots" content="noindex">
<?php endif; ?>
  <meta name="theme-color" content="#0a0e17">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Lexend:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/store.css?v=202610100936">
  <link rel="stylesheet" href="css/pages.css?v=202610100936">
  <link rel="stylesheet" href="css/modern.css?v=202610100936">
  <link rel="stylesheet" href="css/design-system.css?v=202610100936">
</head>
<body>
  <div id="site-header"></div>
  <main class="container page-wrap" id="docs">
    <article class="article">
      <nav class="crumbs"><a href="index.html">Home</a><span class="sep">/</span><a href="documentation.html?type=doc">Docs</a></nav>
      <h1><?= $e($title) ?></h1>
<?php if ($doc): ?>
      <?php if ($updated): ?><p class="muted small">Updated <?= $e($updated) ?></p><?php endif; ?>
      <div class="prose" style="margin-top:20px"><?= $doc['content_html'] ?></div>
<?php else: ?>
      <div class="prose" style="margin-top:20px">
        <p><?= $status === 503 ? 'This page is temporarily unavailable. Please try again in a minute.' : 'We couldn’t find that page.' ?></p>
        <p>Email us at <a href="mailto:fivemdepot@gmail.com">fivemdepot@gmail.com</a>, or go back to the <a href="index.html">store</a>.</p>
      </div>
<?php endif; ?>
    </article>
  </main>
  <div id="site-footer"><footer class="footer"><div class="container">
    <div class="footer-grid">
      <div class="footer-brand"><a class="logo" href="index.html"><span class="logo-text">FiveMDepot</span></a>
        <p>Our own FiveM scripts, MLOs, vehicles, clothing and complete server packs for QBCore, ESX and QBox — sold as instant downloads and subscription plans.</p></div>
      <div><h4>Store</h4><ul><li><a href="category.html?c=all">All Products</a></li><li><a href="server-packs.html">Server Packs</a></li><li><a href="pricing">Plans &amp; Pricing</a></li></ul></div>
      <div><h4>Support</h4><ul><li><a href="contact">Contact us</a></li><li><a href="mailto:fivemdepot@gmail.com">fivemdepot@gmail.com</a></li></ul></div>
      <div><h4>Legal</h4><ul><li><a href="terms">Terms of Service</a></li><li><a href="privacy">Privacy Policy</a></li><li><a href="refunds">Refund Policy</a></li></ul></div>
    </div>
    <p class="small muted" style="margin:18px 0 0">Payments are processed by our online reseller Paddle.com, the Merchant of Record for all our orders.</p>
    <div class="footer-bottom"><span>© FiveMDepot · operated by Tanvir Anjum Neon. All rights reserved.</span><span>Not affiliated with Rockstar Games or Cfx.re.</span></div>
  </div></footer></div>
  <script src="js/store.js?v=202610100936"></script>
</body>
</html>
