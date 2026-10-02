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
  var catUrl = function (slug) { return 'category.html?c=' + encodeURIComponent(slug); };
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

  // Used when the store API is unreachable (e.g. migration not yet run)
  var FALLBACK_NAV = [
    { name: 'Complete Server Pack', slug: 'server-packs', show_in_nav: true, children: [] },
    { name: 'Scripts', slug: 'scripts', show_in_nav: true, children: [] },
    { name: 'Clothes', slug: 'clothing', show_in_nav: true, children: [] },
    { name: 'Vehicles', slug: 'vehicles', show_in_nav: true, children: [] },
    { name: 'Maps & MLOs', slug: 'mlos-maps', show_in_nav: true, children: [] }
  ];
  var STATIC_LINKS = [
    { name: 'Blog', href: 'documentation.html?type=blog' },
    { name: 'Tutorials', href: 'documentation.html?type=tutorial' },
    { name: 'Tools', href: 'documentation.html?type=tool' },
    { name: 'Docs', href: 'documentation.html?type=doc' }
  ];

  // ---------- API ----------
  function api(route, params) {
    var url = 'api/store.php?' + qs(Object.assign({ r: route }, params || {}));
    return fetch(url, { credentials: 'same-origin' }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (body) {
        if (!res.ok || body.error) throw new Error((body.error && body.error.message) || ('HTTP ' + res.status));
        return body.data;
      });
    });
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
    add: function (p) {
      var items = Cart.items();
      if (items.some(function (i) { return i.id === p.id; })) { toast('Already in cart'); return; }
      items.push({
        id: p.id, slug: p.slug, title: p.title,
        price: p.sale_price != null ? p.sale_price : p.price,
        image: p.image || '', seller: { name: p.seller || 'FiveMDepot' }
      });
      Cart.save(items);
      toast('Added to cart', 'success');
    },
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
    var on = btn.classList.contains('on');
    fetch('api/wishlist.php?action=' + (on ? 'remove' : 'add'), {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId })
    }).then(function (res) {
      if (res.status === 401) { toast('Log in to use your wishlist'); return; }
      if (res.ok || res.status === 409) {
        btn.classList.toggle('on', !on);
        toast(on ? 'Removed from wishlist' : 'Saved to wishlist', 'success');
      } else { toast('Could not update wishlist', 'error'); }
    }).catch(function () { toast('Could not update wishlist', 'error'); });
  }

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
    var badge = p.badge ? '<span class="pc-badge" style="background:' + esc(p.badge.color || 'var(--accent)') + '">' + esc(p.badge.name) + '</span>' : '';
    var fw = (p.frameworks || []).slice(0, 3).map(function (t) {
      return '<span class="chip"><i style="background:' + esc(t.color || 'var(--accent)') + '"></i>' + esc(t.name) + '</span>';
    }).join('');
    var media = p.image
      ? '<img src="' + esc(p.image) + '" alt="' + esc(p.title) + '" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement(\'div\'),{className:\'ph\',innerHTML:\'&#128230;\'}))">'
      : '<div class="ph">&#128230;</div>';
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
          '<div class="pc-rating"><span class="stars">' + stars(p.rating || 0) + '</span>' +
            (p.review_count ? '(' + p.review_count + ')' : 'No reviews yet') + '</div>' +
          '<div class="pc-foot">' +
            '<div class="price' + (price === 0 ? ' free' : '') + '">' + (price === 0 ? 'Free' : money(price)) +
              (onSale ? '<s>' + money(p.price) + '</s>' : '') + '</div>' +
            '<button class="pc-add" data-add="' + esc(p.id) + '" aria-label="Add ' + esc(p.title) + ' to cart">' + I.plus + '</button>' +
          '</div>' +
        '</div>' +
      '</article>';
  }

  // Delegated clicks for cards anywhere on the page
  document.addEventListener('click', function (e) {
    var add = e.target.closest('[data-add]');
    if (add) { e.preventDefault(); var p = cardData[add.getAttribute('data-add')]; if (p) Cart.add(p); return; }
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
        links += '<div class="nav-drop"><a href="' + catUrl(c.slug) + '"><span>All ' + esc(c.name) + '</span><span class="count">' + (c.product_count || '') + '</span></a>' +
          kids.map(function (k) {
            return '<a href="' + catUrl(k.slug) + '"><span>' + esc(k.name) + '</span><span class="count">' + (k.product_count || '') + '</span></a>';
          }).join('') + '</div>';
      }
      links += '</div>';
    });
    STATIC_LINKS.forEach(function (l) {
      links += '<div class="nav-item"><a class="nav-link" href="' + l.href + '">' + l.name + '</a></div>';
    });

    var drawerLinks = '<a href="index.html">Home</a><a href="category.html?c=all">All Products</a>';
    navCats.forEach(function (c) {
      drawerLinks += '<a href="' + catUrl(c.slug) + '">' + esc(c.name) + '</a>';
      (c.children || []).forEach(function (k) { drawerLinks += '<a class="sub" href="' + catUrl(k.slug) + '">' + esc(k.name) + '</a>'; });
    });
    STATIC_LINKS.forEach(function (l) { drawerLinks += '<a href="' + l.href + '">' + l.name + '</a>'; });
    drawerLinks += '<a href="wishlist.html">Wishlist</a><a href="auth.html">Account</a>';

    var name = (data.settings && data.settings.site_name) || 'FiveMDepot';

    el.innerHTML =
      '<header class="header"><div class="container header-inner">' +
        '<a class="logo" href="index.html" aria-label="' + esc(name) + ' home"><span class="logo-mark">F</span><span>' + esc(name) + '</span></a>' +
        '<nav class="nav" aria-label="Main">' + links + '</nav>' +
        '<div class="header-actions">' +
          '<form class="header-search" action="category.html" role="search">' + I.search +
            '<input type="hidden" name="c" value="all"><input name="q" placeholder="Search resources…" aria-label="Search"></form>' +
          '<button class="icon-btn theme-btn" id="themeBtn" aria-label="Toggle light/dark theme">' + I.moon + I.sun + '</button>' +
          '<a class="icon-btn" href="cart.html" aria-label="Cart">' + I.cart + '<span class="badge-count" data-cart-count></span></a>' +
          '<a class="icon-btn hide-sm" href="auth.html" id="accountBtn" aria-label="Account">' + I.user + '</a>' +
          '<div class="socials">' + socialLinks(data.settings || {}) + '</div>' +
          '<button class="icon-btn menu-btn" id="menuBtn" aria-label="Open menu" aria-expanded="false">' + I.menu + '</button>' +
        '</div>' +
      '</div></header>' +
      '<div class="drawer-backdrop" id="drawerBackdrop"></div>' +
      '<aside class="drawer" id="drawer" aria-label="Menu">' +
        '<div class="drawer-head"><a class="logo" href="index.html"><span class="logo-mark">F</span><span>' + esc(name) + '</span></a>' +
          '<button class="icon-btn" id="drawerClose" aria-label="Close menu">' + I.close + '</button></div>' +
        '<form class="header-search drawer-search" action="category.html" role="search">' + I.search +
          '<input type="hidden" name="c" value="all"><input name="q" placeholder="Search resources…" aria-label="Search"></form>' +
        drawerLinks +
      '</aside>';

    if (!el.querySelector('.socials').innerHTML) el.querySelector('.socials').remove();

    document.getElementById('themeBtn').addEventListener('click', toggleTheme);
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

    Cart.renderCount();
    checkAuth();
  }

  function checkAuth() {
    fetch('api/auth.php?action=status', { credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.authenticated) return;
        Store.user = d.user;
        var dash = { ADMIN: 'dashboard/admin.html', SELLER: 'dashboard/seller.html' }[d.user.role] || 'dashboard/buyer.html';
        var a = document.getElementById('accountBtn');
        if (a) { a.href = dash; a.setAttribute('aria-label', 'My dashboard'); }
        document.querySelectorAll('[data-wish]').forEach(function (b) { b.hidden = false; });
      }).catch(function () {});
  }

  // ---------- Footer ----------
  function renderFooter(data) {
    var el = document.getElementById('site-footer');
    if (!el) return;
    var s = data.settings || {};
    var name = s.site_name || 'FiveMDepot';
    var cats = data.categories.slice(0, 6).map(function (c) {
      return '<li><a href="' + catUrl(c.slug) + '">' + esc(c.name) + '</a></li>';
    }).join('');
    var since = s.since_year || '2024';
    el.innerHTML =
      '<footer class="footer"><div class="container">' +
        '<div class="footer-grid">' +
          '<div class="footer-brand"><a class="logo" href="index.html"><span class="logo-mark">F</span><span>' + esc(name) + '</span></a>' +
            '<p>' + esc(s.site_tagline || 'Premium FiveM scripts, MLOs, vehicles, clothing and complete server packs.') + '</p>' +
            '<div style="display:flex;gap:4px">' + socialLinks(s) + '</div></div>' +
          '<div><h4>Products</h4><ul>' + cats + '<li><a href="category.html?c=all">All Products</a></li></ul></div>' +
          '<div><h4>Resources</h4><ul><li><a href="documentation.html?type=blog">Blog</a></li><li><a href="documentation.html?type=tutorial">Tutorials</a></li><li><a href="documentation.html?type=tool">Tools</a></li><li><a href="documentation.html?type=doc">Docs</a></li><li><a href="free-assets.html">Free Assets</a></li></ul></div>' +
          '<div><h4>Support</h4><ul><li><a href="dashboard/buyer.html">My Purchases</a></li><li><a href="index.html#faq">FAQ</a></li>' +
            (s.social_discord ? '<li><a href="' + esc(s.social_discord) + '" target="_blank" rel="noopener">Discord Support</a></li>' : '') +
            '<li><a href="auth.html?mode=register">Become a Seller</a></li></ul></div>' +
          '<div><h4>Legal</h4><ul><li><a href="documentation.html?type=doc&amp;slug=terms">Terms of Service</a></li><li><a href="documentation.html?type=doc&amp;slug=privacy">Privacy Policy</a></li><li><a href="documentation.html?type=doc&amp;slug=refunds">Refund Policy</a></li></ul></div>' +
        '</div>' +
        '<div class="footer-badges"><span class="footer-badge">Official Store</span><span class="footer-badge">Verified Sellers</span><span class="footer-badge">Since ' + esc(since) + '</span></div>' +
        '<div class="footer-bottom"><span>© ' + new Date().getFullYear() + ' ' + esc(name) + '. All rights reserved.</span><span>Not affiliated with Rockstar Games or Cfx.re.</span></div>' +
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
  function boot() {
    nav().then(function (data) {
      renderHeader(data);
      renderFooter(data);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  var Store = window.Store = {
    api: api, nav: nav, esc: esc, icon: icon, money: money, qs: qs,
    catUrl: catUrl, productUrl: productUrl, icons: I,
    productCard: productCard, cart: Cart, toast: toast, reveal: reveal, user: null
  };
})();
