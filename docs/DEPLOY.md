# Deploying FiveMDepot (Plesk)

1. **Back up** the database (phpMyAdmin → Export) and the current site files.
2. **Database** — phpMyAdmin → select the `fivemdepot` database → Import, in this order:
   1. `migrations/001_store_rebuild.sql` (categories tree, tags, server packs, homepage, FAQ)
   2. `migrations/002_admin.sql` (admin panel fields, settings)
   3. `migrations/003_content.sql` (starter blog posts, tutorials, tools, docs and the
      Terms / Privacy / Refund policy pages — review the legal pages in Admin → Articles)

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
7. **Security** — change the database password in Plesk (the old one was in git history),
   then update `config.local.php`.

PHP 8.0+ with `pdo_mysql`, `fileinfo`, `mbstring` and `dom`; MariaDB 10.3+.
