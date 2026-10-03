/* FiveMDepot — Seller dashboard: overview, products (editor), withdrawals, profile */
(function () {
  'use strict';
  var S = window.Store, esc = S.esc;
  var nav = document.getElementById('acctNav'), page = document.getElementById('acctPage');
  var user = null, ov = null, dirty = false;
  var FRAMEWORKS = ['QBCore', 'ESX', 'QBox', 'Standalone', 'vRP'];
  var ST = { PUBLISHED: ['st-ok', 'Live'], PENDING: ['st-warn', 'In review'], DRAFT: ['st-muted', 'Draft'], REJECTED: ['st-bad', 'Changes needed'], APPROVED: ['st-ok', 'Approved'], PAID: ['st-ok', 'Paid'] };
  function badge(s) { var x = ST[s] || ['st-muted', s]; return '<span class="st ' + x[0] + '">' + x[1] + '</span>'; }
  function date(s) { var d = new Date(String(s || '').replace(' ', 'T')); return isNaN(d) ? '—' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); }
  function fail(e) { S.toast(e.message, 'error'); }
  function upload(file, kind) {
    var fd = new FormData(); fd.append('file', file); fd.append('kind', kind || 'image'); fd.append('dir', 'products');
    return S.v1('POST', 'admin/upload', fd).then(function (r) { return r.path; });
  }

  function drawNav(active) {
    nav.innerHTML = '<div class="who"><b>' + esc(user.name) + '</b><span class="muted small">Seller · wallet ' + S.money(ov.wallet) + '</span></div>' +
      [['overview', 'Overview'], ['products', 'My products'], ['new', '+ New product'], ['withdrawals', 'Withdrawals'], ['profile', 'Seller profile']].map(function (t) {
        return '<button data-tab="' + t[0] + '" class="' + (active === t[0] ? 'on' : '') + '">' + t[1] + '</button>';
      }).join('') +
      '<a href="seller-profile.html?id=' + encodeURIComponent(user.id) + '">Public page ↗</a><a href="dashboard/buyer.html">My purchases</a>' +
      '<button data-logout>Log out</button>';
  }

  function show(tab, arg) {
    dirty = false;
    history.replaceState(null, '', location.pathname + '?tab=' + tab + (arg ? '&id=' + encodeURIComponent(arg) : ''));
    drawNav(tab === 'edit' ? 'products' : tab);
    page.onclick = page.onsubmit = page.onchange = null;
    ({ overview: overview, products: products, new: function () { editor(null); }, edit: function () { editor(arg); }, withdrawals: withdrawals, profile: profile }[tab] || overview)();
  }
  nav.addEventListener('click', function (e) { var t = e.target.closest('[data-tab]'); if (t) show(t.dataset.tab); });

  // ---------- Overview ----------
  function overview() {
    var max = Math.max.apply(null, ov.chart.map(function (d) { return d.revenue; }).concat([1]));
    page.innerHTML = '<h1>Seller overview</h1>' +
      '<div class="stats"><div class="panel stat-box"><small>Wallet balance</small><b>' + S.money(ov.wallet) + '</b></div>' +
      '<div class="panel stat-box"><small>Total sales</small><b>' + ov.sales + '</b></div>' +
      '<div class="panel stat-box"><small>Gross revenue</small><b>' + S.money(ov.revenue) + '</b></div>' +
      '<div class="panel stat-box"><small>Pending payouts</small><b>' + S.money(ov.pending_withdrawals) + '</b></div></div>' +
      '<div class="panel panel-pad" style="margin-bottom:18px"><div style="display:flex;justify-content:space-between;margin-bottom:12px"><b>Sales — last 30 days</b><span class="small muted">You keep ' + (100 - ov.fee_percent) + '% of every sale</span></div>' +
      '<div style="display:flex;align-items:flex-end;gap:3px;height:140px">' + ov.chart.map(function (d) {
        return '<span title="' + esc(d.date) + ': ' + S.money(d.revenue) + '" style="flex:1;border-radius:3px 3px 0 0;background:linear-gradient(var(--accent),var(--accent-3));opacity:' + (d.revenue ? 1 : .15) + ';height:' + Math.max(3, d.revenue / max * 100) + '%"></span>';
      }).join('') + '</div></div>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn btn-primary" data-go="new">+ Add a product</button><button class="btn btn-ghost" data-go="withdrawals">Withdraw earnings</button></div>';
    page.onclick = function (e) { var g = e.target.closest('[data-go]'); if (g) show(g.dataset.go); };
  }

  // ---------- Products ----------
  function products() {
    page.innerHTML = '<div class="skeleton" style="height:240px"></div>';
    S.v1('GET', 'seller/products').then(function (rows) {
      page.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:18px"><h1 style="margin:0">My products</h1><button class="btn btn-primary btn-sm" data-go="new">+ New product</button></div>' +
        (rows.length ? '<div class="panel tbl-wrap"><table class="tbl"><thead><tr><th>Product</th><th>Status</th><th>Price</th><th>Sales</th><th>Updated</th><th></th></tr></thead><tbody>' + rows.map(function (r) {
          return '<tr><td><div class="cell-prod"><img src="' + esc(r.image || 'images/store/cat-default.svg') + '" alt="" data-fallback="images/store/cat-default.svg"><div><b>' + esc(r.title) + '</b><div class="small muted">v' + esc(r.version) + '</div></div></div></td>' +
            '<td>' + badge(r.status) + (r.status === 'REJECTED' && r.reject_reason ? '<div class="small down" style="max-width:260px;margin-top:4px">' + esc(r.reject_reason) + '</div>' : '') + '</td>' +
            '<td>' + (r.price ? S.money(r.sale_price != null ? r.sale_price : r.price) : 'Free') + '</td><td>' + r.sales + '</td><td class="small muted">' + date(r.updated_at) + '</td>' +
            '<td style="text-align:right;white-space:nowrap">' + (r.status === 'PUBLISHED' ? '<a class="btn btn-ghost btn-sm" href="' + S.productUrl(r.slug) + '" target="_blank" rel="noopener">View</a> ' : '') +
            '<button class="btn btn-ghost btn-sm" data-edit="' + esc(r.id) + '">Edit</button></td></tr>';
        }).join('') + '</tbody></table></div>' : '<div class="empty"><b>No products yet</b>Add your first product — our team reviews it before it goes live.<br><br><button class="btn btn-primary" data-go="new">+ Add a product</button></div>');
      page.onclick = function (e) {
        var g = e.target.closest('[data-go]'), ed = e.target.closest('[data-edit]');
        if (g) show(g.dataset.go);
        if (ed) show('edit', ed.dataset.edit);
      };
    }).catch(fail);
  }

  // ---------- Editor ----------
  function editor(id) {
    page.innerHTML = '<div class="skeleton" style="height:400px"></div>';
    Promise.all([id ? S.v1('GET', 'seller/products/' + encodeURIComponent(id)) : Promise.resolve(null), S.v1('GET', 'seller/tags')]).then(function (r) {
      var p = r[0] || { title: '', description: '', price: '', sale_price: null, version: '1.0.0', changelog: '', features: [], compatibility: ['QBCore'], screenshots: [], video_url: '', tag_ids: [], status: 'DRAFT', has_file: false };
      var tags = r[1], selected = (p.tag_ids || []).slice(), shots = (p.screenshots || []).slice(), filePath = null;
      var descText = (function () { var d = document.createElement('div'); d.innerHTML = (p.description || '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n'); return d.textContent.trim(); })();

      page.innerHTML = '<h1>' + (id ? 'Edit product' : 'New product') + '</h1>' +
        (p.status === 'REJECTED' && p.reject_reason ? '<div class="notice bad"><b>Changes needed:</b> ' + esc(p.reject_reason) + '</div>' : '') +
        (p.status === 'PUBLISHED' ? '<div class="notice">This product is live. Saving changes sends it back for a quick review.</div>' : '') +
        '<form id="pf" novalidate><div class="panel panel-pad" style="margin-bottom:16px">' +
          '<label class="field"><span>Title</span><input class="input" name="title" maxlength="255" value="' + esc(p.title) + '" required></label>' +
          '<label class="field"><span>Description</span><textarea class="input" name="description" rows="8" placeholder="What does it do? Requirements? Highlights?">' + esc(descText) + '</textarea></label>' +
          '<label class="field"><span>Features <small class="muted" style="font-weight:400">one per line</small></span><textarea class="input" name="features" rows="4">' + esc((p.features || []).join('\n')) + '</textarea></label>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px"><label class="field"><span>Price (USD)</span><input class="input" type="number" min="0" step="0.01" name="price" value="' + esc(p.price) + '"></label>' +
          '<label class="field"><span>Sale price</span><input class="input" type="number" min="0" step="0.01" name="sale_price" value="' + esc(p.sale_price == null ? '' : p.sale_price) + '"></label>' +
          '<label class="field"><span>Version</span><input class="input" name="version" maxlength="50" value="' + esc(p.version) + '"></label></div>' +
        '</div>' +
        '<div class="panel panel-pad" style="margin-bottom:16px"><div class="field"><span>Tags <small class="muted" style="font-weight:400">pick the tags that describe it — they decide its categories</small></span>' +
          '<div class="tag-chips" id="chips"></div><div class="tag-select"><input class="input" id="tagIn" placeholder="Type to search tags…" autocomplete="off" style="margin-top:8px"><div class="tag-menu" id="tagMenu" hidden></div></div></div>' +
          '<div class="field"><span>Works with</span><div style="display:flex;gap:14px;flex-wrap:wrap">' + FRAMEWORKS.map(function (f) {
            return '<label style="display:flex;gap:6px;align-items:center"><input type="checkbox" data-fw="' + f + '"' + ((p.compatibility || []).indexOf(f) !== -1 ? ' checked' : '') + '> ' + f + '</label>';
          }).join('') + '</div></div></div>' +
        '<div class="panel panel-pad" style="margin-bottom:16px"><div class="field"><span>Screenshots <small class="muted" style="font-weight:400">first one is the cover</small></span><div class="shots" id="shots"></div>' +
          '<label class="proof-drop"><input type="file" accept="image/png,image/jpeg,image/webp" multiple hidden id="shotIn"><b class="text-accent">Upload images</b> · PNG/JPG/WEBP up to 5 MB</label></div>' +
          '<label class="field"><span>Video preview (YouTube link)</span><input class="input" name="video_url" value="' + esc(p.video_url || '') + '" placeholder="https://youtube.com/watch?v=…"></label></div>' +
        '<div class="panel panel-pad" style="margin-bottom:16px"><div class="field"><span>Download file</span><div class="small" id="fileState">' + (p.has_file ? '✅ File attached — upload to replace' : '⚠️ No file yet') + '</div>' +
          '<label class="proof-drop" style="margin-top:8px"><input type="file" accept=".zip,.rar,.7z" hidden id="fileIn"><b class="text-accent">Upload .zip / .rar / .7z</b> · max 200 MB</label></div>' +
          '<label class="field"><span>Changelog</span><textarea class="input" name="changelog" rows="3">' + esc(p.changelog || '') + '</textarea></label></div>' +
        '<div class="form-msg notice bad" hidden></div>' +
        '<div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn btn-primary" type="submit" data-status="PENDING">Submit for review</button><button class="btn btn-ghost" type="submit" data-status="DRAFT">Save draft</button></div></form>';

      var form = page.querySelector('#pf');
      function tagById(t) { return tags.filter(function (x) { return x.id === t; })[0]; }
      function drawChips() {
        page.querySelector('#chips').innerHTML = selected.map(function (t) { var x = tagById(t); return x ? '<span class="tag-chip">' + esc(x.name) + '<button type="button" data-untag="' + esc(t) + '" aria-label="Remove">✕</button></span>' : ''; }).join('') ||
          '<span class="small muted">No tags yet</span>';
      }
      function drawMenu() {
        var q = page.querySelector('#tagIn').value.toLowerCase();
        var list = tags.filter(function (t) { return selected.indexOf(t.id) === -1 && (!q || t.name.toLowerCase().indexOf(q) !== -1); }).slice(0, 10);
        var m = page.querySelector('#tagMenu');
        m.innerHTML = list.map(function (t) { return '<button type="button" data-tag="' + esc(t.id) + '">' + esc(t.name) + '<small>' + esc(t.categories.join(', ') || t.group_name || '') + '</small></button>'; }).join('') || '<div class="small muted" style="padding:8px">No matching tags. Ask the admin to add one.</div>';
        m.hidden = false;
      }
      function drawShots() {
        page.querySelector('#shots').innerHTML = shots.map(function (s, i) { return '<div class="shot"><img src="' + esc(s) + '" alt=""><button type="button" data-unshot="' + i + '" aria-label="Remove">✕</button></div>'; }).join('');
      }
      drawChips(); drawShots();
      var tagIn = page.querySelector('#tagIn');
      tagIn.addEventListener('input', drawMenu);
      tagIn.addEventListener('focus', drawMenu);
      tagIn.addEventListener('blur', function () { setTimeout(function () { page.querySelector('#tagMenu').hidden = true; }, 150); });
      page.querySelector('#tagMenu').addEventListener('mousedown', function (e) {
        e.preventDefault();
        var b = e.target.closest('[data-tag]'); if (!b) return;
        selected.push(b.dataset.tag); tagIn.value = ''; drawChips(); drawMenu(); dirty = true;
      });
      page.onclick = function (e) {
        var u = e.target.closest('[data-untag]'), us = e.target.closest('[data-unshot]');
        if (u) { selected = selected.filter(function (x) { return x !== u.dataset.untag; }); drawChips(); dirty = true; }
        if (us) { shots.splice(+us.dataset.unshot, 1); drawShots(); dirty = true; }
      };
      form.addEventListener('input', function () { dirty = true; });
      page.querySelector('#shotIn').addEventListener('change', function (e) {
        Array.prototype.forEach.call(e.target.files, function (f) { upload(f).then(function (path) { shots.push(path); drawShots(); dirty = true; }).catch(fail); });
        e.target.value = '';
      });
      page.querySelector('#fileIn').addEventListener('change', function (e) {
        var f = e.target.files[0]; if (!f) return;
        var st = page.querySelector('#fileState'); st.textContent = 'Uploading ' + f.name + '…';
        upload(f, 'archive').then(function (path) { filePath = path; st.textContent = '✅ ' + f.name + ' uploaded — save to attach it'; dirty = true; })
          .catch(function (err) { st.textContent = '❌ ' + err.message; });
        e.target.value = '';
      });

      var submitStatus = 'PENDING';
      form.querySelectorAll('[data-status]').forEach(function (b) { b.addEventListener('click', function () { submitStatus = b.dataset.status; }); });
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var desc = form.description.value.trim();
        var payload = {
          title: form.title.value, price: form.price.value || 0, sale_price: form.sale_price.value, version: form.version.value, status: submitStatus,
          description: desc ? '<p>' + esc(desc).replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>') + '</p>' : '',
          features: form.features.value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean),
          compatibility: Array.prototype.filter.call(form.querySelectorAll('[data-fw]'), function (c) { return c.checked; }).map(function (c) { return c.dataset.fw; }),
          screenshots: shots, video_url: form.video_url.value, changelog: form.changelog.value, tag_ids: selected
        };
        if (filePath) payload.file_path = filePath;
        if (submitStatus === 'PENDING' && !selected.length) { S.toast('Add at least one tag so buyers can find it', 'error'); return; }
        var msg = form.querySelector('.form-msg'); msg.hidden = true;
        S.v1('POST', id ? 'seller/products/' + encodeURIComponent(id) : 'seller/products', payload).then(function () {
          dirty = false;
          S.toast(submitStatus === 'PENDING' ? 'Submitted for review' : 'Draft saved', 'success');
          show('products');
        }).catch(function (err) {
          msg.textContent = err.message + (err.fields ? ' ' + Object.keys(err.fields).map(function (k) { return '• ' + err.fields[k]; }).join(' ') : '');
          msg.hidden = false;
        });
      });
    }).catch(function (e) { fail(e); show('products'); });
  }

  // ---------- Withdrawals ----------
  function withdrawals() {
    S.v1('GET', 'seller/withdrawals').then(function (rows) {
      page.innerHTML = '<h1>Withdrawals</h1><div class="panel panel-pad" style="margin-bottom:18px;max-width:620px">' +
        '<p class="muted" style="margin-bottom:14px">Available: <b style="color:var(--text);font-size:18px">' + S.money(ov.wallet) + '</b> · minimum $5</p>' +
        '<form id="wf" novalidate><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><label class="field"><span>Amount</span><input class="input" type="number" min="5" step="0.01" name="amount" max="' + ov.wallet + '"></label>' +
        '<label class="field"><span>Method</span><select class="input" name="method"><option value="BKASH">bKash</option><option value="NAGAD">Nagad</option><option value="BANK_TRANSFER">Bank transfer</option></select></label></div>' +
        '<label class="field"><span>Account number / details</span><input class="input" name="account_info" maxlength="500" placeholder="01XXXXXXXXX or bank account details"></label>' +
        '<button class="btn btn-primary" type="submit"' + (ov.wallet < 5 ? ' disabled' : '') + '>Request withdrawal</button></form></div>' +
        (rows.length ? '<div class="panel tbl-wrap"><table class="tbl"><thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Status</th></tr></thead><tbody>' + rows.map(function (w) {
          return '<tr><td>' + date(w.created_at) + '</td><td><b>' + S.money(w.amount) + '</b></td><td>' + esc(w.method) + '<div class="small muted">' + esc(w.account_info) + '</div></td><td>' + badge(w.status) +
            (w.rejected_reason ? '<div class="small down">' + esc(w.rejected_reason) + '</div>' : '') + '</td></tr>';
        }).join('') + '</tbody></table></div>' : '');
      page.onsubmit = function (e) {
        e.preventDefault();
        var f = e.target;
        S.v1('POST', 'seller/withdrawals', { amount: f.amount.value, method: f.method.value, account_info: f.account_info.value }).then(function () {
          S.toast('Withdrawal requested', 'success');
          return S.v1('GET', 'seller/overview').then(function (o) { ov = o; show('withdrawals'); });
        }).catch(fail);
      };
    }).catch(fail);
  }

  // ---------- Profile ----------
  function profile() {
    var pr = ov.profile || {};
    page.innerHTML = '<h1>Seller profile</h1><div class="panel panel-pad" style="max-width:620px"><form id="sp">' +
      '<label class="field"><span>About you (shown on your public page)</span><textarea class="input" name="bio" rows="5" maxlength="1000">' + esc(pr.bio || '') + '</textarea></label>' +
      '<label class="field"><span>Discord username</span><input class="input" name="discord_tag" maxlength="100" value="' + esc(pr.discord_tag || '') + '"></label>' +
      '<button class="btn btn-primary" type="submit">Save</button> <a class="btn btn-ghost" href="seller-profile.html?id=' + encodeURIComponent(user.id) + '" target="_blank" rel="noopener">View public page</a></form></div>';
    page.onsubmit = function (e) {
      e.preventDefault();
      S.v1('POST', 'seller/profile', { bio: e.target.bio.value, discord_tag: e.target.discord_tag.value }).then(function () {
        ov.profile = { bio: e.target.bio.value, discord_tag: e.target.discord_tag.value, status: pr.status };
        S.toast('Profile saved', 'success');
      }).catch(fail);
    };
  }

  window.addEventListener('beforeunload', function (e) { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

  S.me().then(function (u) {
    if (!u) { location.replace(S.loginUrl('dashboard/seller.html')); return; }
    if (u.role === 'BUYER') { location.replace('dashboard/buyer.html?tab=sell'); return; }
    user = u;
    return S.v1('GET', 'seller/overview').then(function (o) {
      ov = o;
      var q = new URLSearchParams(location.search);
      show(q.get('tab') || 'overview', q.get('id'));
    });
  }).catch(function (e) {
    page.innerHTML = '<div class="empty"><b>' + (e.status === 403 ? 'Seller account not active' : 'Could not load the seller dashboard') + '</b>' + esc(e.message) +
      ' <a class="link-more" href="dashboard/buyer.html">Go to my account →</a></div>';
  });
})();
