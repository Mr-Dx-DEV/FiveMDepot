<?php
/**
 * Pricing page (pricing.html): what the browser needs to show localized prices and open Paddle checkout.
 * Only public values are returned — the server API key never leaves PHP.
 */
require_once __DIR__ . '/../../core/plans.php';

/**
 * Visitor's country from CDN / server geo headers, or null when unknown.
 * null means "don't send a country" — Paddle then detects it from the visitor's IP.
 */
function visitor_country(): ?string
{
  foreach (['HTTP_CF_IPCOUNTRY', 'HTTP_X_VERCEL_IP_COUNTRY', 'GEOIP_COUNTRY_CODE', 'HTTP_X_COUNTRY_CODE'] as $key) {
    $cc = strtoupper(trim((string)($_SERVER[$key] ?? '')));
    // XX = unknown, T1 = Tor (Cloudflare)
    if (preg_match('/^[A-Z]{2}$/', $cc) && $cc !== 'XX' && $cc !== 'T1') return $cc;
  }
  return null;
}

route('GET', 'pricing/config', function () {
  $user = current_user();
  ok([
    'environment' => paddle_environment(), // throws (500, logged) when unset — never defaults
    'client_token' => PADDLE_CLIENT_TOKEN,
    'country' => visitor_country(),
    'email' => $user['email'] ?? null,
    'paddle_customer_id' => paddle_customer_id_for($user),
    'trial_days' => PLAN_TRIAL_DAYS,
    'tiers' => plans_public(),
  ]);
});
