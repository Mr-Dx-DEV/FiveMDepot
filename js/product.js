/* FiveMDepot — Product page.  URL: product.html?slug=<slug> */
(function () {
  'use strict';
  var S = window.Store, esc = S.esc, I = S.icons;
  var root = document.getElementById('product');
  var slug = new URLSearchParams(location.search).get('slug') || new URLSearchParams(location.search).get('product') || '';
  var p = null, owned = false, staff = false;

  function stars(r) { var f = Math.round(r || 0); return '<span class="stars">' + '★★★★★'.slice(0, f) + '<span style="opacity:.3">' + '★★★★★'.slice(0, 5 - f) + '</span></span>'; }
  function date(s) { var d = new Date(String(s || '').replace(' ', 'T')); return isNaN(d) ? '' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); }
  var check = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';

  function setMeta() {
    document.title = (p.seo_title || p.title) + ' — FiveMDepot';
    var desc = p.seo_description || p.excerpt || '';
    var md = document.querySelector('meta[name="description"]');
    if (md) md.setAttribute('content', desc);
    var og = function (prop, val) {
      var m = document.querySelector('meta[property="' + prop + '"]');
      if (!m) { m = document.createElement('meta'); m.setAttribute('property', prop); document.head.appendChild(m); }
      m.setAttribute('content', val);
    };
    og('og:title', p.title); og('og:description', desc);
    if (p.image) og('og:image', new URL(p.image, location.href).href);
    // Structured data for Google
    var ld = document.createElement('script');
    ld.type = 'application/ld+json';
    ld.textContent = JSON.stringify({
      '@context': 'https://schema.org', '@type': 'Product', name: p.title, description: desc,
      image: p.screenshots.map(function (s) { return new URL(s, location.href).href; }),
      offers: { '@type': 'Offer', price: (p.sale_price != null ? p.sale_price : p.price).toFixed(2), priceCurrency: 'USD', availability: 'https://schema.org/InStock' },
      aggregateRating: p.review_count ? { '@type': 'AggregateRating', ratingValue: p.rating, reviewCount: p.review_count } : undefined
    });
    document.head.appendChild(ld);
  }

  // ---------- Gallery ----------
  function gallery() {
    var media = p.screenshots.map(function (s) { return { type: 'img', src: s }; });
    if (p.video_embed) media.splice(media.length ? 1 : 0, 0, { type: 'video', src: p.video_embed, thumb: p.screenshots[0] });
    if (!media.length) media.push({ type: 'img', src: S.catArt({ slug: (p.badge && p.badge.slug) || 'box' }) });
    var idx = 0;
    var wrap = document.createElement('div');
    function draw() {
      var m = media[idx];
      wrap.innerHTML = '<div class="gallery-main">' +
        (m.type === 'video'
          ? '<iframe src="' + esc(m.src) + '" title="Video preview" allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe>'
          : '<img src="' + esc(m.src) + '" alt="' + esc(p.title) + ' screenshot ' + (idx + 1) + '" data-fallback="images/store/cat-default.svg">') +
        (media.length > 1 ? '<button class="gallery-nav prev" data-step="-1" aria-label="Previous">‹</button><button class="gallery-nav next" data-step="1" aria-label="Next">›</button>' : '') +
        (p.badge ? '<span class="pc-badge" style="background:' + esc(p.badge.color || 'var(--accent)') + '">' + esc(p.badge.name) + '</span>' : '') + '</div>' +
        (media.length > 1 ? '<div class="gallery-thumbs">' + media.map(function (x, i) {
          return '<button class="' + (i === idx ? 'on' : '') + '" data-i="' + i + '" aria-label="Show media ' + (i + 1) + '"><img src="' + esc(x.type === 'video' ? (x.thumb || S.catArt({ slug: 'box' })) : x.src) + '" alt="" loading="lazy">' +
            (x.type === 'video' ? '<span class="play">▶</span>' : '') + '</button>';
        }).join('') + '</div>' : '');
    }
    wrap.addEventListener('click', function (e) {
      var t = e.target.closest('[data-i]'), s = e.target.closest('[data-step]');
      if (t) { idx = +t.dataset.i; draw(); }
      if (s) { idx = (idx + +s.dataset.step + media.length) % media.length; draw(); }
    });
    draw();
    return wrap;
  }

  // ---------- Buy box ----------
  function buyBox() {
    var onSale = p.sale_price != null && p.sale_price < p.price;
    var price = onSale ? p.sale_price : p.price;
    var compat = (p.compatibility.length ? p.compatibility : p.frameworks.map(function (f) { return f.name; }));
    var action;
    if (owned) action = '<a class="btn btn-primary btn-lg" href="api/v1.php?r=account/download/' + encodeURIComponent(p.id) + '">⬇ Download v' + esc(p.version) + '</a>';
    else if (price === 0) action = '<button class="btn btn-lg pc-claim" data-free>🎁 Claim for free</button>';
    else action = '<button class="btn btn-primary btn-lg" data-buy>Buy now</button>';
    return '<aside class="buybox">' +
      '<div>' + (p.breadcrumb.length ? '<nav class="crumbs" aria-label="Breadcrumb"><a href="index.html">Home</a>' + p.breadcrumb.map(function (b) {
        return '<span class="sep">/</span><a href="' + S.catUrl(b.slug) + '">' + esc(b.name) + '</a>';
      }).join('') + '</nav>' : '') +
      '<h1>' + esc(p.title) + '</h1></div>' +
      '<div class="buy-meta">' + stars(p.rating) + '<a href="#reviews" data-tab-link="reviews">' + (p.review_count ? p.rating + ' · ' + p.review_count + ' reviews' : 'No reviews yet') + '</a>' +
        '<span>⬇ ' + p.downloads + ' downloads</span></div>' +
      '<div class="pc-fw">' + compat.map(function (c) { return '<span class="chip">' + esc(c) + '</span>'; }).join('') + '</div>' +
      '<div class="buy-price"><b class="' + (price === 0 ? 'up' : '') + '">' + (price === 0 ? 'Free' : S.money(price)) + '</b>' +
        (onSale ? '<s>' + S.money(p.price) + '</s><span class="save">Save ' + Math.round((1 - p.sale_price / p.price) * 100) + '%</span>' : '') + '</div>' +
      '<div class="buy-actions">' + action +
        '<button class="wish-btn" data-wishbtn aria-label="Save to wishlist">' + I.heart + '</button></div>' +
      (!owned && price > 0 ? '<button class="btn btn-ghost btn-block" data-add>' + (S.cart.has(p.id) ? 'In your cart ✓ — view cart' : 'Add to cart') + '</button>' : '') +
      (!owned && price === 0 ? '<p class="small muted" style="margin:0">Free with a FiveMDepot account — it’s added to your library with lifetime updates.</p>' : '') +
      (owned ? '<p class="small up" style="margin:0">✓ You own this — downloads and updates are in <a class="link-more" href="dashboard/buyer.html">your library</a></p>' : '') +
      (staff && !owned ? '<p class="small muted" style="margin:0">👁 You see the customer view. <a class="link-more" href="api/v1.php?r=account/download/' + encodeURIComponent(p.id) + '">⬇ Download (admin)</a></p>' : '') +
      '<div class="facts"><div><small>Version</small><b>' + esc(p.version) + '</b></div><div><small>Updated</small><b>' + date(p.updated_at) + '</b></div>' +
        '<div><small>Category</small><b>' + (p.categories[0] ? '<a href="' + S.catUrl(p.categories[0].slug) + '">' + esc(p.categories[0].name) + '</a>' : '—') + '</b></div>' +
        '<div><small>Type</small><b>' + (p.type === 'server_pack' ? 'Server pack' : esc((p.badge && p.badge.name) || 'Resource')) + '</b></div></div>' +
      '<div class="trustlist"><span>' + check + 'Instant download after payment check</span><span>' + check + 'Free lifetime updates</span><span>' + check + 'Support on Discord</span></div>' +
      '<a class="seller-card" href="seller-profile.html?id=' + encodeURIComponent(p.seller_info.id) + '"><span class="av">' + esc(p.seller_info.name.charAt(0).toUpperCase()) + '</span>' +
        '<span><b>' + esc(p.seller_info.name) + '</b><span class="' + (p.seller_info.official ? 'verified' : 'muted small') + '">' + (p.seller_info.official ? '✓ Official FiveMDepot' : p.seller_info.products + ' products') + '</span></span></a>' +
    '</aside>';
  }

  // ---------- Tabs ----------
  function tabs() {
    var list = [['desc', 'Description']];
    if (p.features.length || p.pack) list.push(['features', 'Features']);
    if (p.install_html) list.push(['install', 'Installation']);
    if (p.changelog) list.push(['changelog', 'Changelog']);
    list.push(['reviews', 'Reviews', p.review_count]);
    var pack = p.pack ? '<div class="pack-strip">' +
      (p.pack.resources ? '<div><b>' + esc(p.pack.resources) + '+</b><span>Resources included</span></div>' : '') +
      (p.pack.resmon_idle_ms ? '<div><b>' + esc(p.pack.resmon_idle_ms) + '</b><span>Idle resmon</span></div>' : '') +
      (p.pack.frameworks && p.pack.frameworks.length ? '<div><b>' + esc(p.pack.frameworks.join(' / ')) + '</b><span>Frameworks</span></div>' : '') +
      (p.pack.lifetime_updates ? '<div><b>Lifetime</b><span>Free updates</span></div>' : '') + '</div>' : '';
    var panes = {
      desc: pack + '<div class="prose">' + (p.description_html || '<p>No description yet.</p>') + '</div>',
      features: pack + '<ul class="feature-list">' + p.features.map(function (f) { return '<li>' + check + '<span>' + esc(f) + '</span></li>'; }).join('') + '</ul>',
      install: '<div class="prose">' + p.install_html + '</div>',
      changelog: '<div class="changelog">' + esc(p.changelog) + '</div>',
      reviews: reviewsPane()
    };
    var html = '<section style="padding:10px 0 50px" id="tabs-sec"><div class="ptabs" role="tablist">' + list.map(function (t, i) {
      return '<button role="tab" data-tab="' + t[0] + '" class="' + (i === 0 ? 'on' : '') + '" aria-selected="' + (i === 0) + '">' + t[1] + (t[2] ? '<small>' + t[2] + '</small>' : '') + '</button>';
    }).join('') + '</div>' + list.map(function (t, i) {
      return '<div role="tabpanel" data-pane="' + t[0] + '"' + (i ? ' hidden' : '') + (t[0] === 'reviews' ? ' id="reviews"' : '') + '>' + panes[t[0]] + '</div>';
    }).join('') + '</section>';
    return html;
  }

  function reviewsPane() {
    var total = p.review_count || 0;
    var bars = [5, 4, 3, 2, 1].map(function (n) {
      var c = p.rating_distribution[n] || 0;
      return '<div class="rv-bar"><span>' + n + ' ★</span><span class="track"><span class="fill" style="width:' + (total ? c / total * 100 : 0) + '%"></span></span><span>' + c + '</span></div>';
    }).join('');
    var form = owned ? '<form class="panel panel-pad" id="rvForm" style="margin-bottom:20px"><h3 style="font-size:16px;margin-bottom:10px">Rate this product</h3>' +
      '<div class="star-input" role="radiogroup" aria-label="Rating">' + [1, 2, 3, 4, 5].map(function (n) { return '<button type="button" data-star="' + n + '" aria-label="' + n + ' stars">★</button>'; }).join('') + '</div>' +
      '<textarea class="input" name="comment" rows="3" maxlength="2000" placeholder="What did you like? Anything to improve?" style="margin:12px 0"></textarea>' +
      '<button class="btn btn-primary btn-sm" type="submit">Post review</button></form>' : '';
    return '<div class="rv-summary"><div class="rv-big"><b>' + (total ? p.rating : '—') + '</b>' + stars(p.rating) + '<div class="muted small">' + total + ' reviews</div></div><div class="rv-bars">' + bars + '</div></div>' +
      form + (p.reviews.length ? p.reviews.map(function (r) {
        return '<div class="review"><div class="review-head"><b>' + esc(r.name) + ' ' + stars(r.rating) + '</b><span class="muted small">' + date(r.created_at) + '</span></div><p class="muted">' + esc(r.comment || '') + '</p></div>';
      }).join('') : '<p class="muted">No reviews yet' + (owned ? ' — be the first!' : '.') + '</p>');
  }

  function render() {
    root.innerHTML = '<div class="pd"><div id="gal"></div>' + buyBox() + '</div>' + tabs() +
      (p.related.length ? '<section style="padding-bottom:40px"><div class="section-head"><div><span class="eyebrow">You may also like</span><h2 class="section-title">Related resources</h2></div></div><div class="product-grid">' + p.related.map(S.productCard).join('') + '</div></section>' : '');
    root.querySelector('#gal').appendChild(gallery());
    if (S.user) S.syncWishlist();
    syncWishBtn();
  }

  var wished = false;
  function syncWishBtn() { var b = root.querySelector('[data-wishbtn]'); if (b) b.classList.toggle('on', wished); }

  function go(path) { location.href = path; }

  root.addEventListener('click', function (e) {
    var t;
    if ((t = e.target.closest('[data-tab]')) || (t = e.target.closest('[data-tab-link]'))) {
      var name = t.dataset.tab || t.dataset.tabLink;
      if (t.dataset.tabLink) e.preventDefault();
      root.querySelectorAll('[data-tab]').forEach(function (b) { b.classList.toggle('on', b.dataset.tab === name); b.setAttribute('aria-selected', String(b.dataset.tab === name)); });
      root.querySelectorAll('[data-pane]').forEach(function (pn) { pn.hidden = pn.dataset.pane !== name; });
      if (t.dataset.tabLink) document.getElementById('tabs-sec').scrollIntoView({ behavior: 'smooth' });
      return;
    }
    if (e.target.closest('[data-add]')) { S.cart.add(p); e.target.closest('[data-add]').textContent = 'In your cart ✓ — view cart'; return; }
    if (e.target.closest('[data-buy]')) { S.cart.add(p, { silent: true }); go('checkout.html'); return; }
    if (e.target.closest('[data-free]')) { S.claim(p, e.target.closest('[data-free]')); return; }
    if (e.target.closest('[data-wishbtn]')) {
      if (!S.user) { go(S.loginUrl()); return; }
      wished = !wished; syncWishBtn();
      S.v1('POST', 'account/wishlist/' + encodeURIComponent(p.id), { on: wished }).then(function () { S.toast(wished ? 'Saved to wishlist' : 'Removed from wishlist', 'success'); })
        .catch(function (err) { wished = !wished; syncWishBtn(); S.toast(err.message, 'error'); });
      return;
    }
    var st = e.target.closest('[data-star]');
    if (st) {
      var n = +st.dataset.star;
      root.querySelectorAll('[data-star]').forEach(function (b) { b.classList.toggle('on', +b.dataset.star <= n); });
      root.querySelector('#rvForm').dataset.rating = n;
    }
  });
  root.addEventListener('submit', function (e) {
    if (e.target.id !== 'rvForm') return;
    e.preventDefault();
    var f = e.target, rating = +f.dataset.rating || 0;
    if (!rating) { S.toast('Pick 1 to 5 stars', 'error'); return; }
    S.v1('POST', 'account/reviews', { product_id: p.id, rating: rating, comment: f.comment.value }).then(function () {
      S.toast('Thanks for your review!', 'success'); load();
    }).catch(function (err) { S.toast(err.message, 'error'); });
  });

  var claimedId = null;
  document.addEventListener('store:claimed', function (e) {
    claimedId = e.detail;
    if (p && e.detail === p.id) { owned = true; render(); }
  });

  function load() {
    return S.api('product', { slug: slug }).then(function (data) {
      p = data;
      setMeta();
      return S.me().then(function (user) {
        if (!user) return;
        return S.v1('GET', 'account/status&ids=' + encodeURIComponent(p.id)).then(function (st) {
          owned = st.owned.indexOf(p.id) !== -1 || claimedId === p.id;
          staff = user.role === 'ADMIN' || (p.seller_info && p.seller_info.id === user.id);
          wished = st.wishlist.indexOf(p.id) !== -1;
        }).catch(function () {});
      });
    }).then(render).catch(function (e) {
      document.title = 'Not found — FiveMDepot';
      root.innerHTML = '<div class="empty" style="margin:60px 0"><b>' + (/not found/i.test(e.message) ? 'This product isn’t available' : 'Could not load this product') + '</b>' +
        'It may have been removed or is waiting for review. <a class="link-more" href="category.html?c=all">Browse the store →</a></div>';
    });
  }
  load();
})();
