<?php
/**
 * Subscription plans (pricing page). EDIT PLANS HERE — copy, features, what each plan unlocks, and the
 * Paddle IDs for both environments. The active set follows PADDLE_ENVIRONMENT, so switching sandbox →
 * production is a config change only; no code edit or redeploy of IDs.
 *
 * 'categories': top-level category slugs whose products a subscriber can download ('*' = every category).
 * A product counts as in a category when it has one of that category's tags (see core/catalog.php).
 */
require_once __DIR__ . '/gateways.php';
require_once __DIR__ . '/catalog.php';

const PLAN_TRIAL_DAYS = 7;

const PLANS = [
  'starter' => [
    'name' => 'Starter',
    'description' => 'Every FiveM script in the store.',
    'features' => ['Download all Scripts', 'New scripts as soon as they’re released', 'Updates while subscribed', 'Cancel anytime'],
    'categories' => ['scripts'],
    'featured' => false,
    'sandbox' => ['product' => 'pro_01m4gznzmwtgbp2r22ywqg4rdc', 'month' => 'pri_01m4gznzzdq34sz7j6ds9y3429', 'year' => 'pri_01m4gzp15saagb53s9wrm8c9ft'],
    'production' => ['product' => 'pro_01m4h3ktab7bv2bt0y4tkgpz63', 'month' => 'pri_01m4h3ktqj753qwvzhb0k9g1b9', 'year' => 'pri_01m4h3kv607027pfdf20wezrp0'],
  ],
  'pro' => [
    'name' => 'Pro',
    'description' => 'Scripts plus vehicles, clothes and maps.',
    'features' => ['Everything in Starter', 'All Vehicles', 'All Clothes', 'All Maps & MLOs'],
    'categories' => ['scripts', 'vehicles', 'clothing', 'mlos-maps', 'maps'],
    'featured' => true,
    'sandbox' => ['product' => 'pro_01m4gzp1hafk5nx1kb5bpj8938', 'month' => 'pri_01m4gzp1vv1f9xjhzmecd0zscm', 'year' => 'pri_01m4gzp25pthjybnh1djmn1we8'],
    'production' => ['product' => 'pro_01m4h3kvmnjd4q8sjccc643w61', 'month' => 'pri_01m4h3kw1sawmfshjej0a0885t', 'year' => 'pri_01m4h3kwhjwhz78mnnw7cgn91r'],
  ],
  'advanced' => [
    'name' => 'Advanced',
    'description' => 'The whole store, including server packs.',
    'features' => ['Everything in Pro', 'Complete Server Packs', 'UI Packs and every other category', 'Every new release, all categories'],
    'categories' => ['*'],
    'featured' => false,
    'sandbox' => ['product' => 'pro_01m4gzp2h2kcphyqxe4arva4gg', 'month' => 'pri_01m4gzp2t3k0az9rf06nv13g84', 'year' => 'pri_01m4gzp33cc86y6vhnkfztm1jx'],
    'production' => ['product' => 'pro_01m4h3kx079cf9f5as48yc3d5e', 'month' => 'pri_01m4h3kxdywn03c7wx0k5j46x2', 'year' => 'pri_01m4h3kxzkrc68f6ysprrdm120'],
  ],
];

/** Plans for the current environment, as the pricing page needs them. Throws if live IDs are missing. */
function plans_public(): array
{
  $env = paddle_environment();
  $out = [];
  foreach (PLANS as $key => $p) {
    $ids = $p[$env];
    if ($ids['month'] === '' || $ids['year'] === '') throw new RuntimeException("core/plans.php: $env price IDs missing for plan $key");
    $out[] = ['key' => $key, 'name' => $p['name'], 'description' => $p['description'], 'features' => $p['features'],
              'featured' => $p['featured'], 'priceId' => ['month' => $ids['month'], 'year' => $ids['year']]];
  }
  return $out;
}

/** Plan key + billing interval for a Paddle price ID (either environment), or null. */
function plan_for_price(string $priceId): ?array
{
  foreach (PLANS as $key => $p) {
    foreach (['sandbox', 'production'] as $env) {
      if ($p[$env]['month'] === $priceId) return ['key' => $key, 'name' => $p['name'], 'interval' => 'month'];
      if ($p[$env]['year'] === $priceId) return ['key' => $key, 'name' => $p['name'], 'interval' => 'year'];
    }
  }
  return null;
}

/** Top-level category slugs a product belongs to (via its tags). */
function product_root_category_slugs(string $productId): array
{
  $tagIds = array_column(Db::all("SELECT tag_id FROM product_tags WHERE product_id = ?", [$productId]), 'tag_id');
  if (!$tagIds) return [];
  $slugs = [];
  foreach (categories_for_tags($tagIds) as $c) {
    $path = cat_path($c['id']);
    if ($path) $slugs[$path[0]['slug']] = true;
  }
  return array_keys($slugs);
}

/** Does this plan unlock this product? */
function plan_covers_product(string $planKey, string $productId): bool
{
  $cats = PLANS[$planKey]['categories'] ?? [];
  if (in_array('*', $cats, true)) return true;
  return (bool)array_intersect($cats, product_root_category_slugs($productId));
}

/** The plan key that currently grants this user access (active / trialing / past_due), or null. */
function user_plan_key(array $user): ?string
{
  require_once __DIR__ . '/subscriptions.php';
  static $cache = [];
  if (array_key_exists($user['id'], $cache)) return $cache[$user['id']];
  // Sandbox subscriptions are paid with test cards: they must never unlock real downloads for the public.
  if (paddle_sandbox() && ($user['role'] ?? '') !== 'ADMIN') return $cache[$user['id']] = null;
  $sub = user_active_subscription($user);
  $plan = $sub ? plan_for_price((string)$sub['price_id']) : null;
  return $cache[$user['id']] = $plan['key'] ?? null;
}

/** Can this user download this published product through their subscription? */
function user_plan_covers(array $user, array $product): bool
{
  if (($product['status'] ?? '') !== 'PUBLISHED') return false;
  $key = user_plan_key($user);
  return $key !== null && plan_covers_product($key, (string)$product['id']);
}
