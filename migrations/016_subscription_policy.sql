-- ============================================================
-- FiveMDepot — 016 Refund & Cancellation Policy: adds a "Subscriptions" section for the Starter / Pro /
-- Advanced plans (free trial, billing, how to cancel, refunds, what happens to access).
-- Run after 015. Safe to re-run: the section is only added once. Review the text in Admin → Articles.
-- One single statement (no variables), so phpMyAdmin can run it in one go.
-- ============================================================

UPDATE `documentation`
SET `content` = CONCAT(`content`, '
<h2 id="subscriptions">Subscriptions (Starter, Pro and Advanced plans)</h2>
<ul>
<li><b>Free trial:</b> every plan starts with a 7-day free trial. You are not charged during the trial, and if you cancel before it ends you pay nothing.</li>
<li><b>Billing:</b> after the trial, Paddle charges the plan price every month or every year, depending on the plan you chose, until you cancel. The price and the date of the first charge are shown at checkout.</li>
<li><b>Cancel anytime:</b> go to <i>My account → Subscription → Manage subscription</i>, or use the link in any Paddle receipt. Cancellation takes effect at the end of the current billing period; you keep access until then and are not charged again.</li>
<li><b>Refunds:</b> you can request a full refund of a subscription payment within 14 days of that payment, for any reason, through <a href="https://paddle.net" rel="noopener nofollow" target="_blank">paddle.net</a> or by emailing us.</li>
<li><b>What you get:</b> while your subscription is active you can download every product in the categories your plan includes. When the subscription ends, those plan downloads stop. Products you bought separately stay in your library.</li>
</ul>'),
    `title` = 'Refund & Cancellation Policy',
    `excerpt` = 'Full refund within 14 days, for any reason. Subscriptions: 7-day free trial, cancel anytime.'
WHERE `slug` = 'refunds' AND `content` NOT LIKE '%id="subscriptions"%';
