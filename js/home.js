/* FiveMDepot — Home page (sections come from Admin → Homepage builder) */
(function () {
  'use strict';
  var S = window.Store, esc = S.esc, I = S.icons;

  // Same content as the seeded homepage_sections — used until the API answers or if it fails.
  var DEFAULTS = {
    sections: [
      { key: 'hero', content: { badge: 'Premium Marketplace Now Live', headline: 'The Trusted FiveM Marketplace', subtitle: 'Premium scripts, MLOs, vehicles, clothing and complete server packs for QBCore, ESX and QBox.', primary_text: 'Explore Marketplace', primary_link: 'category.html?c=all', secondary_text: 'View Server Packs', secondary_link: 'server-packs.html' } },
      { key: 'trust', content: { items: [{ value: '4.9/5', label: 'Customer rating' }, { value: '10K+', label: 'Discord members' }, { value: '98%', label: 'Satisfaction rate' }, { value: '500+', label: 'Premium resources' }] } },
      { key: 'categories', content: { heading: 'Shop by Category', subheading: 'Everything you need to build your server' } },
      { key: 'featured', content: { heading: 'Featured Resources' } },
      { key: 'server_pack', content: { heading: 'Complete Server Packs', subheading: 'Launch a full server in minutes', stats: [{ value: '400+', label: 'Systems included' }, { value: '0.4-0.6ms', label: 'Idle resmon' }], benefits: ['Lifetime Access', 'No Hidden Fees', 'Free Updates', 'Setup Support'], cta_text: 'View Server Packs', cta_link: 'server-packs.html' } },
      { key: 'reviews', content: { heading: 'Loved by server owners', subheading: 'Real reviews from verified buyers' } },
      { key: 'about', content: { heading: 'About FiveMDepot', body: 'FiveMDepot serves FiveM server owners running QBCore, ESX, QBox or hybrid setups, with complete server packs, job and economy scripts, MLO interiors, vehicle packs and clothing.' } },
      { key: 'faq', content: { heading: 'Frequently Asked Questions' } },
      { key: 'community', content: { heading: 'Join the FiveMDepot community', text: 'Get support, early access to new releases, giveaways and help from other server owners.', button: 'Join our Discord' } }
    ],
    faqs: [
      { question: 'How do I receive my purchase?', answer: 'After your payment is verified, the download becomes available in your dashboard under My Purchases.' },
      { question: 'Which payment methods do you accept?', answer: 'bKash, Nagad and bank transfer. Upload your payment proof at checkout and we verify it quickly.' },
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
      // Floating showcase: featured product images, topped up with category artwork
      var seen = {};
      var shots = (d.featured || []).concat(d.packs || []).filter(function (p) {
        if (!p.image || seen[p.id]) return false;
        return (seen[p.id] = true);
      }).slice(0, 3).map(function (p) {
        return { img: p.image, title: p.title, sub: p.badge ? p.badge.name : '', href: S.productUrl(p.slug) };
      });
      nav.categories.forEach(function (k) {
        if (shots.length < 3) shots.push({ img: S.catArt(k, true), title: k.name, sub: (k.product_count != null ? k.product_count + ' products' : 'Browse'), href: S.catUrl(k.slug) });
      });
      var visual = shots.map(function (s, i) {
        return '<a class="hv-card hv-' + (i + 1) + '" href="' + esc(s.href) + '"><img src="' + esc(s.img) + '" alt="" data-fallback="images/store/cat-default.svg">' +
          '<span class="hv-label"><b>' + esc(s.title) + '</b><small>' + esc(s.sub) + '</small></span></a>';
      }).join('');
      return '<section class="hero"><div class="hero-photo" aria-hidden="true"></div><div class="hero-art" aria-hidden="true"></div><div class="container hero-inner">' +
        '<div class="hero-copy">' +
          '<div class="hero-kicker"><span class="hero-kicker-mark"></span>FIVEM RESOURCE MARKETPLACE <span class="hero-kicker-index">// BUILD YOUR WORLD</span></div>' +
          (c.badge ? '<span class="hero-badge"><span class="dot">FDM</span>' + esc(c.badge) + '</span>' : '') +
          '<h1>' + headline(c.headline) + '</h1>' +
          '<p class="hero-sub">' + esc(c.subtitle) + '</p>' +
          '<form class="hero-search" action="category.html" role="search">' + I.search +
            '<input type="hidden" name="c" value="all"><input name="q" aria-label="Search the store" placeholder="Search ' + (d.stats && d.stats.products >= 50 ? d.stats.products + '+ ' : '') + 'scripts, MLOs, vehicles…">' +
            '<button class="btn btn-primary" type="submit">Search</button></form>' +
          ((d.popular_tags || []).length ? '<div class="hero-popular"><span>Popular:</span>' + d.popular_tags.slice(0, 3).map(function (t) {
            return '<a href="category.html?c=all&tags=' + encodeURIComponent(t.slug) + '">' + esc(t.name) + '</a>';
          }).join('') + '</div>' : '') +
          '<div class="hero-cta">' +
            (c.primary_text ? '<a class="btn btn-primary btn-lg" href="' + esc(link(c.primary_link)) + '">' + esc(c.primary_text) + '</a>' : '') +
            (c.secondary_text ? '<a class="btn btn-ghost btn-lg" href="' + esc(link(c.secondary_link)) + '">' + esc(c.secondary_text) + '</a>' : '') +
          '</div>' +
          (nav.categories.length ? '<div class="hero-path"><span>Explore by category</span><div class="hero-quick">' +
            nav.categories.slice(0, 5).map(function (k) {
              return '<a class="search-chip" href="' + esc(S.catUrl(k.slug)) + '"><span class="di">' + S.catIcon(k) + '</span>' + esc(k.name) + '</a>';
            }).join('') +
          '</div></div>' : '') +
        '</div>' +
        (visual ? '<div class="hero-visual" role="group" aria-label="Explore featured resources and categories">' +
          '<div class="hero-visual-top"><span><i></i> RESOURCE LOADOUT</span><span>01 / ' + String(shots.length).padStart(2, '0') + '</span></div>' +
          '<div class="hero-visual-reticle" aria-hidden="true"></div>' + visual +
          '<div class="hero-visual-bottom"><span>SELECT YOUR NEXT UPGRADE</span><span>FIVEMDEPOT // CATALOG</span></div></div>' : '') +
      '</div></section>';
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
          { value: nav.categories.length ? String(nav.categories.length) : 'Explore', label: 'Resource categories' },
          { value: st.sellers ? String(st.sellers) : 'Compare', label: st.sellers ? 'Active creators' : 'Framework compatibility' },
          { value: st.reviews >= 5 ? st.rating + '/5' : 'Discover', label: st.reviews >= 5 ? 'Buyer rating (' + st.reviews + ' reviews)' : 'Scripts, maps and more' }
        ];
      }
      if (!items.length) return '';
      var fws = ['QBCore', 'ESX', 'QBox', 'Standalone', 'ox_lib', 'oxmysql'];
      return '<section class="trust"><div class="container"><div class="trust-grid reveal">' +
        items.map(function (it) {
          var m = String(it.value).match(/^([\d.]+)(.*)$/);
          var val = m ? '<b data-count="' + esc(m[1]) + '" data-suffix="' + esc(m[2]) + '">' + esc(it.value) + '</b>' : '<b>' + esc(it.value) + '</b>';
          return '<div class="trust-item">' + val + '<span>' + esc(it.label) + '</span></div>';
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
      var benefits = (c.benefits || []).map(function (b) { return '<div class="pack-benefit">' + I.check + esc(b) + '</div>'; }).join('');
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

    reviews: function (c, d) {
      if (!d.reviews || d.reviews.length < 2) return '';
      return '<section class="section"><div class="container">' + head(c.heading || 'Loved by server owners', c.subheading, 'Reviews', true) +
        '<div class="rv-grid">' + d.reviews.map(function (r) {
          return '<figure class="rv-card reveal"><div class="stars">' + '★★★★★'.slice(0, r.rating) + '</div>' +
            '<blockquote>“' + esc(r.comment) + '”</blockquote>' +
            '<figcaption><span class="av">' + esc(r.name.charAt(0).toUpperCase()) + '</span><span><b>' + esc(r.name) + '</b>' +
            '<a href="' + S.productUrl(r.slug) + '">' + esc(r.product) + '</a></span><span class="vb">✓ Verified buyer</span></figcaption></figure>';
        }).join('') + '</div></div></section>';
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
      '<h2>Find the next piece of your server.</h2><p>Browse resources by category, framework and price, then choose what fits your build.</p>' +
      '<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap"><a class="btn btn-lg" href="category.html?c=all">Start shopping</a>' +
      '<a class="btn btn-lg btn-ghost" href="auth.html?mode=register">Sell your resources</a></div></div></div></section>';
  }

  function render(data, nav) {
    var hasTrust = data.sections.some(function (x) { return x.key === 'trust'; });
    COMMUNITY = false;
    var html = data.sections.map(function (s) {
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
