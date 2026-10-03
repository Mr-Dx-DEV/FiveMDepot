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

   Both are safe to run more than once and delete nothing.
3. **Upload** all files. Make sure `config.local.php` is uploaded next to `config.php`
   (it holds the database password and is not in git — copy `config.local.example.php` if needed).
4. **Folders** — `uploads/` and its sub-folders must be writable by PHP. Keep the `.htaccess` files:
   they stop scripts from running in `uploads/` and keep `uploads/files` (product downloads) and
   `uploads/proofs` (payment screenshots) private.
5. **Log in** at `/auth.html` → you are sent to `/admin/`.
   - Change the admin password (Account settings) if it is still the default.
   - Settings → fill payment numbers, social links, platform fee.
   - Categories → check each category owns the right tags.
6. **Google login (optional)** — in Google Cloud Console → APIs & Services → Credentials, create an
   *OAuth client ID* (type: Web application). Add the authorized redirect URI
   `https://YOUR-DOMAIN/api/google-callback.php`, then put the client ID and secret in
   `config.local.php` (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`). The "Continue with Google"
   button appears automatically.
7. **Payments** — run `migrations/005_payments.sql`, then add your keys to `config.local.php`
   (template in `config.local.example.php`). Each method appears at checkout automatically once its
   keys are set and its switch is on (Admin → Settings → Payment methods, which also shows the
   webhook URLs). Test with sandbox/test keys first.
   - **Stripe (cards):** API key `sk_live_…` + webhook secret `whsec_…`. In Stripe → Developers →
     Webhooks add `https://YOUR-DOMAIN/api/pay/stripe-webhook.php` with events
     `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
   - **NOWPayments (crypto):** API key + IPN secret (Settings → Payments). The IPN URL is sent
     automatically with every invoice. Set `NOWPAYMENTS_SANDBOX` to `true` while testing.
   - **SSLCommerz:** store ID + store password. Keep `SSLCZ_SANDBOX = true` until SSLCommerz approves
     your live account; callback URLs are sent automatically.
   - **bKash / Nagad / bank:** only shown when a real number/account is filled in Settings.
   - **Buy Me a Coffee (manual check, no keys needed):** on by default after `007_support.sql`
     (Settings → Buy Me a Coffee). Buyers pay on your BMC page, then submit the transaction ID,
     the email they paid with and the amount. Check each one against your BMC dashboard in
     **Admin → Pay panel** and approve or reject. On approval the buyer is emailed and the files appear in
     their library. Turn off Stripe / crypto / SSLCommerz in Settings if you only want BMC.
   - **Email:** set *Settings → Email → Your email* to get alerts for new orders and tickets.
     PHP `mail()` is used by default; for reliable delivery create a mailbox in Plesk (e.g.
     `noreply@your-domain`) and put its SMTP login in `config.local.php` (see the example file).
   - **Support tickets:** buyers open them from *My account → Support*; you answer in
     **Admin → Support tickets** (replies are emailed). The Discord link comes from Settings → Social links.
8. **Login page video (optional)** — Admin → Settings → Login page → *Upload video* (MP4/WebM,
   10–20 s, max 40 MB). Use footage you own, e.g. a clip of your own server recorded with Rockstar
   Editor or OBS. If the upload fails, raise PHP's limits in Plesk → PHP Settings:
   `upload_max_filesize` and `post_max_size` to at least 64M. Without a video the page shows the
   city photo with a slow zoom.
9. **Security** — change the database password in Plesk (the old one was in git history),
   then update `config.local.php`.

PHP 8.0+ with `pdo_mysql`, `fileinfo`, `mbstring` and `dom`; MariaDB 10.3+.
