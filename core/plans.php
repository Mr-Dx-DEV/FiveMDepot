<?php
/**
 * Subscription plans (pricing page). EDIT PLANS HERE — copy, features, prices shown on the page, what each
 * plan unlocks, and the Lemon Squeezy variant IDs (monthly / yearly) for test mode and live mode.
 * The active set follows LEMONSQUEEZY_TEST_MODE, so going live is a config change only.
 * Create each plan in Lemon Squeezy as a subscription product with two variants (Monthly, Yearly) and a
 * 7-day free trial; the price there must match 'price' here (Lemon Squeezy adds tax at checkout).
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
    'price' => ['month' => 10, 'year' => 100], // USD
    'test' => ['month' => '', 'year' => ''],   // Lemon Squeezy variant IDs (test mode)
    'live' => ['month' => '', 'year' => ''],   // Lemon Squeezy variant IDs (live mode)
  ],
  'pro' => [
    'name' => 'Pro',
    'description' => 'Scripts plus vehicles, clothes and maps.',
    'features' => ['Everything in Starter', 'All Vehicles', 'All Clothes', 'All Maps & MLOs'],
    'categories' => ['scripts', 'vehicles', 'clothing', 'mlos-maps', 'maps'],
    'featured' => true,
    'price' => ['month' => 40, 'year' => 400],
    'test' => ['month' => '', 'year' => ''],
    'live' => ['month' => '', 'year' => ''],
  ],
  'advanced' => [
    'name' => 'Advanced',
    'description' => 'The whole store, including server packs.',
    'features' => ['Everything in Pro', 'Complete Server Packs', 'UI Packs and every other category', 'Every new release, all categories'],
    'categories' => ['*'],
    'featured' => false,
    'price' => ['month' => 120, 'year' => 1200],
    'test' => ['month' => '', 'year' => ''],
    'live' => ['month' => '', 'year' => ''],
  ],
];

function plans_mode(): string
{
  return ls_test_mode() ? 'test' : 'live';
}

/** Can plans be bought right now? (keys configured and every variant ID filled in for this mode) */
function plans_ready(): bool
{
  if (!ls_configured() || setting('pay_lemonsqueezy_enabled', '1') !== '1') return false;
  foreach (PLANS as $p) if ($p[plans_mode()]['month'] === '' || $p[plans_mode()]['year'] === '') return false;
  return true;
}

/** Plans as the pricing page needs them (no variant IDs: checkouts are created on the server). */
function plans_public(): array
{
  $out = [];
  foreach (PLANS as $key => $p) {
    $out[] = ['key' => $key, 'name' => $p['name'], 'description' => $p['description'], 'features' => $p['features'],
              'featured' => $p['featured'], 'price' => $p['price']];
  }
  return $out;
}

/** Lemon Squeezy variant ID for a plan + 'month' | 'year' in the current mode, or null. */
function plan_variant(string $planKey, string $interval): ?string
{
  $id = PLANS[$planKey][plans_mode()][$interval] ?? '';
  return $id !== '' ? $id : null;
}

/** Plan key + billing interval for a Lemon Squeezy variant ID (either mode), or null. */
function plan_for_variant(string $variantId): ?array
{
  if ($variantId === '') return null;
  foreach (PLANS as $key => $p) {
    foreach (['test', 'live'] as $mode) {
      if ($p[$mode]['month'] === $variantId) return ['key' => $key, 'name' => $p['name'], 'interval' => 'month'];
      if ($p[$mode]['year'] === $variantId) return ['key' => $key, 'name' => $p['name'], 'interval' => 'year'];
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
  // Test-mode subscriptions are paid with test cards: they must never unlock real downloads for the public.
  if (ls_test_mode() && ($user['role'] ?? '') !== 'ADMIN') return $cache[$user['id']] = null;
  $sub = user_active_subscription($user);
  $plan = $sub ? plan_for_variant((string)$sub['variant_id']) : null;
  return $cache[$user['id']] = $plan['key'] ?? null;
}

/** Can this user download this published product through their subscription? */
function user_plan_covers(array $user, array $product): bool
{
  if (($product['status'] ?? '') !== 'PUBLISHED') return false;
  $key = user_plan_key($user);
  return $key !== null && plan_covers_product($key, (string)$product['id']);
}
