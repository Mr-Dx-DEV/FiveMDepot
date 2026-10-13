# Lemon Squeezy setup (payments)

Lemon Squeezy is the only payment processor and the **Merchant of Record**: it charges the buyer, adds
sales tax / VAT, sends the receipt and handles chargebacks. You add products only in **Admin → Products** —
store items are never created in Lemon Squeezy one by one.

How it works:

- **Store items** (cart → checkout): the site creates a Lemon Squeezy checkout for the single product
  **"FiveMDepot order"**, with the order's exact price and item names. The webhook delivers the download.
- **Plans** (`/pricing`): Starter / Pro / Advanced are real subscription products in Lemon Squeezy
  (Monthly + Yearly variants, 7-day trial). Their variant IDs go in `core/plans.php`.

## 1. Database

phpMyAdmin → `fivemdepot` → SQL → paste `migrations/019_lemonsqueezy.sql` → Go. The last query must return `0`.

## 2. Products in Lemon Squeezy (do this in **Test mode** first)

1. **Products → New product → "FiveMDepot order"**
   - Pricing: *Single payment*, any price (e.g. $1 — the site always sends the real price).
   - Tax category: *Software / digital download*. Publish it.
   - Open the product → its variant → copy the **variant ID** (number in the URL / "Copy ID").
2. **Three subscription products: Starter, Pro, Advanced**
   - Pricing: *Subscription*. Add two variants: **Monthly** and **Yearly**.
   - Prices (must match `core/plans.php` → `price`): Starter $10 / $100, Pro $40 / $400, Advanced $120 / $1,200.
   - Turn on a **7-day free trial** for each variant.
   - Copy all **six variant IDs**.

## 3. API key, store and webhook

1. **Settings → API → New API key** (in test mode this is a test key). Copy it.
2. **Settings → Stores**: copy your **store ID** (a number).
3. **Settings → Webhooks → +**
   - URL: `https://fivemdepot.com/api/pay/lemonsqueezy-webhook.php`
   - Signing secret: type a long random string (keep a copy).
   - Events: `order_created`, `order_refunded`, `subscription_created`, `subscription_updated`,
     `subscription_cancelled`, `subscription_resumed`, `subscription_expired`, `subscription_paused`,
     `subscription_unpaused`.

## 4. Config

`config.local.php` (on the server, next to `config.php`):

```php
defined('LEMONSQUEEZY_TEST_MODE') || define('LEMONSQUEEZY_TEST_MODE', true);
defined('LEMONSQUEEZY_API_KEY') || define('LEMONSQUEEZY_API_KEY', 'paste-api-key');
defined('LEMONSQUEEZY_STORE_ID') || define('LEMONSQUEEZY_STORE_ID', '12345');
defined('LEMONSQUEEZY_WEBHOOK_SECRET') || define('LEMONSQUEEZY_WEBHOOK_SECRET', 'the-signing-secret');
defined('LEMONSQUEEZY_ORDER_VARIANT_ID') || define('LEMONSQUEEZY_ORDER_VARIANT_ID', '123456');
```

`core/plans.php`: put the six variant IDs in each plan's `'test'` set (`'month'` and `'year'`).

*Admin → Settings → Payments (Lemon Squeezy)* shows whether every key is set.

## 5. Test

While `LEMONSQUEEZY_TEST_MODE` is `true`, **only admins** can pay (test cards are fake). Signed in as admin:

- Buy a product with card `4242 4242 4242 4242`, any future date, any CVC → it appears in *My library*.
- Subscribe to a plan on `/pricing` → *My account → Subscription* shows the free trial; plan downloads unlock.
- *Manage subscription* opens the Lemon Squeezy customer portal.
- Refund the test order in Lemon Squeezy → the order shows *Refunded* and the download is removed.

## 6. Go live

1. Get the store **activated** by Lemon Squeezy (they review the store first).
2. In **live mode**: create the same products (or use *Copy to live mode*), a **live** API key and the webhook again.
3. Fill the live variant IDs in `core/plans.php` (`'live'` sets), put the live key / IDs in
   `config.local.php` and set `LEMONSQUEEZY_TEST_MODE` to `false`.

Refunds: buyers use *Request refund* on their order (or email you); you issue the refund in
Lemon Squeezy → Orders. The webhook then ends the licence automatically.
