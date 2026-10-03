-- ============================================================
-- FiveMDepot — 003 Starter content: blog, tutorials, tools, docs,
-- Terms of Service, Privacy Policy, Refund Policy.
-- Run after 002_admin.sql. Safe to re-run: existing articles (same slug)
-- are NOT overwritten, so your edits in Admin → Articles are kept.
-- Review the legal pages and adjust them to your business.
-- ============================================================

SET NAMES utf8mb4;

INSERT IGNORE INTO `documentation` (`id`, `title`, `slug`, `type`, `category`, `excerpt`, `content`, `thumbnail`, `is_published`, `created_at`) VALUES
('d0000000-0000-0000-0000-000000000001', 'Terms of Service', 'terms', 'doc', 'Legal', 'The rules for buying, selling and using resources on FiveMDepot.', '<p><b>Last updated: October 2026.</b> By creating an account, buying or selling on FiveMDepot ("we", "the store") you agree to these terms. Please read them together with our <a href="documentation.html?type=doc&slug=refunds">Refund Policy</a> and <a href="documentation.html?type=doc&slug=privacy">Privacy Policy</a>.</p>
<h2>1. Your account</h2>
<ul><li>You must give a real email address and keep your password private. You are responsible for everything done with your account.</li>
<li>One person, one account. Accounts used for fraud, chargebacks, sharing purchases or harassment may be suspended without refund.</li>
<li>You must be old enough to make purchases in your country, or have permission from a parent or guardian.</li></ul>
<h2>2. What you buy (the licence)</h2>
<p>Resources sold here are digital goods. When your payment is verified you receive a <b>personal, non-exclusive, non-transferable licence</b> to use the resource on <b>servers you own or manage</b>.</p>
<ul><li><b>You may:</b> install the resource on your own FiveM servers, edit the configuration and the open parts of the code for your own server.</li>
<li><b>You may not:</b> resell, share, upload, leak, give away or re-publish the resource (paid or free, modified or not), or remove licence or author notices.</li>
<li>Leaking or reselling a resource ends your licence immediately and may lead to account suspension and legal action by the author.</li></ul>
<h2>3. Payments</h2>
<ul><li>We accept bKash, Nagad and bank transfer. You send the exact amount shown at checkout and upload your payment screenshot and transaction ID.</li>
<li>Your order is <b>pending</b> until our team verifies the payment. Downloads unlock as soon as it is approved.</li>
<li>Fake, edited or reused payment proofs are fraud. The order is rejected and the account may be banned.</li>
<li>Prices are shown in USD. Promo codes cannot be combined unless stated and have no cash value.</li></ul>
<h2>4. Updates and support</h2>
<p>Updates for resources you own are free for as long as the author keeps publishing them, and appear in <a href="dashboard/buyer.html">your library</a>. Support is offered on our Discord. We cannot guarantee compatibility with heavily modified frameworks or other paid resources.</p>
<h2>5. Sellers</h2>
<ul><li>Sellers must own the rights to everything they upload. Uploading someone else’s work, leaked resources, malware, obfuscated backdoors or tracking code is forbidden and leads to removal and a permanent ban.</li>
<li>Every product is reviewed before it goes live. We can refuse or remove any product.</li>
<li>Earnings from verified orders are added to the seller wallet minus the platform fee shown in the seller dashboard, and can be withdrawn by bKash, Nagad or bank transfer.</li>
<li>Earnings from orders that are refunded or charged back may be deducted from the seller wallet.</li></ul>
<h2>6. Acceptable use</h2>
<p>Do not attack, overload or scrape the store, try to access other people’s accounts or files, or use the store for anything illegal.</p>
<h2>7. Disclaimer</h2>
<p>FiveMDepot is not affiliated with Rockstar Games, Take-Two Interactive or Cfx.re. Resources are provided "as is"; we are not liable for lost profits, server downtime or data loss caused by third-party resources. Our total liability for any order is limited to the amount you paid for it.</p>
<h2>8. Changes</h2>
<p>We may update these terms. The date at the top shows the latest version. Continuing to use the store after a change means you accept it.</p>
<h2>Contact</h2>
<p>Questions? Message us on Discord (link in the footer) or email the address on our website.</p>', '', 1, NOW() - INTERVAL 17 DAY);

INSERT IGNORE INTO `documentation` (`id`, `title`, `slug`, `type`, `category`, `excerpt`, `content`, `thumbnail`, `is_published`, `created_at`) VALUES
('d0000000-0000-0000-0000-000000000002', 'Privacy Policy', 'privacy', 'doc', 'Legal', 'What data we collect, why, and how we protect it.', '<p><b>Last updated: October 2026.</b> This policy explains what personal data FiveMDepot collects and how it is used.</p>
<h2>What we collect</h2>
<ul><li><b>Account details:</b> your name, email address and a securely hashed password (we never store your password in plain text).</li>
<li><b>Orders:</b> the products you bought, amounts, payment method, transaction ID, the sender number you enter and the payment screenshot you upload.</li>
<li><b>Seller details:</b> your bio, Discord username and the payout account you enter for withdrawals.</li>
<li><b>Technical data:</b> IP address, browser type and a session cookie, used to keep you logged in and to protect accounts against abuse.</li></ul>
<h2>Why we use it</h2>
<ul><li>To create your account, verify payments and deliver your downloads.</li>
<li>To pay sellers and prevent fraud, leaks and abuse.</li>
<li>To answer support requests.</li>
<li>To improve the store (for example which pages are visited most).</li></ul>
<p>We do <b>not</b> sell your data.</p>
<h2>Who can see it</h2>
<ul><li>Our admin team, to verify orders and provide support.</li>
<li>Sellers see the name of buyers who review their products, but not your email or payment details.</li>
<li>Payment screenshots are stored in a private folder that is not publicly accessible.</li></ul>
<h2>Cookies</h2>
<p>We use one essential session cookie to keep you logged in, and your browser’s local storage to remember your cart and light/dark theme. We do not use advertising cookies.</p>
<h2>How long we keep it</h2>
<p>We keep order records for as long as needed for accounting and to keep your purchases available. You can ask us to delete your account; we will remove your personal data except what we must keep for legal or fraud-prevention reasons.</p>
<h2>Your rights</h2>
<p>You can ask for a copy of your data, ask us to correct it, or ask us to delete your account by contacting support on Discord or by email.</p>
<h2>Security</h2>
<p>Passwords are hashed, the site uses secure cookies, every form is protected against cross-site request forgery, and uploaded files are checked and stored outside public reach where needed.</p>', '', 1, NOW() - INTERVAL 16 DAY);

INSERT IGNORE INTO `documentation` (`id`, `title`, `slug`, `type`, `category`, `excerpt`, `content`, `thumbnail`, `is_published`, `created_at`) VALUES
('d0000000-0000-0000-0000-000000000003', 'Refund Policy', 'refunds', 'doc', 'Legal', 'When you can get a refund for a digital resource, and how to ask for one.', '<p><b>Last updated: October 2026.</b> Because resources are digital and can be copied once downloaded, refunds are limited — but we always help when something is genuinely wrong.</p>
<h2>You can get a refund when</h2>
<ul><li><b>The resource does not work</b> as described on its product page with the supported framework and version, and our team or the author cannot fix it within a reasonable time (usually 7 days).</li>
<li><b>The product is materially different</b> from its description, screenshots or video.</li>
<li><b>You were charged twice</b> for the same order, or paid for an order that was never approved.</li>
<li><b>You paid but have not downloaded</b> the resource yet, and you ask within <b>24 hours</b> of the payment being approved.</li></ul>
<h2>Refunds are not available when</h2>
<ul><li>You changed your mind, bought by mistake or no longer need the resource after downloading it.</li>
<li>The problem comes from your server setup, another resource, an unsupported framework or edits you made to the code.</li>
<li>You did not read the requirements listed on the product page (framework, dependencies, OneSync, game build).</li>
<li>The resource was leaked, shared or resold from your account.</li>
<li>The request is made more than <b>14 days</b> after the payment was approved.</li></ul>
<h2>How to request a refund</h2>
<ol><li>Go to <a href="dashboard/buyer.html?tab=orders">My account → Orders</a>.</li>
<li>Click <b>Request refund</b> on the order and explain the problem (screenshots or console errors help a lot).</li>
<li>Our team replies within 2 working days. We will usually try to fix the issue first.</li></ol>
<h2>How refunds are paid</h2>
<p>Approved refunds are sent back by the same method you paid with (bKash, Nagad or bank transfer) within 5 working days. The licence for the refunded resource ends and its download is removed from your library.</p>
<h2>Payment disputes</h2>
<p>Please contact us before opening a dispute with your payment provider — it is faster for everyone. Accounts with fraudulent disputes may be suspended.</p>', '', 1, NOW() - INTERVAL 15 DAY);

INSERT IGNORE INTO `documentation` (`id`, `title`, `slug`, `type`, `category`, `excerpt`, `content`, `thumbnail`, `is_published`, `created_at`) VALUES
('d0000000-0000-0000-0000-000000000004', 'How to buy and pay', 'how-to-buy', 'doc', 'Getting started', 'Step-by-step: from adding to cart to downloading your resource.', '<p>Buying on FiveMDepot takes about two minutes. Here is the whole process.</p>
<h2>1. Add to cart</h2>
<p>Open a product and click <b>Buy now</b> or <b>Add to cart</b>. Have a promo code? Enter it on the cart page.</p>
<h2>2. Log in</h2>
<p>You need a free account so your purchases are saved to your library. You can create one at checkout.</p>
<h2>3. Pay</h2>
<ol><li>Choose <b>bKash</b>, <b>Nagad</b> or <b>Bank transfer</b>. The checkout shows the number or account to pay.</li>
<li>Send the <b>exact amount</b> shown using <b>Send Money</b>.</li>
<li>Copy the <b>transaction ID</b> from the confirmation SMS or app.</li>
<li>Take a <b>screenshot</b> of the successful payment.</li>
<li>Back on the checkout, paste the transaction ID, upload the screenshot and click <b>Submit payment</b>.</li></ol>
<h2>4. Download</h2>
<p>Our team checks the payment (usually within a few hours). As soon as it is approved, the resource appears in <a href="dashboard/buyer.html">My library</a> with a <b>Download</b> button. Free resources are added instantly.</p>
<blockquote>Tip: each transaction ID can only be used once. If your payment is rejected, the reason is shown in My account → Orders.</blockquote>', 'images/photos/free-assets.jpg', 1, NOW() - INTERVAL 14 DAY);

INSERT IGNORE INTO `documentation` (`id`, `title`, `slug`, `type`, `category`, `excerpt`, `content`, `thumbnail`, `is_published`, `created_at`) VALUES
('d0000000-0000-0000-0000-000000000005', 'Installing a resource on your server', 'install-a-resource', 'doc', 'Getting started', 'Where to put the files, how to ensure them, and how to import SQL.', '<p>Almost every FiveM resource installs the same way. Always read the product’s own <b>Installation</b> tab first — it lists anything special.</p>
<h2>1. Extract</h2>
<p>Download the .zip from <a href="dashboard/buyer.html">My library</a> and extract it. You should get a folder such as <code>my-resource</code> containing an <code>fxmanifest.lua</code> file.</p>
<blockquote>Do not rename the folder unless the instructions say so — some resources check their own name.</blockquote>
<h2>2. Copy to your resources folder</h2>
<p>Place the folder inside your server’s <code>resources</code> directory. Many servers use category folders like <code>[jobs]</code> or <code>[maps]</code> — any folder in square brackets is fine.</p>
<h2>3. Import the database (if included)</h2>
<p>If the resource has a <code>.sql</code> file, import it into your server database with HeidiSQL, phpMyAdmin or txAdmin’s database tool <b>before</b> starting the resource.</p>
<h2>4. Ensure it in server.cfg</h2>
<p>Add a line <b>after</b> its dependencies (your framework, oxmysql, ox_lib…):</p>
<pre>ensure oxmysql
ensure ox_lib
ensure qb-core
ensure my-resource</pre>
<h2>5. Configure</h2>
<p>Open <code>config.lua</code> and set the framework, locations, prices and permissions to match your server.</p>
<h2>6. Restart and check</h2>
<p>Restart the server (or run <code>refresh</code> then <code>ensure my-resource</code> in the console). Watch the server console and press <b>F8</b> in game for errors. Still stuck? Open a ticket on our Discord with the exact error text.</p>', 'images/photos/scripts.jpg', 1, NOW() - INTERVAL 13 DAY);

INSERT IGNORE INTO `documentation` (`id`, `title`, `slug`, `type`, `category`, `excerpt`, `content`, `thumbnail`, `is_published`, `created_at`) VALUES
('d0000000-0000-0000-0000-000000000006', 'Seller guide: publishing your first product', 'seller-guide', 'doc', 'Sellers', 'How to apply, upload, get approved and get paid.', '<h2>1. Apply</h2>
<p>Create an account, then go to <a href="dashboard/buyer.html?tab=sell">My account → Become a seller</a> and tell us what you make. We review applications quickly.</p>
<h2>2. Add a product</h2>
<p>In the <a href="dashboard/seller.html">Seller dashboard</a> click <b>New product</b> and fill in:</p>
<ul><li>A clear <b>title</b> and a <b>description</b> that lists features, requirements and dependencies.</li>
<li><b>Tags</b> — they decide which categories your product appears in (for example <i>Script</i> + <i>QBCore</i> + <i>Police</i>).</li>
<li><b>Screenshots</b> (the first one is the cover) and an optional YouTube preview.</li>
<li>The <b>download file</b> (.zip, .rar or .7z).</li></ul>
<h2>3. Review</h2>
<p>Click <b>Submit for review</b>. We check that it installs, runs at a reasonable resmon and contains no backdoors or leaked code. If changes are needed you will see the reason on your product list.</p>
<h2>4. Get paid</h2>
<p>For every verified sale, your share is added to your wallet. Request a withdrawal to bKash, Nagad or bank from the <b>Withdrawals</b> tab.</p>
<h2>Rules</h2>
<ul><li>Only sell work you own.</li><li>No obfuscated backdoors, tracking or remote code.</li><li>Keep your changelog updated — buyers get every update for free.</li></ul>', 'images/photos/server-packs.jpg', 1, NOW() - INTERVAL 12 DAY);

INSERT IGNORE INTO `documentation` (`id`, `title`, `slug`, `type`, `category`, `excerpt`, `content`, `thumbnail`, `is_published`, `created_at`) VALUES
('d0000000-0000-0000-0000-000000000007', 'Set up a QBCore server with txAdmin', 'setup-qbcore-server-txadmin', 'tutorial', 'QBCore', 'From an empty machine to a running QBCore server in about 20 minutes.', '<p>This guide uses <b>txAdmin</b>, which ships with the FiveM server artifacts and installs QBCore for you through a recipe.</p>
<h2>What you need</h2>
<ul><li>A Windows or Linux machine/VPS with at least 4 GB RAM.</li><li>A MySQL or MariaDB database.</li><li>A free license key from the Cfx.re portal (keymaster).</li></ul>
<h2>1. Download the server artifacts</h2>
<p>Download the latest <b>recommended</b> server build for your OS from the official Cfx.re artifacts page and extract it to a folder such as <code>C:\\FXServer\\server</code>.</p>
<h2>2. Start txAdmin</h2>
<p>Run <code>FXServer.exe</code> (Windows) or <code>./run.sh</code> (Linux). The console prints a link and a PIN — open it in your browser and link your Cfx.re account.</p>
<h2>3. Deploy the QBCore recipe</h2>
<ol><li>Choose <b>Popular recipes → QBCore Framework</b>.</li><li>Pick a data folder for the server.</li><li>Enter your license key and database details when asked.</li><li>Let txAdmin download and configure everything.</li></ol>
<h2>4. Start and join</h2>
<p>Press <b>Start server</b>, open FiveM, press <b>F8</b> and type <code>connect localhost</code>.</p>
<h2>5. Make yourself admin</h2>
<p>In txAdmin go to <b>Admins</b> and add your identifier, then add the matching ACE permission in <code>server.cfg</code> so QBCore admin commands work.</p>
<h2>Next steps</h2>
<p>Add jobs, maps and vehicles from the <a href="category.html?c=scripts">store</a> — or skip the setup entirely with a <a href="category.html?c=server-packs">Complete Server Pack</a>.</p>', 'images/photos/server-packs.jpg', 1, NOW() - INTERVAL 11 DAY);

INSERT IGNORE INTO `documentation` (`id`, `title`, `slug`, `type`, `category`, `excerpt`, `content`, `thumbnail`, `is_published`, `created_at`) VALUES
('d0000000-0000-0000-0000-000000000008', 'How to find and fix high resmon', 'reduce-resmon', 'tutorial', 'Performance', 'Use resmon and the profiler to find the resources that cost you FPS and server ticks.', '<p>"Resmon" is FiveM’s resource monitor. It shows how much CPU time each resource uses every frame on the client. A well-optimised script idles at <b>0.00–0.02 ms</b>.</p>
<h2>1. Open resmon</h2>
<p>In game press <b>F8</b> and type <code>resmon 1</code>. Sort by <b>CPU msec</b>. Anything above 0.10 ms while you are just standing still deserves a look.</p>
<h2>2. Common causes</h2>
<ul><li><b>Loops with <code>Wait(0)</code></b> that run every frame even when nothing happens. Use a longer wait (500–1000 ms) and only speed up when the player is near something.</li>
<li><b>Drawing markers/text for far-away points.</b> Check distance first and skip work when the player is far.</li>
<li><b>Calling natives repeatedly</b> like <code>PlayerPedId()</code> or <code>GetEntityCoords()</code> many times per frame — cache them once per tick.</li>
<li><b>Many separate threads</b> doing similar distance checks. Merge them or use a zone system such as ox_lib zones or PolyZone.</li></ul>
<h2>3. Server side</h2>
<p>In the server console type <code>profiler record 500</code>, then <code>profiler view</code> to see which events and threads are slow. Heavy database queries inside loops are the usual suspect — batch them or cache results.</p>
<h2>4. Test one change at a time</h2>
<p>Stop resources one by one with <code>stop name</code> and watch the numbers. Fix the worst offender first.</p>
<blockquote>Every product on FiveMDepot is checked for idle resmon before it is approved.</blockquote>', 'images/photos/city-traffic.jpg', 1, NOW() - INTERVAL 10 DAY);

INSERT IGNORE INTO `documentation` (`id`, `title`, `slug`, `type`, `category`, `excerpt`, `content`, `thumbnail`, `is_published`, `created_at`) VALUES
('d0000000-0000-0000-0000-000000000009', 'Adding add-on vehicles to your server', 'add-addon-vehicles', 'tutorial', 'Vehicles', 'Stream cars correctly, add them to your garage shop and avoid texture loss.', '<h2>1. Folder structure</h2>
<p>A vehicle resource usually contains a <code>stream</code> folder (the .yft and .ytd model files), a <code>data</code> folder (vehicles.meta, carvariations.meta, handling.meta…) and an <code>fxmanifest.lua</code> that registers those data files.</p>
<h2>2. Ensure it</h2>
<p>Place the folder in <code>resources/[vehicles]</code> and add <code>ensure</code> for it (or ensure the whole <code>[vehicles]</code> folder) in server.cfg.</p>
<h2>3. Add it to your framework</h2>
<p>For QBCore add an entry in <code>qb-core/shared/vehicles.lua</code> using the vehicle’s <b>spawn name</b> (from vehicles.meta), its brand, price and shop category. ESX servers add a row to the <code>vehicles</code> table instead.</p>
<h2>4. Avoid texture loss</h2>
<ul><li>Keep each .ytd under about 16 MB.</li><li>Do not stream hundreds of 4K cars on a low-end server — choose optimised vehicles.</li><li>Enable an increased streaming memory setting in your server config only if you know your players have enough RAM.</li></ul>
<h2>5. Test</h2>
<p>Spawn it with your admin menu, check the handling, the lights and that the textures load from a distance.</p>', 'images/photos/vehicles.jpg', 1, NOW() - INTERVAL 9 DAY);

INSERT IGNORE INTO `documentation` (`id`, `title`, `slug`, `type`, `category`, `excerpt`, `content`, `thumbnail`, `is_published`, `created_at`) VALUES
('d0000000-0000-0000-0000-000000000010', 'How to install an MLO interior', 'install-mlo', 'tutorial', 'Maps & MLOs', 'Stream map files, avoid conflicts and fix missing collisions.', '<p>An MLO is a custom interior streamed into the map. Most MLOs are drag-and-drop.</p>
<h2>1. Install</h2>
<ol><li>Extract the download and place the folder in <code>resources/[maps]</code>.</li><li>Add <code>ensure</code> for it in server.cfg.</li><li>Restart the server.</li></ol>
<h2>2. Check for conflicts</h2>
<p>Two maps that edit the same location will flicker or show missing walls. If you see that, stop one of them and test again. The product page lists the exact location of every MLO we sell.</p>
<h2>3. Doors and props</h2>
<p>MLOs often include door coordinates for door-lock resources. Copy them into your door-lock config so doors lock correctly.</p>
<h2>4. Missing collisions</h2>
<p>Falling through the floor usually means the resource did not load fully — check the console for errors, clear the client cache (delete the FiveM <code>cache</code> folder except <code>game</code>) and rejoin.</p>', 'images/photos/mlos-maps.jpg', 1, NOW() - INTERVAL 8 DAY);

INSERT IGNORE INTO `documentation` (`id`, `title`, `slug`, `type`, `category`, `excerpt`, `content`, `thumbnail`, `is_published`, `created_at`) VALUES
('d0000000-0000-0000-0000-000000000011', '10 ways to secure your FiveM server', 'secure-your-server', 'tutorial', 'Security', 'Protect your server from cheaters, leaks and bad resources.', '<ol><li><b>Only download resources from trusted sources.</b> Leaked resources often contain backdoors that give strangers admin access.</li>
<li><b>Validate everything on the server.</b> Never trust money, item or job values sent from the client.</li>
<li><b>Protect server events.</b> Check the player’s job, distance and cooldown before giving items or money.</li>
<li><b>Use ACE permissions</b> for admin commands instead of hard-coded identifiers.</li>
<li><b>Keep artifacts and your framework updated.</b></li>
<li><b>Use strong database passwords</b> and never expose your database port to the internet.</li>
<li><b>Back up</b> your database daily and keep a copy off the server.</li>
<li><b>Review resource code</b> for <code>PerformHttpRequest</code> calls to unknown websites and obfuscated code.</li>
<li><b>Use an anticheat</b>, but do not rely on it alone — server-side checks matter more.</li>
<li><b>Limit who has txAdmin access</b> and enable two-factor authentication on your Cfx.re account.</li></ol>', 'images/photos/police.jpg', 1, NOW() - INTERVAL 7 DAY);

INSERT IGNORE INTO `documentation` (`id`, `title`, `slug`, `type`, `category`, `excerpt`, `content`, `thumbnail`, `is_published`, `created_at`) VALUES
('d0000000-0000-0000-0000-000000000012', 'server.cfg starter template', 'server-cfg-template', 'tool', 'Configuration', 'A clean, commented server.cfg to start from.', '<p>Copy this template and replace the values in capitals. Keep the order: database and libraries first, then your framework, then everything else.</p>
<pre>## Network
endpoint_add_tcp "0.0.0.0:30120"
endpoint_add_udp "0.0.0.0:30120"

## Server info
sv_hostname "YOUR SERVER NAME"
sets sv_projectName "YOUR SERVER NAME"
sets sv_projectDesc "Short description"
sv_maxclients 48
sv_licenseKey "YOUR_LICENSE_KEY"
set onesync on

## Database
set mysql_connection_string "mysql://USER:PASSWORD@localhost/DATABASE?charset=utf8mb4"

## Core
ensure mapmanager
ensure chat
ensure spawnmanager
ensure sessionmanager
ensure hardcap
ensure oxmysql
ensure ox_lib
ensure qb-core

## Folders
ensure [qb]
ensure [standalone]
ensure [jobs]
ensure [maps]
ensure [vehicles]

## Permissions
add_ace group.admin command allow
add_principal identifier.license:YOUR_LICENSE group.admin</pre>
<blockquote>Never share your server.cfg publicly — it contains your license key and database password.</blockquote>', 'images/photos/scripts.jpg', 1, NOW() - INTERVAL 6 DAY);

INSERT IGNORE INTO `documentation` (`id`, `title`, `slug`, `type`, `category`, `excerpt`, `content`, `thumbnail`, `is_published`, `created_at`) VALUES
('d0000000-0000-0000-0000-000000000013', 'Resmon optimisation checklist', 'resmon-checklist', 'tool', 'Performance', 'A quick checklist to review any script before you add it to your server.', '<p>Use this checklist when testing a new resource on a development server.</p>
<ul><li>☐ Idle client resmon is under <b>0.05 ms</b> while standing away from its locations.</li>
<li>☐ No <code>Wait(0)</code> loop runs when the player is not near anything.</li>
<li>☐ Distance checks use a slow loop and only speed up nearby.</li>
<li>☐ Markers and 3D text are only drawn within a short distance.</li>
<li>☐ No database queries inside per-player loops on the server.</li>
<li>☐ Server events check permissions and distance.</li>
<li>☐ No errors in the server console or F8 after a restart.</li>
<li>☐ No calls to unknown websites (search for <code>PerformHttpRequest</code>).</li>
<li>☐ Config options documented and translations available.</li></ul>', 'images/photos/city-traffic.jpg', 1, NOW() - INTERVAL 5 DAY);

INSERT IGNORE INTO `documentation` (`id`, `title`, `slug`, `type`, `category`, `excerpt`, `content`, `thumbnail`, `is_published`, `created_at`) VALUES
('d0000000-0000-0000-0000-000000000014', 'Useful free tools for FiveM developers', 'useful-dev-tools', 'tool', 'Development', 'Editors, map tools and debugging helpers we use every day.', '<ul><li><b>Visual Studio Code</b> with a Lua extension — autocomplete and error highlighting for scripts.</li>
<li><b>txAdmin</b> — built into the server; restarts, logs, player management and scheduled restarts.</li>
<li><b>HeidiSQL</b> — a free database client for importing .sql files and editing data.</li>
<li><b>CodeWalker</b> — explore the map, find coordinates and edit YMAP files.</li>
<li><b>OpenIV</b> — inspect game files, vehicles and textures.</li>
<li><b>The FiveM native reference</b> — documentation for every native function.</li>
<li><b>The built-in profiler and resmon</b> — find performance problems (see our <a href="documentation.html?type=tutorial&slug=reduce-resmon">resmon guide</a>).</li></ul>', 'images/photos/default.jpg', 1, NOW() - INTERVAL 4 DAY);

INSERT IGNORE INTO `documentation` (`id`, `title`, `slug`, `type`, `category`, `excerpt`, `content`, `thumbnail`, `is_published`, `created_at`) VALUES
('d0000000-0000-0000-0000-000000000015', 'Welcome to the new FiveMDepot', 'welcome-to-the-new-fivemdepot', 'blog', 'News', 'A brand-new store: categories, server packs, instant library downloads and a seller program.', '<p>We rebuilt FiveMDepot from the ground up to make finding and buying resources for your server faster and safer.</p>
<h2>What’s new</h2>
<ul><li><b>Smarter categories</b> — Scripts, Maps &amp; MLOs, Vehicles, Clothes and Complete Server Packs, with filters for QBCore, ESX and QBox.</li>
<li><b>Your library</b> — every purchase in one place with one-click downloads and free updates.</li>
<li><b>Server packs</b> — launch a full server in minutes.</li>
<li><b>Seller program</b> — creators can now sell on FiveMDepot, with every product reviewed before it goes live.</li>
<li><b>Local payments</b> — bKash, Nagad and bank transfer.</li></ul>
<p>Thanks for being part of the community. Join our Discord to tell us what you want to see next!</p>', 'images/photos/hero-city.jpg', 1, NOW() - INTERVAL 3 DAY);

INSERT IGNORE INTO `documentation` (`id`, `title`, `slug`, `type`, `category`, `excerpt`, `content`, `thumbnail`, `is_published`, `created_at`) VALUES
('d0000000-0000-0000-0000-000000000016', 'QBCore vs ESX vs QBox: which framework should you pick?', 'qbcore-vs-esx-vs-qbox', 'blog', 'Guides', 'A practical comparison for new server owners.', '<p>Your framework decides which scripts you can use, so it is the first big decision for a new roleplay server.</p>
<h2>QBCore</h2>
<p>Very popular, with a huge number of free and paid resources and an easy txAdmin recipe. A great default for most new servers.</p>
<h2>ESX</h2>
<p>The oldest of the three, with years of resources available. Modern ESX Legacy is far faster than old versions — avoid outdated forks.</p>
<h2>QBox</h2>
<p>A newer project built on QBCore’s ideas with a strong focus on performance and the ox_lib ecosystem. Many QBCore scripts work with it through a compatibility bridge.</p>
<h2>Our advice</h2>
<ul><li>Starting from zero and want the most choice? <b>QBCore</b>.</li><li>Already running ESX with lots of custom code? Stay on <b>ESX Legacy</b>.</li><li>Want a modern, performance-first base and comfortable with newer tooling? <b>QBox</b>.</li></ul>
<p>Every product page on FiveMDepot shows which frameworks it supports — use the <b>Framework</b> filter in the store.</p>', 'images/photos/scripts.jpg', 1, NOW() - INTERVAL 2 DAY);

INSERT IGNORE INTO `documentation` (`id`, `title`, `slug`, `type`, `category`, `excerpt`, `content`, `thumbnail`, `is_published`, `created_at`) VALUES
('d0000000-0000-0000-0000-000000000017', 'Why optimised resources matter for your player count', 'why-buy-optimized-resources', 'blog', 'Performance', 'Low resmon means higher FPS, fewer crashes and players who stay.', '<p>Players leave servers that stutter. Every script you add costs a little CPU time every frame — and it adds up fast.</p>
<p>Fifty scripts each idling at 0.10 ms cost 5 ms per frame, enough to drop a 60 FPS game to around 45 FPS on mid-range PCs. The same fifty scripts at 0.01 ms cost just 0.5 ms.</p>
<h2>What we check</h2>
<ul><li>Idle resmon on a clean server.</li><li>Server-side event security.</li><li>No backdoors or hidden web requests.</li><li>Clean install with the listed framework.</li></ul>
<p>That is why every product on FiveMDepot goes through review before it is published. Learn to check your own resources with our <a href="documentation.html?type=tutorial&slug=reduce-resmon">resmon tutorial</a>.</p>', 'images/photos/vehicles.jpg', 1, NOW() - INTERVAL 1 DAY);

INSERT IGNORE INTO `documentation` (`id`, `title`, `slug`, `type`, `category`, `excerpt`, `content`, `thumbnail`, `is_published`, `created_at`) VALUES
('d0000000-0000-0000-0000-000000000018', 'Creators: start selling your scripts on FiveMDepot', 'start-selling-on-fivemdepot', 'blog', 'Sellers', 'Reach server owners, get paid by bKash, Nagad or bank, and keep full credit for your work.', '<p>Building great resources? Turn them into income.</p>
<ul><li><b>Simple uploads</b> — add a description, screenshots, tags and your file.</li>
<li><b>Fair review</b> — we check quality and security, and tell you exactly what to change if needed.</li>
<li><b>Fast payouts</b> — earnings go to your wallet with every verified sale; withdraw to bKash, Nagad or bank.</li>
<li><b>Your own seller page</b> with all your products and reviews.</li></ul>
<p>Read the <a href="documentation.html?type=doc&slug=seller-guide">seller guide</a> and <a href="dashboard/buyer.html?tab=sell">apply here</a>.</p>', 'images/photos/server-packs.jpg', 1, NOW() - INTERVAL 0 DAY);

INSERT IGNORE INTO `migrations` (`name`) VALUES ('003_content');
