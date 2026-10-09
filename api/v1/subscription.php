<?php
/**
 * Subscription (pricing page plans) for the signed-in buyer: current plan + Paddle customer portal.
 * The Paddle customer is always resolved server-side from the session — never taken from the client.
 */
require_once __DIR__ . '/../../core/subscriptions.php';

route('GET', 'account/subscription', function () {
  $u = require_user();
  $subs = user_subscriptions($u);
  foreach ($subs as &$s) $s['has_access'] = subscription_grants_access($s);
  ok(['subscriptions' => $subs, 'pricing_url' => 'pricing']);
});

// Mint a Paddle customer portal session (update card, cancel, invoices) and return its URL
route('POST', 'account/subscription/portal', function () {
  $u = require_user();
  rate_limit('billing_portal', 10, 300);
  $subs = user_subscriptions($u);
  if (!$subs) fail(404, 'You have no subscription yet.');
  if (!defined('PADDLE_API_KEY') || PADDLE_API_KEY === '') {
    error_log('[paddle] PADDLE_API_KEY missing: customer portal unavailable');
    fail(503, 'Subscription management is unavailable right now. Please contact support.');
  }
  $customerId = $subs[0]['customer_id'];
  $subIds = array_values(array_map(fn($s) => $s['subscription_id'],
    array_filter($subs, fn($s) => $s['customer_id'] === $customerId && $s['status'] !== 'canceled')));
  [$status, $res] = http_request('POST', paddle_base() . '/customers/' . rawurlencode($customerId) . '/portal-sessions', [],
    ['Authorization: Bearer ' . PADDLE_API_KEY, 'Content-Type: application/json', 'Paddle-Version: 1'],
    json_encode(['subscription_ids' => $subIds]));
  $url = $res['data']['urls']['general']['overview'] ?? '';
  if (($status !== 201 && $status !== 200) || $url === '') {
    error_log('[paddle] portal session failed: ' . $status . ' ' . json_encode($res['error'] ?? $res));
    fail(502, 'Could not open subscription management. Please try again in a minute.');
  }
  ok(['url' => $url]);
});
