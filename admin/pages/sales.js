/* Admin — Orders, Users, Reviews, Promo codes */
(function () {
  'use strict';
  var A = window.Admin, h = A.h;

  // ============================================================
  // Orders
  // ============================================================
  function openOrder(id, onDone) {
    A.get('admin/orders/' + encodeURIComponent(id)).then(function (b) {
      var o = b.data;
      var proofs = o.proofs.map(function (p) {
        if (!+p.has_file) {
          // Buy Me a Coffee: buyer typed the receipt details — match them against the BMC dashboard
          var diff = Math.round((+p.amount - +o.total_amount) * 100) / 100;
          return '<div class="panel panel-pad pay-check"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><b>☕ Buy Me a Coffee receipt</b>' + A.badge(p.status) + '</div>' +
            '<dl class="kv"><dt>Transaction ID</dt><dd><b class="mono">' + h(p.transaction_id || '—') + '</b> <button type="button" class="btn btn-sm btn-ghost" data-copy="' + h(p.transaction_id || '') + '">Copy</button></dd>' +
            '<dt>Paid with email</dt><dd>' + h(p.payer_email || '—') + (p.payer_email && o.email && p.payer_email.toLowerCase() !== o.email.toLowerCase() ? ' <span class="small muted">(account: ' + h(o.email) + ')</span>' : '') + '</dd>' +
            '<dt>Amount paid</dt><dd><b>' + A.money(p.amount) + '</b> ' + (diff === 0 ? '<span class="st st-ok">matches total</span>' : '<span class="st st-' + (diff < 0 ? 'bad' : 'warn') + '">' + (diff < 0 ? A.money(-diff) + ' short' : A.money(diff) + ' over') + '</span>') + '</dd>' +
            '<dt>Submitted</dt><dd>' + A.date(p.created_at) + ' (' + A.ago(p.created_at) + ')</dd>' +
            (p.note ? '<dt>Buyer note</dt><dd style="white-space:pre-wrap">' + h(p.note) + '</dd>' : '') + '</dl>' +
            '<p class="small muted">Find this payment in your Buy Me a Coffee dashboard (Supporters / Payments) and check the email, amount and ID before approving.</p>' +
            (p.review_note ? '<p class="small muted">Review note: ' + h(p.review_note) + '</p>' : '') + '</div>';
        }
        return '<div class="panel panel-pad" style="display:grid;gap:8px"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap">' +
          '<span class="small">TX: <b class="mono">' + h(p.transaction_id || '—') + '</b>' + (p.sender_number ? ' · from ' + h(p.sender_number) : '') + ' · ' + A.money(p.amount) + '</span>' + A.badge(p.status) + '</div>' +
          '<a href="../api/v1.php?r=admin/proofs/' + h(p.id) + '/file" target="_blank" rel="noopener"><img class="proof-img" src="../api/v1.php?r=admin/proofs/' + h(p.id) + '/file" alt="Payment proof" onerror="this.replaceWith(Object.assign(document.createElement(\'p\'),{className:\'small down\',textContent:\'Proof image missing on the server\'}))"></a>' +
          (p.note ? '<p class="small">Buyer note: ' + h(p.note) + '</p>' : '') +
          (p.review_note ? '<p class="small muted">Note: ' + h(p.review_note) + '</p>' : '') + '</div>';
      }).join('') || '<p class="small muted">No payment details submitted.</p>';
      var pending = o.status === 'PENDING' || o.status === 'AWAITING_PAYMENT';
      var m = A.modal({
        title: 'Order ' + o.id.slice(0, 8),
        wide: true,
        body: '<div class="grid g-2" style="align-items:start"><div class="stack">' +
          '<dl class="kv"><dt>Status</dt><dd>' + A.badge(o.status) + '</dd><dt>Customer</dt><dd>' + h(o.customer) + '<br><span class="muted small">' + h(o.email) + '</span></dd>' +
          '<dt>Payment</dt><dd>' + h(o.payment_method || '—') + '</dd><dt>Transaction ID</dt><dd class="mono">' + h(o.transaction_id || o.gateway_ref || '—') + '</dd>' +
          (o.paid_at ? '<dt>Paid</dt><dd>' + A.money(o.paid_amount) + ' ' + h(o.paid_currency || '') + ' · ' + A.date(o.paid_at) + '</dd>' : '') +
          '<dt>Placed</dt><dd>' + A.date(o.created_at) + ' (' + A.ago(o.created_at) + ')</dd>' +
          (o.verified_at ? '<dt>Checked</dt><dd>' + A.date(o.verified_at) + '</dd>' : '') +
          (o.admin_note ? '<dt>Note</dt><dd>' + h(o.admin_note) + '</dd>' : '') + '</dl>' +
          '<div class="panel"><div class="list">' + o.items.map(function (i) {
            return '<div class="list-item"><span class="grow">' + (i.title ? '<a class="link" href="#/products/' + h(i.product_id) + '">' + h(i.title) + '</a>' : '<span class="muted">Deleted product</span>') + '</span><b>' + A.money(i.price_paid) + '</b></div>';
          }).join('') + '<div class="list-item"><span class="grow"><b>Total</b></span><b>' + A.money(o.total_amount) + '</b></div></div></div>' +
          '</div><div class="stack">' + proofs + '</div></div>',
        actions: pending ? [
          { label: 'Close' },
          { label: 'Reject…', kind: 'danger', onClick: function () {
            return A.ask({ title: 'Reject payment', label: 'Reason (shown to the customer)', required: true, danger: true, ok: 'Reject' }).then(function (note) {
              if (!note) return false;
              return A.post('admin/orders/' + o.id + '/verify', { decision: 'reject', note: note }).then(function () { A.toast('Order rejected'); onDone(); });
            });
          } },
          { label: 'Approve payment', kind: 'primary', onClick: function () {
            return A.post('admin/orders/' + o.id + '/verify', { decision: 'approve' }).then(function () { A.toast('Approved — customer emailed and can download now'); onDone(); });
          } }
        ] : [{ label: 'Close' }]
      });
      m.body.addEventListener('click', function (e) {
        var c = e.target.closest('[data-copy]');
        if (c && navigator.clipboard) navigator.clipboard.writeText(c.dataset.copy).then(function () { A.toast('Copied'); });
      });
    }).catch(A.fail);
  }

  A.page('/orders', function (el) {
    var q = A.query();
    var state = { status: q.get('status') || '', q: q.get('q') || '', page: +q.get('page') || 1 };
    el.innerHTML = A.head('Pay panel', 'Check each payment (Buy Me a Coffee receipt or transfer screenshot), then approve — the customer is emailed and can download right away.') +
      '<div class="panel"><div class="tabs" id="tabs"></div><div class="tools"><input class="input grow" id="oq" type="search" placeholder="Search order ID, transaction ID, customer or payment email…" value="' + h(state.q) + '"></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Order</th><th>Customer</th><th>Payment</th><th class="num">Items</th><th class="num">Total</th><th>Status</th><th>Date</th><th></th></tr></thead><tbody id="rows"></tbody></table></div><div id="pager"></div></div>';

    function load() {
      A.setQuery({ status: state.status, q: state.q, page: state.page > 1 ? state.page : '' });
      var qs = '&page=' + state.page + (state.status ? '&status=' + state.status : '') + (state.q ? '&q=' + encodeURIComponent(state.q) : '');
      return A.get('admin/orders' + qs).then(function (b) {
        var sc = b.meta.status_counts || {}, all = Object.keys(sc).reduce(function (s, k) { return s + sc[k]; }, 0);
        el.querySelector('#tabs').innerHTML = [['', 'All', all], ['PENDING', 'Needs check'], ['AWAITING_PAYMENT', 'Awaiting online payment'], ['VERIFIED', 'Paid'], ['REJECTED', 'Rejected'], ['CANCELLED', 'Cancelled'], ['REFUNDED', 'Refunded']].map(function (t) {
          return '<button class="tab' + (state.status === t[0] ? ' on' : '') + '" data-status="' + t[0] + '">' + t[1] + '<small>' + (t[2] != null ? t[2] : sc[t[0]] || 0) + '</small></button>';
        }).join('');
        el.querySelector('#rows').innerHTML = b.data.length ? b.data.map(function (o) {
          return '<tr data-id="' + h(o.id) + '" style="cursor:pointer"><td class="mono">' + h(o.id.slice(0, 8)) + '</td><td>' + h(o.customer) + '<span class="cell-sub">' + h(o.email) + '</span></td>' +
            '<td>' + h(o.payment_method || '—') + '<span class="cell-sub mono">' + h(o.transaction_id || '') + '</span></td><td class="num">' + o.items + '</td><td class="num"><b>' + A.money(o.total_amount) + '</b></td>' +
            '<td>' + A.badge(o.status) + '</td><td class="small muted">' + A.ago(o.created_at) + '</td><td class="num">' + (o.status === 'PENDING' ? '<button class="btn btn-sm btn-primary">Review</button>' : '<button class="btn btn-sm btn-ghost">View</button>') + '</td></tr>';
        }).join('') : '<tr><td colspan="8">' + A.empty('No orders', state.status === 'PENDING' ? 'Nothing waiting for a payment check.' : '') + '</td></tr>';
        var pg = el.querySelector('#pager'); pg.innerHTML = '';
        pg.appendChild(A.pager(b.meta, function (n) { state.page = n; load(); }));
      }).catch(A.fail);
    }
    function done() { A.refreshCounts(); load(); }
    el.addEventListener('click', function (e) {
      var t = e.target.closest('[data-status]');
      if (t) { state.status = t.dataset.status; state.page = 1; load(); return; }
      var tr = e.target.closest('tr[data-id]');
      if (tr) openOrder(tr.dataset.id, done);
    });
    var deb;
    el.querySelector('#oq').addEventListener('input', function (e) { clearTimeout(deb); deb = setTimeout(function () { state.q = e.target.value.trim(); state.page = 1; load(); }, 300); });
    if (q.get('id')) openOrder(q.get('id'), done);
    return load();
  });

  // ============================================================
  // Support tickets
  // ============================================================
  var TK_ST = { open: 'warn', answered: 'ok', closed: 'muted' };
  function tkBadge(s) { return '<span class="st st-' + (TK_ST[s] || 'muted') + '">' + h(s === 'open' ? 'needs reply' : s) + '</span>'; }

  function openTicket(id, cats, onDone) {
    A.get('admin/tickets/' + encodeURIComponent(id)).then(function (b) {
      var t = b.data;
      var m = A.modal({
        title: '#' + t.number + ' · ' + t.subject,
        wide: true,
        body: '<div class="grid g-2" style="align-items:start;grid-template-columns:1.6fr 1fr"><div class="stack">' +
          '<div class="tk-thread">' + t.messages.map(function (x) {
            return '<div class="tk-msg' + (x.is_staff ? ' staff' : '') + '"><div class="tk-meta"><b>' + h(x.is_staff ? (x.name || 'Staff') + ' (staff)' : (x.name || t.name)) + '</b><span class="muted small">' + A.date(x.created_at) + ' · ' + A.ago(x.created_at) + '</span></div><div class="tk-body">' + h(x.body) + '</div></div>';
          }).join('') + '</div>' +
          '<label class="field"><span>Reply (emailed to the customer)</span><textarea class="input" name="reply" rows="5" maxlength="5000" placeholder="Hi ' + h(t.name) + ', …"></textarea></label></div>' +
          '<div class="stack"><dl class="kv"><dt>Status</dt><dd>' + tkBadge(t.status) + '</dd><dt>Customer</dt><dd>' + h(t.name) + '<br><a class="link small" href="#/users?q=' + encodeURIComponent(t.email) + '">' + h(t.email) + '</a></dd>' +
          '<dt>Topic</dt><dd>' + h(cats[t.category] || t.category) + '</dd><dt>Opened</dt><dd>' + A.date(t.created_at) + '</dd>' +
          (t.order_id ? '<dt>Order</dt><dd><a class="link mono" href="#/orders?id=' + h(t.order_id) + '">' + h(t.order_id.slice(0, 8)) + '</a></dd>' : '') + '</dl>' +
          (t.orders.length ? '<div class="panel"><div class="list">' + t.orders.map(function (o) {
            return '<a class="list-item" href="#/orders?id=' + h(o.id) + '"><span class="grow mono small">' + h(o.id.slice(0, 8)) + ' · ' + h(o.payment_method || 'Free') + '</span>' + A.badge(o.status) + '<b>' + A.money(o.total_amount) + '</b></a>';
          }).join('') + '</div></div>' : '<p class="small muted">No orders from this customer.</p>') + '</div></div>',
        actions: [
          { label: 'Close' },
          { label: t.status === 'closed' ? 'Reopen' : 'Close ticket', onClick: function () {
            return A.post('admin/tickets/' + t.id + '/status', { status: t.status === 'closed' ? 'open' : 'closed' }).then(function () { A.toast('Ticket updated'); onDone(); });
          } },
          { label: 'Reply & close', onClick: function (c) { return send(c, true); } },
          { label: 'Send reply', kind: 'primary', onClick: function (c) { return send(c, false); } }
        ]
      });
      function send(c, close) {
        var msg = c.body.querySelector('[name=reply]').value.trim();
        if (msg.length < 2) { A.toast('Write a reply first', 'error'); return false; }
        return A.post('admin/tickets/' + t.id + '/reply', { message: msg, close: close }).then(function () { A.toast('Reply sent — customer emailed'); onDone(); });
      }
      var th = m.body.querySelector('.tk-thread'); th.lastElementChild && th.lastElementChild.scrollIntoView({ block: 'nearest' });
    }).catch(A.fail);
  }

  A.page('/tickets', function (el) {
    var q = A.query();
    var state = { status: q.has('status') ? q.get('status') : 'open', q: q.get('q') || '', page: 1 }, cats = {};
    el.innerHTML = A.head('Support tickets', 'Customer questions from the website. Replies are emailed to the customer.') +
      '<div class="panel"><div class="tabs" id="tabs"></div><div class="tools"><input class="input grow" id="tq" type="search" placeholder="Search subject, customer or ticket #…" value="' + h(state.q) + '"></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th>Subject</th><th>Customer</th><th>Topic</th><th class="num">Msgs</th><th>Status</th><th>Updated</th><th></th></tr></thead><tbody id="rows"></tbody></table></div><div id="pager"></div></div>';
    function load() {
      A.setQuery({ status: state.status, q: state.q });
      var qs = '&page=' + state.page + (state.status ? '&status=' + state.status : '') + (state.q ? '&q=' + encodeURIComponent(state.q) : '');
      return A.get('admin/tickets' + qs).then(function (b) {
        var sc = b.meta.status_counts || {}; cats = b.meta.categories || {};
        el.querySelector('#tabs').innerHTML = [['open', 'Needs reply'], ['answered', 'Answered'], ['closed', 'Closed'], ['', 'All']].map(function (t) {
          var n = t[0] ? sc[t[0]] || 0 : Object.keys(sc).reduce(function (s, k) { return s + sc[k]; }, 0);
          return '<button class="tab' + (state.status === t[0] ? ' on' : '') + '" data-status="' + t[0] + '">' + t[1] + '<small>' + n + '</small></button>';
        }).join('');
        el.querySelector('#rows').innerHTML = b.data.length ? b.data.map(function (t) {
          return '<tr data-id="' + h(t.id) + '" style="cursor:pointer"><td class="mono">' + t.number + '</td><td><b>' + h(t.subject) + '</b>' + (t.order_id ? '<span class="cell-sub mono">order ' + h(t.order_id.slice(0, 8)) + '</span>' : '') + '</td>' +
            '<td>' + h(t.name) + '<span class="cell-sub">' + h(t.email) + '</span></td><td class="small">' + h(cats[t.category] || t.category) + '</td><td class="num">' + t.messages + '</td>' +
            '<td>' + tkBadge(t.status) + '</td><td class="small muted">' + A.ago(t.updated_at) + '</td><td class="num"><button class="btn btn-sm ' + (t.status === 'open' ? 'btn-primary">Reply' : 'btn-ghost">View') + '</button></td></tr>';
        }).join('') : '<tr><td colspan="8">' + A.empty('No tickets', state.status === 'open' ? 'Nothing waiting for a reply.' : '') + '</td></tr>';
        var pg = el.querySelector('#pager'); pg.innerHTML = '';
        pg.appendChild(A.pager(b.meta, function (n) { state.page = n; load(); }));
      }).catch(A.fail);
    }
    function done() { A.refreshCounts(); load(); }
    el.addEventListener('click', function (e) {
      var t = e.target.closest('[data-status]');
      if (t) { state.status = t.dataset.status; state.page = 1; load(); return; }
      var tr = e.target.closest('tr[data-id]');
      if (tr) openTicket(tr.dataset.id, cats, done);
    });
    var deb;
    el.querySelector('#tq').addEventListener('input', function (e) { clearTimeout(deb); deb = setTimeout(function () { state.q = e.target.value.trim(); state.page = 1; load(); }, 300); });
    return load().then(function () { if (q.get('id')) openTicket(q.get('id'), cats, done); });
  });

  // ============================================================
  // Users
  // ============================================================
  A.page('/users', function (el) {
    var q = A.query();
    var state = { q: q.get('q') || '', role: q.get('role') || '', page: 1 };
    var rows = [];
    el.innerHTML = A.head('Users', 'Change roles or suspend accounts.') +
      '<div class="panel"><div class="tools"><input class="input grow" id="uq" type="search" placeholder="Search name or email…" value="' + h(state.q) + '">' +
      '<select class="input" id="ur"><option value="">All roles</option><option value="BUYER">Buyers</option><option value="ADMIN">Admins</option></select></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>User</th><th>Role</th><th class="num">Orders</th><th>Joined</th><th>Last login</th><th></th></tr></thead><tbody id="rows"></tbody></table></div><div id="pager"></div></div>';
    el.querySelector('#ur').value = state.role;
    function load() {
      var qs = '&page=' + state.page + (state.role ? '&role=' + state.role : '') + (state.q ? '&q=' + encodeURIComponent(state.q) : '');
      return A.get('admin/users' + qs).then(function (b) {
        rows = b.data;
        el.querySelector('#rows').innerHTML = rows.length ? rows.map(function (u) {
          return '<tr data-id="' + h(u.id) + '"><td><b>' + h(u.name) + '</b><span class="cell-sub">' + h(u.email) + '</span></td><td>' + A.badge(u.role) + (u.is_banned ? ' ' + A.badge('banned') : '') + '</td>' +
            '<td class="num">' + u.orders + '</td><td class="small muted">' + A.date(u.created_at) + '</td><td class="small muted">' + A.ago(u.last_login_at) + '</td>' +
            '<td class="num"><button class="btn btn-sm btn-ghost" data-edit>Edit</button></td></tr>';
        }).join('') : '<tr><td colspan="8">' + A.empty('No users found', '') + '</td></tr>';
        var pg = el.querySelector('#pager'); pg.innerHTML = '';
        pg.appendChild(A.pager(b.meta, function (n) { state.page = n; load(); }));
      }).catch(A.fail);
    }
    el.addEventListener('click', function (e) {
      if (!e.target.closest('[data-edit]')) return;
      var u = rows.filter(function (x) { return x.id === e.target.closest('tr').dataset.id; })[0];
      A.modal({
        title: 'Edit ' + u.name,
        body: '<form class="form-grid"><p class="muted small">' + h(u.email) + '</p>' +
          '<label class="field"><span>Role</span><select class="input" name="role">' + ['BUYER', 'ADMIN'].map(function (r) { return '<option' + (u.role === r ? ' selected' : '') + '>' + r + '</option>'; }).join('') + '</select></label>' +
          '<label class="switch"><span>Suspended<small>Suspended users are logged out and cannot log in</small></span><input type="checkbox" name="is_banned"' + (u.is_banned ? ' checked' : '') + '></label>' +
          '<label class="field"><span>Reason</span><input class="input" name="ban_reason" maxlength="255" value="' + h(u.ban_reason || '') + '"></label></form>',
        actions: [{ label: 'Cancel' }, { label: 'Save', kind: 'primary', onClick: function (c) {
          return A.post('admin/users/' + u.id, A.formData(c.body.querySelector('form'))).then(function () { A.toast('User updated'); load(); });
        } }]
      });
    });
    el.querySelector('#ur').addEventListener('change', function (e) { state.role = e.target.value; state.page = 1; load(); });
    var deb;
    el.querySelector('#uq').addEventListener('input', function (e) { clearTimeout(deb); deb = setTimeout(function () { state.q = e.target.value.trim(); state.page = 1; load(); }, 300); });
    return load();
  });

  // ============================================================
  // Reviews
  // ============================================================
  A.page('/reviews', function (el) {
    var page = 1;
    el.innerHTML = A.head('Reviews', 'Hide or delete inappropriate reviews.') + '<div class="panel"><div id="box"></div><div id="pager"></div></div>';
    function load() {
      return A.get('admin/reviews&page=' + page).then(function (b) {
        el.querySelector('#box').innerHTML = b.data.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Rating</th><th>Review</th><th>Product</th><th>By</th><th>Date</th><th></th></tr></thead><tbody>' +
          b.data.map(function (r) {
            return '<tr data-id="' + h(r.id) + '"' + (+r.is_hidden ? ' style="opacity:.55"' : '') + '><td style="color:var(--star)">' + '★★★★★'.slice(0, r.rating) + '</td><td style="max-width:420px">' + h(r.comment || '') + '</td>' +
              '<td><a class="link" target="_blank" href="../product.html?slug=' + encodeURIComponent(r.slug) + '">' + h(r.product) + '</a></td><td>' + h(r.user_name) + '</td><td class="small muted">' + A.ago(r.created_at) + '</td>' +
              '<td class="num"><button class="btn btn-sm btn-ghost" data-hide="' + (+r.is_hidden ? 0 : 1) + '">' + (+r.is_hidden ? 'Show' : 'Hide') + '</button> <button class="btn btn-sm btn-ghost" data-del>Delete</button></td></tr>';
          }).join('') + '</tbody></table></div>' : A.empty('No reviews yet', '');
        var pg = el.querySelector('#pager'); pg.innerHTML = '';
        pg.appendChild(A.pager(b.meta, function (n) { page = n; load(); }));
      }).catch(A.fail);
    }
    el.addEventListener('click', function (e) {
      var tr = e.target.closest('tr[data-id]');
      if (!tr) return;
      var hb = e.target.closest('[data-hide]');
      if (hb) A.post('admin/reviews/' + tr.dataset.id, { is_hidden: hb.dataset.hide === '1' }).then(load).catch(A.fail);
      if (e.target.closest('[data-del]')) A.confirm('Delete this review permanently?', { danger: true, ok: 'Delete' }).then(function (y) {
        if (y) A.post('admin/reviews/' + tr.dataset.id, { delete: true }).then(function () { A.toast('Review deleted'); load(); }).catch(A.fail);
      });
    });
    return load();
  });

  // ============================================================
  // Promo codes
  // ============================================================
  A.page('/promos', function (el) {
    var promos = [];
    el.innerHTML = A.head('Promo codes', 'Discount codes customers can enter at checkout.', '<button class="btn btn-sm btn-primary" id="newPromo">+ New code</button>') + '<div class="panel" id="box"></div>';
    function edit(p) {
      p = p || { code: '', type: 'percent', value: 10, min_amount: 0, max_uses: 0, expires_at: '', is_active: 1 };
      A.modal({
        title: p.id ? 'Edit ' + p.code : 'New promo code',
        body: '<form class="form-grid" novalidate><input type="hidden" name="id" value="' + h(p.id || '') + '">' +
          '<div class="row-2"><label class="field"><span>Code</span><input class="input mono" name="code" maxlength="50" value="' + h(p.code) + '" placeholder="SUMMER20" style="text-transform:uppercase"></label>' +
          '<label class="field"><span>Type</span><select class="input" name="type"><option value="percent"' + (p.type === 'percent' ? ' selected' : '') + '>Percent off</option><option value="fixed"' + (p.type === 'fixed' ? ' selected' : '') + '>Fixed amount off</option></select></label></div>' +
          '<div class="row-2"><label class="field"><span>Value</span><input class="input" name="value" type="number" min="0" step="0.01" value="' + h(p.value) + '"></label>' +
          '<label class="field"><span>Minimum order</span><input class="input" name="min_amount" type="number" min="0" step="0.01" value="' + h(p.min_amount) + '"></label></div>' +
          '<div class="row-2"><label class="field"><span>Max uses <small>0 = unlimited</small></span><input class="input" name="max_uses" type="number" min="0" value="' + h(p.max_uses) + '"></label>' +
          '<label class="field"><span>Expires</span><input class="input" name="expires_at" type="date" value="' + h((p.expires_at || '').slice(0, 10)) + '"></label></div>' +
          '<label class="switch"><span>Active</span><input type="checkbox" name="is_active"' + (+p.is_active ? ' checked' : '') + '></label></form>',
        actions: [{ label: 'Cancel' }, { label: 'Save', kind: 'primary', onClick: function (c) {
          var form = c.body.querySelector('form');
          return A.post('admin/promos', A.formData(form)).then(function () { A.toast('Promo saved'); load(); }).catch(function (err) { A.fieldErrors(form, err); throw err; });
        } }]
      });
    }
    function load() {
      return A.get('admin/promos').then(function (b) {
        promos = b.data;
        el.querySelector('#box').innerHTML = promos.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Code</th><th>Discount</th><th class="num">Min order</th><th class="num">Used</th><th>Expires</th><th>Status</th><th></th></tr></thead><tbody>' +
          promos.map(function (p) {
            var expired = p.expires_at && new Date(p.expires_at.replace(' ', 'T')) < new Date();
            return '<tr data-id="' + h(p.id) + '"><td class="mono"><b>' + h(p.code) + '</b></td><td>' + (p.type === 'percent' ? (+p.value) + '%' : A.money(p.value)) + '</td><td class="num">' + A.money(p.min_amount) + '</td>' +
              '<td class="num">' + p.uses_count + (+p.max_uses ? ' / ' + p.max_uses : '') + '</td><td class="small">' + (p.expires_at ? A.date(p.expires_at) : '—') + '</td>' +
              '<td>' + (expired ? A.badge('expired') : +p.is_active ? A.badge('approved').replace('approved', 'active') : A.badge('draft').replace('draft', 'off')) + '</td>' +
              '<td class="num"><button class="btn btn-sm btn-ghost" data-edit>Edit</button> <button class="btn btn-sm btn-ghost" data-del>Delete</button></td></tr>';
          }).join('') + '</tbody></table></div>' : A.empty('No promo codes yet', '');
      }).catch(A.fail);
    }
    el.querySelector('#newPromo').addEventListener('click', function () { edit(null); });
    el.addEventListener('click', function (e) {
      var tr = e.target.closest('tr[data-id]');
      if (!tr) return;
      var p = promos.filter(function (x) { return x.id === tr.dataset.id; })[0];
      if (e.target.closest('[data-edit]')) edit(p);
      if (e.target.closest('[data-del]')) A.confirm('Delete code ' + p.code + '?', { danger: true, ok: 'Delete' }).then(function (y) {
        if (y) A.post('admin/promos/' + p.id + '/delete').then(function () { A.toast('Deleted'); load(); }).catch(A.fail);
      });
    });
    return load();
  });
})();
