-- ============================================================
-- FiveMDepot — 013 Resources: 19 new articles (tools: oxmysql, MariaDB, HeidiSQL, txAdmin, artifacts,
-- CodeWalker; tutorials, blog posts, help docs) and new cover images for every article.
-- Covers live in images/articles/. Run after 012. Safe to re-run.
-- ============================================================

SET NAMES utf8mb4;

INSERT INTO `documentation` (`id`, `title`, `slug`, `type`, `category`, `excerpt`, `content`, `thumbnail`, `is_published`, `created_at`) VALUES
('d0000000-0000-0000-0000-000000000020', 'oxmysql: install, connect and use it in your scripts', 'oxmysql-setup-guide', 'tool', 'Database', 'The database connector almost every modern FiveM framework uses — how to install it, write the connection string and query safely.', '<p><b>oxmysql</b> is the MySQL/MariaDB connector made by Overextended. QBCore, QBox and current ESX all use it, so it is usually the first resource your server starts.</p>
<h2>1. Download</h2>
<p>Get the latest <b>release</b> (not the source code) from <a href="https://github.com/overextended/oxmysql/releases">github.com/overextended/oxmysql/releases</a> and extract the <code>oxmysql</code> folder into your <code>resources</code> folder.</p>
<h2>2. Connection string</h2>
<p>Add this line to <code>server.cfg</code> <b>above</b> the line that starts oxmysql:</p>
<pre>set mysql_connection_string "mysql://fivem:YourPassword@127.0.0.1:3306/fivem?charset=utf8mb4"</pre>
<p>The parts are <code>user:password@host:port/database</code>. If your password contains special characters such as <code>@</code> or <code>#</code>, URL-encode them (for example <code>@</code> becomes <code>%40</code>).</p>
<h2>3. Start order</h2>
<pre>ensure oxmysql
ensure ox_lib
ensure qb-core   # or es_extended / qbx_core</pre>
<p>oxmysql must start before anything that uses the database.</p>
<h2>4. Use it in your own resources</h2>
<p>In <code>fxmanifest.lua</code>:</p>
<pre>server_scripts {
    ''@oxmysql/lib/MySQL.lua'',
    ''server/*.lua''
}</pre>
<p>Then query with parameters — never build SQL by joining strings:</p>
<pre>local row = MySQL.single.await(''SELECT money FROM players WHERE citizenid = ?'', { cid })
MySQL.update.await(''UPDATE players SET money = ? WHERE citizenid = ?'', { json.encode(money), cid })
local id = MySQL.insert.await(''INSERT INTO bans (license, reason) VALUES (?, ?)'', { license, reason })</pre>
<h2>Useful settings</h2>
<ul>
<li><code>set mysql_slow_query_warning 150</code> — warns in the console when a query takes longer than 150 ms.</li>
<li><code>set mysql_debug false</code> — keep it off on a live server; turn it on only while hunting a bug.</li>
</ul>
<h2>Common errors</h2>
<ul>
<li><b>Access denied for user</b> — wrong user or password, or the user has no rights on that database (see our MariaDB guide).</li>
<li><b>ECONNREFUSED</b> — the database server is not running, or the host/port is wrong.</li>
<li><b>Unknown database</b> — create the database first, then import your framework’s SQL file.</li>
</ul>', 'images/articles/oxmysql-setup-guide.webp', 1, NOW() - INTERVAL 6 DAY),
('d0000000-0000-0000-0000-000000000021', 'MariaDB for FiveM: install, create the database and stay safe', 'mariadb-for-fivem', 'tool', 'Database', 'Install MariaDB on Windows or Linux, create a dedicated database and user for your server, and keep it secure.', '<p><b>MariaDB</b> is a free, open-source database that works as a drop-in replacement for MySQL. It is fast, stable and what most FiveM hosts recommend.</p>
<h2>Which version?</h2>
<p>Use a current <b>long-term support (LTS)</b> release, such as 10.11 or 11.4. LTS versions get security fixes for years.</p>
<h2>Install on Windows</h2>
<ol>
<li>Download the MSI installer from <a href="https://mariadb.org/download/">mariadb.org/download</a>.</li>
<li>Set a strong <b>root password</b> during setup and keep port <code>3306</code>.</li>
<li>Leave “Enable access from remote machines for root” <b>unchecked</b>.</li>
</ol>
<h2>Install on Ubuntu / Debian</h2>
<pre>sudo apt update
sudo apt install mariadb-server
sudo mysql_secure_installation</pre>
<p>Answer yes to removing anonymous users, disabling remote root login and removing the test database.</p>
<h2>Create a database and user for FiveM</h2>
<p>Never let your server log in as root. Create its own user:</p>
<pre>CREATE DATABASE fivem CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER ''fivem''@''localhost'' IDENTIFIED BY ''a-long-random-password'';
GRANT ALL PRIVILEGES ON fivem.* TO ''fivem''@''localhost'';
FLUSH PRIVILEGES;</pre>
<p>Then import your framework’s SQL file (for example <code>qbcore.sql</code>) into the <code>fivem</code> database with HeidiSQL or the command line:</p>
<pre>mysql -u fivem -p fivem &lt; qbcore.sql</pre>
<h2>Keep it secure</h2>
<ul>
<li>Do not open port 3306 in your firewall — FiveM and the database run on the same machine.</li>
<li>Use a different password for the database than for anything else.</li>
<li>Back it up every day (see our backup tutorial).</li>
</ul>', 'images/articles/mariadb-for-fivem.webp', 1, NOW() - INTERVAL 6 DAY),
('d0000000-0000-0000-0000-000000000022', 'HeidiSQL: manage your FiveM database with a free GUI', 'heidisql-guide', 'tool', 'Database', 'Browse players, fix data, import SQL files and export backups — without typing commands.', '<p><b>HeidiSQL</b> is a free database client for Windows. It is the easiest way to look inside your FiveM database.</p>
<h2>Connect</h2>
<ol>
<li>Download it from <a href="https://www.heidisql.com/download.php">heidisql.com</a>.</li>
<li>Click <b>New</b>, choose <i>MariaDB or MySQL (TCP/IP)</i>.</li>
<li>Hostname <code>127.0.0.1</code>, user <code>fivem</code>, your password, port <code>3306</code>, then <b>Open</b>.</li>
</ol>
<h2>Import a resource’s SQL file</h2>
<p>Select your database on the left, then <b>File → Run SQL file…</b> and pick the <code>.sql</code> file that came with the resource.</p>
<h2>Export a backup</h2>
<p>Right-click the database → <b>Export database as SQL</b>. Tick <i>Create</i> for tables and <i>Insert</i> for data, and save the file somewhere safe.</p>
<h2>Handy tips</h2>
<ul>
<li>Use the <b>Filter</b> box above a table to find a player by citizen ID or license.</li>
<li>Edit a value by double-clicking it — but stop the server first so it does not overwrite your change.</li>
<li>On a remote VPS, connect through an <b>SSH tunnel</b> (Settings → SSH tunnel) instead of opening port 3306.</li>
</ul>', 'images/articles/heidisql-guide.webp', 1, NOW() - INTERVAL 5 DAY),
('d0000000-0000-0000-0000-000000000023', 'txAdmin: the control panel built into your FiveM server', 'txadmin-guide', 'tool', 'Server management', 'Deploy a framework in minutes, schedule restarts, manage players and watch the live console from your browser.', '<p><b>txAdmin</b> comes with every FiveM server build. It is a web panel to start, stop and manage your server.</p>
<h2>First start</h2>
<ol>
<li>Run <code>FXServer.exe</code> (Windows) or <code>./run.sh</code> (Linux) <b>without</b> extra arguments.</li>
<li>Open <code>http://localhost:40120</code>, enter the PIN shown in the console and link your Cfx.re account.</li>
<li>Choose <b>Popular recipes</b> to deploy QBCore, QBox or ESX automatically, or point it at your own server data folder.</li>
</ol>
<h2>Features you should use</h2>
<ul>
<li><b>Scheduled restarts</b> — restart every 6–8 hours to keep memory usage low; players get warnings first.</li>
<li><b>Live console</b> — run commands and see errors without remote desktop.</li>
<li><b>Players &amp; bans</b> — warn, kick and ban, with history per player.</li>
<li><b>Admins</b> — give staff their own logins with limited permissions instead of sharing yours.</li>
<li><b>Diagnostics</b> — check CPU, memory and resource performance.</li>
</ul>
<h2>Security</h2>
<p>Port <code>40120</code> is the admin panel. On a VPS, allow it only from your own IP, or reach it through an SSH tunnel.</p>', 'images/articles/txadmin-guide.webp', 1, NOW() - INTERVAL 5 DAY),
('d0000000-0000-0000-0000-000000000024', 'FXServer artifacts: choose and update your server build', 'fxserver-artifacts', 'tool', 'Server management', 'What artifacts are, which build to pick and how to update without losing your server data.', '<p>The FiveM server program is called <b>FXServer</b>, and each downloadable build is an <b>artifact</b>.</p>
<h2>Where to download</h2>
<ul>
<li>Windows: <a href="https://runtime.fivem.net/artifacts/fivem/build_server_windows/master/">runtime.fivem.net/artifacts/fivem/build_server_windows/master</a></li>
<li>Linux: <a href="https://runtime.fivem.net/artifacts/fivem/build_proot_linux/master/">runtime.fivem.net/artifacts/fivem/build_proot_linux/master</a></li>
</ul>
<p>Pick the build marked <b>recommended</b> unless a resource tells you it needs a newer one.</p>
<h2>Keep two folders</h2>
<pre>server/        ← the artifact (FXServer.exe, citizen/ ...)
server-data/   ← your resources, server.cfg, txData</pre>
<p>Because your files live in <code>server-data</code>, updating is safe: stop the server, delete the contents of <code>server/</code>, extract the new artifact there and start again.</p>
<h2>When to update</h2>
<ul>
<li>When txAdmin or the console says your build is outdated or unsupported.</li>
<li>When a new game build (DLC) is released and you want its content.</li>
<li>Test a new artifact on a copy of your server first if you run many resources.</li>
</ul>', 'images/articles/fxserver-artifacts.webp', 1, NOW() - INTERVAL 4 DAY),
('d0000000-0000-0000-0000-000000000025', 'CodeWalker: explore the map, find coordinates and edit ymaps', 'codewalker-for-mlos', 'tool', 'Maps & MLOs', 'The free GTA V map editor every MLO and mapping creator uses — what it can do for a server owner.', '<p><b>CodeWalker</b> is a free tool that loads the whole GTA V world so you can fly around it, inspect props and edit map files.</p>
<h2>What server owners use it for</h2>
<ul>
<li><b>Finding coordinates</b> for blips, job locations and teleports.</li>
<li><b>Checking where an MLO sits</b> and whether two maps overlap before you install both.</li>
<li><b>Removing or moving props</b> in a <code>.ymap</code> file, for example a fence blocking an entrance.</li>
</ul>
<h2>Getting started</h2>
<ol>
<li>Download the latest release from the official CodeWalker GitHub or its Discord.</li>
<li>Point it at your GTA V install folder on first launch.</li>
<li>Use <b>WASD</b> to fly, hold the right mouse button to look around, and open the <b>Project</b> window to edit files.</li>
</ol>
<h2>Tips</h2>
<ul>
<li>Always edit a <b>copy</b> of a map file and keep the original.</li>
<li>Overlapping MLOs cause flickering walls — move or remove one of them.</li>
<li>After editing, restart the map resource and clear the server cache.</li>
</ul>', 'images/articles/codewalker-for-mlos.webp', 1, NOW() - INTERVAL 3 DAY),
('d0000000-0000-0000-0000-000000000030', 'Back up your FiveM database automatically every day', 'backup-fivem-database', 'tutorial', 'Database', 'A one-line backup command plus a scheduled task, so a bad update or crash never wipes your players’ progress.', '<p>Your database holds every character, vehicle and house. Back it up every day — it takes five minutes to set up.</p>
<h2>1. The backup command</h2>
<pre>mysqldump -u fivem -p --single-transaction --routines fivem &gt; fivem-backup.sql</pre>
<p><code>--single-transaction</code> takes a consistent copy without stopping the server.</p>
<h2>2. Windows: Task Scheduler</h2>
<p>Create <code>backup.bat</code>:</p>
<pre>@echo off
set D=%date:~-4%-%date:~3,2%-%date:~0,2%
"C:\\Program Files\\MariaDB 11.4\\bin\\mysqldump.exe" -u fivem -pYourPassword --single-transaction fivem &gt; "D:\\backups\\fivem-%D%.sql"</pre>
<p>Open Task Scheduler → <b>Create Basic Task</b> → Daily at 04:00 → start <code>backup.bat</code>.</p>
<h2>3. Linux: cron</h2>
<pre>0 4 * * * mysqldump -u fivem -pYourPassword --single-transaction fivem | gzip &gt; /home/fivem/backups/fivem-$(date +\\%F).sql.gz</pre>
<h2>4. Keep copies somewhere else</h2>
<ul>
<li>Delete backups older than 14 days so the disk does not fill up.</li>
<li>Copy them off the server (cloud storage or your PC) — a backup on the same disk dies with the disk.</li>
<li>Test a restore once: <code>mysql -u fivem -p fivem &lt; fivem-backup.sql</code> on a test database.</li>
</ul>', 'images/articles/backup-fivem-database.webp', 1, NOW() - INTERVAL 5 DAY),
('d0000000-0000-0000-0000-000000000031', 'Run a FiveM server on a Linux VPS (Ubuntu)', 'linux-vps-fivem-server', 'tutorial', 'Hosting', 'From a fresh Ubuntu VPS to a running server with txAdmin, a firewall and automatic start.', '<p>A Linux VPS is the cheapest way to run a stable 24/7 server. This guide uses Ubuntu 22.04 or 24.04.</p>
<h2>1. Create a user</h2>
<pre>adduser fivem
usermod -aG sudo fivem
su - fivem</pre>
<h2>2. Download FXServer</h2>
<pre>mkdir -p ~/server &amp;&amp; cd ~/server
wget &lt;link to the latest recommended fx.tar.xz&gt;
tar xf fx.tar.xz</pre>
<p>Copy the <code>fx.tar.xz</code> link from the Linux artifacts page (see our artifacts guide).</p>
<h2>3. Database</h2>
<p>Install MariaDB and create a <code>fivem</code> database and user — follow our MariaDB guide.</p>
<h2>4. Firewall</h2>
<pre>sudo ufw allow OpenSSH
sudo ufw allow 30120/tcp
sudo ufw allow 30120/udp
sudo ufw allow from YOUR.HOME.IP to any port 40120
sudo ufw enable</pre>
<h2>5. First start with txAdmin</h2>
<pre>cd ~/server &amp;&amp; ./run.sh</pre>
<p>Open <code>http://SERVER-IP:40120</code>, enter the PIN and deploy your framework.</p>
<h2>6. Keep it running</h2>
<p>Run it inside <code>tmux</code> (<code>tmux new -s fivem</code>, then <code>./run.sh</code>, detach with Ctrl+B then D), or create a systemd service so it starts after a reboot.</p>', 'images/articles/linux-vps-fivem-server.webp', 1, NOW() - INTERVAL 4 DAY),
('d0000000-0000-0000-0000-000000000032', 'Add a custom job to QBCore', 'qbcore-add-custom-job', 'tutorial', 'QBCore', 'Create a new job with grades and salaries in shared/jobs.lua and give it to a player.', '<p>Jobs in QBCore are defined in one file: <code>qb-core/shared/jobs.lua</code>.</p>
<h2>1. Add the job</h2>
<pre>[''taxi''] = {
    label = ''Downtown Cab Co.'',
    type = ''taxi'',
    defaultDuty = true,
    offDutyPay = false,
    grades = {
        [''0''] = { name = ''Driver'', payment = 50 },
        [''1''] = { name = ''Senior Driver'', payment = 75 },
        [''2''] = { name = ''Boss'', isboss = true, payment = 120 },
    },
},</pre>
<p>Grades are strings starting at <code>''0''</code>. <code>payment</code> is the paycheck each interval. <code>isboss</code> unlocks the boss menu.</p>
<h2>2. Restart</h2>
<p>Restart the whole server — <code>qb-core</code> shares jobs with every resource on start.</p>
<h2>3. Give the job</h2>
<pre>/setjob [player id] taxi 0</pre>
<h2>4. Make it useful</h2>
<ul>
<li>Add a duty point, garage and stash for the job in your target/zone script.</li>
<li>Add the job to <code>qb-management</code> so the boss can hire and fire.</li>
<li>Check scripts that test <code>PlayerData.job.name == ''taxi''</code> use the exact same name.</li>
</ul>', 'images/articles/qbcore-add-custom-job.webp', 1, NOW() - INTERVAL 4 DAY),
('d0000000-0000-0000-0000-000000000033', 'Switch old resources from mysql-async to oxmysql', 'migrate-to-oxmysql', 'tutorial', 'Database', 'Older scripts still load mysql-async or ghmattimysql. Here is how to move them to oxmysql safely.', '<p>mysql-async and ghmattimysql are no longer maintained. oxmysql is faster and supports the same style of queries.</p>
<h2>1. Replace the include</h2>
<p>In each old resource’s <code>fxmanifest.lua</code> (or <code>__resource.lua</code>):</p>
<pre>-- before
server_script ''@mysql-async/lib/MySQL.lua''
-- after
server_script ''@oxmysql/lib/MySQL.lua''</pre>
<h2>2. Remove the old connectors</h2>
<p>Delete or stop <code>mysql-async</code> and <code>ghmattimysql</code>, and remove their <code>ensure</code> lines from <code>server.cfg</code>. Keep only <code>ensure oxmysql</code>.</p>
<h2>3. Update old functions</h2>
<pre>MySQL.Async.fetchAll(q, p, cb)   →  MySQL.query(q, p, cb)
MySQL.Async.execute(q, p, cb)    →  MySQL.update(q, p, cb)
MySQL.Async.insert(q, p, cb)     →  MySQL.insert(q, p, cb)
MySQL.Sync.fetchScalar(q, p)     →  MySQL.scalar.await(q, p)</pre>
<p>oxmysql still understands the old <code>MySQL.Async</code> names, but updating them makes the code clearer.</p>
<h2>4. Test</h2>
<p>Start the server and watch the console for <code>No such export</code> errors — they show which resource still points to the old connector.</p>', 'images/articles/migrate-to-oxmysql.webp', 1, NOW() - INTERVAL 3 DAY),
('d0000000-0000-0000-0000-000000000034', 'Install a complete server pack step by step', 'install-a-server-pack', 'tutorial', 'Server packs', 'Database, server.cfg, licence key and first login — everything to go from download to a live server.', '<p>A server pack contains the framework, scripts, maps and an SQL file. Here is how to get one running.</p>
<h2>1. Prepare</h2>
<ul>
<li>Install the recommended FXServer artifact (see our artifacts guide).</li>
<li>Install MariaDB and create an empty database and user.</li>
</ul>
<h2>2. Import the database</h2>
<p>Open HeidiSQL, select your database and run the pack’s <code>.sql</code> file.</p>
<h2>3. Configure server.cfg</h2>
<pre>set mysql_connection_string "mysql://fivem:password@127.0.0.1/fivem?charset=utf8mb4"
sv_licenseKey "your key from portal.cfx.re"
sv_hostname "My Server"
sets sv_projectName "My Server"
set steam_webApiKey ""</pre>
<p>Get a free licence key at <a href="https://portal.cfx.re">portal.cfx.re</a> → Server Registration Keys.</p>
<h2>4. Start it</h2>
<p>Start through txAdmin and point it at the pack folder, or run <code>FXServer.exe +exec server.cfg</code> from the pack folder.</p>
<h2>5. Make yourself admin</h2>
<pre>add_principal identifier.license:YOURLICENSE group.admin</pre>
<p>Your license is shown in the txAdmin player list or the server console when you join.</p>
<h2>6. Customise</h2>
<p>Change the server name, logo, loading screen, prices and jobs. Keep a copy of the original pack so you can compare when something breaks.</p>', 'images/articles/install-a-server-pack.webp', 1, NOW() - INTERVAL 2 DAY),
('d0000000-0000-0000-0000-000000000040', '7 mistakes new FiveM server owners make (and how to avoid them)', 'mistakes-new-server-owners-make', 'blog', 'Guides', 'Too many scripts, no backups, root database users and more — learn from the servers that did not make it.', '<p>Most new servers fail for the same reasons. Avoid these and you are ahead of most.</p>
<h2>1. Installing every script you find</h2>
<p>Each resource costs performance and adds bugs. Start small, add features players actually ask for.</p>
<h2>2. No backups</h2>
<p>One bad update can wipe months of progress. Set up a daily database backup on day one.</p>
<h2>3. Running the database as root</h2>
<p>Create a dedicated database user with access to one database only.</p>
<h2>4. Ignoring resmon</h2>
<p>Check <code>resmon 1</code> regularly. Anything above 0.10 ms idle deserves a look.</p>
<h2>5. Using leaked resources</h2>
<p>Leaked scripts often contain backdoors that give strangers admin access. Buy from the creator.</p>
<h2>6. No rules or staff structure</h2>
<p>Write clear rules before you open and give staff their own txAdmin accounts.</p>
<h2>7. Changing everything at once</h2>
<p>Update one thing at a time on a test server, then move it to live.</p>', 'images/articles/mistakes-new-server-owners-make.webp', 1, NOW() - INTERVAL 6 DAY),
('d0000000-0000-0000-0000-000000000041', 'How to grow your FiveM roleplay community', 'grow-your-roleplay-community', 'blog', 'Community', 'Practical ways to get your first 50 regular players — and keep them.', '<p>Getting players is hard; keeping them is harder. These are the things that work.</p>
<h2>Give the server an identity</h2>
<p>Pick a clear theme — serious RP, PVP, gangs, economy — and build around it instead of copying every other server.</p>
<h2>Make the first hour great</h2>
<p>A clean character creator, a starter guide and a staff member who says hello turn visitors into regulars.</p>
<h2>Post clips, not ads</h2>
<p>Short gameplay clips on TikTok, YouTube Shorts and Discord show what your server feels like better than any banner.</p>
<h2>Listen and update</h2>
<p>Run a suggestions channel and ship small updates every week. Players stay where things keep improving.</p>
<h2>Keep performance high</h2>
<p>Nobody stays on a laggy server. Optimised resources and scheduled restarts matter more than another feature.</p>', 'images/articles/grow-your-roleplay-community.webp', 1, NOW() - INTERVAL 5 DAY),
('d0000000-0000-0000-0000-000000000042', 'VPS, dedicated or game host? Choosing hosting for FiveM', 'choosing-fivem-hosting', 'blog', 'Hosting', 'What each option costs, how many players it handles and which one fits your server.', '<p>Your hosting decides how smooth the server feels. Here is how the options compare.</p>
<h2>Game server hosts</h2>
<p>Easiest to start: a control panel, one-click installs and support. Less control and often more expensive per player slot.</p>
<h2>VPS</h2>
<p>A virtual server you manage yourself. Great value for up to around 64 players if you pick a provider with fast CPUs and NVMe storage.</p>
<h2>Dedicated server</h2>
<p>A whole machine for you. The best performance for large servers with heavy scripts, at a higher monthly price.</p>
<h2>What matters most</h2>
<ul>
<li><b>Single-core CPU speed</b> — FiveM’s main thread loves high clock speeds.</li>
<li><b>RAM</b> — 8 GB minimum, 16 GB for big packs.</li>
<li><b>NVMe storage</b> for fast database queries.</li>
<li><b>DDoS protection</b> and a data centre close to your players.</li>
</ul>', 'images/articles/choosing-fivem-hosting.webp', 1, NOW() - INTERVAL 4 DAY),
('d0000000-0000-0000-0000-000000000043', 'What is OneSync and does your server need it?', 'what-is-onesync', 'blog', 'Guides', 'OneSync explained in plain words: player slots, entity syncing and how to turn it on.', '<p><b>OneSync</b> is FiveM’s server-side synchronisation. The server, instead of one player’s game, keeps track of players, vehicles and objects.</p>
<h2>Why it matters</h2>
<ul>
<li>It is required for more than 32 players.</li>
<li>It makes syncing more reliable and lets scripts control entities from the server.</li>
<li>Most modern frameworks and scripts expect it to be on.</li>
</ul>
<h2>Turn it on</h2>
<pre>set onesync on
sv_maxclients 48</pre>
<p>In txAdmin you can also set OneSync in the server settings.</p>
<h2>Player slots</h2>
<p>A free Cfx.re licence key covers smaller servers. Larger slot counts need a paid Cfx.re subscription — check the current limits on the Cfx.re portal.</p>', 'images/articles/what-is-onesync.webp', 1, NOW() - INTERVAL 3 DAY),
('d0000000-0000-0000-0000-000000000050', 'Downloads and free updates', 'downloads-and-updates', 'doc', 'Getting started', 'Where to find your purchases, how download links work and how you get updates.', '<p>Everything you buy is saved in <a href="dashboard/buyer.html">My account → My library</a>.</p>
<h2>Downloading</h2>
<ul>
<li>Click <b>Download</b> next to the product. Downloads are available as soon as your payment is confirmed.</li>
<li>Each download link is personal and works only while you are signed in.</li>
</ul>
<h2>Updates</h2>
<ul>
<li>Updates are free for as long as we maintain the product.</li>
<li>When a new version is released, the version number in your library changes — just download again.</li>
<li>Read the changelog before updating a live server and keep a copy of your configured files.</li>
</ul>
<h2>Problems?</h2>
<p>Open a support ticket from your account or email <a href="mailto:{{support_email}}">{{support_email}}</a>.</p>', 'images/articles/downloads-and-updates.webp', 1, NOW() - INTERVAL 6 DAY),
('d0000000-0000-0000-0000-000000000051', 'Your licence explained', 'licence-explained', 'doc', 'Legal', 'What you can and cannot do with a resource you bought — in plain words.', '<p>When you buy a resource you get a personal licence to use it. The full rules are in our <a href="documentation.html?type=doc&slug=terms">Terms of Service</a>; here is the short version.</p>
<h2>You can</h2>
<ul>
<li>Use it on FiveM servers you own or manage.</li>
<li>Change the configuration and the open code for your own servers.</li>
<li>Download every future update for free.</li>
</ul>
<h2>You cannot</h2>
<ul>
<li>Resell, share, upload or give away the files — modified or not.</li>
<li>Remove licence or author notices.</li>
</ul>
<p>Sharing or reselling ends your licence. If you are unsure whether something is allowed, email <a href="mailto:{{support_email}}">{{support_email}}</a> and ask.</p>', 'images/articles/licence-explained.webp', 1, NOW() - INTERVAL 5 DAY),
('d0000000-0000-0000-0000-000000000052', 'How to get help fast', 'getting-support', 'doc', 'Getting started', 'What to include in a support request so we can fix your problem on the first reply.', '<p>We answer every request within 1–2 working days. You get a faster fix when we have everything we need straight away.</p>
<h2>Where to ask</h2>
<ul>
<li><b>Support ticket:</b> My account → Support → New ticket.</li>
<li><b>Email:</b> <a href="mailto:{{support_email}}">{{support_email}}</a></li>
</ul>
<h2>Include</h2>
<ul>
<li>The product name and your order number.</li>
<li>Your framework and version (QBCore, QBox or ESX) and your server artifact number.</li>
<li>The error from the server console and the F8 client console — a screenshot or copy is perfect.</li>
<li>What you changed just before it broke.</li>
</ul>
<h2>Orders and refunds</h2>
<p>Payments, receipts and refunds are handled by Paddle, our Merchant of Record. See our <a href="documentation.html?type=doc&slug=refunds">Refund Policy</a>.</p>', 'images/articles/getting-support.webp', 1, NOW() - INTERVAL 4 DAY),
('d0000000-0000-0000-0000-000000000053', 'Your account and security', 'account-and-security', 'doc', 'Getting started', 'Sign-in options, keeping your account safe and deleting your data.', '<h2>Signing in</h2>
<p>Create an account with your email and a password, or continue with Google or Discord. You can link or unlink Discord in <b>Account settings</b>.</p>
<h2>Keep it safe</h2>
<ul>
<li>Use a password you do not use anywhere else.</li>
<li>Never share your account — purchases are personal and shared accounts can be suspended.</li>
<li>We will never ask for your password by email or Discord.</li>
</ul>
<h2>Your data</h2>
<p>You can ask for a copy of your data or for your account to be deleted at any time — see our <a href="documentation.html?type=doc&slug=privacy">Privacy Policy</a>.</p>', 'images/articles/account-and-security.webp', 1, NOW() - INTERVAL 3 DAY)
ON DUPLICATE KEY UPDATE `title` = VALUES(`title`), `category` = VALUES(`category`), `excerpt` = VALUES(`excerpt`),
  `content` = VALUES(`content`), `thumbnail` = VALUES(`thumbnail`);

UPDATE `documentation` SET `thumbnail` = 'images/articles/terms.webp' WHERE `slug` = 'terms';
UPDATE `documentation` SET `thumbnail` = 'images/articles/privacy.webp' WHERE `slug` = 'privacy';
UPDATE `documentation` SET `thumbnail` = 'images/articles/refunds.webp' WHERE `slug` = 'refunds';
UPDATE `documentation` SET `thumbnail` = 'images/articles/how-to-buy.webp' WHERE `slug` = 'how-to-buy';
UPDATE `documentation` SET `thumbnail` = 'images/articles/install-a-resource.webp' WHERE `slug` = 'install-a-resource';
UPDATE `documentation` SET `thumbnail` = 'images/articles/contact.webp' WHERE `slug` = 'contact';
UPDATE `documentation` SET `thumbnail` = 'images/articles/setup-qbcore-server-txadmin.webp' WHERE `slug` = 'setup-qbcore-server-txadmin';
UPDATE `documentation` SET `thumbnail` = 'images/articles/reduce-resmon.webp' WHERE `slug` = 'reduce-resmon';
UPDATE `documentation` SET `thumbnail` = 'images/articles/add-addon-vehicles.webp' WHERE `slug` = 'add-addon-vehicles';
UPDATE `documentation` SET `thumbnail` = 'images/articles/install-mlo.webp' WHERE `slug` = 'install-mlo';
UPDATE `documentation` SET `thumbnail` = 'images/articles/secure-your-server.webp' WHERE `slug` = 'secure-your-server';
UPDATE `documentation` SET `thumbnail` = 'images/articles/server-cfg-template.webp' WHERE `slug` = 'server-cfg-template';
UPDATE `documentation` SET `thumbnail` = 'images/articles/resmon-checklist.webp' WHERE `slug` = 'resmon-checklist';
UPDATE `documentation` SET `thumbnail` = 'images/articles/useful-dev-tools.webp' WHERE `slug` = 'useful-dev-tools';
UPDATE `documentation` SET `thumbnail` = 'images/articles/qbcore-vs-esx-vs-qbox.webp' WHERE `slug` = 'qbcore-vs-esx-vs-qbox';
UPDATE `documentation` SET `thumbnail` = 'images/articles/why-buy-optimized-resources.webp' WHERE `slug` = 'why-buy-optimized-resources';

INSERT IGNORE INTO `migrations` (`name`) VALUES ('013_resources');
