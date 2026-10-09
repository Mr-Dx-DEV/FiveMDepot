/* ============================================================
   FiveMDepot — Store core (header, footer, theme, cart, cards)
   Pages include:  <div id="site-header"></div> ... <div id="site-footer"></div>
   then store.js, then their page script.
   ============================================================ */
(function () {
  'use strict';

  // ---------- Helpers ----------
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  // Category icons are stored as HTML entities (e.g. "&#128187;"); allow only entities / plain emoji.
  var icon = function (s) {
    s = String(s || '');
    return /^(&#\d+;|&#x[0-9a-f]+;|[^<>&"']{1,4})$/i.test(s) ? s : '&#128230;';
  };
  var money = function (n) { return '$' + Number(n || 0).toFixed(2).replace(/\.00$/, ''); };
  var qs = function (obj) {
    return Object.keys(obj).filter(function (k) { return obj[k] !== '' && obj[k] != null; })
      .map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(obj[k]); }).join('&');
  };
  // The server pack category has its own landing page
  var catUrl = function (slug) { return slug === 'server-packs' ? 'server-packs.html' : 'category.html?c=' + encodeURIComponent(slug); };
  var productUrl = function (slug) { return 'product.html?slug=' + encodeURIComponent(slug); };

  var I = {
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.7 12.4a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.5L22 7H6"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 21s-7.5-4.6-9.5-9.3C1 8 3.4 4.5 7 4.5c2 0 3.4 1 5 3 1.6-2 3-3 5-3 3.6 0 6 3.5 4.5 7.2C19.5 16.4 12 21 12 21z"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    moon: '<svg class="i-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
    sun: '<svg class="i-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    caret: '<svg class="caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    discord: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.3 4.4A19.8 19.8 0 0 0 15.4 3l-.6 1.3a18.3 18.3 0 0 0-5.6 0L8.6 3a19.7 19.7 0 0 0-4.9 1.5C.6 9.1-.3 13.6.1 18.1a19.9 19.9 0 0 0 6 3l1.3-2a12.9 12.9 0 0 1-2-1l.5-.4a14.2 14.2 0 0 0 12.2 0l.5.4a12.9 12.9 0 0 1-2 1l1.3 2a19.8 19.8 0 0 0 6-3c.5-5.2-.8-9.7-3.6-13.7zM8 15.4c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4zm8 0c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4z"/></svg>',
    github: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5a11.5 11.5 0 0 0-3.6 22.4c.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0C17.3 4.8 18.3 5 18.3 5c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.2c0 .3.2.7.8.6A11.5 11.5 0 0 0 12 .5z"/></svg>',
    youtube: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z"/></svg>'
  };

  // ---------- Category icons + artwork ----------
  var svg = function (d) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>'; };
  var CAT_ICONS = {
    server: svg('<rect x="3" y="3" width="18" height="7" rx="2"/><rect x="3" y="14" width="18" height="7" rx="2"/><path d="M7 6.5h.01M7 17.5h.01M11 6.5h6M11 17.5h6"/>'),
    code: svg('<path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14"/>'),
    car: svg('<path d="M5 16H3v-4l2-5h11l3 5h2v4h-2"/><circle cx="7.5" cy="16.5" r="2"/><circle cx="16.5" cy="16.5" r="2"/><path d="M9.5 16.5h5M6 12h13"/>'),
    building: svg('<path d="M4 21V5l8-3v19M12 8l8 3v10M2 21h20M7 8h2M7 12h2M7 16h2M15 13h2M15 17h2"/>'),
    map: svg('<path d="M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/>'),
    shirt: svg('<path d="M8 3 3 6l2 5 2-1v11h10V10l2 1 2-5-5-3a4 4 0 0 1-8 0z"/>'),
    gift: svg('<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v9h14v-9M12 8v13M12 8S10.5 3 8 3a2.5 2.5 0 0 0 0 5M12 8s1.5-5 4-5a2.5 2.5 0 0 1 0 5"/>'),
    ui: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 9v11"/>'),
    job: svg('<path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5z"/><path d="m9 12 2 2 4-4"/>'),
    weapon: svg('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4"/>'),
    box: svg('<path d="m21 8-9-5-9 5v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>')
  };
  var ICON_RULES = [
    [/\bui\b|hud|menu|inventory/, 'ui'], [/server|\bpacks?\b|bundle/, 'server'], [/vehicle|\bcars?\b|bike|heli|boat/, 'car'],
    [/mlo|interior|building/, 'building'], [/\bmaps?\b/, 'map'], [/cloth|eup|outfit|wear/, 'shirt'], [/free|gift/, 'gift'],
    [/job|police|ems|polic|gang/, 'job'], [/weapon|gun/, 'weapon'], [/script|code|system|tool/, 'code']
  ];
  function catKey(c) {
    var s = ((c && c.slug) || '') + ' ' + ((c && c.name) || '');
    s = s.toLowerCase();
    for (var i = 0; i < ICON_RULES.length; i++) if (ICON_RULES[i][0].test(s)) return ICON_RULES[i][1];
    return 'box';
  }
  function catIcon(c) { return CAT_ICONS[catKey(c)]; }
  // Real photos (CC0, see images/photos/CREDITS.txt) per category type
  var ART = { server: 'server-packs', car: 'vehicles', building: 'mlos-maps', map: 'hero-city', shirt: 'clothing', gift: 'free-assets', code: 'scripts', ui: 'scripts', job: 'police', weapon: 'police', box: 'default' };
  function photo(key, small) { return 'images/photos/' + ART[key] + (small ? '-640' : '') + '.jpg'; }
  // Banner set by admin → newest featured product image in the category → drawn artwork
  function catArt(c, small) { return (c && (c.banner_url || c.cover_url)) || photo(catKey(c), small); }
  function productArt(p) {
    var b = (p.badge && p.badge.slug) || (p.type === 'server_pack' ? 'server-pack' : '');
    return photo(catKey({ slug: b }), true);
  }

  function logoHtml(name) {
    return '<span class="logo-mark" aria-hidden="true"><span class="logo-ring"></span>' +
      '<svg viewBox="0 0 40 40"><path d="M11 29V12l9 7 9-7v17" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span>' +
      '<span class="logo-text">' + esc(name) + '</span>';
  }

  // Used when the store API is unreachable (e.g. migration not yet run)
  var FALLBACK_NAV = [
    { name: 'Complete Server Pack', slug: 'server-packs', show_in_nav: true, children: [] },
    { name: 'Scripts', slug: 'scripts', show_in_nav: true, children: [] },
    { name: 'Clothes', slug: 'clothing', show_in_nav: true, children: [] },
    { name: 'Vehicles', slug: 'vehicles', show_in_nav: true, children: [] },
    { name: 'Maps & MLOs', slug: 'mlos-maps', show_in_nav: true, children: [] }
  ];
  var STATIC_LINKS = [
    { type: 'blog', name: 'Blog', href: 'documentation.html?type=blog', desc: 'News, guides and server-owner stories', icon: 'M4 4h12l4 4v12H4zM8 10h8M8 14h8M8 18h5' },
    { type: 'tutorial', name: 'Tutorials', href: 'documentation.html?type=tutorial', desc: 'Step-by-step server setup guides', icon: 'M4 5h16v11H4zM9 20h6M12 16v4M10 8.5l4 2.5-4 2.5z' },
    { type: 'tool', name: 'Tools', href: 'documentation.html?type=tool', desc: 'oxmysql, MariaDB, txAdmin and more', icon: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z' },
    { type: 'doc', name: 'Docs', href: 'documentation.html?type=doc', desc: 'Buying, installing, policies', icon: 'M6 2h9l5 5v15H6zM14 2v6h6M9 13h8M9 17h8' }
  ];

  // "Resources" mega menu: one entry in the top bar that slides down with every section and its most-read articles
  function resourcesMenu(res, active) {
    var cols = STATIC_LINKS.map(function (l) {
      var r = (res && res[l.type]) || { count: 0, top: [] };
      return '<div class="mega-col"><a class="mega-head" href="' + l.href + '"><span class="di"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="' + l.icon + '"/></svg></span>' +
        '<span><b>' + l.name + (r.count ? ' <small>' + r.count + '</small>' : '') + '</b><small>' + l.desc + '</small></span></a>' +
        (r.top || []).map(function (a) {
          return '<a class="mega-link" href="documentation.html?type=' + l.type + '&amp;slug=' + encodeURIComponent(a.slug) + '">' + esc(a.title) + '</a>';
        }).join('') +
        '<a class="mega-all" href="' + l.href + '">View all ' + l.name.toLowerCase() + ' →</a></div>';
    }).join('');
    return '<div class="nav-item nav-mega-item"><a class="nav-link' + (active ? ' active' : '') + '" href="documentation.html?type=blog" aria-haspopup="true">Resources' + I.caret + '</a>' +
      '<div class="nav-drop nav-mega">' + cols + '</div></div>';
  }

  // ---------- Promo bar config ----------
  // The one place to edit the promo bar. Admin -> Settings -> Promo bar fills in the headline,
  // coupon, end time and free-install flag at runtime (see promoBar() in api/store.php).
  var PROMO = {
    badge: 'Limited time',
    headline: '',                 // empty = show the plain announcement bar instead
    freeInstall: false,
    freeInstallLabel: 'Free installation',
    code: '',                     // the API only sends codes that are live in Promos
    endsAt: null,                 // ISO date; no countdown when empty
    cta: { label: 'Shop now', href: 'category.html?c=all' }
  };


  // ---------- API ----------
  function api(route, params) {
    var url = 'api/store.php?' + qs(Object.assign({ r: route }, params || {}));
    return fetch(url, { credentials: 'same-origin' }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (body) {
        if (!res.ok || body.error || body.data === undefined) throw new Error((body.error && body.error.message) || ('Invalid store response (' + res.status + ')'));
        return body.data;
      });
    });
  }

  // API v1 (auth/account/checkout). Non-GET calls carry the CSRF token; a 419 refreshes it once.
  var csrf = null, mePromise = null;
  function me(force) {
    if (!mePromise || force) {
      mePromise = fetch('api/v1.php?r=auth/me', { credentials: 'same-origin' })
        .then(function (r) { return r.json(); })
        .then(function (j) { csrf = j.data.csrf; return j.data.user; })
        .catch(function () { return null; });
    }
    return mePromise;
  }
  function v1(method, path, data, retried) {
    var ready = method === 'GET' || csrf ? Promise.resolve() : me();
    return ready.then(function () {
      var opts = { method: method, credentials: 'same-origin', headers: {} };
      if (method !== 'GET') opts.headers['X-CSRF-Token'] = csrf || '';
      if (data instanceof FormData) opts.body = data;
      else if (data !== undefined) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(data); }
      return fetch('api/v1.php?r=' + path, opts);
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (body) {
        if (res.status === 419 && !retried) return me(true).then(function () { return v1(method, path, data, true); });
        if (!res.ok || body.error || body.data === undefined) {
          var e = new Error((body.error && body.error.message) || 'Something went wrong (' + res.status + ')');
          e.status = res.status; e.fields = (body.error && body.error.fields) || {};
          throw e;
        }
        return body.data;
      });
    });
  }
  // Site root = folder that contains js/store.js (works from sub-folders and sub-directory installs)
  var ROOT = (document.currentScript && document.currentScript.src || location.href).replace(/js\/store\.js.*$/, '');
  function loginUrl(next) {
    var here = location.href.indexOf(ROOT) === 0 ? location.href.slice(ROOT.length) : 'index.html';
    return ROOT + 'auth.html?next=' + encodeURIComponent(next || here);
  }

  var navPromise = null;
  function nav() {
    if (!navPromise) {
      navPromise = api('nav').catch(function () {
        return { categories: FALLBACK_NAV, settings: {}, offline: true };
      });
    }
    return navPromise;
  }

  // ---------- Theme ----------
  var THEME_KEY = 'fivedepot_theme'; // shared with js/main.js
  function applyTheme() {
    var t = 'dark';
    try { if (localStorage.getItem(THEME_KEY) === 'light') t = 'light'; } catch (e) {}
    document.documentElement.setAttribute('data-theme', t);
  }
  function toggleTheme() {
    var next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
  }
  applyTheme();

  // ---------- Toast ----------
  function toast(msg, type) {
    var box = document.querySelector('.toasts');
    if (!box) { box = document.createElement('div'); box.className = 'toasts'; document.body.appendChild(box); }
    var el = document.createElement('div');
    el.className = 'toast ' + (type || '');
    el.setAttribute('role', 'status');
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(function () { el.remove(); }, 3000);
  }

  // ---------- Cart (same storage as cart.html / js/main.js) ----------
  var CART_KEY = 'fivemdepot-cart';
  var Cart = {
    items: function () {
      try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch (e) { return []; }
    },
    save: function (items) {
      try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch (e) {}
      Cart.renderCount();
    },
    add: function (p, opts) {
      opts = opts || {};
      var items = Cart.items();
      if (!items.some(function (i) { return i.id === p.id; })) {
        items.push({
          id: p.id, slug: p.slug, title: p.title,
          price: p.sale_price != null ? p.sale_price : p.price,
          original: p.price,
          image: p.image || '', seller: { name: p.seller || 'FiveMDepot' }
        });
        Cart.save(items);
        bumpCart();
      }
      if (!opts.silent) Drawer.open(p.id);
    },
    remove: function (id) {
      Cart.save(Cart.items().filter(function (i) { return i.id !== id; }));
    },
    clear: function () { Cart.save([]); },
    has: function (id) { return Cart.items().some(function (i) { return i.id === id; }); },
    renderCount: function () {
      var n = Cart.items().length;
      document.querySelectorAll('[data-cart-count]').forEach(function (b) {
        b.textContent = n;
        b.style.display = n ? 'flex' : 'none';
      });
    }
  };
  window.addEventListener('storage', function (e) { if (e.key === CART_KEY) Cart.renderCount(); });

  // ---------- Wishlist ----------
  function toggleWish(btn, productId) {
    if (!Store.user) { location.href = loginUrl(); return; }
    var on = !btn.classList.contains('on');
    btn.classList.toggle('on', on);
    v1('POST', 'account/wishlist/' + encodeURIComponent(productId), { on: on }).then(function () {
      toast(on ? 'Saved to wishlist' : 'Removed from wishlist', 'success');
    }).catch(function (e) { btn.classList.toggle('on', !on); toast(e.message, 'error'); });
  }
  /** Mark hearts of wishlisted products on the current page. */
  function syncWishlist() {
    if (!Store.user) return;
    var ids = Object.keys(cardData);
    if (!ids.length) return;
    v1('GET', 'account/status&ids=' + ids.map(encodeURIComponent).join(',')).then(function (st) {
      document.querySelectorAll('[data-wish]').forEach(function (b) {
        b.hidden = false;
        b.classList.toggle('on', st.wishlist.indexOf(b.getAttribute('data-wish')) !== -1);
      });
    }).catch(function () {});
  }

  // ---------- Cart icon bounce ----------
  function bumpCart() {
    document.querySelectorAll('.cart-btn').forEach(function (b) {
      b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
    });
  }

  // ---------- Claim a free product (login required) ----------
  var CLAIM_KEY = 'fivemdepot-claim';
  function claim(p, btn) {
    if (!Store.user) {
      try { sessionStorage.setItem(CLAIM_KEY, p.id); } catch (e) {}
      toast('Log in or create a free account to claim it');
      setTimeout(function () { location.href = loginUrl(); }, 600);
      return Promise.resolve(false);
    }
    if (btn) { btn.disabled = true; btn.textContent = '…'; }
    return v1('POST', 'checkout/order', { ids: [p.id] }).then(function () {
      if (btn) { btn.textContent = '✓ Claimed'; btn.classList.add('done'); }
      toastLink('Added to your library', 'dashboard/buyer.html', 'Open library');
      document.dispatchEvent(new CustomEvent('store:claimed', { detail: p.id }));
      return true;
    }).catch(function (e) {
      if (btn) { btn.disabled = false; btn.textContent = 'Claim'; }
      if (/already own/i.test(e.message)) { toastLink('You already own this', 'dashboard/buyer.html', 'Open library'); return true; }
      toast(e.message, 'error');
      return false;
    });
  }
  function toastLink(msg, href, label) {
    toast(msg, 'success');
    var t = document.querySelector('.toasts .toast:last-child');
    if (t) t.innerHTML = esc(msg) + ' · <a href="' + esc(ROOT + href) + '" style="color:var(--accent);font-weight:700">' + esc(label) + ' →</a>';
  }

  // ---------- Slide-in cart drawer ----------
  var Drawer = (function () {
    var el = null, lastFocus = null, highlight = null;
    function build() {
      if (el) return;
      el = document.createElement('div');
      el.className = 'cd-wrap';
      el.innerHTML = '<div class="cd-scrim" data-cd-close></div>' +
        '<aside class="cd" role="dialog" aria-modal="true" aria-labelledby="cdTitle">' +
          '<div class="cd-head"><h2 id="cdTitle">Your cart</h2><button class="icon-btn" data-cd-close aria-label="Close cart">' + I.close + '</button></div>' +
          '<div class="cd-body" id="cdBody"></div><div class="cd-foot" id="cdFoot"></div>' +
        '</aside>';
      document.body.appendChild(el);
      el.addEventListener('click', function (e) {
        if (e.target.closest('[data-cd-close]')) { close(); return; }
        var rm = e.target.closest('[data-cd-rm]');
        if (rm) {
          var line = rm.closest('.cd-line');
          line.classList.add('out');
          setTimeout(function () { Cart.remove(rm.getAttribute('data-cd-rm')); render(); }, 220);
        }
      });
      el.addEventListener('submit', function (e) {
        if (e.target.id !== 'cdPromoForm') return;
        e.preventDefault();
        var code = e.target.elements.code.value.trim().toUpperCase();
        try { code ? localStorage.setItem('fivemdepot-promo', code) : localStorage.removeItem('fivemdepot-promo'); } catch (err) {}
        render();
      });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && el.classList.contains('open')) close(); });
    }
    function lineHtml(i, idx) {
      var save = i.original > i.price ? i.original - i.price : 0;
      return '<div class="cd-line' + (i.id === highlight ? ' new' : '') + '" style="animation-delay:' + (idx * 40) + 'ms">' +
        '<a href="' + ROOT + productUrl(i.slug) + '"><img src="' + esc(i.image || 'images/photos/default-640.jpg') + '" alt="" data-fallback="images/store/cat-default.svg"></a>' +
        '<div class="cd-info"><a class="cd-title" href="' + ROOT + productUrl(i.slug) + '">' + esc(i.title) + '</a>' +
          (i.owned ? '<span class="cd-owned">✓ You already own this — not charged</span>'
                   : save ? '<span class="cd-save">You save ' + money(save) + '</span>' : '<span class="cd-meta">Digital resource</span>') +
        '</div>' +
        '<div class="cd-price">' + (i.owned ? '<s>' + money(i.price) + '</s>' : (i.price === 0 ? '<b class="up">Free</b>' : '<b>' + money(i.price) + '</b>' + (save ? '<s>' + money(i.original) + '</s>' : ''))) +
          '<button data-cd-rm="' + esc(i.id) + '" aria-label="Remove ' + esc(i.title) + '">Remove</button></div></div>';
    }
    function render() {
      var body = el.querySelector('#cdBody'), foot = el.querySelector('#cdFoot');
      var local = Cart.items();
      el.querySelector('#cdTitle').textContent = 'Your cart' + (local.length ? ' (' + local.length + ')' : '');
      if (!local.length) {
        body.innerHTML = '<div class="cd-empty"><div class="cd-empty-ico">' + I.cart + '</div><b>Your cart is empty</b><span>Scripts, MLOs, vehicles and server packs are waiting.</span>' +
          '<a class="btn btn-primary" href="' + ROOT + 'category.html?c=all">Browse the store</a></div>';
        foot.innerHTML = '';
        return;
      }
      // instant render from local data, then replace with server-checked prices
      draw(local.map(function (i) { return { id: i.id, slug: i.slug, title: i.title, image: i.image, price: +i.price, original: +(i.original != null ? i.original : i.price), owned: false }; }));
      var code = ''; try { code = localStorage.getItem('fivemdepot-promo') || ''; } catch (e) {}
      v1('POST', 'checkout/quote', { ids: local.map(function (i) { return i.id; }), promo_code: code }).then(function (q) {
        var live = q.items.map(function (x) { return x.id; });
        local.forEach(function (i) { if (live.indexOf(i.id) === -1) Cart.remove(i.id); });
        if (!q.items.length) { render(); return; }
        draw(q.items, q);
      }).catch(function (e) {
        if (e.fields && e.fields.promo_code) {
          try { localStorage.removeItem('fivemdepot-promo'); } catch (err) {}
          toast(e.fields.promo_code, 'error'); render();
        }
      });
    }
    function draw(items, quote) {
      var body = el.querySelector('#cdBody'), foot = el.querySelector('#cdFoot');
      var charge = items.filter(function (i) { return !i.owned; });
      var original = charge.reduce(function (s, i) { return s + (i.original > i.price ? i.original : i.price); }, 0);
      var total = quote ? quote.total : charge.reduce(function (s, i) { return s + i.price; }, 0);
      var saved = Math.max(0, original - total);
      body.innerHTML = items.map(lineHtml).join('') +
        '<form class="cd-promo" id="cdPromoForm"><label for="cdPromoInput">Promo code</label><div><input id="cdPromoInput" class="input" name="code" maxlength="50" value="' + esc(quote && quote.promo ? quote.promo.code : '') + '" placeholder="Enter code"><button class="btn btn-ghost btn-sm" type="submit">Apply</button></div><small>Final price and eligibility are checked at checkout.</small></form>';
      var checkoutBtn;
      if (!charge.length) checkoutBtn = '<a class="btn btn-ghost btn-block" href="' + ROOT + 'dashboard/buyer.html">You own everything — open library</a>';
      else if (Store.user) checkoutBtn = '<a class="btn btn-primary btn-lg btn-block cd-checkout" href="' + ROOT + 'checkout.html">' + (total === 0 ? 'Get them free' : 'Checkout · ' + money(total)) + ' →</a>';
      else checkoutBtn = '<div class="cd-login"><b>Log in to checkout</b><span>Your purchases are saved to your account so you can download them any time.</span>' +
          '<div class="cd-login-btns"><a class="btn btn-primary" href="' + ROOT + 'auth.html?next=checkout.html" data-auth-open>Log in</a>' +
          '<a class="btn btn-ghost" href="' + ROOT + 'auth.html?mode=register&next=checkout.html">Sign up free</a></div></div>';
      foot.innerHTML =
        '<div class="cd-row"><span>Subtotal</span><span>' + money(original) + '</span></div>' +
        (quote && quote.discount ? '<div class="cd-row up"><span>Promo ' + esc(quote.promo.code) + '</span><span>−' + money(quote.discount) + '</span></div>' : '') +
        (saved && (!quote || saved > quote.discount) ? '<div class="cd-row up"><span>Product savings</span><span>−' + money(saved - (quote ? quote.discount : 0)) + '</span></div>' : '') +
        '<div class="cd-row cd-total"><span>Total</span><span>' + money(total) + '</span></div>' +
        (saved ? '<div class="cd-saved">🎉 You save ' + money(saved) + ' on this order</div>' : '') +
        checkoutBtn +
        '<div class="cd-trust"><span>Secure checkout</span><span>Available payment methods appear at checkout</span></div>' +
        '<a class="cd-viewcart" href="' + ROOT + 'cart.html">View full cart</a>';
    }
    function open(newId) {
      build();
      highlight = newId || null;
      lastFocus = document.activeElement;
      render();
      el.classList.add('open');
      document.body.classList.add('cd-lock');
      setTimeout(function () { var c = el.querySelector('.cd-head .icon-btn'); if (c) c.focus(); }, 50);
    }
    function close() {
      if (!el) return;
      el.classList.remove('open');
      document.body.classList.remove('cd-lock');
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    window.addEventListener('storage', function (e) { if (e.key === CART_KEY && el && el.classList.contains('open')) render(); });
    return { open: open, close: close, render: function () { if (el && el.classList.contains('open')) render(); } };
  })();

  // ---------- Product card ----------
  var cardData = {};
  function stars(r) {
    var full = Math.round(r);
    return '★★★★★'.slice(0, full) + '<span style="opacity:.3">' + '★★★★★'.slice(0, 5 - full) + '</span>';
  }
  function productCard(p) {
    cardData[p.id] = p;
    var onSale = p.sale_price != null && p.sale_price < p.price;
    var price = onSale ? p.sale_price : p.price;
    var badge = p.badge ? '<span class="pc-badge">' + esc(p.badge.name) + '</span>' : '';
    var fw = (p.frameworks || []).slice(0, 3).map(function (t) {
      return '<span class="chip"><i style="background:' + esc(t.color || 'var(--accent)') + '"></i>' + esc(t.name) + '</span>';
    }).join('');
    var art = productArt(p);
    var media = '<img src="' + esc(p.image || art) + '" alt="' + esc(p.title) + '" loading="lazy" data-fallback="' + esc(art) + '">';
    return '' +
      '<article class="product-card">' +
        '<div class="pc-media">' +
          '<a href="' + productUrl(p.slug) + '" tabindex="-1" aria-hidden="true">' + media + '</a>' + badge +
          (onSale ? '<span class="pc-sale">-' + Math.round((1 - p.sale_price / p.price) * 100) + '%</span>' : '') +
          '<button class="pc-wish" data-wish="' + esc(p.id) + '" aria-label="Save to wishlist"' + (Store.user ? '' : ' hidden') + '>' + I.heart + '</button>' +
        '</div>' +
        '<div class="pc-body">' +
          '<div class="pc-fw">' + fw + '</div>' +
          '<a class="pc-title" href="' + productUrl(p.slug) + '">' + esc(p.title) + '</a>' +
          '<div class="pc-rating">' + (p.review_count ? '<span class="stars">' + stars(p.rating || 0) + '</span><span>' + p.rating + ' (' + p.review_count + ')</span>' : '<span>No reviews yet</span>') + '</div>' +
          '<div class="pc-foot">' +
            '<div class="price' + (price === 0 ? ' free' : '') + '">' + (price === 0 ? 'Free' : money(price)) +
              (onSale ? '<s>' + money(p.price) + '</s>' : '') + '</div>' +
            (price === 0
              ? '<button class="pc-claim" data-claim="' + esc(p.id) + '">Claim</button>'
              : '<button class="pc-add" data-add="' + esc(p.id) + '" aria-label="Add ' + esc(p.title) + ' to cart">' + I.plus + '<span>Add to cart</span></button>') +
          '</div>' +
        '</div>' +
      '</article>';
  }

  // Broken product images → category artwork (error events don't bubble, so capture)
  document.addEventListener('error', function (e) {
    var img = e.target;
    if (img.tagName === 'IMG' && img.dataset.fallback && img.getAttribute('src') !== img.dataset.fallback) {
      img.src = img.dataset.fallback;
    }
  }, true);

  // Delegated clicks for cards anywhere on the page
  document.addEventListener('click', function (e) {
    var claimBtn = e.target.closest('[data-claim]');
    if (claimBtn) { e.preventDefault(); var cp = cardData[claimBtn.getAttribute('data-claim')]; if (cp) claim(cp, claimBtn); return; }
    var cartLink = e.target.closest('[data-open-cart]');
    if (cartLink && !e.ctrlKey && !e.metaKey) { e.preventDefault(); Drawer.open(); return; }
    var add = e.target.closest('[data-add]');
    if (add) { e.preventDefault(); var p = cardData[add.getAttribute('data-add')]; if (p) { add.classList.add('added'); Cart.add(p); } return; }
    var wish = e.target.closest('[data-wish]');
    if (wish) { e.preventDefault(); toggleWish(wish, wish.getAttribute('data-wish')); }
  });

  // ---------- Header ----------
  function socialLinks(s) {
    var out = '';
    if (s.social_discord) out += '<a class="icon-btn" href="' + esc(s.social_discord) + '" target="_blank" rel="noopener" aria-label="Discord">' + I.discord + '</a>';
    if (s.social_github) out += '<a class="icon-btn" href="' + esc(s.social_github) + '" target="_blank" rel="noopener" aria-label="GitHub">' + I.github + '</a>';
    if (s.social_youtube) out += '<a class="icon-btn" href="' + esc(s.social_youtube) + '" target="_blank" rel="noopener" aria-label="YouTube">' + I.youtube + '</a>';
    return out;
  }

  function currentCat() {
    return new URLSearchParams(location.search).get('c');
  }

  // Sign-in uses the same session and CSRF-backed endpoint as auth.html.
  var authModal = null;
  function initAuthModal() {
    document.addEventListener('click', function (e) {
      var trigger = e.target.closest('[data-auth-open]');
      if (!trigger) return;
      e.preventDefault();
      openAuthModal();
    });
  }
  function openAuthModal() {
    if (authModal) return;
    var previous = document.activeElement;
    authModal = document.createElement('div');
    authModal.className = 'fd-auth-wrap';
    authModal.innerHTML = '<div class="fd-auth-scrim" data-auth-close></div>' +
      '<section class="fd-auth" role="dialog" aria-modal="true" aria-labelledby="fdAuthTitle">' +
      '<button class="fd-auth-close icon-btn" type="button" data-auth-close aria-label="Close sign in">' + I.close + '</button>' +
      '<div class="fd-auth-mark">F<span>D</span></div><span class="eyebrow">Your depot awaits</span>' +
      '<h2 id="fdAuthTitle">Welcome back.</h2><p>Sign in to manage your library, wishlist and orders.</p>' +
      '<form id="fdAuthForm"><label>Email address<input class="input" type="email" name="email" autocomplete="email" required></label>' +
      '<label>Password<input class="input" type="password" name="password" autocomplete="current-password" required></label>' +
      '<p class="fd-auth-error" role="alert" hidden></p><button class="btn btn-primary btn-lg btn-block" type="submit">Sign in</button></form>' +
      '<div class="fd-auth-social" hidden></div><p class="fd-auth-bottom">New here? <a href="' + ROOT + 'auth.html?mode=register">Create an account</a></p>' +
      '<p class="fd-auth-help"><a href="' + ROOT + 'auth.html">More sign-in options</a></p></section>';
    document.body.appendChild(authModal);
    document.body.classList.add('fd-modal-lock');
    var close = function () {
      authModal.remove(); authModal = null; document.body.classList.remove('fd-modal-lock');
      if (previous && previous.focus) previous.focus();
    };
    authModal.addEventListener('click', function (e) { if (e.target.closest('[data-auth-close]')) close(); });
    authModal.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') {
        var focusable = Array.from(authModal.querySelectorAll('button, input, a')).filter(function (x) { return !x.closest('[hidden]'); });
        var first = focusable[0], last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    authModal.querySelector('[name=email]').focus();
    fetch(ROOT + 'api/v1.php?r=auth/me', { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (r) {
      if (!authModal || !r.data) return;
      var methods = [];
      var next = encodeURIComponent(location.href.slice(ROOT.length));
      if (r.data.discord) methods.push('<a class="discord-signin" href="' + ROOT + 'api/discord-login.php?next=' + next + '">' + I.discord + 'Continue with Discord<span class="go" aria-hidden="true">→</span></a>');
      if (r.data.google) methods.push('<a href="' + ROOT + 'api/google-login.php?next=' + next + '">Continue with Google</a>');
      if (methods.length) {
        var social = authModal.querySelector('.fd-auth-social');
        social.innerHTML = '<span>or continue with</span>' + methods.join(''); social.hidden = false;
      }
    }).catch(function () {});
    authModal.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault();
      var form = e.currentTarget, button = form.querySelector('button[type=submit]'), error = form.querySelector('.fd-auth-error');
      button.disabled = true; button.textContent = 'Signing in...'; error.hidden = true;
      v1('POST', 'auth/login', { email: form.elements.email.value.trim(), password: form.elements.password.value }).then(function () {
        location.reload();
      }).catch(function (err) {
        error.textContent = err.message; error.hidden = false; button.disabled = false; button.textContent = 'Sign in';
      });
    });
  }

  // ---------- Promo bar ----------
  function promoModel(data) {
    var p = Object.assign({}, PROMO), live = data.promo;
    if (live && live.headline) {
      p.headline = live.headline; p.code = live.code || ''; p.endsAt = live.ends_at || null; p.freeInstall = !!live.free_install;
      if (live.link) p.cta = { label: p.cta.label, href: live.link };
    }
    if (!p.headline) return null;
    if (p.endsAt && !(new Date(p.endsAt).getTime() > Date.now())) return null;
    return p;
  }

  function promoHtml(p, s) {
    if (!p) {
      return '<div class="topbar"><span class="topbar-signal" aria-hidden="true"></span><span class="topbar-label">From the depot</span><span class="topbar-copy">' + esc(s.topbar_text || 'Explore resources for your next FiveM world') + '</span>' +
        '<a href="' + esc(s.topbar_link || 'category.html?c=all') + '">Explore <span aria-hidden="true">&rarr;</span></a></div>';
    }
    return '<div class="promo-bar" role="region" aria-label="Current promotion"><div class="promo-inner">' +
      '<div class="promo-msg"><span class="fd-badge fd-badge--solid promo-badge">' + esc(p.badge) + '</span>' +
        '<strong class="promo-headline">' + esc(p.headline) + '</strong>' +
        (p.freeInstall ? '<span class="fd-badge fd-badge--warm promo-install">' + I.check + esc(p.freeInstallLabel) + '</span>' : '') + '</div>' +
      '<div class="promo-actions">' +
        (p.code ? '<button type="button" class="promo-code" data-promo-copy="' + esc(p.code) + '" aria-label="Copy coupon code ' + esc(p.code) + '">' +
          '<span class="promo-code-label">Code</span><b>' + esc(p.code) + '</b><span class="promo-code-state" aria-hidden="true">Copy</span></button>' : '') +
        (p.endsAt ? '<span class="promo-timer" data-promo-ends="' + esc(p.endsAt) + '" role="timer" aria-label="Offer ends in"></span>' : '') +
        '<a class="promo-cta" href="' + esc(p.cta.href) + '">' + esc(p.cta.label) + '<span aria-hidden="true">&rarr;</span></a>' +
      '</div></div></div>';
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var t = document.createElement('textarea');
      t.value = text; t.setAttribute('readonly', ''); t.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(t); t.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
      t.remove(); if (ok) resolve(); else reject(new Error('copy failed'));
    });
  }

  function initPromo(bar) {
    if (!bar || !bar.classList.contains('promo-bar')) return;
    var btn = bar.querySelector('[data-promo-copy]');
    if (btn) btn.addEventListener('click', function () {
      var code = btn.getAttribute('data-promo-copy'), label = btn.querySelector('.promo-code-state');
      copyText(code).then(function () {
        btn.classList.add('copied'); label.textContent = 'Copied';
        toast('Code ' + code + ' copied', 'success');
        setTimeout(function () { btn.classList.remove('copied'); label.textContent = 'Copy'; }, 1800);
      }).catch(function () { toast('Could not copy — the code is ' + code, 'error'); });
    });
    var timer = bar.querySelector('[data-promo-ends]');
    if (!timer) return;
    var end = new Date(timer.getAttribute('data-promo-ends')).getTime(), iv;
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var seg = function (v, u) { return '<span class="promo-seg"><b>' + v + '</b><small>' + u + '</small></span>'; };
    var tick = function () {
      var left = Math.max(0, Math.floor((end - Date.now()) / 1000));
      if (!left) { clearInterval(iv); bar.remove(); return; }
      var d = Math.floor(left / 86400), h = Math.floor(left / 3600) % 24, m = Math.floor(left / 60) % 60;
      timer.innerHTML = '<span class="promo-timer-label">Ends in</span>' + (d ? seg(d, 'd') : '') + seg(pad(h), 'h') + seg(pad(m), 'm') + seg(pad(left % 60), 's');
    };
    iv = setInterval(tick, 1000);
    tick();
  }

  // Navbar tightens once the page scrolls.
  function initCompactHeader(el) {
    var on = false, queued = false;
    var check = function () {
      queued = false;
      var v = window.scrollY > 24;
      if (v !== on) { on = v; el.classList.toggle('is-compact', v); }
    };
    window.addEventListener('scroll', function () { if (!queued) { queued = true; requestAnimationFrame(check); } }, { passive: true });
    check();
  }

  function renderHeader(data) {
    var el = document.getElementById('site-header');
    if (!el) return;
    var cur = currentCat();
    var path = location.pathname.split('/').pop() || 'index.html';
    var navCats = data.categories.filter(function (c) { return c.show_in_nav; });

    var links = '<div class="nav-item"><a class="nav-link' + (path === 'index.html' || path === '' ? ' active' : '') + '" href="index.html">Home</a></div>';
    navCats.forEach(function (c) {
      var kids = c.children || [];
      var active = cur === c.slug || kids.some(function (k) { return k.slug === cur; });
      links += '<div class="nav-item"><a class="nav-link' + (active ? ' active' : '') + '" href="' + catUrl(c.slug) + '">' +
        esc(c.name) + (kids.length ? I.caret : '') + '</a>';
      if (kids.length) {
        links += '<div class="nav-drop"><a href="' + catUrl(c.slug) + '"><span class="dl"><span class="di">' + catIcon(c) + '</span>All ' + esc(c.name) + '</span><span class="count">' + (c.product_count || '') + '</span></a>' +
          kids.map(function (k) {
            return '<a href="' + catUrl(k.slug) + '"><span class="dl"><span class="di">' + catIcon(k) + '</span>' + esc(k.name) + '</span><span class="count">' + (k.product_count || '') + '</span></a>';
          }).join('') + '</div>';
      }
      links += '</div>';
    });
    links += resourcesMenu(data.resources, path === 'documentation.html');

    var drawerLinks = '<a href="index.html">Home</a><a href="category.html?c=all">All Products</a>';
    navCats.forEach(function (c) {
      drawerLinks += '<a href="' + catUrl(c.slug) + '">' + esc(c.name) + '</a>';
      (c.children || []).forEach(function (k) { drawerLinks += '<a class="sub" href="' + catUrl(k.slug) + '">' + esc(k.name) + '</a>'; });
    });
    STATIC_LINKS.forEach(function (l) { drawerLinks += '<a href="' + l.href + '">' + l.name + '</a>'; });
    drawerLinks += '<div id="drawerAcct"><a href="auth.html" data-auth-open>Log in</a><a href="auth.html?mode=register">Create account</a></div>';

    var name = (data.settings && data.settings.site_name) || 'FiveMDepot';

    // The promo bar scrolls away with the page; only the floating navbar is sticky.
    var promo = document.getElementById('site-promo');
    if (!promo) { promo = document.createElement('div'); promo.id = 'site-promo'; el.parentNode.insertBefore(promo, el); }
    promo.innerHTML = promoHtml(promoModel(data), data.settings || {});
    initPromo(promo.firstChild);

    el.innerHTML =
      '<header class="header"><div class="container header-inner">' +
        '<a class="logo" href="index.html" aria-label="' + esc(name) + ' home">' + logoHtml(name) + '</a>' +
        '<nav class="nav" aria-label="Main">' + links + '</nav>' +
        '<div class="header-actions">' +
          '<button class="icon-btn" id="searchBtn" aria-label="Search (press /)" aria-haspopup="dialog">' + I.search + '</button>' +
          '<button class="icon-btn theme-btn" id="themeBtn" aria-label="Toggle light/dark theme">' + I.moon + I.sun + '</button>' +
          '<a class="icon-btn cart-btn" href="cart.html" data-open-cart aria-label="Cart">' + I.cart + '<span class="cart-label">Cart</span><span class="badge-count" data-cart-count></span></a>' +
          '<div class="acct-wrap hide-sm"><a class="icon-btn account-entry" href="auth.html" id="accountBtn" data-auth-open aria-label="Log in">' + I.user + '<span>Sign in</span></a><div class="acct-menu" id="acctMenu" hidden></div></div>' +
          '<div class="socials">' + socialLinks(data.settings || {}) + '</div>' +
          '<button class="icon-btn menu-btn" id="menuBtn" aria-label="Open menu" aria-expanded="false">' + I.menu + '</button>' +
        '</div>' +
      '</div></header>' +
      '<div class="drawer-backdrop" id="drawerBackdrop"></div>' +
      '<aside class="drawer" id="drawer" aria-label="Menu">' +
        '<div class="drawer-head"><a class="logo" href="index.html">' + logoHtml(name) + '</a>' +
          '<button class="icon-btn" id="drawerClose" aria-label="Close menu">' + I.close + '</button></div>' +
        '<form class="header-search drawer-search" action="category.html" role="search">' + I.search +
          '<input type="hidden" name="c" value="all"><input name="q" placeholder="Search resources…" aria-label="Search"></form>' +
        drawerLinks +
      '</aside>' +
      '<div class="search-overlay" id="searchOverlay" role="dialog" aria-modal="true" aria-label="Search the store" hidden>' +
        '<div class="search-panel">' +
          '<form class="search-form" action="category.html" role="search">' + I.search +
            '<input type="hidden" name="c" value="all">' +
            '<input name="q" id="searchInput" placeholder="Search scripts, MLOs, vehicles, server packs…" autocomplete="off" aria-label="Search">' +
            '<button type="button" class="search-esc" id="searchClose" aria-label="Close search">Esc</button></form>' +
          '<div class="search-cats"><span>Browse categories</span><div>' +
            data.categories.map(function (c) {
              return '<a class="search-chip" href="' + catUrl(c.slug) + '"><span class="di">' + catIcon(c) + '</span>' + esc(c.name) + '</a>';
            }).join('') +
          '</div></div>' +
        '</div>' +
      '</div>';

    if (!el.querySelector('.socials').innerHTML) el.querySelector('.socials').remove();

    document.getElementById('themeBtn').addEventListener('click', toggleTheme);
    initSearch();
    var open = function (v) {
      document.body.classList.toggle('drawer-open', v);
      document.getElementById('menuBtn').setAttribute('aria-expanded', String(v));
    };
    document.getElementById('menuBtn').addEventListener('click', function () { open(true); });
    document.getElementById('drawerClose').addEventListener('click', function () { open(false); });
    document.getElementById('drawerBackdrop').addEventListener('click', function () {
      open(false); document.body.classList.remove('filters-open');
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { open(false); document.body.classList.remove('filters-open'); } });

    danceNav(el);
    initCompactHeader(el);
    Cart.renderCount();
    checkAuth();
    initAuthModal();
  }

  function initSearch() {
    var ov = document.getElementById('searchOverlay');
    var input = document.getElementById('searchInput');
    var lastFocus = null;
    function show(v) {
      if (v) {
        lastFocus = document.activeElement;
        ov.hidden = false;
        requestAnimationFrame(function () { ov.classList.add('open'); input.focus(); });
      } else {
        ov.classList.remove('open');
        setTimeout(function () { ov.hidden = true; }, 180);
        if (lastFocus) lastFocus.focus();
      }
    }
    document.getElementById('searchBtn').addEventListener('click', function () { show(true); });
    document.getElementById('searchClose').addEventListener('click', function () { show(false); });
    ov.addEventListener('click', function (e) { if (e.target === ov) show(false); });
    document.addEventListener('keydown', function (e) {
      var typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) || document.activeElement.isContentEditable;
      if (e.key === 'Escape' && !ov.hidden) show(false);
      else if (!typing && (e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k'))) { e.preventDefault(); show(true); }
    });
  }

  function checkAuth() {
    me().then(function (user) {
      if (!user) return;
      Store.user = user;
      accountMenu(user);
      document.querySelectorAll('[data-wish]').forEach(function (b) { b.hidden = false; });
      syncWishlist();
      var pending = null;
      try { pending = sessionStorage.getItem(CLAIM_KEY); sessionStorage.removeItem(CLAIM_KEY); } catch (e) {}
      if (pending) claim({ id: pending }, null);
      document.dispatchEvent(new CustomEvent('store:user', { detail: user }));
    });
  }

  // Top bar: split each link's label into letters so they can bounce one by one on hover (CSS .nl-ch)
  function danceNav(root) {
    root.querySelectorAll('.nav > .nav-item > .nav-link').forEach(function (link) {
      var node = link.firstChild;
      if (!node || node.nodeType !== 3 || !node.nodeValue.trim()) return;
      var text = node.nodeValue;
      var wrap = document.createElement('span');
      wrap.className = 'nl-txt';
      wrap.setAttribute('aria-hidden', 'true');
      wrap.innerHTML = Array.prototype.map.call(text, function (ch, i) {
        return ch === ' ' ? '<span class="nl-sp">&nbsp;</span>' : '<span class="nl-ch" style="--i:' + i + '">' + esc(ch) + '</span>';
      }).join('');
      link.setAttribute('aria-label', text.trim());
      link.replaceChild(wrap, node);
    });
  }

  // ---------- Account menu (header + mobile drawer) ----------
  function accountMenu(user) {
    var links = [
      ['dashboard/buyer.html', 'My library'], ['dashboard/buyer.html?tab=orders', 'Orders'],
      ['dashboard/buyer.html?tab=wishlist', 'Wishlist'], ['dashboard/buyer.html?tab=settings', 'Account settings']
    ];
    if (user.role === 'ADMIN') links.splice(0, 0, ['admin/', 'Admin panel']);
    var items = links.map(function (l) { return '<a href="' + ROOT + l[0] + '">' + esc(l[1]) + '</a>'; }).join('');
    var initial = esc((user.name || user.email || '?').charAt(0).toUpperCase());

    var btn = document.getElementById('accountBtn'), menu = document.getElementById('acctMenu');
    if (btn && menu) {
      btn.outerHTML = '<button class="icon-btn acct-avatar" id="accountBtn" aria-haspopup="true" aria-expanded="false" aria-label="My account">' + initial + '</button>';
      btn = document.getElementById('accountBtn');
      menu.innerHTML = '<div class="acct-who"><b>' + esc(user.name || '') + '</b><small>' + esc(user.email || '') + '</small></div>' + items +
        '<button type="button" class="acct-logout" data-logout>Log out</button>';
      var open = function (v) { menu.hidden = !v; btn.setAttribute('aria-expanded', String(v)); };
      btn.addEventListener('click', function (e) { e.stopPropagation(); open(menu.hidden); });
      document.addEventListener('click', function (e) { if (!menu.hidden && !e.target.closest('.acct-wrap')) open(false); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { open(false); btn.focus(); } });
    }
    var d = document.getElementById('drawerAcct');
    if (d) d.innerHTML = '<span class="drawer-who">' + esc(user.name || user.email) + '</span>' + items + '<a href="#" data-logout>Log out</a>';
  }

  function logout() {
    v1('POST', 'auth/logout', {}).catch(function () {}).then(function () {
      try { sessionStorage.removeItem(CLAIM_KEY); } catch (e) {}
      location.href = ROOT + 'index.html';
    });
  }
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-logout]')) { e.preventDefault(); logout(); }
  });

  // ---------- Footer ----------
  function renderFooter(data) {
    var el = document.getElementById('site-footer');
    if (!el) return;
    var s = data.settings || {};
    var name = s.site_name || 'FiveMDepot';
    var email = s.support_email || 'fivemdepot@gmail.com';
    var cats = data.categories.slice(0, 6).map(function (c) {
      return '<li><a href="' + catUrl(c.slug) + '">' + esc(c.name) + '</a></li>';
    }).join('');
    el.innerHTML =
      '<footer class="footer"><div class="container">' +
        '<div class="footer-grid">' +
          '<div class="footer-brand"><a class="logo" href="index.html">' + logoHtml(name) + '</a>' +
            '<p>' + esc(s.site_tagline || 'Premium FiveM scripts, MLOs, vehicles, clothing and complete server packs.') + '</p>' +
            '<div style="display:flex;gap:4px">' + socialLinks(s) + '</div></div>' +
          '<div><h4>Products</h4><ul>' + cats + '<li><a href="category.html?c=all">All Products</a></li></ul></div>' +
          '<div><h4>Resources</h4><ul><li><a href="documentation.html?type=blog">Blog</a></li><li><a href="documentation.html?type=tutorial">Tutorials</a></li><li><a href="documentation.html?type=tool">Tools</a></li><li><a href="documentation.html?type=doc">Docs</a></li><li><a href="free-assets.html">Free Assets</a></li></ul></div>' +
          '<div><h4>Support</h4><ul><li><a href="dashboard/buyer.html">My Purchases</a></li><li><a href="index.html#faq">FAQ</a></li>' +
            (s.social_discord ? '<li><a href="' + esc(s.social_discord) + '" target="_blank" rel="noopener">Discord Support</a></li>' : '') +
            '<li><a href="documentation.html?type=doc&amp;slug=contact">Contact us</a></li></ul></div>' +
          '<div><h4>Legal</h4><ul><li><a href="documentation.html?type=doc&amp;slug=terms">Terms of Service</a></li><li><a href="documentation.html?type=doc&amp;slug=privacy">Privacy Policy</a></li><li><a href="documentation.html?type=doc&amp;slug=refunds">Refund Policy</a></li>' +
            '<li><a href="mailto:' + esc(email) + '">' + esc(email) + '</a></li></ul></div>' +
        '</div>' +
        '<div class="footer-badges"><span class="footer-badge">FiveM resources</span><span class="footer-badge">Scripts &amp; worlds</span><span class="footer-badge">Server packs</span></div>' +
        '<p class="small muted" style="margin:18px 0 0">Payments are processed by our online reseller Paddle.com, the Merchant of Record for all our orders.</p>' +
        '<div class="footer-bottom"><span>© ' + new Date().getFullYear() + ' ' + esc(name) + (s.legal_name ? ' · operated by ' + esc(s.legal_name) : '') + '. All rights reserved.</span><span>Not affiliated with Rockstar Games or Cfx.re.</span></div>' +
      '</div></footer>';
  }

  // ---------- Reveal on scroll ----------
  function reveal(root) {
    var els = (root || document).querySelectorAll('.reveal:not(.in)');
    if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (e) { io.observe(e); });
  }

  // ---------- Boot ----------
  // ---------- Hover & mouse effects ----------
  // Card light/border follows the mouse, a soft glow trails the cursor, buttons ripple on click.
  function initEffects() {
    var fine = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;
    var calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var CARDS = '.product-card, .cat-card, .fx-card, .rv-card, .seller-card, .trust-item, .hero-cat, .hv-card';
    if (fine) {
      var halo = null, hx = 0, hy = 0, frame = 0;
      if (!calm) { halo = document.createElement('div'); halo.className = 'fx-halo'; halo.setAttribute('aria-hidden', 'true'); document.body.appendChild(halo); }
      document.addEventListener('pointermove', function (e) {
        var card = e.target.closest && e.target.closest(CARDS);
        if (card) {
          var spot = card.querySelector(':scope > .fx-spot');
          if (!spot) { spot = document.createElement('span'); spot.className = 'fx-spot'; spot.setAttribute('aria-hidden', 'true'); card.appendChild(spot); }
          var r = card.getBoundingClientRect();
          card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
          card.style.setProperty('--my', (e.clientY - r.top) + 'px');
        }
        if (halo) {
          hx = e.clientX; hy = e.clientY;
          if (!frame) frame = requestAnimationFrame(function () { frame = 0; halo.style.transform = 'translate(' + hx + 'px,' + hy + 'px)'; halo.classList.add('on'); });
        }
      }, { passive: true });
      if (halo) document.documentElement.addEventListener('mouseleave', function () { halo.classList.remove('on'); });
    }
    if (!calm) {
      document.addEventListener('pointerdown', function (e) {
        var b = e.target.closest && e.target.closest('.btn');
        if (!b || b.disabled) return;
        var r = b.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2.2;
        var s = document.createElement('span');
        s.className = 'fx-ripple';
        s.style.cssText = 'width:' + d + 'px;height:' + d + 'px;left:' + (e.clientX - r.left - d / 2) + 'px;top:' + (e.clientY - r.top - d / 2) + 'px';
        b.appendChild(s);
        setTimeout(function () { s.remove(); }, 650);
      });
    }
  }

  function boot() {
    initEffects();
    nav().then(function (data) {
      // Brand colour chosen in Admin -> Settings (cached so the next page paints in the right colour)
      var accent = (data.settings && data.settings.brand_color) || '';
      if (/^(crimson|orange|blue|green|purple)$/.test(accent)) {
        document.documentElement.setAttribute('data-accent', accent);
        try { localStorage.setItem('fdm_accent', accent); } catch (e) {}
      }
      renderHeader(data);
      renderFooter(data);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  // ---------- Paddle checkout ----------
  // Loads Paddle.js once and opens the overlay checkout for a transaction created by the server.
  // info = { transaction_id, client_token, environment, email, success_url }; onClose runs if the buyer closes it unpaid.
  var paddleReady = null, paddleClose = null, paddlePaid = false;
  function paddleCheckout(info, onClose) {
    if (!paddleReady) {
      paddleReady = new Promise(function (resolve, reject) {
        var s = document.createElement('script');
        s.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
        s.onload = function () {
          if (info.environment === 'sandbox') window.Paddle.Environment.set('sandbox');
          window.Paddle.Initialize({
            token: info.client_token,
            eventCallback: function (ev) {
              if (ev.name === 'checkout.completed') paddlePaid = true;
              if (ev.name === 'checkout.closed' && !paddlePaid && paddleClose) paddleClose();
            }
          });
          resolve(window.Paddle);
        };
        s.onerror = function () { paddleReady = null; reject(new Error('Could not load the secure checkout. Check your connection or disable ad blockers and try again.')); };
        document.head.appendChild(s);
      });
    }
    return paddleReady.then(function (P) {
      paddleClose = onClose || null; paddlePaid = false;
      P.Checkout.open({
        transactionId: info.transaction_id,
        customer: info.email ? { email: info.email } : undefined,
        settings: { displayMode: 'overlay', theme: document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark', successUrl: info.success_url }
      });
    });
  }

  var Store = window.Store = {
    api: api, nav: nav, esc: esc, icon: icon, money: money, qs: qs,
    catUrl: catUrl, productUrl: productUrl, icons: I, catIcon: catIcon, catArt: catArt,
    productCard: productCard, cart: Cart, toast: toast, reveal: reveal, user: null,
    v1: v1, me: me, loginUrl: loginUrl, syncWishlist: syncWishlist, claim: claim, drawer: Drawer, logout: logout, paddleCheckout: paddleCheckout
  };
})();
