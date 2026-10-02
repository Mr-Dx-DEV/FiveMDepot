# FiveMDepot Store Rebuild — Design Spec

Date: 2026-10-03
Status: Awaiting review

## 1. Goal

Rebuild FiveMDepot into a qbcore.store-style FiveM marketplace:

- Storefront look and structure modeled on https://qbcore.store (dark theme, orange accent, category-driven nav, Server Pack showcase, FAQ, 4-column footer).
- Admin-defined category tree + tags, where **products are placed in categories automatically by their tags**.
- An advanced admin panel for catalog, sales, people, marketing and system management.
- A rebuilt backend core (secure, consistent, migration-based).

### Decisions already made (with the owner)

| Topic | Decision |
|---|---|
| Stack | Stay on plain PHP + MariaDB + vanilla HTML/JS. No framework, no build step. Must deploy to existing Plesk hosting by file upload. |
| Approach | **Phase C** (patch security in current code) first, then **Phase A** (new core + rebuild). |
| Auto-categorization | **Category owns tags.** A product appears in every category that owns any of its tags. |
| Vendors | Multi-vendor stays: admin + sellers add products; admin approves seller products. |
| Scope | Everything in sections 3–7. |
| Data | Existing users, products, orders must be migrated, never wiped. |

### Assumptions

- PHP ≥ 8.0 and MariaDB ≥ 10.4 on the host.
- Apache with `.htaccess` / `mod_rewrite` available (Plesk default).
- Existing manual payment flow (bKash/Nagad/bank + payment proof) stays; no card gateway in this scope.

## 2. Phase C — Immediate security patch (current code)

Small, shippable on its own, before any redesign:

1. **Secrets out of git.** Move credentials to `config.local.php` (git-ignored); `config.php` requires it. Add `.gitignore`. Owner must **rotate the DB password**, since it exists in git history.
2. **SQL injection.** Replace every string-built query (5 in `api/admin.php`, e.g. line 464) with prepared statements.
3. **Output/upload hardening.** Verify uploads by real MIME (`finfo`), random file names, no PHP execution in `uploads/` (`.htaccess`).
4. **Session hardening.** `httponly`, `secure`, `samesite=Lax` cookies; regenerate ID on login.
5. **Production errors.** No stack traces / SQL errors in API responses.

## 3. Data model (taxonomy)

New migration-managed schema (existing tables altered, not dropped).

```
categories
  id, parent_id (nullable, self-FK, ON DELETE RESTRICT), name, slug (unique),
  icon, banner_url, description, seo_title, seo_description,
  sort_order, is_active, show_in_nav, created_at, updated_at

tag_groups
  id, name, slug, show_as_filter, sort_order          -- e.g. Framework, Type

tags
  id, group_id (nullable FK), name, slug (unique), color, created_at

category_tags            -- "category owns tags"
  category_id, tag_id    (PK both)

product_tags
  product_id, tag_id     (PK both)

products  (altered)
  + type ENUM('standard','server_pack') DEFAULT 'standard'
  + sale_price DECIMAL NULL
  + seo_title, seo_description
  + reject_reason TEXT NULL
  + pack_meta JSON NULL   -- server_pack only: resources[], resmon_idle_ms,
                          --   frameworks[], features[], lifetime_updates
  - category ENUM  (removed after migration)
  - tags TEXT      (removed after migration)
  - category_id    (removed after migration; categories are derived)

homepage_sections
  id, key (hero|trust|categories|featured|server_pack|new|free|about|faq),
  is_enabled, sort_order, content JSON

faqs
  id, question, answer, sort_order, is_active

documentation  (altered)
  + type ENUM('blog','tutorial','tool','doc') DEFAULT 'doc'
```

### Category membership rule

A product P is in category C when:
`P` has a tag owned by `C` **or** by any descendant of `C`.

Computed by query (no stored membership), so editing a category's tags takes effect immediately. One query, indexed on `product_tags.tag_id` and `category_tags.tag_id`. Descendants resolved with a recursive CTE (MariaDB 10.2+).

### Rules

- Only admins create/edit categories, tags and tag groups. Sellers pick from existing tags.
- A category cannot be deleted while it has children (move/delete children first). Deleting a category never deletes products.
- Deleting a tag removes it from products and categories (with confirmation showing affected counts).
- Tag merge: move all product/category links from tag A to B, delete A.
- Only `PUBLISHED` products appear on the storefront.

### Data migration

1. Create tags `script`, `mlo`, `vehicle` (group "Type") and seed tags `qbcore`, `esx`, `qbox` (group "Framework").
2. Create categories Scripts, Maps & MLOs, Vehicles, Clothing, Complete Server Pack, Free Assets; attach the matching type tags.
3. For each product: add a type tag from the old `category` ENUM; parse the old `tags` JSON into `tags` + `product_tags` (slugified, deduped).
4. Verify counts (products before = products tagged after), then drop the old columns.

## 4. Backend core (Phase A)

```
/core
  bootstrap.php   config load, error handler, session, autoload
  Db.php          PDO wrapper; prepared statements only; transactions
  Router.php      method + path → handler; path params
  Request.php     JSON/form body, query, files
  Response.php    json(), error(code, message), consistent shape
  Auth.php        current user, requireRole('admin'|'seller'|'buyer')
  Csrf.php        token issue/verify for state-changing requests
  RateLimit.php   per-IP+route (login, register, checkout)
  Validator.php   declarative rules: required, string, int, slug, in, ...
  Upload.php      MIME check, size limit, random names
  Migrator.php    runs /migrations/NNN_name.sql once, tracked in `migrations` table
/api/v1/index.php  single entry; .htaccess rewrites /api/v1/* here
/api/v1/routes/    one file per resource: products, categories, tags,
                   tag-groups, orders, users, sellers, reviews, promos,
                   refunds, banners, homepage, faqs, docs, settings, auth, ...
/migrations/       001_taxonomy.sql, 002_migrate_products.sql, ...
/admin/migrate.php admin-only page to run pending migrations from the browser
                   (no SSH needed on Plesk)
```

- **Response shape:** `{ "data": ..., "meta": {...} }` on success, `{ "error": { "code", "message", "fields" } }` on failure, correct HTTP status.
- **Pagination:** `?page=&per_page=` (max 100), `meta.total`.
- **Old endpoints** (`api/*.php`) keep working until each page is switched to v1, then removed.
- **Audit log:** every admin write goes through one `audit()` helper.

## 5. Admin panel

New layout replacing `admin.html` / `dashboard/admin.html` (single admin app at `/admin/`).

- **Shell:** grouped sidebar (Catalog, Sales, People, Marketing, System), Ctrl+K global search (products, orders, users, categories), dark/orange theme, mobile-friendly.
- **Dashboard:** revenue & orders charts (Chart.js), pending-review count, top products, top categories.
- **Catalog**
  - *Products list:* filters (status, type, category, tag, seller, price), multi-select bulk actions (approve, reject, feature, add/remove tag, delete), inline price/status edit.
  - *Product editor (full page):* title, rich-text description, price + sale price, sortable screenshot upload, video URL, version, changelog, download file, tag autocomplete, **live "Will appear in: …" category preview**, server-pack fields when type = server_pack, status, SEO.
  - *Categories:* drag-and-drop tree (reorder + nest), edit panel, tag assignment, product count per category.
  - *Tags:* CRUD, merge, recolor, tag groups, usage counts, delete unused.
  - *Review queue:* pending seller products; approve or reject with reason (seller sees reason).
- **Sales:** Orders, Payment proofs, Refunds, Promo codes (ported from existing).
- **People:** Users (roles, ban), Sellers (payouts, withdrawals), Reviews moderation.
- **Marketing:** Homepage builder (toggle/order sections, edit hero, trust stats, featured categories, server-pack block, FAQ), Banners, Newsletter.
- **System:** Settings, Audit log, Health, CSV export, Migrations.

Seller dashboard keeps its features but uses the same tag picker (existing tags only) and shows reject reasons.

## 6. Storefront

- **Theme:** near-black navy background, orange/amber accent, Inter font, generous spacing; light/dark toggle kept. Replaces current gold theme. Design tokens as CSS variables in one file.
- **Header:** logo; nav generated from categories with `show_in_nav` (dropdowns for children) plus static Blog / Tutorials / Tools / Docs; search, cart count, account, Discord/GitHub/YouTube icons; mobile drawer.
- **Home** (sections rendered from `homepage_sections`, order/toggles from admin):
  hero (badge, headline, subtitle, "Explore Marketplace" + "View Server Packs"), trust stats, shop-by-category cards, featured products, Server Pack showcase, new releases, free assets, about, FAQ accordion.
- **Footer:** Products / Resources / Support / Legal columns; Official Store / Verified / Since badges; copyright.
- **Product card:** image, type badge, title, framework tags, rating, price (+ struck old price), add-to-cart, wishlist heart.
- **Category page** `/category/<slug>[/<child>]`: breadcrumbs, banner, sub-category chips, sidebar filters (tag groups with `show_as_filter`, price range), sort, pagination.
- **Product page:** gallery + video, tabs (Description / Features / Changelog / Reviews), compatibility, version, related products (shared tags).
- **Server Pack page:** landing-style: stats, features grid, included resources, FAQ, buy CTA.
- **Cart / checkout / auth / wishlist / buyer dashboard:** restyled; behavior unchanged.
- **Blog / Tutorials / Tools / Docs:** list + detail pages from `documentation` by `type`.
- Pretty URLs via `.htaccess` rewrites to the existing HTML pages.

## 7. Error handling

- API: validation errors → 422 with `fields`; auth → 401/403; not found → 404; unexpected → 500 with generic message, details logged to a server log file (not returned).
- Frontend: one `api()` fetch helper that shows toast errors and redirects to login on 401.
- Migrations run inside transactions where MariaDB allows; the data migration verifies counts and aborts (rollback) on mismatch.

## 8. Testing / verification

- PHP: a minimal test runner (`tests/run.php`, no Composer) covering Validator, Router, category-membership query, tag merge, data migration on a seeded copy.
- API smoke script: hits each v1 endpoint for status codes and response shape.
- Manual browser check of each storefront page and admin screen at desktop and 375px widths, both themes.
- Before deploy: back up the production DB (phpMyAdmin export).

## 9. Delivery order

1. Phase C security patch → deploy.
2. Core (section 4) + taxonomy migrations (section 3).
3. Admin: shell, catalog (products, editor, categories, tags, review queue).
4. Storefront: theme, header/footer, home, category, product, server pack.
5. Admin: remaining sections (sales, people, marketing/homepage builder, system).
6. Restyle remaining pages; blog/tutorials/tools/docs.
7. Remove old `api/*.php` endpoints and dead pages.

Each step is deployable on its own.

## Out of scope

Card/crypto payment gateways, automated license keys / Tebex integration, multi-language, framework rewrites.
