<?php
/**
 * Subscriptions (pricing page plans): mirror of Lemon Squeezy customers and subscriptions, filled only from
 * verified webhooks (api/pay/lemonsqueezy-webhook.php), plus the access rule and the customer portal.
 * Tables: billing_customers + billing_subscriptions (migrations/019_lemonsqueezy.sql).
 */
require_once __DIR__ . '/gateways.php';

/**
 * Statuses that grant paid access. past_due = Lemon Squeezy is still retrying the card (grace period).
 * 'cancelled' also grants access until ends_at (the paid period runs out) — see subscription_grants_access().
 */
const SUB_ACCESS_STATUSES = ['on_trial', 'active', 'past_due'];

/** ISO 8601 timestamp → MySQL DATETIME(3) in UTC, or null. */
function provider_time(?string $ts): ?string
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
 * Upsert a customer. Idempotent; an older payload never overwrites a newer one.
 * $userId: the site account that started the checkout (custom data), else matched by email.
 */
function sub_upsert_customer(string $customerId, string $email, ?string $userId, ?string $updatedAt): void
{
  if ($customerId === '' || $email === '') return;
  $userId = $userId ?: user_id_for_email($email);
  Db::pdo()->prepare(
    "INSERT INTO billing_customers (customer_id, user_id, email, provider_updated_at) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       user_id = COALESCE(VALUES(user_id), user_id),
       email = IF(provider_updated_at IS NULL OR VALUES(provider_updated_at) >= provider_updated_at, VALUES(email), email),
       provider_updated_at = GREATEST(COALESCE(provider_updated_at, VALUES(provider_updated_at)), VALUES(provider_updated_at))"
  )->execute([$customerId, $userId, $email, provider_time($updatedAt)]);
  if ($userId) {
    Db::pdo()->prepare("UPDATE billing_subscriptions SET user_id = ? WHERE customer_id = ? AND user_id IS NULL")->execute([$userId, $customerId]);
  }
}

/**
 * Upsert a subscription from a subscription_* webhook ($data = the JSON:API resource, $custom = meta.custom_data).
 * Idempotent and safe against out-of-order delivery.
 */
function sub_upsert_subscription(array $data, array $custom): void
{
  $id = (string)($data['id'] ?? '');
  $a = $data['attributes'] ?? [];
  $customerId = (string)($a['customer_id'] ?? '');
  if ($id === '' || $customerId === '') return;
  $userId = isset($custom['user_id']) && Db::one("SELECT id FROM users WHERE id = ?", [(string)$custom['user_id']]) ? (string)$custom['user_id'] : null;
  sub_upsert_customer($customerId, (string)($a['user_email'] ?? ''), $userId, $a['updated_at'] ?? null);

  $status = (string)($a['status'] ?? '');
  $c = Db::one("SELECT user_id FROM billing_customers WHERE customer_id = ?", [$customerId]);
  $row = [
    'subscription_id' => $id,
    'customer_id' => $customerId,
    'user_id' => $c['user_id'] ?? null,
    'status' => $status,
    'variant_id' => (string)($a['variant_id'] ?? ''),
    'product_id' => (string)($a['product_id'] ?? ''),
    'current_period_end' => provider_time($status === 'on_trial' ? ($a['trial_ends_at'] ?? null) : ($a['renews_at'] ?? null)),
    'scheduled_change_action' => $status === 'cancelled' ? 'cancel' : null,
    'scheduled_change_at' => provider_time($a['ends_at'] ?? null),
    'provider_updated_at' => provider_time($a['updated_at'] ?? null),
  ];
  // Every column only changes when this payload is at least as new as the stored one
  $newer = 'provider_updated_at IS NULL OR VALUES(provider_updated_at) >= provider_updated_at';
  $sets = [];
  foreach (array_keys($row) as $col) {
    if ($col === 'subscription_id' || $col === 'provider_updated_at') continue;
    $sets[] = $col === 'user_id'
      ? "user_id = COALESCE(user_id, VALUES(user_id))"
      : "$col = IF($newer, VALUES($col), $col)";
  }
  $sets[] = 'provider_updated_at = GREATEST(COALESCE(provider_updated_at, VALUES(provider_updated_at)), VALUES(provider_updated_at))';
  $cols = implode(', ', array_keys($row));
  $marks = implode(', ', array_fill(0, count($row), '?'));
  Db::pdo()->prepare("INSERT INTO billing_subscriptions ($cols) VALUES ($marks) ON DUPLICATE KEY UPDATE " . implode(', ', $sets))
    ->execute(array_values($row));
}

/** Route a verified webhook event. Returns true when it was a subscription event (handled here). */
function sub_handle_event(string $type, array $data, array $custom): bool
{
  // subscription_payment_* events carry an invoice, not the subscription: the subscription_updated
  // event that follows carries the new state
  if (strpos($type, 'subscription_payment_') === 0) return true;
  if (strpos($type, 'subscription_') === 0) { sub_upsert_subscription($data, $custom); return true; }
  return false;
}

/**
 * The user's subscriptions, newest first. Matched by account link, or by email for customers
 * who bought before signing up with the same address.
 */
function user_subscriptions(array $user): array
{
  return Db::all(
    "SELECT s.subscription_id, s.customer_id, s.status, s.variant_id, s.product_id, s.current_period_end,
            s.scheduled_change_action, s.scheduled_change_at, s.created_at
       FROM billing_subscriptions s JOIN billing_customers c ON c.customer_id = s.customer_id
      WHERE s.user_id = ? OR c.user_id = ? OR LOWER(c.email) = LOWER(?)
      ORDER BY s.created_at DESC", [$user['id'], $user['id'], $user['email']]);
}

/**
 * Does this subscription grant paid access right now?
 * on_trial / active / past_due → yes. cancelled → yes until ends_at. paused / unpaid / expired → no.
 */
function subscription_grants_access(array $sub): bool
{
  $status = $sub['status'] ?? '';
  if (in_array($status, SUB_ACCESS_STATUSES, true)) return true;
  if ($status === 'cancelled' && !empty($sub['scheduled_change_at'])) {
    return strtotime($sub['scheduled_change_at'] . ' UTC') > time();
  }
  return false;
}

/** The user's access-granting subscription (newest), or null. Use this to unlock plan benefits. */
function user_active_subscription(array $user): ?array
{
  foreach (user_subscriptions($user) as $s) if (subscription_grants_access($s)) return $s;
  return null;
}
