<?php
/**
 * Subscriptions (pricing page plans): mirror of Paddle customers and subscriptions, filled only from
 * verified webhooks (api/pay/paddle-webhook.php), plus the access rule and the customer portal.
 * Tables: migrations/014_subscriptions.sql + 015_subscription_order.sql.
 */
require_once __DIR__ . '/gateways.php';

/** Statuses that grant paid access. past_due = Paddle is still retrying the card (grace period). */
const SUB_ACCESS_STATUSES = ['active', 'trialing', 'past_due'];

/** Paddle RFC 3339 timestamp → MySQL DATETIME(3) in UTC, or null. */
function paddle_time(?string $ts): ?string
{
  if (!$ts) return null;
  try {
    return (new DateTimeImmutable($ts))->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s.v');
  } catch (Throwable $e) {
    return null;
  }
}

/** Site account for an email (case-insensitive), or null. */
function user_id_for_email(string $email): ?string
{
  if ($email === '') return null;
  $u = Db::one("SELECT id FROM users WHERE LOWER(email) = LOWER(?)", [$email]);
  return $u['id'] ?? null;
}

/**
 * Upsert a customer from a customer.* event (or an API fetch). Idempotent; an older payload never
 * overwrites a newer one. Also links that customer's subscriptions to the matching site account.
 */
function sub_upsert_customer(array $c): void
{
  $id = (string)($c['id'] ?? '');
  $email = (string)($c['email'] ?? '');
  if (strpos($id, 'ctm_') !== 0 || $email === '') return;
  $userId = user_id_for_email($email);
  Db::pdo()->prepare(
    "INSERT INTO paddle_customers (customer_id, user_id, email, paddle_updated_at) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       user_id = IF(paddle_updated_at IS NULL OR VALUES(paddle_updated_at) >= paddle_updated_at, VALUES(user_id), user_id),
       email = IF(paddle_updated_at IS NULL OR VALUES(paddle_updated_at) >= paddle_updated_at, VALUES(email), email),
       paddle_updated_at = GREATEST(COALESCE(paddle_updated_at, VALUES(paddle_updated_at)), VALUES(paddle_updated_at))"
  )->execute([$id, $userId, $email, paddle_time($c['updated_at'] ?? null)]);
  if ($userId) {
    Db::pdo()->prepare("UPDATE subscriptions SET user_id = ? WHERE customer_id = ? AND user_id IS NULL")->execute([$userId, $id]);
  }
}

/** Make sure we know a customer's email (subscription events don't carry it). Uses the API key. */
function sub_ensure_customer(string $customerId): void
{
  if (Db::one("SELECT customer_id FROM paddle_customers WHERE customer_id = ?", [$customerId])) return;
  if (!defined('PADDLE_API_KEY') || PADDLE_API_KEY === '') return; // customer.created will fill it in
  [$status, $res] = http_request('GET', paddle_base() . '/customers/' . rawurlencode($customerId), [],
    ['Authorization: Bearer ' . PADDLE_API_KEY, 'Paddle-Version: 1']);
  if ($status === 200 && !empty($res['data'])) sub_upsert_customer($res['data']);
  else error_log("[paddle] could not fetch customer $customerId: $status");
}

/** Upsert a subscription from a subscription.* event. Idempotent and safe against out-of-order delivery. */
function sub_upsert_subscription(array $s): void
{
  $id = (string)($s['id'] ?? '');
  $customerId = (string)($s['customer_id'] ?? '');
  if (strpos($id, 'sub_') !== 0 || strpos($customerId, 'ctm_') !== 0) return;
  sub_ensure_customer($customerId);

  $price = $s['items'][0]['price'] ?? [];
  $change = $s['scheduled_change'] ?? null;
  $c = Db::one("SELECT user_id FROM paddle_customers WHERE customer_id = ?", [$customerId]);
  $row = [
    'subscription_id' => $id,
    'customer_id' => $customerId,
    'user_id' => $c['user_id'] ?? null,
    'status' => (string)($s['status'] ?? ''),
    'price_id' => (string)($price['id'] ?? ''),
    'product_id' => (string)($price['product_id'] ?? ''),
    'current_period_end' => paddle_time($s['current_billing_period']['ends_at'] ?? null),
    'scheduled_change_action' => $change['action'] ?? null,
    'scheduled_change_at' => paddle_time($change['effective_at'] ?? null),
    'paddle_updated_at' => paddle_time($s['updated_at'] ?? null),
  ];
  // Every column only changes when this payload is at least as new as the stored one
  $newer = 'paddle_updated_at IS NULL OR VALUES(paddle_updated_at) >= paddle_updated_at';
  $sets = [];
  foreach (array_keys($row) as $col) {
    if ($col === 'subscription_id' || $col === 'paddle_updated_at') continue;
    $sets[] = $col === 'user_id'
      ? "user_id = COALESCE(user_id, VALUES(user_id))"
      : "$col = IF($newer, VALUES($col), $col)";
  }
  $sets[] = 'paddle_updated_at = GREATEST(COALESCE(paddle_updated_at, VALUES(paddle_updated_at)), VALUES(paddle_updated_at))';
  $cols = implode(', ', array_keys($row));
  $marks = implode(', ', array_fill(0, count($row), '?'));
  Db::pdo()->prepare("INSERT INTO subscriptions ($cols) VALUES ($marks) ON DUPLICATE KEY UPDATE " . implode(', ', $sets))
    ->execute(array_values($row));
}

/** Route a verified webhook event. Returns true when it was a subscription/customer event (handled here). */
function sub_handle_event(string $type, array $data): bool
{
  if (strpos($type, 'customer.') === 0) { sub_upsert_customer($data); return true; }
  if (strpos($type, 'subscription.') === 0) { sub_upsert_subscription($data); return true; }
  return false;
}

/**
 * The user's subscriptions, newest first. Matched by account link, or by email for customers
 * who bought before signing up with the same address.
 */
function user_subscriptions(array $user): array
{
  return Db::all(
    "SELECT s.subscription_id, s.customer_id, s.status, s.price_id, s.product_id, s.current_period_end,
            s.scheduled_change_action, s.scheduled_change_at, s.created_at
       FROM subscriptions s JOIN paddle_customers c ON c.customer_id = s.customer_id
      WHERE s.user_id = ? OR c.user_id = ? OR LOWER(c.email) = LOWER(?)
      ORDER BY s.created_at DESC", [$user['id'], $user['id'], $user['email']]);
}

/**
 * Does this subscription grant paid access right now?
 * active / trialing / past_due → yes. paused / canceled → no.
 * A scheduled cancel or pause does NOT end access early — only the status change does.
 */
function subscription_grants_access(array $sub): bool
{
  return in_array($sub['status'] ?? '', SUB_ACCESS_STATUSES, true);
}

/** The user's access-granting subscription (newest), or null. Use this to unlock plan benefits. */
function user_active_subscription(array $user): ?array
{
  foreach (user_subscriptions($user) as $s) if (subscription_grants_access($s)) return $s;
  return null;
}
