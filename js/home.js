/* FiveMDepot — Home page (sections come from Admin → Homepage builder) */
(function () {
  'use strict';
  var S = window.Store, esc = S.esc, I = S.icons;
  var FEATURE_SECTION = { key: 'features', content: {
    heading: 'Everything You Need to Build *Epic* FiveM Servers',
    subheading: 'Explore the resources and details that help you plan your next build.',
    items: [
      { icon: 'code', title: 'Scripts & Systems', text: 'Browse jobs, economy systems and other server resources.' },
      { icon: 'globe', title: 'Maps & MLOs', text: 'Explore interiors and locations for your server world.' },
      { icon: 'zap', title: 'Vehicles', text: 'Compare vehicle resources and their listed requirements.' },
      { icon: 'users', title: 'Clothing', text: 'Find clothing resources for your community.' },
      { icon: 'layers', title: 'Server Packs', text: 'Review complete packs and the systems they include.' },
      { icon: 'sliders', title: 'Framework Filters', text: 'Narrow the catalog by listed compatibility.' },
      { icon: 'database', title: 'Product Details', text: 'Check screenshots, features and setup notes before checkout.' },
      { icon: 'shield', title: 'Your Library', text: 'Access eligible purchases from your account dashboard.' }
    ]
  } };

  // Same content as the seeded homepage_sections — used until the API answers or if it fails.
  var DEFAULTS = {
    sections: [
      { key: 'hero', content: { badge: 'Made in-house · Instant download', headline: '*FiveM* Premium|*Scripts*, MLOs &|Server Packs', subtitle: '**Since 2024** — **our own** FiveM resources for QBCore, ESX and QBox: server packs, jobs, MLO maps, vehicles, clothing and more.', checks: ['Secure checkout', 'Instant Download', 'Lifetime Updates'], primary_text: 'Browse the store', primary_link: 'category.html?c=all', secondary_text: 'View Server Packs', secondary_link: 'server-packs.html' } },
      { key: 'trust', content: { items: [] } },
      { key: 'categories', content: { heading: 'Shop by Category', subheading: 'Everything you need to build your server' } },
      FEATURE_SECTION,
      { key: 'featured', content: { heading: 'Featured Resources' } },
      { key: 'server_pack', content: { heading: 'Complete Server Packs', subheading: 'Explore complete builds for your next server', stats: [], benefits: ['Compare included systems', 'Review framework support', 'Explore pack details'], cta_text: 'View Server Packs', cta_link: 'server-packs.html' } },
      { key: 'reviews', content: { heading: 'From the community', subheading: 'Reviews from buyers when available' } },
      { key: 'about', content: { heading: 'About FiveMDepot', body: 'FiveMDepot serves FiveM server owners running QBCore, ESX, QBox or hybrid setups, with complete server packs, job and economy scripts, MLO interiors, vehicle packs and clothing.' } },
      { key: 'faq', content: { heading: 'Frequently Asked Questions' } },
      { key: 'community', content: { heading: 'Join the FiveMDepot community', text: 'Get support, early access to new releases, giveaways and help from other server owners.', button: 'Join our Discord' } }
    ],
    faqs: [
      { question: 'How do I receive my purchase?', answer: 'As soon as your payment is confirmed, the download appears in your dashboard under My library.' },
      { question: 'Which payment methods do you accept?', answer: 'Card (Visa, Mastercard, Amex), PayPal, Apple Pay and Google Pay through Paddle, our Merchant of Record. Prices are in USD; tax is added where required.' },
      { question: 'Do resources work with QBCore and ESX?', answer: 'Each product lists its supported frameworks (QBCore, ESX, QBox or standalone) on the product page.' },
      { question: 'Do I get updates?', answer: 'Yes. Updates for purchased resources are free and appear in your dashboard.' }
    ],
    featured: [], new: [], free: [], packs: [], popular: [], reviews: [], popular_tags: [], stats: {}
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
      var st = nav.settings || {};
      var since = st.since_year || '2024';
      var checks = (c.checks && c.checks.length ? c.checks : ['100% Legal', 'Instant Download', 'Lifetime Updates']).slice(0, 3);
      var discord = st.social_discord
        ? '<div class="hx-discord reveal"><div class="hx-dc-left"><span class="hx-pill"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>Official Discord</span>' +
            '<h3>' + esc(st.discord_server_name || ((st.site_name || 'FiveMDepot') + ' Community')) + '</h3>' +
            '<p>' + esc(c.discord_text || 'Live support, update alerts and a community of server owners.') + '</p>' +
            '<span class="hx-online" id="dcOnline" hidden><i></i><b>—</b> online</span></div>' +
          '<div class="hx-dc-right"><div><small>ONLINE MEMBERS</small><span>Live from <b>discord.com</b></span></div>' +
            '<a class="btn btn-ghost btn-sm" href="' + esc(st.social_discord) + '" target="_blank" rel="noopener">' +
            '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/></svg>Join Discord</a></div></div>'
        : '';
      return '<section class="hx"><div class="hx-glow" aria-hidden="true"></div><div class="hx-grid" aria-hidden="true"></div>' +
        '<svg class="hx-curve" viewBox="0 0 900 120" aria-hidden="true"><path d="M10 40 C 300 0, 600 10, 880 90" fill="none" stroke="var(--accent)" stroke-opacity=".5" stroke-width="2"/><path d="M866 76 l16 15 -20 4" fill="none" stroke="var(--accent)" stroke-opacity=".7" stroke-width="2"/></svg>' +
        '<div class="container hx-inner"><div class="hx-copy">' +
          '<div class="hx-badges reveal">' +
            '<span class="hx-b green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5z"/><path d="m9 12 2 2 4-4"/></svg>✓ Official Store</span>' +
            '<span class="hx-b blue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/></svg>✓ Made In-House</span>' +
            '<span class="hx-b yellow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="6"/><path d="M8.2 13.5 7 22l5-3 5 3-1.2-8.5"/></svg>✓ Since ' + esc(since) + '</span>' +
          '</div>' +
          (c.badge ? '<span class="hx-live reveal"><i></i>' + esc(c.badge) + '</span>' : '') +
          '<h1 class="hx-title">' + headline(c.headline || '*FiveM* Premium|*Scripts*, MLOs &|Server Packs') + '</h1>' +
          '<svg class="hx-swoosh" viewBox="0 0 400 14" aria-hidden="true"><path d="M2 10 C 120 2, 260 2, 398 7" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/></svg>' +
          '<p class="hx-sub">' + rich(c.subtitle) + '</p>' +
          '<p class="hx-checks">' + checks.map(function (t, i) { return '<span class="c' + i + '">✓ ' + esc(t) + '</span>'; }).join('<span class="dot">·</span>') + '</p>' +
          '<div class="hx-cta">' +
            (c.primary_text ? '<a class="btn btn-primary btn-lg hx-main" href="' + esc(link(c.primary_link)) + '">' + esc(c.primary_text) + ' <span aria-hidden="true">→</span></a>' : '') +
            (c.secondary_text ? '<a class="btn btn-ghost btn-lg" href="' + esc(link(c.secondary_link)) + '">' + esc(c.secondary_text) + '</a>' : '') +
          '</div>' + discord +
        '</div>' +
        '<div class="hx-term-wrap"><div class="hx-term" id="hxTerm" role="img" aria-label="Animated terminal creating a QBCore script">' +
          '<div class="hx-term-bar"><span class="r"></span><span class="y"></span><span class="g"></span><em>&gt;_ ' + esc((st.site_name || 'fivemdepot').toLowerCase().replace(/\s+/g, '')) + '@terminal</em></div>' +
          '<div class="hx-term-body" id="hxTermBody"></div></div></div>' +
      '</div></section>';
    },

    features: function (c) {
      var ICONS = {
        users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
        database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5M3 12c0 1.7 4 3 9 3s9-1.3 9-3"/>',
        zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
        shield: '<path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5z"/><path d="M12 8v4M12 16h.01"/>',
        activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
        sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
        globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/>',
        layers: '<path d="M4 4h6v6H4zM14 14h6v6h-6zM4 14h6M7 10v4M14 7h3a3 3 0 0 1 3 3v1"/>',
        code: '<path d="m8 8-4 4 4 4M16 8l4 4-4 4"/>', box: '<path d="m21 8-9-5-9 5v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>'
      };
      var seededClaims = (c.items || []).some(function (it) { return /0\.00ms|zero data loss|prevent exploits/i.test(it.text || ''); });
      if (seededClaims) c = FEATURE_SECTION.content;
      var items = (c.items || []).slice(0, 12);
      if (!items.length) return '';
      var sub = esc(c.subheading || '')
        .replace(/\bperformance\b/i, '<b class="g">$&</b>').replace(/\bsecurity\b/i, '<b class="b">$&</b>').replace(/\bconfigurability\b/i, '<b class="y">$&</b>');
      return '<section class="section fx"><div class="container">' +
        '<div class="section-head center reveal"><div><h2 class="section-title fx-title">' + headline(c.heading || 'Everything You Need') + '</h2>' +
        (sub ? '<p class="section-sub">' + sub + '</p>' : '') + '</div></div>' +
        '<div class="fx-grid">' + items.map(function (it) {
          return '<div class="fx-card reveal"><span class="fx-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[it.icon] || ICONS.box) + '</svg></span>' +
            '<h3>' + esc(it.title) + '</h3><p>' + esc(it.text) + '</p></div>';
        }).join('') + '</div></div></section>';
    },

    showcase: function (c, d, nav) {
      var items = nav.categories.map(function (k) {
        return { img: S.catArt(k, true), title: k.name, sub: k.product_count != null ? k.product_count + ' products' : '', href: S.catUrl(k.slug), icon: S.catIcon(k) };
      }).concat((d.new || []).filter(function (p) { return p.image; }).map(function (p) {
        return { img: p.image, title: p.title, sub: p.badge ? p.badge.name : '', href: S.productUrl(p.slug), icon: '' };
      }));
      if (items.length < 3) return '';
      var row = items.map(function (it) {
        return '<a class="mq-item" href="' + esc(it.href) + '"><img src="' + esc(it.img) + '" alt="" loading="lazy" data-fallback="images/store/cat-default.svg">' +
          '<span class="mq-label">' + (it.icon ? '<span class="di">' + it.icon + '</span>' : '') + '<span><b>' + esc(it.title) + '</b><small>' + esc(it.sub) + '</small></span></span></a>';
      }).join('');
      // The row appears twice so the -50% loop is seamless; the copy is hidden from screen readers
      return '<section class="marquee" aria-label="Showcase"><div class="mq-track"><div class="mq-row">' + row + '</div>' +
        '<div class="mq-row" aria-hidden="true">' + row.replace(/<a /g, '<a tabindex="-1" ') + '</div></div></section>';
    },

    trust: function (c, d, nav) {
      var items = (c.items || []).slice();
      var st = d.stats || {};
      // Replace the original demo figures with facts from the live catalog.
      // Admin-authored values remain untouched.
      var demo = items.length === 4 && items[0].value === '4.9/5' &&
        items[1].value === '10K+' && items[2].value === '98%' && items[3].value === '500+';
      if (demo || !items.length) {
        items = [
          { value: st.products ? String(st.products) : 'Browse', label: st.products ? 'Published resources' : 'FiveM resources' },
          { value: st.products && nav.categories.length ? String(nav.categories.length) : 'Explore', label: 'Resource categories' },
          { value: 'QB · ESX', label: 'Framework compatibility' },
          { value: st.reviews >= 5 ? st.rating + '/5' : 'Discover', label: st.reviews >= 5 ? 'Buyer rating (' + st.reviews + ' reviews)' : 'Scripts, maps and more' }
        ];
      }
      if (!items.length) return '';
      var fws = ['QBCore', 'ESX', 'QBox', 'Standalone', 'ox_lib', 'oxmysql'];
      // One colour + icon per tile, cycling: crimson, blue, green, amber
      var tones = ['t-red', 't-blue', 't-green', 't-amber'];
      var icons = [
        '<path d="m21 8-9-5-9 5v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
        '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
        '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
        '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>'
      ];
      return '<section class="trust"><div class="container"><div class="trust-grid reveal">' +
        items.map(function (it, i) {
          var m = String(it.value).match(/^([\d.]+)(.*)$/);
          var val = m ? '<b data-count="' + esc(m[1]) + '" data-suffix="' + esc(m[2]) + '">' + esc(it.value) + '</b>' : '<b>' + esc(it.value) + '</b>';
          return '<div class="trust-item ' + tones[i % 4] + '"><i class="trust-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + icons[i % 4] + '</svg></i>' +
            val + '<span>' + esc(it.label) + '</span></div>';
        }).join('') +
        '</div><div class="fw-strip reveal"><span>Works with</span>' + fws.map(function (f) { return '<b>' + f + '</b>'; }).join('') + '</div></div></section>';
    },

    categories: function (c, d, nav) {
      if (!nav.categories.length) return '';
      var cards = nav.categories.map(function (k) {
        var kids = (k.children || []).slice(0, 3).map(function (x) { return '<span class="chip">' + esc(x.name) + '</span>'; }).join('');
        return '<a class="cat-card reveal" href="' + S.catUrl(k.slug) + '">' +
          '<span class="cat-media"><img src="' + esc(S.catArt(k, true)) + '" alt="" loading="lazy" data-fallback="images/store/cat-default.svg"></span>' +
          '<span class="cat-body">' +
            '<span class="ico">' + S.catIcon(k) + '</span>' +
            '<h3>' + esc(k.name) + '</h3>' +
            '<p>' + esc(k.description || '') + '</p>' +
            (kids ? '<span class="pc-fw">' + kids + '</span>' : '') +
            '<span class="meta"><span>' + (k.product_count != null ? k.product_count + ' products' : '') + '</span><span class="go">Browse →</span></span>' +
          '</span>' +
        '</a>';
      }).join('');
      return '<section class="section" id="categories"><div class="container">' +
        head(c.heading || 'Shop by Category', c.subheading, 'Categories', true) +
        '<div class="cat-grid">' + cards + '</div></div></section>';
    },

    featured: function (c, d) {
      var tabs = [['featured', 'Featured', d.featured, 'category.html?c=all'], ['new', 'New', d.new, 'category.html?c=all&sort=newest'],
                  ['popular', 'Popular', d.popular, 'category.html?c=all&sort=popular'], ['free', 'Free', d.free, 'category.html?c=free-assets']]
        .filter(function (t) { return t[2] && t[2].length; });
      if (!tabs.length) return '';
      TAB_DATA = {};
      tabs.forEach(function (t) { TAB_DATA[t[0]] = t; });
      return '<section class="section section-alt" id="showcase"><div class="container">' +
        '<div class="section-head reveal"><div><span class="eyebrow">Shop</span><h2 class="section-title">' + esc(c.heading || 'Featured Resources') + '</h2></div>' +
        '<div class="ptab-pills" role="tablist">' + tabs.map(function (t, i) {
          return '<button role="tab" data-ptab="' + t[0] + '" aria-selected="' + (i === 0) + '" class="' + (i === 0 ? 'on' : '') + '">' + t[1] + '</button>';
        }).join('') + '</div></div>' +
        '<div class="product-grid" id="ptabGrid">' + tabs[0][2].map(S.productCard).join('') + '</div>' +
        '<div style="text-align:center;margin-top:26px"><a class="btn btn-ghost" id="ptabMore" href="' + tabs[0][3] + '">View all →</a></div>' +
        '</div></section>';
    },
    new: function (c, d) { return productRow(c.heading || 'New Releases', 'Just dropped', d.new, 'category.html?c=all&sort=newest'); },
    free: function (c, d) { return productRow(c.heading || 'Free Assets', 'Free', d.free, 'category.html?c=free-assets', true); },

    server_pack: function (c, d) {
      var stats = (c.stats || []).filter(function (s) {
        return !(s.value === '400+' && s.label === 'Systems included') &&
          !(s.value === '0.4-0.6ms' && s.label === 'Idle resmon');
      }).map(function (s) { return '<div><b>' + esc(s.value) + '</b><span>' + esc(s.label) + '</span></div>'; }).join('');
      var seededBenefits = (c.benefits || []).join('|') === 'Lifetime Access|No Hidden Fees|Free Updates|Setup Support';
      var benefitList = seededBenefits ? ['Compare included systems', 'Review framework support', 'Explore pack details'] : (c.benefits || []);
      var benefits = benefitList.map(function (b) { return '<div class="pack-benefit">' + I.check + esc(b) + '</div>'; }).join('');
      var packs = (d.packs || []).length
        ? '<div class="product-grid" style="margin-top:24px">' + d.packs.map(S.productCard).join('') + '</div>' : '';
      return '<section class="section" id="server-packs"><div class="container">' +
        '<div class="pack reveal">' +
          '<div><span class="eyebrow">Server Packs</span>' +
            '<h2>' + esc(c.heading || 'Complete Server Packs') + '</h2>' +
            '<p class="pack-sub">' + esc(c.subheading || '') + '</p>' +
            (stats ? '<div class="pack-stats">' + stats + '</div>' : '') +
            '<a class="btn btn-primary btn-lg" href="' + esc(link(c.cta_link || 'server-packs.html')) + '">' + esc(c.cta_text || 'View Server Packs') + '</a>' +
          '</div>' +
          '<div class="pack-benefits">' + benefits + '</div>' +
        '</div>' + packs +
      '</div></section>';
    },

    about: function (c) {
      var points = [
        ['&#9889;', 'Find your fit', 'Explore product details before adding a resource to your server.'],
        ['&#128737;', 'Browse by framework', 'Use compatibility details to compare resources for your setup.'],
        ['&#128260;', 'Keep your library close', 'Access eligible purchases from your account dashboard.']
      ].map(function (p) {
        return '<div class="about-point"><span class="ico">' + p[0] + '</span><div><b>' + p[1] + '</b><span>' + p[2] + '</span></div></div>';
      }).join('');
      return '<section class="section section-alt"><div class="container about">' +
        '<div class="reveal"><span class="eyebrow">About</span><h2 class="section-title" style="margin-bottom:16px">' + esc(c.heading || 'About') + '</h2><p>' + esc(c.body || '') + '</p>' +
          '<div style="margin-top:24px;display:flex;gap:12px;flex-wrap:wrap"><a class="btn btn-primary" href="category.html?c=all">Browse the store</a><a class="btn btn-ghost" href="documentation.html?type=doc">Read the docs</a></div></div>' +
        '<div class="about-points reveal">' + points + '</div>' +
      '</div></section>';
    },

    reviews: function (c, d) {
      var reviews = d.reviews || [];
      return '<section class="section fd-reviews"><div class="container">' + head(reviews.length ? (c.heading || 'From the community') : 'Your stories, soon.', reviews.length ? c.subheading : 'Buyer reviews will appear here as customers share their experience.', 'Community / Reviews', true) +
        (reviews.length ? '<div class="rv-grid">' + reviews.map(function (r) {
          return '<figure class="rv-card reveal"><div class="stars">' + '★★★★★'.slice(0, r.rating) + '</div>' +
            '<blockquote>“' + esc(r.comment) + '”</blockquote>' +
            '<figcaption><span class="av">' + esc(r.name.charAt(0).toUpperCase()) + '</span><span><b>' + esc(r.name) + '</b>' +
            '<a href="' + S.productUrl(r.slug) + '">' + esc(r.product) + '</a></span><span class="vb">✓ Verified buyer</span></figcaption></figure>';
        }).join('') + '</div>' : '<div class="fd-review-empty"><span>COMMUNITY WALL / AWAITING FIRST REVIEW</span><strong>Built for the people behind the servers.</strong><a href="category.html?c=all">Explore the collection &rarr;</a></div>') + '</div></section>';
    },

    community: function (c, d, nav) {
      var url = nav.settings && nav.settings.social_discord;
      if (!url) return '';
      COMMUNITY = true;
      return '<section class="section" style="padding-top:20px"><div class="container"><div class="community reveal">' +
        '<div class="community-ico">' + I.discord + '</div><div class="community-text"><h2>' + esc(c.heading || 'Join our community') + '</h2><p>' + esc(c.text || '') + '</p></div>' +
        '<a class="btn btn-lg" href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(c.button || 'Join our Discord') + '</a></div></div></section>';
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

  var TAB_DATA = {}, COMMUNITY = false;

  // Headline markup: "*word*" = accent colour, "|" = new line. Without markup the last word is highlighted.
  function headline(text) {
    text = String(text || '').trim();
    if (text.indexOf('*') === -1 && text.indexOf('|') === -1) {
      var words = text.split(/\s+/);
      if (words.length < 2) return esc(text);
      var last = words.pop();
      return esc(words.join(' ')) + ' <span class="text-grad">' + esc(last) + '</span>';
    }
    return text.split('|').map(function (line) {
      return '<span class="hl-line">' + esc(line.trim()).replace(/\*([^*]+)\*/g, '<span class="hl-accent">$1</span>') + '</span>';
    }).join('');
  }
  // Subtitle markup: "**bold**"
  function rich(text) { return esc(text || '').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>'); }

  // ---------- Animated terminal (types a QBCore script, then loops) ----------
  var TERM = [
    ['cmd', 'mkdir fdm-garage && cd fdm-garage'],
    ['out', 'Creating QBCore resource structure...'],
    ['cmd', 'touch fxmanifest.lua server/main.lua config.lua'],
    ['cmd', 'nano server/main.lua'],
    ['code', [
      '-- FiveMDepot Garage · optimised for QBCore',
      '-- Idle resmon: 0.00ms',
      "local QBCore = exports['qb-core']:GetCoreObject()",
      "RegisterNetEvent('fdm-garage:server:store', function(plate)",
      '    local src = source',
      '    local Player = QBCore.Functions.GetPlayer(src)',
      '    if not Player then return end',
      "    MySQL.update('UPDATE player_vehicles SET state = 1 WHERE plate = ?', { plate })",
      "    TriggerClientEvent('QBCore:Notify', src, 'Vehicle stored', 'success')",
      'end)',
      "print('^2[fdm-garage] ^7Loaded successfully!')"
    ]],
    ['ok', 'Script saved successfully'],
    ['cmd', 'ensure fdm-garage'],
    ['info', '[fdm-garage] Resource loaded - 0.00ms resmon']
  ];
  function lua(line) {
    var h = esc(line);
    if (/^\s*--/.test(line)) return '<span class="t-com">' + h + '</span>';
    h = h.replace(/(&#39;[^&]*?&#39;)/g, '<span class="t-str">$1</span>');
    h = h.replace(/\b(local|function|if|then|end|not|return)\b/g, '<span class="t-kw">$1</span>');
    h = h.replace(/\b(RegisterNetEvent|TriggerClientEvent|print|exports|MySQL\.update)\b/g, '<span class="t-fn">$1</span>');
    return h;
  }
  var termTimer = null;
  function terminal() {
    var body = document.getElementById('hxTermBody');
    if (!body) return;
    clearTimeout(termTimer);
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var prompt = '<span class="t-arrow">→</span> <span class="t-tilde">~</span> ';
    function line(cls, html) { var d = document.createElement('div'); d.className = 't-line ' + cls; d.innerHTML = html; body.appendChild(d); return d; }
    if (reduce) {
      TERM.forEach(function (s) {
        if (s[0] === 'cmd') line('t-cmd', prompt + esc(s[1]));
        else if (s[0] === 'code') line('t-code', s[1].map(lua).join('\n'));
        else if (s[0] === 'ok') line('t-ok', '✓ ' + esc(s[1]));
        else line('t-' + s[0], esc(s[1]));
      });
      return;
    }
    var i = 0;
    function next() {
      if (!document.body.contains(body)) return;
      if (i >= TERM.length) {
        var cur = line('t-cmd', prompt + '<span class="t-caret"></span>');
        termTimer = setTimeout(function () { body.innerHTML = ''; i = 0; next(); }, 4200);
        return;
      }
      var s = TERM[i++];
      if (s[0] === 'cmd') {
        var el = line('t-cmd', prompt + '<span class="t-typed"></span><span class="t-caret"></span>'), typed = el.querySelector('.t-typed'), n = 0;
        (function type() {
          typed.textContent = s[1].slice(0, ++n);
          if (n < s[1].length) termTimer = setTimeout(type, 28 + Math.random() * 40);
          else { el.querySelector('.t-caret').remove(); termTimer = setTimeout(next, 380); }
        })();
      } else if (s[0] === 'code') {
        var box = line('t-code', ''), k = 0;
        (function addLine() {
          box.innerHTML += (k ? '\n' : '') + lua(s[1][k++]);
          termTimer = setTimeout(k < s[1].length ? addLine : next, k < s[1].length ? 120 : 500);
        })();
      } else {
        line(s[0] === 'ok' ? 't-ok' : 't-' + s[0], (s[0] === 'ok' ? '✓ ' : '') + esc(s[1]));
        termTimer = setTimeout(next, s[0] === 'ok' ? 700 : 450);
      }
    }
    next();
  }

  // Live "online members" from the public Discord widget (Server Settings → Widget → Enable)
  function discordOnline(nav) {
    var el = document.getElementById('dcOnline'), id = nav.settings && nav.settings.discord_widget_server_id;
    if (!el || !id || !/^\d{15,22}$/.test(id)) return;
    fetch('https://discord.com/api/guilds/' + id + '/widget.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (w) {
      if (!w || typeof w.presence_count !== 'number') return;
      el.querySelector('b').textContent = w.presence_count.toLocaleString();
      el.hidden = false;
    }).catch(function () {});
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
      '<h2>Find the next piece of your server.</h2><p>Browse resources by category, framework and price, then choose what fits your build.</p>' +
      '<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap"><a class="btn btn-lg" href="category.html?c=all">Start shopping</a>' +
      '<a class="btn btn-lg btn-ghost" href="server-packs.html">Server packs</a></div></div></div></section>';
  }

  function render(data, nav) {
    var sections = data.sections.slice();
    if (data.features_configured === false && !sections.some(function (x) { return x.key === 'features'; })) {
      var afterCategories = sections.findIndex(function (x) { return x.key === 'categories'; });
      sections.splice(afterCategories + 1, 0, FEATURE_SECTION);
    }
    var hasTrust = sections.some(function (x) { return x.key === 'trust'; });
    COMMUNITY = false;
    var html = sections.map(function (s) {
      var fn = R[s.key];
      var out = fn ? fn(s.content || {}, data, nav) : '';
      // Image showcase strip follows the trust stats (or the hero when trust is disabled)
      if (s.key === 'trust' || (s.key === 'hero' && !hasTrust)) out += R.showcase({}, data, nav);
      return out;
    }).join('');
    if (!COMMUNITY) html += ctaBand();
    var main = document.getElementById('home');
    main.innerHTML = html;
    S.reveal(main);
    countUp(main);
    terminal();
    discordOnline(nav);
    S.syncWishlist();
  }

  // Product showcase tabs
  document.getElementById('home').addEventListener('click', function (e) {
    var b = e.target.closest('[data-ptab]');
    if (!b || !TAB_DATA[b.dataset.ptab]) return;
    var t = TAB_DATA[b.dataset.ptab];
    document.querySelectorAll('[data-ptab]').forEach(function (x) { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', String(x === b)); });
    var grid = document.getElementById('ptabGrid');
    grid.classList.add('swap');
    setTimeout(function () { grid.innerHTML = t[2].map(S.productCard).join(''); grid.classList.remove('swap'); S.syncWishlist(); }, 150);
    document.getElementById('ptabMore').href = t[3];
  });

  // Numbers in the trust bar count up when they scroll into view
  function countUp(root) {
    var els = root.querySelectorAll('[data-count]');
    if (!els.length || !('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        var el = en.target, target = parseFloat(el.dataset.count), dec = (el.dataset.count.split('.')[1] || '').length, start = null;
        function step(ts) {
          if (!start) start = ts;
          var k = Math.min(1, (ts - start) / 1200), v = target * (1 - Math.pow(1 - k, 3));
          el.textContent = v.toFixed(dec) + el.dataset.suffix;
          if (k < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      });
    }, { threshold: 0.4 });
    els.forEach(function (el) { io.observe(el); });
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
