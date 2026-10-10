# Deploying FiveMDepot (Plesk)

1. **Back up** the database (phpMyAdmin → Export) and the current site files.
2. **Database** — phpMyAdmin → select the `fivemdepot` database → Import, in this order:
   1. `migrations/001_store_rebuild.sql` (categories tree, tags, server packs, homepage, FAQ)
   2. `migrations/002_admin.sql` (admin panel fields, settings)
   3. `migrations/003_content.sql` (starter blog posts, tutorials, tools, docs and the
      Terms / Privacy / Refund policy pages — review the legal pages in Admin → Articles)
   4. `migrations/004_home.sql` (homepage: customer reviews + Discord community sections)
   5. `migrations/005_payments.sql` (international payments: Stripe, crypto, SSLCommerz)
   6. `migrations/006_brand.sql` (crimson brand colour, new hero, “Everything you need” features)
   7. `migrations/007_support.sql` (Buy Me a Coffee payments, support tickets, email settings)
   8. `migrations/008_discord.sql` (Discord sign-in: stores the Discord handle)
   9. `migrations/009_paddle.sql` (Paddle-only checkout, business details, Paddle-ready Terms / Privacy /
      Refund / Contact pages; switches off the old payment methods, the lucky wheel and the seller program)
   10. `migrations/010_products.sql` (the 24-product catalogue; images are in `images/products/`).
       Then upload each product's download file in
       Admin → Products (files are not included), and review the products left as Draft.
   11. `migrations/011_store_wording.sql` (homepage says “store”, not “marketplace”; hides the test products)
   12. `migrations/012_product_images.sql` (only if you ran an older 010: points product images at `images/products/`)
   13. `migrations/013_resources.sql` (19 new blog posts, tutorials, tools and docs; new cover images in `images/articles/`)

   Both are safe to run more than once and delete nothing.
3. **Upload** all files. Make sure `config.local.php` is uploaded next to `config.php`
   (it holds the database password and is not in git — copy `config.local.example.php` if needed).
4. **Folders** — `uploads/` and its sub-folders must be writable by PHP. Keep the `.htaccess` files:
   they stop scripts from running in `uploads/` and keep `uploads/files` (product downloads) and
   `uploads/proofs` (payment screenshots) private.
5. **Log in** at `/auth.html` → you are sent to `/admin/`.
   - Change the admin password (Account settings) if it is still the default.
   - Settings → check Business details (legal name, address, support email) and social links.
   - Categories → check each category owns the right tags.
6. **Google login (optional)** — in Google Cloud Console → APIs & Services → Credentials, create an
   *OAuth client ID* (type: Web application). Add the authorized redirect URI
   `https://YOUR-DOMAIN/api/google-callback.php`, then put the client ID and secret in
   `config.local.php` (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`). The "Continue with Google"
   button appears automatically.
   **Discord login (optional)** — at discord.com/developers/applications create an application →
   OAuth2 → add the redirect `https://YOUR-DOMAIN/api/discord-callback.php`, then put the client ID
   and secret in `config.local.php` (`DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`). The "Continue
   with Discord" button appears automatically, and users can link/unlink Discord from
   Account settings → Connected accounts.
7. **Payments (Paddle)** — Paddle is the only payment processor and the Merchant of Record (it charges
   the buyer, adds sales tax/VAT, sends receipts and handles refunds and chargebacks).
   1. Check *Admin → Settings → Business details* (legal name, address, support email). They are filled
      into the Terms, Privacy, Refund and Contact pages automatically.
   2. Sign up at paddle.com and submit `https://YOUR-DOMAIN` for domain review (see `docs/PADDLE.md`).
   3. Paddle → Developer tools → Authentication: create an **API key** and a **client-side token**.
   4. Paddle → Developer tools → Notifications → New destination: URL
      `https://YOUR-DOMAIN/api/pay/paddle-webhook.php`, events `transaction.completed`,
      `adjustment.created`, `adjustment.updated`. Copy its **secret key**.
   5. Paddle → Checkout → Checkout settings: set the **default payment link** to
      `https://YOUR-DOMAIN/checkout.html`.
   6. Put the three values in `config.local.php` (`PADDLE_API_KEY`, `PADDLE_CLIENT_TOKEN`,
      `PADDLE_WEBHOOK_SECRET`). Checkout appears automatically; *Admin → Settings → Payments* shows the status.
   7. Also set `PADDLE_ENVIRONMENT` to `'sandbox'` or `'production'`. The **pricing page** (`/pricing`,
      subscription plans) requires it and refuses to load if it is missing or doesn't match the client token.
      Plans live in `core/plans.php`: copy, features, which categories each plan unlocks, and the Paddle
      product/price IDs for **both** sandbox and production. The site uses the set matching
      `PADDLE_ENVIRONMENT`, so going live is a config change. After checkout, Paddle sends buyers to `/welcome`.
   8. **Subscriptions:** run `migrations/014`, `015` and `016` (016 adds the subscription section to the
      Refund Policy), then `017` (footer tagline without "marketplace" — Paddle's domain review rejects
      marketplaces). The webhook destination must also send `subscription.*` and `customer.*` events.
      Buyers see their plan and a *Manage subscription* button (Paddle customer portal) under
      *My account → Subscription*; that needs `PADDLE_API_KEY`. Access rule (`core/subscriptions.php`):
      active, trialing and past_due grant access; subscribers can download every published product in their
      plan's categories. While `PADDLE_ENVIRONMENT` is `sandbox`, only admins can pay for store products or
      download through a plan (test cards are fake).
   9. **Webhook IP allowlist:** the webhook only accepts deliveries from Paddle's IPs, loaded from
      `https://api.paddle.com/ips` (or sandbox) and cached for 6 hours; behind Cloudflare it reads
      `CF-Connecting-IP`. If a proxy hides the real IP and every delivery gets 403, set
      `define('PADDLE_WEBHOOK_IP_CHECK', false);` in `config.local.php` and tell your developer.
   Test everything with a **sandbox** account (sandbox-vendors.paddle.com) first, then swap in the live keys.
   - **Email:** set *Settings → Email → Your email* to get alerts for new tickets.
     PHP `mail()` is used by default; for reliable delivery create a mailbox in Plesk (e.g.
     `noreply@your-domain`) and put its SMTP login in `config.local.php` (see the example file).
   - **Support tickets:** buyers open them from *My account → Support*; you answer in
     **Admin → Support tickets** (replies are emailed).
8. **Login page video (optional)** — Admin → Settings → Login page: paste a YouTube link (it is embedded,
   muted and looped — the owner must allow embedding), or *Upload video* (MP4/WebM,
   10–20 s, max 40 MB). Use footage you own, e.g. a clip of your own server recorded with Rockstar
   Editor or OBS. If the upload fails, raise PHP's limits in Plesk → PHP Settings:
   `upload_max_filesize` and `post_max_size` to at least 64M. Without a video the page shows the
   city photo with a slow zoom.
9. **Security** — change the database password in Plesk (the old one was in git history),
   then update `config.local.php`.

PHP 8.0+ with `pdo_mysql`, `fileinfo`, `mbstring` and `dom`; MariaDB 10.3+.
