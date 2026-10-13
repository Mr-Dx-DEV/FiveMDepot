<?php
/**
 * Pricing page (pricing.html): the plans to show, and a Lemon Squeezy checkout for the chosen plan.
 * Only public values are returned — the API key never leaves PHP.
 */
require_once __DIR__ . '/../../core/plans.php';
require_once __DIR__ . '/../../core/subscriptions.php';

route('GET', 'pricing/config', function () {
  $user = current_user();
  ok([
    'ready' => plans_ready(),
    'test_mode' => ls_test_mode(),
    'signed_in' => $user !== null,
    'trial_days' => PLAN_TRIAL_DAYS,
    'currency' => 'USD',
    'tiers' => plans_public(),
  ]);
});

// Checkout for a plan: signed-in only, so the subscription is linked to the account that pays
route('POST', 'pricing/checkout', function () {
  $u = require_user();
  rate_limit('plan_checkout', 10, 600);
  $plan = str_in('plan', 30);
  $interval = str_in('interval', 10) === 'year' ? 'year' : 'month';
  if (!isset(PLANS[$plan])) fail(422, 'Choose a plan');
  if (!plans_ready()) fail(503, 'Plans can’t be bought right now. Please try again later.');
  if (ls_test_mode() && $u['role'] !== 'ADMIN') fail(503, 'Plans can’t be bought right now. Please try again later.');
  $active = user_active_subscription($u);
  if ($active) fail(409, 'You already have an active plan. Manage it in My account → Subscription.');
  $checkout = ls_create_checkout(plan_variant($plan, $interval), [
    'email' => $u['email'], 'user_name' => $u['name'] ?? '',
    'custom' => ['user_id' => $u['id'], 'plan' => $plan],
    'redirect_url' => site_root_url() . 'welcome',
    'expires_in' => 3600,
  ]);
  ok(['url' => $checkout['url'], 'success_url' => site_root_url() . 'welcome']);
});
