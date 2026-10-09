/* FiveMDepot — Buyer account: library, orders, wishlist, support, settings */
(function () {
  'use strict';
  var S = window.Store, esc = S.esc;
  var nav = document.getElementById('acctNav'), page = document.getElementById('acctPage');
  var user = null, overview = null;

  function date(s) { var d = new Date(String(s || '').replace(' ', 'T')); return isNaN(d) ? '—' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); }
  var STATUS = { AWAITING_PAYMENT: ['st-warn', 'Awaiting payment'], CANCELLED: ['st-muted', 'Cancelled'], PENDING: ['st-warn', 'Awaiting payment check'], VERIFIED: ['st-ok', 'Paid'], COMPLETED: ['st-ok', 'Completed'], REJECTED: ['st-bad', 'Payment rejected'], REFUNDED: ['st-muted', 'Refunded'] };
  function badge(s) { var x = STATUS[s] || ['st-muted', s]; return '<span class="st ' + x[0] + '">' + x[1] + '</span>'; }

  function modal(title, bodyHtml, actions) {
    var w = document.createElement('div');
    w.className = 'modal-wrap';
    w.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-label="' + esc(title) + '"><div class="modal-head"><h3>' + esc(title) + '</h3><button class="icon-btn" data-x aria-label="Close">✕</button></div>' +
      '<form class="modal-body">' + bodyHtml + '</form><div class="modal-foot"></div></div>';
    var close = function () { w.remove(); document.removeEventListener('keydown', onKey); };
    var onKey = function (e) { if (e.key === 'Escape') close(); };
    actions.forEach(function (a) {
      var b = document.createElement('button');
      b.className = 'btn btn-sm ' + (a.primary ? 'btn-primary' : 'btn-ghost');
      b.textContent = a.label;
      b.addEventListener('click', function () {
        if (!a.run) return close();
        b.disabled = true;
        Promise.resolve(a.run(w.querySelector('form'))).then(function (keep) { if (keep !== false) close(); })
          .catch(function (e) { S.toast(e.message, 'error'); }).finally(function () { b.disabled = false; });
      });
      w.querySelector('.modal-foot').appendChild(b);
    });
    w.querySelector('form').addEventListener('submit', function (e) { e.preventDefault(); w.querySelector('.modal-foot .btn-primary').click(); });
    w.querySelector('[data-x]').addEventListener('click', close);
    w.addEventListener('mousedown', function (e) { if (e.target === w) close(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(w);
    var f = w.querySelector('input, textarea, select, button.btn-primary'); if (f) f.focus();
  }

  // ---------- Tabs ----------
  var TABS = {
    library: { label: 'My library', render: library },
    orders: { label: 'Orders', render: orders },
    wishlist: { label: 'Wishlist', render: wishlist },
    subscription: { label: 'Subscription', render: subscription },
    support: { label: 'Support', render: support },
    settings: { label: 'Account settings', render: settings }
  };

  function drawNav(active) {
    var st = overview.stats;
    var adminLink = user.role === 'ADMIN' ? '<a href="admin/">Admin panel →</a>' : '';
    nav.innerHTML = '<div class="who"><b>' + esc(user.name) + '</b><span class="muted small">' + esc(user.email) + '</span></div>' +
      '<button data-tab="library" class="' + (active === 'library' ? 'on' : '') + '">My library<span class="n">' + st.purchases + '</span></button>' +
      '<button data-tab="orders" class="' + (active === 'orders' ? 'on' : '') + '">Orders' + (st.pending ? '<span class="n">' + st.pending + ' pending</span>' : '') + '</button>' +
      '<button data-tab="wishlist" class="' + (active === 'wishlist' ? 'on' : '') + '">Wishlist<span class="n">' + st.wishlist + '</span></button>' +
      '<button data-tab="subscription" class="' + (active === 'subscription' ? 'on' : '') + '">Subscription</button>' +
      '<button data-tab="support" class="' + (active === 'support' ? 'on' : '') + '">Support</button>' +
      '<button data-tab="settings" class="' + (active === 'settings' ? 'on' : '') + '">Account settings</button>' + adminLink +
      '<button data-logout>Log out</button>';
  }

  function show(tab, extra) {
    if (!TABS[tab]) tab = 'library';
    history.replaceState(null, '', location.pathname + '?tab=' + tab + (extra || ''));
    drawNav(tab);
    page.innerHTML = '<div class="skeleton" style="height:260px"></div>';
    TABS[tab].render();
  }

  nav.addEventListener('click', function (e) {
    var t = e.target.closest('[data-tab]');
    if (t) show(t.dataset.tab);
    // Log out is handled by the shared handler in store.js ([data-logout])
  });

  // ---------- Library ----------
  function library() {
    S.v1('GET', 'account/library').then(function (rows) {
      var st = overview.stats;
      page.innerHTML = '<h1>My library</h1>' +
        '<div class="stats"><div class="panel stat-box"><small>Products owned</small><b>' + st.purchases + '</b></div>' +
        '<div class="panel stat-box"><small>Total spent</small><b>' + S.money(st.spent) + '</b></div>' +
        '<div class="panel stat-box"><small>Pending orders</small><b>' + st.pending + '</b></div>' +
        '<div class="panel stat-box"><small>Wishlist</small><b>' + st.wishlist + '</b></div></div>' +
        (st.pending ? '<div class="notice">⏳ You have ' + st.pending + ' order(s) waiting for a payment check. They appear here as soon as they’re approved.</div>' : '') +
        (rows.length ? '<div class="lib">' + rows.map(function (r) {
          return '<div class="panel lib-item"><a href="' + S.productUrl(r.slug) + '"><img src="' + esc(r.image || 'images/store/cat-default.svg') + '" alt="" data-fallback="images/store/cat-default.svg"></a>' +
            '<div><h3><a href="' + S.productUrl(r.slug) + '">' + esc(r.title) + '</a></h3><span class="small muted">Version ' + esc(r.version) + ' · updated ' + date(r.updated_at) + '</span>' +
            (r.my_rating ? '<div class="stars small">' + '★★★★★'.slice(0, r.my_rating) + '</div>' : '') + '</div>' +
            '<div class="lib-actions">' + (r.has_file ? '<a class="btn btn-primary btn-sm" href="api/v1.php?r=account/download/' + encodeURIComponent(r.id) + '">⬇ Download</a>' : '<span class="small muted">File coming soon</span>') +
            (r.changelog ? '<button class="btn btn-ghost btn-sm" data-changelog="' + esc(r.id) + '">Changelog</button>' : '') +
            '<a class="btn btn-ghost btn-sm" href="' + S.productUrl(r.slug) + '#reviews">' + (r.my_rating ? 'Edit review' : 'Review') + '</a></div></div>';
        }).join('') + '</div>'
          : '<div class="empty"><b>No purchases yet</b>Everything you buy shows up here with downloads and updates.<br><br><a class="btn btn-primary" href="category.html?c=all">Browse the store</a></div>');
      page.onclick = function (e) {
        var c = e.target.closest('[data-changelog]');
        if (!c) return;
        var r = rows.filter(function (x) { return x.id === c.dataset.changelog; })[0];
        modal('Changelog — ' + r.title, '<div class="changelog">' + esc(r.changelog) + '</div>', [{ label: 'Close' }]);
      };
    }).catch(fail);
  }

  // ---------- Orders ----------
  function orders() {
    S.v1('GET', 'account/orders').then(function (rows) {
      page.innerHTML = '<h1>Orders</h1>' + (rows.length ? rows.map(function (o) {
        return '<div class="panel order"><div class="order-head"><span><b class="mono">#' + esc(o.id.slice(0, 8)) + '</b> · ' + date(o.created_at) + ' · ' + esc(o.payment_method === 'PADDLE' ? 'Paddle' : (o.payment_method || 'Free')) +
          (o.transaction_id ? ' · <span class="mono">' + esc(o.transaction_id) + '</span>' : '') + '</span>' + badge(o.status) + '</div>' +
          o.items.map(function (i) {
            return '<div class="order-line"><span>' + (i.slug ? '<a href="' + S.productUrl(i.slug) + '">' + esc(i.title) + '</a>' : '<span class="muted">Removed product</span>') + '</span><span>' + S.money(i.price_paid) + '</span></div>';
          }).join('') +
          '<div class="order-line"><b>Total</b><b>' + S.money(o.total_amount) + '</b></div>' +
          (o.status === 'PENDING' ? '<div class="order-note">We’re checking your payment. This usually takes a few hours. ' +
            '<a class="link" href="dashboard/buyer.html?tab=support&new=1&order=' + encodeURIComponent(o.id) + '">Need help with this order?</a></div>' : '') +
          (o.status === 'AWAITING_PAYMENT' ? '<div class="order-note">This order isn’t paid yet.' + (o.admin_note ? ' ' + esc(o.admin_note) : '') +
            '<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><button class="btn btn-primary btn-sm" data-pay="' + esc(o.id) + '">Pay now</button>' +
            '<button class="btn btn-ghost btn-sm" data-cancel="' + esc(o.id) + '">Cancel order</button></div></div>' : '') +
          (o.status === 'REJECTED' && o.admin_note ? '<div class="order-note down">Reason: ' + esc(o.admin_note) + '. <a class="link" href="dashboard/buyer.html?tab=support&new=1&order=' + encodeURIComponent(o.id) + '">Open a ticket</a> if you think this is a mistake.</div>' : '') +
          ((o.status === 'VERIFIED' || o.status === 'COMPLETED') && o.total_amount > 0 ? '<div style="padding:0 18px 14px;text-align:right">' +
            (o.payment_method === 'PADDLE'
              ? '<a class="btn btn-ghost btn-sm" href="https://paddle.net" target="_blank" rel="noopener">Request refund at paddle.net ↗</a>'
              : '<button class="btn btn-ghost btn-sm" data-refund="' + esc(o.id) + '">Request refund</button>') + '</div>' : '') +
          (o.status === 'REFUNDED' ? '<div class="order-note">This order was refunded. The licence has ended and the download was removed from your library.</div>' : '') +
          '</div>';
      }).join('') : '<div class="empty"><b>No orders yet</b><a class="link-more" href="category.html?c=all">Start shopping →</a></div>');
      page.onclick = function (e) {
        var pay = e.target.closest('[data-pay]'), cancel = e.target.closest('[data-cancel]');
        if (pay) {
          pay.disabled = true;
          S.v1('POST', 'account/orders/' + encodeURIComponent(pay.dataset.pay) + '/pay', {}).then(function (r) {
            return S.paddleCheckout(r.paddle, function () { pay.disabled = false; });
          }).catch(function (err) { pay.disabled = false; fail(err); });
          return;
        }
        if (cancel) {
          S.v1('POST', 'account/orders/' + encodeURIComponent(cancel.dataset.cancel) + '/cancel', {}).then(function () { S.toast('Order cancelled', 'success'); show('orders'); }).catch(fail);
          return;
        }
        var b = e.target.closest('[data-refund]');
        if (!b) return;
        modal('Request a refund', '<p class="muted small" style="margin-bottom:12px">Tell us what went wrong. Our team reviews every request.</p>' +
          '<label class="field"><span>What’s the problem?</span><textarea class="input" name="reason" rows="4" maxlength="2000" required></textarea></label>',
          [{ label: 'Cancel' }, { label: 'Send request', primary: true, run: function (f) {
            return S.v1('POST', 'account/refunds', { order_id: b.dataset.refund, reason: f.reason.value }).then(function () { S.toast('Refund request sent', 'success'); });
          } }]);
      };
    }).catch(fail);
  }

  // ---------- Wishlist ----------
  function wishlist() {
    S.v1('GET', 'account/wishlist').then(function (rows) {
      page.innerHTML = '<h1>Wishlist</h1>' + (rows.length ? '<div class="lib">' + rows.map(function (r) {
        var price = r.sale_price != null ? r.sale_price : r.price;
        return '<div class="panel lib-item"><a href="' + S.productUrl(r.slug) + '"><img src="' + esc(r.image || 'images/store/cat-default.svg') + '" alt="" data-fallback="images/store/cat-default.svg"></a>' +
          '<div><h3><a href="' + S.productUrl(r.slug) + '">' + esc(r.title) + '</a></h3><b>' + (price ? S.money(price) : '<span class="up">Free</span>') + '</b>' +
          (r.status !== 'PUBLISHED' ? ' <span class="small down">no longer available</span>' : '') + '</div>' +
          '<div class="lib-actions">' + (r.status === 'PUBLISHED' ? '<button class="btn btn-primary btn-sm" data-cart="' + esc(r.id) + '">Add to cart</button>' : '') +
          '<button class="btn btn-ghost btn-sm" data-unwish="' + esc(r.id) + '">Remove</button></div></div>';
      }).join('') + '</div>' : '<div class="empty"><b>Your wishlist is empty</b>Tap the ♥ on any product to save it for later.</div>');
      page.onclick = function (e) {
        var c = e.target.closest('[data-cart]'), u = e.target.closest('[data-unwish]');
        if (c) { var r = rows.filter(function (x) { return x.id === c.dataset.cart; })[0]; S.cart.add(r); }
        if (u) S.v1('POST', 'account/wishlist/' + encodeURIComponent(u.dataset.unwish), { on: false }).then(function () { overview.stats.wishlist--; show('wishlist'); }).catch(fail);
      };
    }).catch(fail);
  }

  // ---------- Support tickets ----------
  var TICKET_CATS = { payment: 'Payment / order', download: 'Download problem', install: 'Installation help', refund: 'Refund', general: 'General question' };
  var TICKET_ST = { open: ['st-warn', 'Waiting for staff'], answered: ['st-ok', 'Staff replied'], closed: ['st-muted', 'Closed'] };
  function tbadge(s) { var x = TICKET_ST[s] || ['st-muted', s]; return '<span class="st ' + x[0] + '">' + x[1] + '</span>'; }
  function time(s) { var d = new Date(String(s || '').replace(' ', 'T')); return isNaN(d) ? '' : d.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); }

  function support() {
    var q = new URLSearchParams(location.search);
    if (q.get('ticket')) return ticket(q.get('ticket'));
    Promise.all([S.v1('GET', 'account/tickets'), S.v1('GET', 'account/orders').catch(function () { return []; }), S.nav()]).then(function (res) {
      var rows = res[0], myOrders = res[1], discord = (res[2].settings || {}).social_discord;
      page.innerHTML = '<div class="tk-top"><h1>Support</h1><button class="btn btn-primary btn-sm" data-new>+ New ticket</button></div>' +
        '<div class="tk-help panel panel-pad"><div><b>Fastest help: Discord</b><span class="small muted">Open a ticket in our Discord server — we usually reply within minutes when online.</span></div>' +
        (discord ? '<a class="btn btn-sm discord-btn" href="' + esc(discord) + '" target="_blank" rel="noopener">Open Discord ↗</a>' : '') + '</div>' +
        (rows.length ? '<div class="panel tk-list">' + rows.map(function (t) {
          return '<a class="tk-row" href="dashboard/buyer.html?tab=support&ticket=' + encodeURIComponent(t.id) + '" data-open="' + esc(t.id) + '">' +
            '<span class="mono muted">#' + t.number + '</span><span class="tk-subj"><b>' + esc(t.subject) + '</b><small class="muted">' + esc(TICKET_CATS[t.category] || t.category) + ' · ' + t.messages + ' message' + (+t.messages === 1 ? '' : 's') + ' · updated ' + time(t.updated_at) + '</small></span>' + tbadge(t.status) + '</a>';
        }).join('') + '</div>'
          : '<div class="empty"><b>No tickets yet</b>Problem with a payment, download or install? Open a ticket and our team will reply here and by email.</div>');
      page.onclick = function (e) {
        if (e.target.closest('[data-new]')) return newTicket(myOrders);
        var o = e.target.closest('[data-open]');
        if (o && !e.ctrlKey && !e.metaKey) { e.preventDefault(); ticket(o.dataset.open); }
      };
      if (q.get('new')) { history.replaceState(null, '', location.pathname + '?tab=support'); newTicket(myOrders, q.get('order')); }
    }).catch(fail);
  }

  function newTicket(myOrders, orderId) {
    var opts = '<option value="">— Not about a specific order —</option>' + myOrders.map(function (o) {
      return '<option value="' + esc(o.id) + '"' + (o.id === orderId ? ' selected' : '') + '>#' + esc(o.id.slice(0, 8).toUpperCase()) + ' · ' + S.money(o.total_amount) + ' · ' + esc((STATUS[o.status] || [0, o.status])[1]) + '</option>';
    }).join('');
    modal('New support ticket',
      '<label class="field"><span>Topic</span><select class="input" name="category">' + Object.keys(TICKET_CATS).map(function (k) {
        return '<option value="' + k + '"' + (orderId && k === 'payment' ? ' selected' : '') + '>' + TICKET_CATS[k] + '</option>';
      }).join('') + '</select></label>' +
      '<label class="field"><span>Order</span><select class="input" name="order_id">' + opts + '</select></label>' +
      '<label class="field"><span>Subject</span><input class="input" name="subject" maxlength="200" placeholder="e.g. Paid but order still pending"' + (orderId ? ' value="Question about order #' + esc(orderId.slice(0, 8).toUpperCase()) + '"' : '') + '></label>' +
      '<label class="field"><span>Message</span><textarea class="input" name="message" rows="5" maxlength="5000" placeholder="Describe the problem. For payments, include your transaction ID and the email you paid with."></textarea></label>',
      [{ label: 'Cancel' }, { label: 'Open ticket', primary: true, run: function (f) {
        return S.v1('POST', 'account/tickets', { category: f.category.value, order_id: f.order_id.value, subject: f.subject.value.trim(), message: f.message.value.trim() })
          .then(function (r) { S.toast('Ticket #' + r.number + ' opened — we’ll reply by email', 'success'); ticket(r.id); })
          .catch(function (err) { var k = Object.keys(err.fields || {}); throw new Error(k.length ? err.fields[k[0]] : err.message); });
      } }]);
  }

  function ticket(id) {
    history.replaceState(null, '', location.pathname + '?tab=support&ticket=' + encodeURIComponent(id));
    S.v1('GET', 'account/tickets/' + encodeURIComponent(id)).then(function (t) {
      page.innerHTML = '<a class="link-more" href="dashboard/buyer.html?tab=support" data-back>← All tickets</a>' +
        '<div class="tk-top"><h1 style="font-size:24px">' + esc(t.subject) + '</h1>' + tbadge(t.status) + '</div>' +
        '<p class="small muted" style="margin-bottom:16px">Ticket <b class="mono">#' + t.number + '</b> · ' + esc(TICKET_CATS[t.category] || t.category) +
        (t.order_id ? ' · order <span class="mono">#' + esc(t.order_id.slice(0, 8).toUpperCase()) + '</span>' : '') + ' · opened ' + time(t.created_at) + '</p>' +
        '<div class="tk-thread">' + t.messages.map(function (m) {
          return '<div class="tk-msg' + (m.is_staff ? ' staff' : '') + '"><div class="tk-meta"><b>' + (m.is_staff ? 'FiveMDepot support' : esc(m.name || 'You')) + '</b><span class="muted">' + time(m.created_at) + '</span></div><div class="tk-body">' + esc(m.body) + '</div></div>';
        }).join('') + '</div>' +
        '<form class="panel panel-pad tk-reply" id="tkReply"><label class="field"><span>' + (t.status === 'closed' ? 'Reply to reopen this ticket' : 'Your reply') + '</span><textarea class="input" name="message" rows="4" maxlength="5000"></textarea></label>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-primary btn-sm" type="submit">Send reply</button>' +
        (t.status !== 'closed' ? '<button class="btn btn-ghost btn-sm" type="button" data-close>Mark as solved</button>' : '') + '</div></form>';
      page.onclick = function (e) {
        if (e.target.closest('[data-back]')) { e.preventDefault(); show('support'); return; }
        if (e.target.closest('[data-close]')) S.v1('POST', 'account/tickets/' + encodeURIComponent(t.id) + '/close', {}).then(function () { S.toast('Ticket closed', 'success'); ticket(t.id); }).catch(fail);
      };
      page.onsubmit = function (e) {
        e.preventDefault();
        var f = e.target, btn = f.querySelector('[type=submit]');
        if (f.message.value.trim().length < 2) { S.toast('Write a message first', 'error'); return; }
        btn.disabled = true;
        S.v1('POST', 'account/tickets/' + encodeURIComponent(t.id) + '/reply', { message: f.message.value.trim() })
          .then(function () { S.toast('Reply sent', 'success'); ticket(t.id); }).catch(function (err) { btn.disabled = false; fail(err); });
      };
    }).catch(function (e) { S.toast(e.message, 'error'); show('support'); });
  }

  // ---------- Subscription (pricing page plans) ----------
  var SUB_STATUS = { active: ['st-ok', 'Active'], trialing: ['st-ok', 'Free trial'], past_due: ['st-warn', 'Payment due'], paused: ['st-muted', 'Paused'], canceled: ['st-muted', 'Canceled'] };
  function planName(priceId) {
    var hit = null;
    (window.PRICING_TIERS || []).forEach(function (t) {
      if (t.priceId.month === priceId) hit = t.name + ' · Monthly';
      if (t.priceId.year === priceId) hit = t.name + ' · Yearly';
    });
    return hit || 'Subscription';
  }
  function subscription() {
    page.innerHTML = '<h1>Subscription</h1><div class="skeleton" style="height:160px"></div>';
    S.v1('GET', 'account/subscription').then(function (r) {
      if (!r.subscriptions.length) {
        page.innerHTML = '<h1>Subscription</h1><div class="empty"><b>No subscription yet</b>Every plan starts with a free trial.' +
          '<p style="margin-top:14px"><a class="btn btn-primary" href="pricing">See plans</a></p></div>';
        return;
      }
      page.innerHTML = '<h1>Subscription</h1>' + r.subscriptions.map(function (s) {
        var st = SUB_STATUS[s.status] || ['st-muted', s.status];
        var when = s.scheduled_change_action === 'cancel' ? 'Ends on ' + date(s.scheduled_change_at)
          : s.scheduled_change_action === 'pause' ? 'Pauses on ' + date(s.scheduled_change_at)
          : s.status === 'canceled' ? '' : (s.status === 'trialing' ? 'First payment on ' : 'Renews on ') + date(s.current_period_end);
        return '<div class="panel panel-pad" style="max-width:560px;margin-bottom:14px"><h2 style="font-size:18px">' + esc(planName(s.price_id)) +
          ' <span class="st ' + st[0] + '">' + st[1] + '</span></h2>' + (when ? '<p class="muted" style="margin-top:6px">' + esc(when) + '</p>' : '') + '</div>';
      }).join('') +
        '<p class="muted small" style="max-width:560px;margin-bottom:14px">Change your card, cancel, or download invoices in Paddle’s secure portal.</p>' +
        '<button class="btn btn-primary" id="portalBtn">Manage subscription</button>';
      document.getElementById('portalBtn').onclick = function () {
        var b = this; b.disabled = true;
        S.v1('POST', 'account/subscription/portal', {}).then(function (p) { location.href = p.url; })
          .catch(function (e) { b.disabled = false; fail(e); });
      };
    }).catch(fail);
  }

  // ---------- Settings ----------
  function settings() {
    page.innerHTML = '<h1>Account settings</h1><div class="panel panel-pad" style="max-width:560px;margin-bottom:18px"><h2 style="font-size:17px;margin-bottom:14px">Profile</h2>' +
      '<form id="profForm"><label class="field"><span>Name</span><input class="input" name="name" maxlength="100" value="' + esc(user.name) + '"></label>' +
      '<label class="field"><span>Email</span><input class="input" value="' + esc(user.email) + '" disabled></label><button class="btn btn-primary btn-sm" type="submit">Save</button></form></div>' +
      '<div class="panel panel-pad" style="max-width:560px;margin-bottom:18px" id="connBox"><h2 style="font-size:17px;margin-bottom:6px">Connected accounts</h2>' +
      '<p class="small muted" style="margin-bottom:14px">Log in with any connected account.</p><div class="skeleton" style="height:120px"></div></div>' +
      '<div class="panel panel-pad" style="max-width:560px"><h2 style="font-size:17px;margin-bottom:14px" id="pwTitle">Change password</h2>' +
      '<form id="pwForm"><label class="field" id="curPw"><span>Current password</span><input class="input" type="password" name="current_password" autocomplete="current-password"></label>' +
      '<label class="field"><span>New password</span><input class="input" type="password" name="new_password" minlength="8" autocomplete="new-password"></label>' +
      '<button class="btn btn-primary btn-sm" type="submit">Update password</button></form></div>';
    page.onsubmit = function (e) {
      e.preventDefault();
      var f = e.target;
      if (f.id === 'profForm') S.v1('POST', 'auth/profile', { name: f.name.value }).then(function (r) { user.name = r.name; drawNav('settings'); S.toast('Profile saved', 'success'); }).catch(fail);
      if (f.id === 'pwForm') S.v1('POST', 'auth/password', { current_password: f.current_password.value, new_password: f.new_password.value })
        .then(function () { f.reset(); S.toast('Password updated', 'success'); connections(); }).catch(fail);
    };
    var q = new URLSearchParams(location.search);
    if (q.get('linked') === 'discord') S.toast('Discord connected', 'success');
    if (q.get('error')) S.toast(q.get('error'), 'error');
    history.replaceState(null, '', location.pathname + '?tab=settings');
    connections();
  }

  // Connected sign-in methods: Discord (link / unlink), Google, password
  var CONN_ICON = {
    discord: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.32 4.37A19.8 19.8 0 0 0 15.38 2.8a13.9 13.9 0 0 0-.63 1.3 18.4 18.4 0 0 0-5.5 0 13.3 13.3 0 0 0-.64-1.3 19.7 19.7 0 0 0-4.94 1.53C.54 9.06-.31 13.62.11 18.12a19.9 19.9 0 0 0 6.06 3.07 14.7 14.7 0 0 0 1.3-2.12 12.9 12.9 0 0 1-2.04-.98l.5-.39a14.2 14.2 0 0 0 12.14 0l.5.39c-.65.39-1.33.71-2.04.98.37.75.81 1.46 1.3 2.12a19.8 19.8 0 0 0 6.06-3.07c.5-5.22-.84-9.74-3.57-13.75ZM8.02 15.33c-1.18 0-2.16-1.08-2.16-2.42 0-1.33.96-2.42 2.16-2.42 1.21 0 2.18 1.1 2.16 2.42 0 1.34-.96 2.42-2.16 2.42Zm7.96 0c-1.18 0-2.16-1.08-2.16-2.42 0-1.33.96-2.42 2.16-2.42 1.21 0 2.18 1.1 2.16 2.42 0 1.34-.95 2.42-2.16 2.42Z"/></svg>',
    google: '<svg viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>',
    password: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>'
  };
  function connections() {
    var box = document.getElementById('connBox');
    if (!box) return;
    S.v1('GET', 'auth/connections').then(function (c) {
      var row = function (key, name, status, action) {
        return '<div class="conn-row"><i class="conn-ico conn-' + key + '">' + CONN_ICON[key] + '</i><span class="conn-name"><b>' + name + '</b><small class="muted">' + status + '</small></span>' + (action || '') + '</div>';
      };
      var rows = '';
      if (c.available.discord || c.discord) rows += row('discord', 'Discord', c.discord ? 'Connected as <b>' + esc(c.discord) + '</b>' : 'Not connected',
        c.discord ? '<button class="btn btn-ghost btn-sm" data-unlink="discord">Disconnect</button>' : '<a class="btn btn-sm discord-btn" href="api/discord-login.php?link=1">Connect</a>');
      if (c.available.google || c.google) rows += row('google', 'Google', c.google ? 'Connected' : 'Log in with Google once to connect it (same email)', '');
      rows += row('password', 'Email & password', c.password ? 'Set' : 'Not set — add one below to log in with your email', '');
      var list = box.querySelector('.conn-list') || box.appendChild(document.createElement('div'));
      list.className = 'conn-list'; list.innerHTML = rows;
      if (box.querySelector('.skeleton')) box.querySelector('.skeleton').remove();
      // Discord/Google-only accounts set a first password without the "current" field
      document.getElementById('curPw').hidden = !c.password;
      document.getElementById('pwTitle').textContent = c.password ? 'Change password' : 'Set a password';
      box.onclick = function (e) {
        var b = e.target.closest('[data-unlink]');
        if (!b) return;
        b.disabled = true;
        S.v1('POST', 'auth/connections/discord/unlink', {}).then(function () { S.toast('Discord disconnected', 'success'); connections(); })
          .catch(function (err) { b.disabled = false; fail(err); });
      };
    }).catch(function () { box.remove(); });
  }

  function fail(e) { S.toast(e.message, 'error'); if (/log in/i.test(e.message)) location.href = S.loginUrl(); }

  S.me().then(function (u) {
    if (!u) { location.replace(S.loginUrl('dashboard/buyer.html')); return; }
    user = u;
    return S.v1('GET', 'account/overview').then(function (o) {
      overview = o;
      var q0 = new URLSearchParams(location.search), keep = '';
      ['ticket', 'new', 'order'].forEach(function (k) { if (q0.get(k)) keep += '&' + k + '=' + encodeURIComponent(q0.get(k)); });
      show(q0.get('tab') || 'library', keep);
    });
  }).catch(function (e) { page.innerHTML = '<div class="empty"><b>Could not load your account</b>' + esc(e.message) + '</div>'; });
})();
