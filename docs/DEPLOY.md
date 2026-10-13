# Deploying FiveMDepot (Plesk)

1. **Back up** the database (phpMyAdmin → Export) and the current site files.
2. **Database** — phpMyAdmin → select the `fivemdepot` database → Import, in this order:
   1. `migrations/001_store_rebuild.sql` (categories tree, tags, server packs, homepage, FAQ)
   2. `migrations/002_admin.sql` (admin panel fields, settings)
   3. `migrations/003_content.sql` (starter blog posts, tutorials, tools, docs and the
      Terms / Privacy / Refund policy pages — review the legal pages in Admin → Articles)
   4. `migrations/004_home.sql` (homepage: customer reviews + Discord community sections)
   5. `migrations/005_payments.sql` (international payments: Stripe, crypto, SSLCommerz — superseded)
   6. `migrations/006_brand.sql` (crimson brand colour, new hero, “Everything you need” features)
   7. `migrations/007_support.sql` (Buy Me a Coffee payments, support tickets, email settings)
   8. `migrations/008_discord.sql` (Discord sign-in: stores the Discord handle)
   9. `migrations/009_paddle.sql` (business details, Terms / Privacy / Refund / Contact pages; switches off the
      old payment methods, the lucky wheel and the seller program — its payment wording is updated by 019)
   10. `migrations/010_products.sql` (the 24-product catalogue; images are in `images/products/`).
       Then upload each product's download file in
       Admin → Products (files are not included), and review the products left as Draft.
   11. `migrations/011_store_wording.sql` (homepage says “store”, not “marketplace”; hides the test products)
   12. `migrations/012_product_images.sql` (only if you ran an older 010: points product images at `images/products/`)
   13. `migrations/013_resources.sql` (19 new blog posts, tutorials, tools and docs; new cover images in `images/articles/`)
   14. `014`–`017` (subscription plans, refund policy section, footer tagline), `018_paddle_review.sql`
       (product names without third-party brands), then **`019_lemonsqueezy.sql`** (Lemon Squeezy).
   15. Optional, once Lemon Squeezy works: `020_drop_paddle_tables.sql` removes the unused Paddle tables.

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
7. **Payments (Lemon Squeezy)** — Lemon Squeezy is the only payment processor and the Merchant of Record
   (it charges the buyer, adds sales tax/VAT, sends receipts and handles chargebacks). Full step-by-step
   setup: **`docs/LEMONSQUEEZY.md`**. In short:
   1. Run `migrations/019_lemonsqueezy.sql` (new subscription tables, checkout switch, legal wording).
   2. Check *Admin → Settings → Business details*; they fill the Terms, Privacy, Refund and Contact pages.
   3. In Lemon Squeezy create one product **"FiveMDepot order"** (store items — the price is set per order)
      and the three plans **Starter / Pro / Advanced** (each with a Monthly and a Yearly variant, 7-day trial).
   4. Put the API key, store ID, webhook secret and the order variant ID in `config.local.php`, and the
      plan variant IDs in `core/plans.php` (test and live sets; `LEMONSQUEEZY_TEST_MODE` picks one).
   5. Webhook: `https://YOUR-DOMAIN/api/pay/lemonsqueezy-webhook.php` (events listed in docs/LEMONSQUEEZY.md).
   *Admin → Settings → Payments* shows which keys are set. While test mode is on, only admins can pay for
   store products or download through a plan (test cards are fake).
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
