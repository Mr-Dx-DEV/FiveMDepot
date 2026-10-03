/* ============================================================
   FiveMDepot Admin — core: API client, router, UI kit
   Pages register with Admin.page('/path/:id', render) in admin/pages/*.js
   ============================================================ */
(function () {
  'use strict';

  var Admin = window.Admin = {};
  var csrf = null;
  var routes = [];
  var counts = {};

  // ---------- Escaping / formatting ----------
  var h = Admin.h = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  Admin.money = function (n) { return '$' + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }); };
  Admin.date = function (s) {
    if (!s) return '—';
    var d = new Date(String(s).replace(' ', 'T'));
    return isNaN(d) ? h(s) : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  };
  Admin.ago = function (s) {
    if (!s) return '—';
    var d = new Date(String(s).replace(' ', 'T')), sec = (Date.now() - d) / 1000;
    if (isNaN(sec)) return h(s);
    if (sec < 60) return 'just now';
    if (sec < 3600) return Math.floor(sec / 60) + 'm ago';
    if (sec < 86400) return Math.floor(sec / 3600) + 'h ago';
    if (sec < 86400 * 30) return Math.floor(sec / 86400) + 'd ago';
    return Admin.date(s);
  };
  Admin.img = function (p) {
    if (!p) return '../images/store/cat-default.svg';
    return /^(https?:)?\/\//.test(p) ? p : '../' + String(p).replace(/^\//, '');
  };
  var STATUS = {
    PUBLISHED: 'ok', VERIFIED: 'ok', COMPLETED: 'ok', APPROVED: 'ok', PAID: 'ok', ADMIN: 'accent',
    PENDING: 'warn', AWAITING_PAYMENT: 'info', CANCELLED: 'muted', DRAFT: 'muted', REJECTED: 'bad', REFUNDED: 'bad', BANNED: 'bad', SELLER: 'info', BUYER: 'muted'
  };
  Admin.badge = function (s) { s = String(s || '').toUpperCase(); return '<span class="st st-' + (STATUS[s] || 'muted') + '">' + h(s.toLowerCase()) + '</span>'; };

  // ---------- API ----------
  function loadMe() {
    return fetch('../api/v1.php?r=auth/me', { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (j) {
      csrf = j.data.csrf;
      return j.data.user;
    });
  }

  Admin.api = function (method, path, data, _retried) {
    var opts = { method: method, credentials: 'same-origin', headers: {} };
    if (method !== 'GET') opts.headers['X-CSRF-Token'] = csrf || '';
    if (data instanceof FormData) opts.body = data;
    else if (data !== undefined) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(data); }
    return fetch('../api/v1.php?r=' + path, opts).then(function (res) {
      return res.json().catch(function () { return { error: { message: 'Server error (' + res.status + ')' } }; }).then(function (body) {
        if (res.status === 401) { location.href = '../auth.html?next=' + encodeURIComponent('admin/' + location.hash); throw new Error('Please log in'); }
        if (res.status === 419 && !_retried) return loadMe().then(function () { return Admin.api(method, path, data, true); });
        if (!res.ok || body.error) {
          var err = new Error((body.error && body.error.message) || 'Request failed');
          err.fields = (body.error && body.error.fields) || {};
          err.status = res.status;
          throw err;
        }
        return body;
      });
    });
  };
  Admin.get = function (path) { return Admin.api('GET', path).then(function (b) { return b; }); };
  Admin.post = function (path, data) { return Admin.api('POST', path, data || {}); };

  Admin.upload = function (file, opts) {
    var fd = new FormData();
    fd.append('file', file);
    fd.append('kind', (opts && opts.kind) || 'image');
    fd.append('dir', (opts && opts.dir) || 'products');
    return Admin.api('POST', 'admin/upload', fd).then(function (b) { return b.data.path; });
  };

  // ---------- Toast ----------
  Admin.toast = function (msg, type) {
    var box = document.querySelector('.toasts');
    if (!box) { box = document.createElement('div'); box.className = 'toasts'; document.body.appendChild(box); }
    var el = document.createElement('div');
    el.className = 'toast ' + (type || 'success');
    el.setAttribute('role', 'status');
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(function () { el.remove(); }, type === 'error' ? 5000 : 2800);
  };
  Admin.fail = function (e) { Admin.toast(e && e.message ? e.message : 'Something went wrong', 'error'); };

  /** Show field errors from a 422 inside a form ([name=field]). */
  Admin.fieldErrors = function (form, err) {
    form.querySelectorAll('.f-err').forEach(function (e) { e.remove(); });
    form.querySelectorAll('.has-err').forEach(function (e) { e.classList.remove('has-err'); });
    var first = null;
    Object.keys((err && err.fields) || {}).forEach(function (k) {
      var input = form.querySelector('[name="' + k + '"]');
      if (!input) return;
      input.classList.add('has-err');
      var m = document.createElement('div');
      m.className = 'f-err';
      m.textContent = err.fields[k];
      (input.closest('.field') || input.parentNode).appendChild(m);
      first = first || input;
    });
    if (first) first.focus();
  };

  // ---------- Modal / confirm / ask ----------
  Admin.modal = function (o) {
    var wrap = document.createElement('div');
    wrap.className = 'modal-wrap';
    wrap.innerHTML = '<div class="modal' + (o.wide ? ' modal-wide' : '') + '" role="dialog" aria-modal="true" aria-label="' + h(o.title) + '">' +
      '<div class="modal-head"><h3>' + h(o.title) + '</h3><button class="icon-btn" data-x aria-label="Close">✕</button></div>' +
      '<div class="modal-body"></div><div class="modal-foot"></div></div>';
    var body = wrap.querySelector('.modal-body');
    if (typeof o.body === 'string') body.innerHTML = o.body; else if (o.body) body.appendChild(o.body);
    var foot = wrap.querySelector('.modal-foot');
    var prev = document.activeElement;
    function close() {
      wrap.classList.remove('open');
      document.removeEventListener('keydown', onKey);
      setTimeout(function () { wrap.remove(); }, 160);
      if (prev && prev.focus) prev.focus();
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    (o.actions || [{ label: 'Close' }]).forEach(function (a) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn btn-sm ' + (a.kind === 'primary' ? 'btn-primary' : a.kind === 'danger' ? 'btn-danger' : 'btn-ghost');
      b.textContent = a.label;
      b.addEventListener('click', function () {
        if (!a.onClick) return close();
        var r = a.onClick({ close: close, body: body, button: b });
        if (r && r.then) {
          b.disabled = true;
          r.then(function (keep) { if (keep !== false) close(); }).catch(Admin.fail).finally(function () { b.disabled = false; });
        } else if (r !== false) close();
      });
      foot.appendChild(b);
    });
    wrap.addEventListener('mousedown', function (e) { if (e.target === wrap) close(); });
    wrap.querySelector('[data-x]').addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    document.body.appendChild(wrap);
    requestAnimationFrame(function () {
      wrap.classList.add('open');
      var f = body.querySelector('input, textarea, select, button');
      (f || wrap.querySelector('.modal-foot .btn-primary, .modal-foot .btn-danger') || wrap.querySelector('[data-x]')).focus();
    });
    return { close: close, body: body, el: wrap };
  };

  Admin.confirm = function (message, o) {
    o = o || {};
    return new Promise(function (resolve) {
      var done = false;
      var m = Admin.modal({
        title: o.title || 'Are you sure?',
        body: '<p class="muted">' + h(message) + '</p>',
        actions: [
          { label: 'Cancel', onClick: function () { done = true; resolve(false); } },
          { label: o.ok || 'Confirm', kind: o.danger ? 'danger' : 'primary', onClick: function () { done = true; resolve(true); } }
        ]
      });
      var obs = new MutationObserver(function () { if (!document.body.contains(m.el)) { obs.disconnect(); if (!done) resolve(false); } });
      obs.observe(document.body, { childList: true });
    });
  };

  /** Ask for text (e.g. a rejection reason). Resolves string or null. */
  Admin.ask = function (o) {
    return new Promise(function (resolve) {
      var done = false;
      var m = Admin.modal({
        title: o.title,
        body: '<label class="field"><span>' + h(o.label || '') + '</span><textarea class="input" rows="3" maxlength="500">' + h(o.value || '') + '</textarea></label>',
        actions: [
          { label: 'Cancel', onClick: function () { done = true; resolve(null); } },
          { label: o.ok || 'Save', kind: o.danger ? 'danger' : 'primary', onClick: function (ctx) {
            var v = ctx.body.querySelector('textarea').value.trim();
            if (o.required && !v) { ctx.body.querySelector('textarea').classList.add('has-err'); return false; }
            done = true; resolve(v);
          } }
        ]
      });
      var obs = new MutationObserver(function () { if (!document.body.contains(m.el)) { obs.disconnect(); if (!done) resolve(null); } });
      obs.observe(document.body, { childList: true });
    });
  };

  // ---------- Small widgets ----------
  Admin.pager = function (meta, onPage) {
    var el = document.createElement('div');
    el.className = 'pager';
    if (!meta || meta.pages <= 1) return el;
    var html = '<button data-p="' + (meta.page - 1) + '"' + (meta.page <= 1 ? ' disabled' : '') + '>‹</button>';
    for (var i = 1; i <= meta.pages; i++) {
      if (i === 1 || i === meta.pages || Math.abs(i - meta.page) <= 2) html += '<button data-p="' + i + '"' + (i === meta.page ? ' class="on"' : '') + '>' + i + '</button>';
      else if (Math.abs(i - meta.page) === 3) html += '<button disabled>…</button>';
    }
    html += '<button data-p="' + (meta.page + 1) + '"' + (meta.page >= meta.pages ? ' disabled' : '') + '>›</button>';
    el.innerHTML = html;
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-p]');
      if (b && !b.disabled) onPage(parseInt(b.getAttribute('data-p'), 10));
    });
    return el;
  };

  Admin.empty = function (title, text, action) {
    return '<div class="empty"><b>' + h(title) + '</b>' + h(text || '') + (action || '') + '</div>';
  };

  Admin.loading = function (el) { el.innerHTML = '<div class="adm-loading"><span class="spin"></span>Loading…</div>'; };

  /** Read a form into an object. Checkboxes → bool, data-json → parsed. */
  Admin.formData = function (form) {
    var out = {};
    form.querySelectorAll('[name]').forEach(function (i) {
      if (i.type === 'checkbox') out[i.name] = i.checked;
      else if (i.type === 'radio') { if (i.checked) out[i.name] = i.value; }
      else out[i.name] = i.value;
    });
    return out;
  };

  /** Cached reference data (tags, groups, categories); call Admin.ref.reset() after edits. */
  var refCache = {};
  Admin.ref = {
    get: function (what) {
      if (!refCache[what]) refCache[what] = Admin.get('admin/' + what).then(function (b) { return b.data; }).catch(function (e) { delete refCache[what]; throw e; });
      return refCache[what];
    },
    reset: function (what) { if (what) delete refCache[what]; else refCache = {}; }
  };

  /** Category list → [{id, path}] sorted by tree path. */
  Admin.categoryOptions = function (cats) {
    var byId = {};
    cats.forEach(function (c) { byId[c.id] = c; });
    function path(c) { var p = [], seen = {}; while (c && !seen[c.id]) { seen[c.id] = 1; p.unshift(c.name); c = byId[c.parent_id]; } return p.join(' › '); }
    return cats.map(function (c) { return { id: c.id, path: path(c), depth: path(c).split(' › ').length - 1 }; })
      .sort(function (a, b) { return a.path.localeCompare(b.path); });
  };

  /**
   * Tag picker: chips + autocomplete. Admins can create a tag inline.
   * opts: { selected: [ids], onChange(ids), allowCreate }
   */
  Admin.tagPicker = function (host, opts) {
    var selected = (opts.selected || []).slice();
    var tags = [];
    host.classList.add('tagpick');
    host.innerHTML = '<div class="tp-chips"></div><div class="tp-input"><input class="input" placeholder="Type to add a tag…" aria-label="Add tag" autocomplete="off"><div class="tp-menu" hidden></div></div>';
    var chips = host.querySelector('.tp-chips'), input = host.querySelector('input'), menu = host.querySelector('.tp-menu');
    var active = 0;

    function byId(id) { return tags.filter(function (t) { return t.id === id; })[0]; }
    function renderChips() {
      chips.innerHTML = selected.map(function (id) {
        var t = byId(id);
        if (!t) return '';
        return '<span class="tp-chip"><i style="background:' + h(t.color || 'var(--accent)') + '"></i>' + h(t.name) +
          (t.group_name ? '<small>' + h(t.group_name) + '</small>' : '') + '<button type="button" data-rm="' + h(id) + '" aria-label="Remove ' + h(t.name) + '">✕</button></span>';
      }).join('') || '<span class="muted small">No tags yet — tags decide which categories this appears in.</span>';
    }
    function matches() {
      var q = input.value.trim().toLowerCase();
      var list = tags.filter(function (t) { return selected.indexOf(t.id) === -1 && (!q || t.name.toLowerCase().indexOf(q) !== -1); }).slice(0, 8);
      return { q: q, list: list, exact: tags.some(function (t) { return t.name.toLowerCase() === q; }) };
    }
    function renderMenu() {
      var m = matches();
      var items = m.list.map(function (t, i) {
        return '<button type="button" class="tp-opt' + (i === active ? ' on' : '') + '" data-add="' + h(t.id) + '"><i style="background:' + h(t.color || 'var(--accent)') + '"></i>' + h(t.name) +
          '<small>' + h(t.group_name || '') + (t.categories && t.categories.length ? ' → ' + h(t.categories.join(', ')) : '') + '</small></button>';
      }).join('');
      if (opts.allowCreate && m.q && !m.exact) items += '<button type="button" class="tp-opt tp-new' + (m.list.length === active ? ' on' : '') + '" data-new="1">+ Create tag “' + h(input.value.trim()) + '”</button>';
      menu.innerHTML = items;
      menu.hidden = !items;
    }
    function add(id) {
      if (selected.indexOf(id) === -1) selected.push(id);
      input.value = '';
      active = 0;
      renderChips(); renderMenu();
      opts.onChange && opts.onChange(selected.slice());
    }
    function create() {
      var name = input.value.trim();
      return Admin.post('admin/tags', { name: name }).then(function (b) {
        Admin.ref.reset('tags');
        tags.push({ id: b.data.id, name: b.data.name, slug: b.data.slug, color: b.data.color, categories: [] });
        add(b.data.id);
        Admin.toast('Tag “' + name + '” created — assign it to a category so products appear there');
      }).catch(Admin.fail);
    }
    input.addEventListener('input', function () { active = 0; renderMenu(); });
    input.addEventListener('focus', renderMenu);
    input.addEventListener('blur', function () { setTimeout(function () { menu.hidden = true; }, 150); });
    input.addEventListener('keydown', function (e) {
      var opts2 = menu.querySelectorAll('.tp-opt');
      if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(active + 1, opts2.length - 1); renderMenu(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(active - 1, 0); renderMenu(); }
      else if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        var o = opts2[active];
        if (o && o.dataset.add) add(o.dataset.add); else if (o && o.dataset.new) create();
      } else if (e.key === 'Backspace' && !input.value && selected.length) {
        selected.pop(); renderChips(); opts.onChange && opts.onChange(selected.slice());
      }
    });
    menu.addEventListener('mousedown', function (e) {
      e.preventDefault();
      var o = e.target.closest('.tp-opt');
      if (!o) return;
      if (o.dataset.add) add(o.dataset.add); else create();
    });
    chips.addEventListener('click', function (e) {
      var b = e.target.closest('[data-rm]');
      if (!b) return;
      selected = selected.filter(function (x) { return x !== b.dataset.rm; });
      renderChips();
      opts.onChange && opts.onChange(selected.slice());
    });

    Admin.ref.get('tags').then(function (t) { tags = t.slice(); renderChips(); }).catch(Admin.fail);
    renderChips();
    return { get: function () { return selected.slice(); } };
  };

  // ---------- Navigation ----------
  var NAV = [
    { group: null, items: [{ href: '#/', label: 'Dashboard', icon: 'M3 12l9-8 9 8M5 10v10h5v-6h4v6h5V10' }] },
    { group: 'Catalog', items: [
      { href: '#/products', label: 'Products', icon: 'm21 8-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8' },
      { href: '#/review', label: 'Review queue', icon: 'M9 12l2 2 4-4M12 3l8 4v5c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V7z', count: 'products_pending' },
      { href: '#/categories', label: 'Categories', icon: 'M4 5h6v6H4zM14 5h6v6h-6zM4 15h6v6H4zM14 15h6v6h-6z' },
      { href: '#/tags', label: 'Tags', icon: 'M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8zM7.5 7.5h.01' }
    ] },
    { group: 'Sales', items: [
      { href: '#/orders', label: 'Orders', icon: 'M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0', count: 'orders_pending' },
      { href: '#/promos', label: 'Promo codes', icon: 'M9 14 15 8M9.5 8.5h.01M14.5 13.5h.01M3 7V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a3 3 0 0 0 0 6v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a3 3 0 0 0 0-6z' }
    ] },
    { group: 'People', items: [
      { href: '#/users', label: 'Users', icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8' },
      { href: '#/sellers', label: 'Sellers', icon: 'M3 9l1-5h16l1 5M3 9h18v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0zM5 13v8h14v-8', count: 'sellers_pending' },
      { href: '#/withdrawals', label: 'Withdrawals', icon: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6', count: 'withdrawals_pending' },
      { href: '#/reviews', label: 'Reviews', icon: 'm12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z' }
    ] },
    { group: 'Website', items: [
      { href: '#/homepage', label: 'Homepage', icon: 'M3 3h18v18H3zM3 9h18M9 21V9' },
      { href: '#/articles', label: 'Articles', icon: 'M4 4h16v16H4zM8 8h8M8 12h8M8 16h5' },
      { href: '#/faqs', label: 'FAQ', icon: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01' },
      { href: '#/settings', label: 'Settings', icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z' },
      { href: '#/activity', label: 'Activity log', icon: 'M22 12h-4l-3 9L9 3l-3 9H2' }
    ] }
  ];

  function renderSide() {
    var side = document.getElementById('side');
    var cur = '#' + (location.hash.slice(1).split('?')[0] || '/');
    side.innerHTML = '<a class="logo adm-logo" href="#/"><span class="logo-mark"><span class="logo-ring"></span><svg viewBox="0 0 40 40"><path d="M11 29V12l9 7 9-7v17" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="logo-text">FiveMDepot</span><span class="adm-pill">Admin</span></a>' +
      NAV.map(function (g) {
        return '<div class="adm-group">' + (g.group ? '<div class="adm-group-title">' + g.group + '</div>' : '') +
          g.items.map(function (it) {
            var on = it.href === '#/' ? cur === '#/' : cur.indexOf(it.href) === 0;
            var n = it.count && counts[it.count];
            return '<a class="adm-link' + (on ? ' on' : '') + '" href="' + it.href + '"' + (on ? ' aria-current="page"' : '') + '>' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="' + it.icon + '"/></svg>' +
              '<span>' + it.label + '</span>' + (n ? '<b class="adm-count">' + n + '</b>' : '') + '</a>';
          }).join('') + '</div>';
      }).join('');
  }

  Admin.refreshCounts = function () {
    return Admin.get('admin/dashboard').then(function (b) { counts = b.data.stats; renderSide(); return b.data; }).catch(function () {});
  };

  // ---------- Router ----------
  Admin.page = function (pattern, render) {
    var keys = [];
    var re = new RegExp('^' + pattern.replace(/:(\w+)/g, function (_, k) { keys.push(k); return '([^/]+)'; }) + '$');
    routes.push({ re: re, keys: keys, render: render });
  };
  Admin.go = function (hash) { if (location.hash === hash) route(); else location.hash = hash; };
  Admin.query = function () { return new URLSearchParams(location.hash.split('?')[1] || ''); };
  Admin.setQuery = function (obj) {
    var base = location.hash.split('?')[0];
    var q = new URLSearchParams();
    Object.keys(obj).forEach(function (k) { if (obj[k] !== '' && obj[k] != null && obj[k] !== false) q.set(k, obj[k]); });
    var s = q.toString();
    history.replaceState(null, '', base + (s ? '?' + s : ''));
  };

  var dirtyCheck = null;
  /** Pages with unsaved changes register a check; navigation asks before leaving. */
  Admin.guard = function (fn) { dirtyCheck = fn; };

  function route() {
    var path = location.hash.slice(1).split('?')[0] || '/';
    // Fresh container per page so event listeners from the previous page don't leak
    var old = document.getElementById('page');
    var page = old.cloneNode(false);
    old.replaceWith(page);
    renderSide();
    document.body.classList.remove('side-open');
    for (var i = 0; i < routes.length; i++) {
      var m = path.match(routes[i].re);
      if (!m) continue;
      var params = {};
      routes[i].keys.forEach(function (k, j) { params[k] = decodeURIComponent(m[j + 1]); });
      dirtyCheck = null;
      page.innerHTML = '';
      page.scrollTop = 0;
      window.scrollTo(0, 0);
      Promise.resolve(routes[i].render(page, params)).catch(function (e) {
        page.innerHTML = Admin.empty('Could not load this page', e.message);
      });
      page.focus({ preventScroll: true });
      return;
    }
    page.innerHTML = Admin.empty('Page not found', 'Use the menu on the left.');
  }

  var lastHash = location.hash;
  window.addEventListener('hashchange', function () {
    if (dirtyCheck && dirtyCheck()) {
      var target = location.hash;
      history.replaceState(null, '', lastHash);
      Admin.confirm('You have unsaved changes. Leave this page?', { ok: 'Leave', danger: true }).then(function (yes) {
        if (yes) { dirtyCheck = null; location.hash = target; }
      });
      return;
    }
    lastHash = location.hash;
    route();
  });
  window.addEventListener('beforeunload', function (e) { if (dirtyCheck && dirtyCheck()) { e.preventDefault(); e.returnValue = ''; } });

  /** Page header helper. */
  Admin.head = function (title, sub, actions) {
    return '<div class="adm-head"><div><h1>' + h(title) + '</h1>' + (sub ? '<p class="muted">' + sub + '</p>' : '') + '</div>' +
      (actions ? '<div class="adm-head-actions">' + actions + '</div>' : '') + '</div>';
  };

  // ---------- Global search (Ctrl+K) ----------
  var TYPE_LINK = { product: '#/products/', category: '#/categories?id=', tag: '#/tags?id=', user: '#/users?q=', order: '#/orders?id=' };
  function openSearch() {
    var body = document.createElement('div');
    body.innerHTML = '<input class="input" placeholder="Search products, categories, tags, users, orders…" aria-label="Search" autocomplete="off"><div class="gs-results"></div>';
    var input = body.querySelector('input'), results = body.querySelector('.gs-results');
    var m = Admin.modal({ title: 'Search', body: body, actions: [] });
    m.el.querySelector('.modal-foot').remove();
    var t, active = 0, items = [];
    function draw() {
      results.innerHTML = items.length ? items.map(function (r, i) {
        var href = TYPE_LINK[r.type] + encodeURIComponent(r.type === 'user' ? r.label : r.id);
        return '<a class="gs-item' + (i === active ? ' on' : '') + '" href="' + href + '"><span class="gs-type">' + h(r.type) + '</span><b>' + h(r.label) + '</b><small>' + h(r.sub || '') + '</small></a>';
      }).join('') : (input.value.trim().length > 1 ? '<p class="muted small" style="padding:12px">No results</p>' : '<p class="muted small" style="padding:12px">Type at least 2 characters</p>');
    }
    input.addEventListener('input', function () {
      clearTimeout(t);
      t = setTimeout(function () {
        var q = input.value.trim();
        if (q.length < 2) { items = []; draw(); return; }
        Admin.get('admin/search&q=' + encodeURIComponent(q)).then(function (b) { items = b.data; active = 0; draw(); }).catch(Admin.fail);
      }, 200);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(active + 1, items.length - 1); draw(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(active - 1, 0); draw(); }
      if (e.key === 'Enter') { var a = results.querySelectorAll('.gs-item')[active]; if (a) { location.hash = a.getAttribute('href'); m.close(); } }
    });
    results.addEventListener('click', function (e) { if (e.target.closest('.gs-item')) m.close(); });
    draw();
    input.focus();
  }

  // ---------- Start ----------
  Admin.start = function () {
    loadMe().then(function (user) {
      if (!user) { location.href = '../auth.html?next=' + encodeURIComponent('admin/' + location.hash); return; }
      if (user.role !== 'ADMIN') {
        document.getElementById('boot').innerHTML = '<div class="empty" style="max-width:420px"><b>Admins only</b>You are logged in as ' + h(user.email) + '. <a class="link-more" href="../' + h(user.dashboard) + '">Go to your dashboard →</a></div>';
        return;
      }
      Admin.user = user;
      document.getElementById('userBox').innerHTML =
        '<button class="adm-avatar" id="userBtn" aria-haspopup="true">' + h((user.name || '?').charAt(0).toUpperCase()) + '</button>' +
        '<div class="adm-usermenu" id="userMenu" hidden><b>' + h(user.name) + '</b><small>' + h(user.email) + '</small>' +
        '<a href="../dashboard/buyer.html">My purchases</a><button type="button" id="logoutBtn">Log out</button></div>';
      document.getElementById('userBtn').addEventListener('click', function (e) { e.stopPropagation(); var m = document.getElementById('userMenu'); m.hidden = !m.hidden; });
      document.addEventListener('click', function () { var m = document.getElementById('userMenu'); if (m) m.hidden = true; });
      document.getElementById('logoutBtn').addEventListener('click', function () {
        Admin.post('auth/logout').finally(function () { location.href = '../index.html'; });
      });
      document.getElementById('boot').remove();
      Admin.refreshCounts();
      route();
    }).catch(function () {
      document.getElementById('boot').innerHTML = '<div class="empty" style="max-width:460px"><b>Can’t reach the server</b>Check that the database migrations (migrations/001 and 002) have been run, then reload.</div>';
    });

    document.getElementById('menuBtn').addEventListener('click', function () { document.body.classList.add('side-open'); });
    document.getElementById('scrim').addEventListener('click', function () { document.body.classList.remove('side-open'); });
    document.getElementById('searchBtn').addEventListener('click', openSearch);
    document.getElementById('themeBtn').addEventListener('click', function () {
      var next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('fivedepot_theme', next); } catch (e) {}
    });
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if (!document.querySelector('.modal-wrap')) openSearch(); }
    });
  };
})();
