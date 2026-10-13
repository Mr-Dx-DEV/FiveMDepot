<?php
/**
 * Subscription (pricing page plans) for the signed-in buyer: current plan + Lemon Squeezy customer portal.
 * The subscription is always resolved server-side from the session — never taken from the client.
 */
require_once __DIR__ . '/../../core/subscriptions.php';
require_once __DIR__ . '/../../core/plans.php';

route('GET', 'account/subscription', function () {
  $u = require_user();
  $subs = user_subscriptions($u);
  foreach ($subs as &$s) {
    $s['has_access'] = subscription_grants_access($s);
    $plan = plan_for_variant((string)$s['variant_id']);
    $s['plan_name'] = $plan ? $plan['name'] . ' · ' . ($plan['interval'] === 'year' ? 'Yearly' : 'Monthly') : 'Subscription';
  }
  ok(['subscriptions' => $subs, 'pricing_url' => 'pricing']);
});

// Customer portal (update card, cancel, invoices): a fresh signed URL from the subscription (valid 24 hours)
route('POST', 'account/subscription/portal', function () {
  $u = require_user();
  rate_limit('billing_portal', 10, 300);
  $subs = user_subscriptions($u);
  if (!$subs) fail(404, 'You have no subscription yet.');
  if (!ls_configured()) {
    error_log('[lemonsqueezy] not configured: customer portal unavailable');
    fail(503, 'Subscription management is unavailable right now. Please contact support.');
  }
  [$status, $res] = ls_api('GET', 'subscriptions/' . rawurlencode((string)$subs[0]['subscription_id']));
  $url = (string)($res['data']['attributes']['urls']['customer_portal'] ?? '');
  if ($status !== 200 || $url === '') {
    error_log('[lemonsqueezy] portal url failed: ' . $status . ' ' . json_encode($res['errors'] ?? $res));
    fail(502, 'Could not open subscription management. Please try again in a minute.');
  }
  ok(['url' => $url]);
});
