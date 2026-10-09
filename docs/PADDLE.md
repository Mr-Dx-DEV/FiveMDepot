# Paddle registration checklist

Paddle reviews the website before it lets you take payments ("domain review").
This is what Paddle checks, and where FiveMDepot meets each rule.

## Website requirements — done in the code

| Paddle rule | Where it is on the site |
|---|---|
| Clear product description | Every product page: description, screenshots, video, install guide |
| Visible pricing | Price on every product card, product page, cart and checkout (USD) |
| What the buyer gets (features) | "Features", "Compatibility" and "What's included" on product pages |
| Terms, Refund Policy, Privacy Policy reachable from navigation | Footer → Legal, on every page; also linked at sign-up and checkout |
| Legal name in the Terms | Terms §1 — filled from *Admin → Settings → Business details* |
| "Paddle is the Merchant of Record" | Terms §2, Refund Policy, checkout page, site footer |
| Contact email | Footer, Contact page, Terms, Privacy, Refund Policy |
| Refund window 14–90 days, no "no refunds" wording | Refund Policy: full refund within 14 days for any reason, via paddle.net |
| Privacy notice names Paddle, legal name/address, rights, retention, cookies | Privacy Policy §1–§10 |
| Only your own products (no marketplace) | Seller program, seller dashboards, wallets and payouts removed |
| No games of chance | Daily lucky wheel removed |
| No other payment methods / stored value | bKash, Nagad, bank, Buy Me a Coffee, Stripe, crypto and SSLCommerz removed |

## What you still need to do

1. **Deploy** the code and run `migrations/009_paddle.sql` (see `docs/DEPLOY.md`).
2. **Make sure the site is live on HTTPS** (`https://fivemdepot.com` with a valid SSL certificate).
3. **Read the four legal pages** on the live site (Terms, Privacy, Refund, Contact) and check the
   name, address and email. Edit them in *Admin → Articles* if anything should change.
4. **Make sure every published product is yours** and has a real description, screenshots and a price.
   Keep your source files or project history; Paddle can ask for proof of ownership.
5. **Sign up** at paddle.com. Use your legal name, **Tanvir Anjum Neon**, and the same details as the
   website. Submit `fivemdepot.com` as your domain. Describe the business as:
   *"Digital downloads: FiveM server resources (scripts, maps, vehicles, server packs) created and sold
   by us. One-time purchases, delivered instantly as downloads."*
6. **Be ready for extra questions:** FiveM resources are game mods, so Paddle may ask how you are
   allowed to sell them (a mod agreement), or ask for a test account to see the downloads.
7. **Check payouts:** confirm Paddle can pay you in Bangladesh (bank transfer or Payoneer).
8. **After approval:** follow *docs/DEPLOY.md → Payments (Paddle)* to add the keys, the webhook and the
   default payment link. Test a sandbox purchase, then a sandbox refund. A refund should remove the
   product from the buyer's library.
