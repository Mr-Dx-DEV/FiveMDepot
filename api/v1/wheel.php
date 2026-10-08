<?php
/**
 * Daily lucky wheel.
 *
 *   GET  wheel/status   prizes on the wheel, whether the visitor is signed in, and their current spin (if any)
 *   POST wheel/spin     signed-in users only; one spin per 24 hours
 *
 * Every spin creates a personal promo (code SPIN-XXXXXXXX, single use, expires after 48 hours)
 * in the existing `promos` table. created_by = the winner, and checkout only accepts a SPIN- code
 * from that account (see price_cart in account.php). The server picks the prize, never the browser.
 */

const WHEEL_PREFIX = 'SPIN-';
const WHEEL_COOLDOWN_HOURS = 24;
const WHEEL_CODE_HOURS = 48;
/** Percent off => weight (chance relative to the others). */
const WHEEL_PRIZES = [10 => 50, 15 => 30, 20 => 15, 25 => 5];

function wheel_enabled(): bool
{
  return setting('wheel_enabled', '1') !== '0';
}

/** The user's spin from the last 24 hours, or null. */
function wheel_last_spin(string $userId): ?array
{
  $row = Db::one(
    "SELECT p.id, p.code, p.value, p.expires_at, p.created_at,
            DATE_ADD(p.created_at, INTERVAL " . WHEEL_COOLDOWN_HOURS . " HOUR) AS next_at,
            (p.uses_count > 0 OR p.expires_at <= NOW() OR EXISTS (SELECT 1 FROM orders o WHERE o.promo_id = p.id AND o.status NOT IN ('REJECTED', 'CANCELLED'))) AS used
       FROM promos p
      WHERE p.created_by = ? AND p.code LIKE ? AND p.created_at > DATE_SUB(NOW(), INTERVAL " . WHEEL_COOLDOWN_HOURS . " HOUR)
      ORDER BY p.created_at DESC LIMIT 1",
    [$userId, WHEEL_PREFIX . '%']
  );
  return $row ? wheel_spin_out($row) : null;
}

function wheel_spin_out(array $row): array
{
  $value = (int)round((float)$row['value']);
  return [
    'code' => $row['code'],
    'value' => $value,
    'label' => $value . '% off',
    'expires_at' => wheel_iso($row['expires_at']),
    'next_at' => wheel_iso($row['next_at']),
    'used' => !empty($row['used']),
  ];
}

/** DB datetime -> ISO 8601 with the database's UTC offset, so browsers count down correctly. */
function wheel_iso(string $dbTime): string
{
  static $offset = null;
  if ($offset === null) $offset = (string)Db::value("SELECT TIME_FORMAT(TIMEDIFF(NOW(), UTC_TIMESTAMP()), '%H:%i')");
  $sign = strpos($offset, '-') === 0 ? '-' : '+';
  $hm = ltrim($offset, '-+');
  if (strlen($hm) === 4) $hm = '0' . $hm;
  return str_replace(' ', 'T', $dbTime) . $sign . $hm;
}

function wheel_pick(): int
{
  $roll = random_int(1, array_sum(WHEEL_PRIZES));
  foreach (WHEEL_PRIZES as $percent => $weight) {
    $roll -= $weight;
    if ($roll <= 0) return $percent;
  }
  return array_key_first(WHEEL_PRIZES);
}

function wheel_new_code(): string
{
  $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O or 1/I
  do {
    $code = WHEEL_PREFIX;
    for ($i = 0; $i < 8; $i++) $code .= $alphabet[random_int(0, strlen($alphabet) - 1)];
  } while (Db::value("SELECT COUNT(*) FROM promos WHERE code = ?", [$code]));
  return $code;
}

route('GET', 'wheel/status', function () {
  $u = current_user();
  ok([
    'enabled' => wheel_enabled(),
    'prizes' => array_keys(WHEEL_PRIZES),
    'signed_in' => (bool)$u,
    'spin' => $u ? wheel_last_spin($u['id']) : null,
    'cooldown_hours' => WHEEL_COOLDOWN_HOURS,
    'code_hours' => WHEEL_CODE_HOURS,
  ]);
});

route('POST', 'wheel/spin', function () {
  if (!wheel_enabled()) fail(403, 'The lucky wheel is not available right now');
  $u = require_user();
  rate_limit('wheel', 5, 600);

  $pdo = Db::pdo();
  $pdo->beginTransaction();
  try {
    // Lock the user row so two spins at the same moment cannot both pass the 24-hour check
    Db::one("SELECT id FROM users WHERE id = ? FOR UPDATE", [$u['id']]);
    if ($last = wheel_last_spin($u['id'])) {
      $pdo->rollBack();
      fail(429, 'You already spun today. Your next spin unlocks in 24 hours.', ['spin' => $last]);
    }
    $percent = wheel_pick();
    $id = uuid();
    $pdo->prepare(
      "INSERT INTO promos (id, code, type, value, min_amount, max_uses, uses_count, expires_at, is_active, created_by)
       VALUES (?, ?, 'percent', ?, 0, 1, 0, DATE_ADD(NOW(), INTERVAL " . WHEEL_CODE_HOURS . " HOUR), 1, ?)"
    )->execute([$id, wheel_new_code(), $percent, $u['id']]);
    $pdo->commit();
  } catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    throw $e;
  }
  ok(['spin' => wheel_last_spin($u['id'])]);
});
