-- ============================================================
-- FiveMDepot — 009 Paddle-only store (Paddle = Merchant of Record)
--   * business details used by the legal pages ({{legal_name}}, {{business_address}}, {{support_email}})
--   * Paddle checkout switch; all old payment methods, the lucky wheel and the seller program switched off
--   * Terms / Privacy / Refund policy rewritten to Paddle's requirements, new Contact page
-- Run after 008. Safe to re-run. Deletes nothing (old orders, proofs and seller rows are kept for records).
-- ============================================================

SET NAMES utf8mb4;

INSERT INTO `site_settings` (`id`, `key`, `value`, `description`) VALUES
('s0000000-0000-0000-0000-000000000090', 'legal_name', 'Tanvir Anjum Neon', 'Legal name shown in the Terms, Privacy and Refund policy'),
('s0000000-0000-0000-0000-000000000091', 'business_address', 'Dhaka, Bangladesh', 'Business address shown in the legal pages'),
('s0000000-0000-0000-0000-000000000092', 'support_email', 'fivemdepot@gmail.com', 'Support email shown in the footer and legal pages'),
('s0000000-0000-0000-0000-000000000093', 'pay_paddle_enabled', '1', 'Paddle checkout')
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`);

-- Paddle is the only way to pay; no games of chance; no third-party sellers
UPDATE `site_settings` SET `value` = '0'
WHERE `key` IN ('pay_stripe_enabled', 'pay_crypto_enabled', 'pay_sslcommerz_enabled', 'pay_manual_enabled', 'pay_bmc_enabled', 'wheel_enabled', 'seller_auto_approve');
UPDATE `users` SET `role` = 'BUYER' WHERE `role` = 'SELLER';
UPDATE `products` SET `status` = 'DRAFT' WHERE `status` = 'PENDING';  -- old seller submissions stay hidden

-- Help pages about selling or local payments are no longer true
UPDATE `documentation` SET `is_published` = 0
WHERE `slug` IN ('seller-guide', 'start-selling-on-fivemdepot', 'welcome-to-the-new-fivemdepot');

UPDATE `faqs` SET `answer` = 'As soon as your payment is confirmed, the download appears in your dashboard under My library. Paddle also emails you a receipt.'
WHERE `id` = 'f0000000-0000-0000-0000-000000000001';
UPDATE `faqs` SET `answer` = 'Card (Visa, Mastercard, Amex), PayPal, Apple Pay and Google Pay through Paddle, our Merchant of Record. Prices are in USD; tax is added where required.'
WHERE `id` = 'f0000000-0000-0000-0000-000000000002';
UPDATE `faqs` SET `answer` = 'Every resource is made and tested by our team and must run at low idle resmon before it is published.'
WHERE `id` = 'f0000000-0000-0000-0000-000000000006';

-- ------------------------------------------------------------
-- Legal pages. {{legal_name}}, {{business_address}}, {{support_email}}, {{site_name}} and {{site_url}}
-- are filled in from Admin → Settings → Business details when the page is shown.
-- ------------------------------------------------------------
INSERT INTO `documentation` (`id`, `title`, `slug`, `type`, `category`, `excerpt`, `content`, `thumbnail`, `is_published`, `created_at`) VALUES
('d0000000-0000-0000-0000-000000000001', 'Terms of Service', 'terms', 'doc', 'Legal', 'The agreement between you and FiveMDepot when you use the website and buy our resources.',
'<p><b>Last updated: 9 October 2026.</b></p>
<h2>1. Who we are</h2>
<p>{{site_name}} ({{site_url}}) is owned and operated by <b>{{legal_name}}</b>, a sole proprietor based in {{business_address}} (“we”, “us”, “our”). When you use this website or buy a product here, you enter into this agreement with {{legal_name}}. You can contact us at <a href="mailto:{{support_email}}">{{support_email}}</a>.</p>
<h2>2. Our reseller and Merchant of Record</h2>
<p>Our order process is conducted by our online reseller <b>Paddle.com</b>. Paddle.com is the Merchant of Record for all our orders. Paddle provides all customer service inquiries and handles returns. Payments are also subject to the <a href="https://www.paddle.com/legal/checkout-buyer-terms" target="_blank" rel="noopener">Paddle Buyer Terms</a>.</p>
<h2>3. Accepting these terms</h2>
<p>By creating an account, buying a product or continuing to use the website, you agree to these terms, our <a href="documentation.html?type=doc&slug=privacy">Privacy Policy</a> and our <a href="documentation.html?type=doc&slug=refunds">Refund Policy</a>. If you do not agree, please do not use the website.</p>
<h2>4. What we sell</h2>
<p>We sell digital resources for FiveM servers: scripts, maps and MLO interiors, vehicles, clothing and complete server packs. Every product is created by us. Each product page describes what is included, the supported frameworks and requirements, and the price. Products are a <b>one-time purchase</b> — there are no subscriptions or recurring charges.</p>
<h2>5. Prices, payment and delivery</h2>
<ul>
<li>Prices are shown in US dollars. Paddle adds sales tax or VAT where your country requires it, and shows the final amount before you pay.</li>
<li>You can pay by card, PayPal, Apple Pay or Google Pay, depending on what Paddle offers in your country.</li>
<li>Delivery is digital. As soon as Paddle confirms the payment, the product appears in <b>My account → My library</b> with a download button, and you receive a receipt from Paddle by email.</li>
<li>Promo codes have no cash value, cannot be combined unless stated and may expire.</li>
</ul>
<h2>6. Your licence</h2>
<p>We keep full ownership of every product and all related intellectual property. When you buy a product you receive a personal, non-exclusive, non-transferable licence to install and use it on FiveM servers you own or manage, and to edit its configuration and open code for your own servers.</p>
<p>You may not resell, share, upload, leak, give away or re-publish a product (modified or not), or remove licence or author notices. Doing so ends your licence immediately.</p>
<h2>7. Your account</h2>
<p>Give a real email address and keep your password private; you are responsible for activity on your account. You must be old enough to make purchases in your country, or have permission from a parent or guardian.</p>
<h2>8. Acceptable use</h2>
<p>You must not use the website or our products to:</p>
<ul>
<li>break any law or help anyone else break it;</li>
<li>commit fraud, send spam, or make purchases with payment details you are not allowed to use;</li>
<li>infringe our intellectual property or anyone else’s, including leaking or reselling our products;</li>
<li>interfere with the security of the website — for example attacking, overloading or scraping it, or trying to access other people’s accounts or files.</li>
</ul>
<p>Products are mods for the FiveM platform and must be used in line with the Cfx.re platform terms and Rockstar Games’ terms. {{site_name}} is not affiliated with Rockstar Games, Take-Two Interactive or Cfx.re.</p>
<h2>9. Updates and support</h2>
<p>Updates to products you own are free and appear in your library for as long as we maintain the product. Support is available by email and through the support tickets in your account. We do our best to keep the website and products working, but we do not guarantee that the website will be uninterrupted or error-free, or that a product will work with heavily modified frameworks or other third-party resources.</p>
<h2>10. Refunds</h2>
<p>You can request a refund as described in our <a href="documentation.html?type=doc&slug=refunds">Refund Policy</a>. Refunds are handled by Paddle.</p>
<h2>11. Suspension and termination</h2>
<p>We may suspend or close an account, and end the licences on it, if there is a material breach of these terms, non-payment or a reversed payment, a security or fraud risk, or repeated or serious violations. You can close your account at any time by contacting us.</p>
<h2>12. Liability</h2>
<p>Products are provided “as is”. To the extent the law allows, we are not liable for lost profits, server downtime or data loss, and our total liability for any order is limited to the amount you paid for it. Nothing in these terms limits rights you have under consumer protection law.</p>
<h2>13. Changes and governing law</h2>
<p>We may update these terms; the date at the top shows the latest version. Continuing to use the website after a change means you accept it. These terms are governed by the laws of Bangladesh, without affecting any mandatory consumer rights in your country.</p>
<h2>14. Contact</h2>
<p>{{legal_name}} · {{business_address}} · <a href="mailto:{{support_email}}">{{support_email}}</a></p>',
'', 1, NOW() - INTERVAL 17 DAY),

('d0000000-0000-0000-0000-000000000002', 'Privacy Policy', 'privacy', 'doc', 'Legal', 'What personal data we collect, why, who we share it with and your rights.',
'<p><b>Last updated: 9 October 2026.</b></p>
<h2>1. Who is responsible for your data</h2>
<p>The controller of your personal data is <b>{{legal_name}}</b>, operating {{site_name}} ({{site_url}}), {{business_address}}. For any privacy question or request, email <a href="mailto:{{support_email}}">{{support_email}}</a>.</p>
<h2>2. What we collect, why, and our legal basis</h2>
<ul>
<li><b>Account details</b> — name, email address and a securely hashed password, or your Google/Discord account ID if you sign in with them. Used to run your account and give you access to your purchases. <i>Legal basis: performing our contract with you.</i></li>
<li><b>Orders</b> — products bought, amounts, promo codes and the Paddle transaction reference. Used to deliver products, provide updates and keep accounting records. <i>Legal basis: contract and legal obligations.</i></li>
<li><b>Payment details</b> — your card or PayPal details go directly to Paddle, our Merchant of Record. We never see or store full card numbers. Paddle shares with us the order status, your email and country.</li>
<li><b>Support messages</b> — what you send in tickets or by email. Used to help you. <i>Legal basis: contract and our legitimate interest in providing good support.</i></li>
<li><b>Technical data</b> — IP address, browser type and log entries. Used to keep accounts secure and prevent fraud and abuse. <i>Legal basis: legitimate interests.</i></li>
<li><b>Newsletter</b> (only if you sign up) — your email address. <i>Legal basis: consent, which you can withdraw at any time.</i></li>
</ul>
<p>We do not sell your personal data and do not use it for advertising.</p>
<h2>3. Who we share it with</h2>
<ul>
<li><b>Paddle.com</b> — our reseller and Merchant of Record, which processes payments, taxes, invoices and refunds. See the <a href="https://www.paddle.com/legal/privacy" target="_blank" rel="noopener">Paddle Privacy Notice</a>.</li>
<li><b>Service providers</b> — our web hosting provider and email delivery provider, which process data only on our instructions; Google and Discord if you choose to sign in with them.</li>
<li><b>Professional advisers</b> — such as accountants or lawyers, when needed.</li>
<li><b>Authorities</b> — when the law requires it, or to prevent fraud.</li>
</ul>
<h2>4. How long we keep it</h2>
<p>Account data is kept while your account is open. Order and invoice records are kept for as long as accounting and tax law requires (usually up to 7 years). Support tickets are kept for 2 years. Server logs are kept for up to 90 days. When you delete your account we remove your personal data, except what we must keep for legal or fraud-prevention reasons.</p>
<h2>5. International transfers</h2>
<p>Our providers, including Paddle, may process data outside your country. Where this happens, we rely on appropriate safeguards such as the providers’ standard contractual clauses.</p>
<h2>6. Your rights</h2>
<p>Depending on where you live (including under the GDPR and UK GDPR), you have the right to access a copy of your data, correct it, delete it, restrict or object to its use, receive it in a portable format, and withdraw consent at any time. Email <a href="mailto:{{support_email}}">{{support_email}}</a> to make a request — we reply within one month. You also have the right to complain to your local data protection authority.</p>
<h2>7. Cookies</h2>
<p>We use one essential session cookie to keep you signed in and protect forms, plus your browser’s local storage to remember your cart and theme. Paddle’s checkout uses its own essential cookies to process your payment securely. We do not use advertising or tracking cookies.</p>
<h2>8. Security</h2>
<p>Passwords are hashed, the website is served only over HTTPS, cookies are secure, every form is protected against cross-site request forgery, and access to personal data is limited to the people who need it.</p>
<h2>9. Children</h2>
<p>The website is not intended for children under 13, and we do not knowingly collect their data.</p>
<h2>10. Changes</h2>
<p>We may update this policy; the date at the top shows the latest version.</p>',
'', 1, NOW() - INTERVAL 16 DAY),

('d0000000-0000-0000-0000-000000000003', 'Refund Policy', 'refunds', 'doc', 'Legal', 'A full refund within 14 days of purchase, for any reason.',
'<p><b>Last updated: 9 October 2026.</b></p>
<h2>14-day refunds</h2>
<p>If you are not happy with a purchase, you can request a <b>full refund within 14 days</b> of the purchase date, for any reason.</p>
<h2>How to request a refund</h2>
<p>Our order process is conducted by our online reseller <b>Paddle.com</b>, the Merchant of Record for all our orders. Paddle handles all returns and refunds:</p>
<ol>
<li>Go to <a href="https://paddle.net" target="_blank" rel="noopener">paddle.net</a> and look up your order with the email you used at checkout, or reply to the receipt email Paddle sent you.</li>
<li>Choose the order and request a refund.</li>
</ol>
<p>You can also email us at <a href="mailto:{{support_email}}">{{support_email}}</a> with your order number and we will arrange it with Paddle.</p>
<h2>How refunds are paid</h2>
<p>Refunds go back to the original payment method. Depending on your bank or card provider, it usually takes 5–10 working days to appear.</p>
<h2>What happens to the product</h2>
<p>When a refund is completed, the licence for that product ends and it is removed from your library. Please delete it from your servers.</p>
<h2>Need help instead?</h2>
<p>If a product does not work as described, contact us first — we are happy to help you get it running or fix the problem. This does not affect your right to a refund within 14 days.</p>
<p>Paddle may refuse refunds where there is evidence of fraud or refund abuse, as described in the <a href="https://www.paddle.com/legal/checkout-buyer-terms" target="_blank" rel="noopener">Paddle Buyer Terms</a>. Nothing in this policy limits your statutory rights.</p>',
'', 1, NOW() - INTERVAL 15 DAY),

('d0000000-0000-0000-0000-000000000004', 'How to buy and pay', 'how-to-buy', 'doc', 'Getting started', 'Step-by-step: from adding to cart to downloading your resource.',
'<p>Buying on {{site_name}} takes about a minute.</p>
<h2>1. Add to cart</h2>
<p>Open a product and click <b>Buy now</b> or <b>Add to cart</b>. Have a promo code? Enter it on the cart page.</p>
<h2>2. Sign in</h2>
<p>You need a free account so your purchases are saved to your library. You can create one at checkout.</p>
<h2>3. Pay securely with Paddle</h2>
<p>Click <b>Continue to secure payment</b>. Paddle’s checkout opens on top of the page — pay by card, PayPal, Apple Pay or Google Pay. Paddle is our Merchant of Record: it adds sales tax or VAT where required and emails you a receipt.</p>
<h2>4. Download</h2>
<p>As soon as the payment is confirmed (usually a few seconds), the resource appears in <b>My library</b> with a <b>Download</b> button. Free resources are added instantly.</p>
<p>Questions? Email <a href="mailto:{{support_email}}">{{support_email}}</a>. Changed your mind? See our <a href="documentation.html?type=doc&slug=refunds">Refund Policy</a>.</p>',
'images/photos/free-assets.jpg', 1, NOW() - INTERVAL 14 DAY),

('d0000000-0000-0000-0000-000000000019', 'Contact us', 'contact', 'doc', 'Legal', 'How to reach FiveMDepot for support, orders and privacy questions.',
'<p>We’re happy to help with orders, installation, refunds or anything else.</p>
<ul>
<li><b>Email:</b> <a href="mailto:{{support_email}}">{{support_email}}</a> — we reply within 1–2 working days.</li>
<li><b>Support tickets:</b> sign in and open <a href="dashboard/buyer.html?tab=support">My account → Support</a>.</li>
<li><b>Orders, receipts and refunds:</b> Paddle.com is the Merchant of Record for all our orders — you can also manage your order at <a href="https://paddle.net" target="_blank" rel="noopener">paddle.net</a>.</li>
</ul>
<h2>Business details</h2>
<p>{{site_name}} is owned and operated by <b>{{legal_name}}</b>, {{business_address}}.</p>',
'', 1, NOW() - INTERVAL 13 DAY)
ON DUPLICATE KEY UPDATE `title` = VALUES(`title`), `excerpt` = VALUES(`excerpt`), `content` = VALUES(`content`), `is_published` = 1;

INSERT IGNORE INTO `migrations` (`name`) VALUES ('009_paddle');
