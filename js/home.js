/* FiveMDepot — Home page (sections come from Admin → Homepage builder) */
(function () {
  'use strict';
  var S = window.Store, esc = S.esc, I = S.icons;

  // Same content as the seeded homepage_sections — used until the API answers or if it fails.
  var DEFAULTS = {
    sections: [
      { key: 'hero', content: { badge: 'Premium Marketplace Now Live', headline: 'The Trusted FiveM Marketplace', subtitle: 'Premium scripts, MLOs, vehicles, clothing and complete server packs for QBCore, ESX and QBox.', primary_text: 'Explore Marketplace', primary_link: 'category.html?c=all', secondary_text: 'View Server Packs', secondary_link: 'category.html?c=server-packs' } },
      { key: 'trust', content: { items: [{ value: '4.9/5', label: 'Customer rating' }, { value: '10K+', label: 'Discord members' }, { value: '98%', label: 'Satisfaction rate' }, { value: '500+', label: 'Premium resources' }] } },
      { key: 'categories', content: { heading: 'Shop by Category', subheading: 'Everything you need to build your server' } },
      { key: 'featured', content: { heading: 'Featured Resources' } },
      { key: 'server_pack', content: { heading: 'Complete Server Packs', subheading: 'Launch a full server in minutes', stats: [{ value: '400+', label: 'Systems included' }, { value: '0.4-0.6ms', label: 'Idle resmon' }], benefits: ['Lifetime Access', 'No Hidden Fees', 'Free Updates', 'Setup Support'], cta_text: 'View Server Packs', cta_link: 'category.html?c=server-packs' } },
      { key: 'new', content: { heading: 'New Releases' } },
      { key: 'free', content: { heading: 'Free Assets' } },
      { key: 'about', content: { heading: 'About FiveMDepot', body: 'FiveMDepot serves FiveM server owners running QBCore, ESX, QBox or hybrid setups, with complete server packs, job and economy scripts, MLO interiors, vehicle packs and clothing.' } },
      { key: 'faq', content: { heading: 'Frequently Asked Questions' } }
    ],
    faqs: [
      { question: 'How do I receive my purchase?', answer: 'After your payment is verified, the download becomes available in your dashboard under My Purchases.' },
      { question: 'Which payment methods do you accept?', answer: 'bKash, Nagad and bank transfer. Upload your payment proof at checkout and we verify it quickly.' },
      { question: 'Do resources work with QBCore and ESX?', answer: 'Each product lists its supported frameworks (QBCore, ESX, QBox or standalone) on the product page.' },
      { question: 'Do I get updates?', answer: 'Yes. Updates for purchased resources are free and appear in your dashboard.' }
    ],
    featured: [], new: [], free: [], packs: [], stats: {}
  };

  // Admin may enter site-root links like "/shop.html" or "/category/x"; map them to pages that exist.
  function link(href) {
    href = String(href || '');
    var m = href.match(/^\/?category\/([\w-]+)/);
    if (m) return S.catUrl(m[1]);
    if (/^\/?shop\.html/.test(href)) return 'category.html?c=all';
    if (/^(https?:)?\/\//.test(href) || /^[\w./?=&#-]+$/.test(href)) return href.replace(/^\//, '');
    return '#';
  }

  // ---------- Section renderers ----------
  var R = {
    hero: function (c, d, nav) {
      var cats = nav.categories.slice(0, 6).map(function (k) {
        return '<a class="hero-cat" href="' + S.catUrl(k.slug) + '"><span class="ico">' + S.icon(k.icon) + '</span>' +
          '<span><b>' + esc(k.name) + '</b><small>' + (k.product_count != null ? k.product_count + ' items' : 'Browse') + '</small></span></a>';
      }).join('');
      return '<section class="hero"><div class="container hero-inner">' +
        '<div>' +
          (c.badge ? '<span class="hero-badge"><span class="dot">NEW</span>' + esc(c.badge) + '</span>' : '') +
          '<h1>' + headline(c.headline) + '</h1>' +
          '<p class="hero-sub">' + esc(c.subtitle) + '</p>' +
          '<div class="hero-cta">' +
            (c.primary_text ? '<a class="btn btn-primary btn-lg" href="' + esc(link(c.primary_link)) + '">' + esc(c.primary_text) + '</a>' : '') +
            (c.secondary_text ? '<a class="btn btn-ghost btn-lg" href="' + esc(link(c.secondary_link)) + '">' + esc(c.secondary_text) + '</a>' : '') +
          '</div>' +
          '<div class="hero-trustline">' +
            '<span>' + I.check + 'Instant download</span><span>' + I.check + 'QBCore / ESX / QBox</span><span>' + I.check + 'Free updates</span>' +
          '</div>' +
        '</div>' +
        (cats ? '<div class="hero-card"><h3>Browse categories</h3><div class="hero-cats">' + cats + '</div></div>' : '') +
      '</div></section>';
    },

    trust: function (c, d) {
      var items = (c.items || []).slice();
      if (d.stats && d.stats.products) {
        items = items.map(function (it) {
          return /resource|product/i.test(it.label) ? { value: d.stats.products + '+', label: it.label } : it;
        });
      }
      if (!items.length) return '';
      return '<section class="trust"><div class="container"><div class="trust-grid reveal">' +
        items.map(function (it) { return '<div class="trust-item"><b>' + esc(it.value) + '</b><span>' + esc(it.label) + '</span></div>'; }).join('') +
        '</div></div></section>';
    },

    categories: function (c, d, nav) {
      if (!nav.categories.length) return '';
      var cards = nav.categories.map(function (k) {
        var banner = k.banner_url ? ' has-banner" style="background-image:url(\'' + esc(k.banner_url) + '\')' : '';
        return '<a class="cat-card reveal' + banner + '" href="' + S.catUrl(k.slug) + '">' +
          '<span class="ico">' + S.icon(k.icon) + '</span>' +
          '<h3>' + esc(k.name) + '</h3>' +
          '<p>' + esc(k.description || '') + '</p>' +
          '<div class="meta"><span>' + (k.product_count != null ? k.product_count + ' products' : '') + '</span><span class="go">Browse →</span></div>' +
        '</a>';
      }).join('');
      return '<section class="section" id="categories"><div class="container">' +
        head(c.heading || 'Shop by Category', c.subheading, 'Categories', true) +
        '<div class="cat-grid">' + cards + '</div></div></section>';
    },

    featured: function (c, d) { return productRow(c.heading || 'Featured Resources', 'Hand-picked', d.featured, 'category.html?c=all', true); },
    new: function (c, d) { return productRow(c.heading || 'New Releases', 'Just dropped', d.new, 'category.html?c=all&sort=newest'); },
    free: function (c, d) { return productRow(c.heading || 'Free Assets', 'Free', d.free, 'category.html?c=free-assets', true); },

    server_pack: function (c, d) {
      var stats = (c.stats || []).map(function (s) { return '<div><b>' + esc(s.value) + '</b><span>' + esc(s.label) + '</span></div>'; }).join('');
      var benefits = (c.benefits || []).map(function (b) { return '<div class="pack-benefit">' + I.check + esc(b) + '</div>'; }).join('');
      var packs = (d.packs || []).length
        ? '<div class="product-grid" style="margin-top:24px">' + d.packs.map(S.productCard).join('') + '</div>' : '';
      return '<section class="section" id="server-packs"><div class="container">' +
        '<div class="pack reveal">' +
          '<div><span class="eyebrow">Server Packs</span>' +
            '<h2>' + esc(c.heading || 'Complete Server Packs') + '</h2>' +
            '<p class="pack-sub">' + esc(c.subheading || '') + '</p>' +
            '<div class="pack-stats">' + stats + '</div>' +
            '<a class="btn btn-primary btn-lg" href="' + esc(link(c.cta_link || 'category.html?c=server-packs')) + '">' + esc(c.cta_text || 'View Server Packs') + '</a>' +
          '</div>' +
          '<div class="pack-benefits">' + benefits + '</div>' +
        '</div>' + packs +
      '</div></section>';
    },

    about: function (c) {
      var points = [
        ['&#9889;', 'Optimized performance', 'Every resource is reviewed for low idle resmon before it goes live.'],
        ['&#128737;', 'Verified sellers', 'Sellers are approved by our team, and products are checked before publishing.'],
        ['&#128260;', 'Lifetime updates', 'Buy once and get every future update from your dashboard.']
      ].map(function (p) {
        return '<div class="about-point"><span class="ico">' + p[0] + '</span><div><b>' + p[1] + '</b><span>' + p[2] + '</span></div></div>';
      }).join('');
      return '<section class="section section-alt"><div class="container about">' +
        '<div class="reveal"><span class="eyebrow">About</span><h2 class="section-title" style="margin-bottom:16px">' + esc(c.heading || 'About') + '</h2><p>' + esc(c.body || '') + '</p>' +
          '<div style="margin-top:24px;display:flex;gap:12px;flex-wrap:wrap"><a class="btn btn-primary" href="category.html?c=all">Browse the store</a><a class="btn btn-ghost" href="auth.html?mode=register">Become a seller</a></div></div>' +
        '<div class="about-points reveal">' + points + '</div>' +
      '</div></section>';
    },

    faq: function (c, d) {
      if (!d.faqs || !d.faqs.length) return '';
      return '<section class="section" id="faq"><div class="container">' +
        head(c.heading || 'FAQ', 'Everything you need to know before you buy.', 'FAQ', true) +
        '<div class="faq">' + d.faqs.map(function (f, i) {
          return '<details class="reveal"' + (i === 0 ? ' open' : '') + '><summary>' + esc(f.question) + '</summary><div class="answer">' + esc(f.answer) + '</div></details>';
        }).join('') + '</div></div></section>';
    }
  };

  // Last word of the headline gets the accent gradient
  function headline(text) {
    var words = String(text || '').trim().split(/\s+/);
    if (words.length < 2) return esc(text);
    var last = words.pop();
    return esc(words.join(' ')) + ' <span class="text-grad">' + esc(last) + '</span>';
  }

  function head(title, sub, eyebrow, center, moreHref) {
    return '<div class="section-head' + (center ? ' center' : '') + ' reveal"><div>' +
      (eyebrow ? '<span class="eyebrow">' + esc(eyebrow) + '</span>' : '') +
      '<h2 class="section-title">' + esc(title) + '</h2>' +
      (sub ? '<p class="section-sub">' + esc(sub) + '</p>' : '') + '</div>' +
      (moreHref ? '<a class="link-more" href="' + moreHref + '">View all →</a>' : '') + '</div>';
  }

  function productRow(title, eyebrow, items, moreHref, alt) {
    if (!items || !items.length) return '';
    return '<section class="section' + (alt ? ' section-alt' : '') + '"><div class="container">' +
      head(title, '', eyebrow, false, moreHref) +
      '<div class="product-grid">' + items.map(S.productCard).join('') + '</div></div></section>';
  }

  function ctaBand() {
    return '<section class="section" style="padding-top:20px"><div class="container"><div class="cta-band reveal">' +
      '<h2>Ready to build your dream server?</h2><p>Thousands of server owners already trust FiveMDepot.</p>' +
      '<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap"><a class="btn btn-lg" href="category.html?c=all">Start shopping</a>' +
      '<a class="btn btn-lg btn-ghost" href="auth.html?mode=register">Sell your resources</a></div></div></div></section>';
  }

  function render(data, nav) {
    var html = data.sections.map(function (s) {
      var fn = R[s.key];
      return fn ? fn(s.content || {}, data, nav) : '';
    }).join('') + ctaBand();
    var main = document.getElementById('home');
    main.innerHTML = html;
    S.reveal(main);
  }

  var nav = S.nav();
  nav.then(function (n) { render(DEFAULTS, n); });

  Promise.all([S.api('home'), nav]).then(function (res) {
    var data = res[0];
    if (!data.sections || !data.sections.length) data.sections = DEFAULTS.sections;
    render(data, res[1]);
    if (location.hash) { var t = document.querySelector(location.hash); if (t) t.scrollIntoView(); }
  }).catch(function (e) {
    console.warn('Home API unavailable, showing defaults:', e.message);
  });
})();
