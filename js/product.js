/* FiveMDepot — Product page.  URL: product.html?slug=<slug> */
(function () {
  'use strict';
  var S = window.Store, esc = S.esc, I = S.icons;
  var root = document.getElementById('product');
  var slug = new URLSearchParams(location.search).get('slug') || new URLSearchParams(location.search).get('product') || '';
  var p = null, owned = false, staff = false, included = null; // included = plan name when a subscription unlocks it

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

  // ---------- Gallery: sliding track + lightbox ----------
  // Slides sit side by side and the track moves; YouTube loads only when the visitor presses play.
  var REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function mediaList() {
    var media = p.screenshots.map(function (s) { return { type: 'img', src: s }; });
    if (p.video_embed) {
      // YouTube gives every video a thumbnail; use it so the video tile never depends on the screenshots
      var yt = /youtube(?:-nocookie)?\.com\/embed\/([\w-]+)/.exec(p.video_embed);
      media.splice(media.length ? 1 : 0, 0, { type: 'video', src: p.video_embed, thumb: yt ? 'https://i.ytimg.com/vi/' + yt[1] + '/hqdefault.jpg' : p.screenshots[0] });
    }
    if (!media.length) media.push({ type: 'img', src: S.catArt({ slug: (p.badge && p.badge.slug) || 'box' }) });
    return media;
  }

  function slideHtml(m, i, big) {
    if (m.type === 'video') {
      return '<div class="g-slide g-video" data-slide="' + i + '"><img src="' + esc(m.thumb || '') + '" alt="' + esc(p.title) + ' video" loading="lazy" draggable="false" data-fallback="images/store/cat-default.svg">' +
        '<button type="button" class="g-play" data-play="' + i + '" aria-label="Play video"><span>▶</span></button></div>';
    }
    return '<div class="g-slide" data-slide="' + i + '"><img src="' + esc(m.src) + '" alt="' + esc(p.title) + ' screenshot ' + (i + 1) + '"' +
      (i && !big ? ' loading="lazy"' : '') + ' draggable="false" data-fallback="images/store/cat-default.svg"' + (big ? '' : ' data-zoom="' + i + '"') + '></div>';
  }

  // Shared slider behaviour for the page gallery and the lightbox
  function slider(root, media, opts) {
    var track = root.querySelector('.g-track'), idx = opts.start || 0, timer = null;
    function stopVideos() {
      root.querySelectorAll('.g-video iframe').forEach(function (f) { f.parentNode.classList.remove('playing'); f.remove(); });
    }
    function go(n, user) {
      if (user) stopAuto();
      idx = (n + media.length) % media.length;
      stopVideos();
      track.style.transform = 'translate3d(' + (-idx * 100) + '%,0,0)';
      root.querySelectorAll('.g-slide').forEach(function (el, i) { el.classList.toggle('on', i === idx); });
      var c = root.querySelector('.g-count');
      if (c) c.textContent = (idx + 1) + ' / ' + media.length;
      if (opts.onChange) opts.onChange(idx);
    }
    function play(i) {
      var v = root.querySelector('.g-video[data-slide="' + i + '"]');
      if (!v || v.querySelector('iframe')) return;
      stopAuto();
      var f = document.createElement('iframe');
      f.src = media[i].src + (media[i].src.indexOf('?') === -1 ? '?' : '&') + 'autoplay=1&rel=0';
      f.title = p.title + ' video';
      f.allow = 'accelerometer; autoplay; encrypted-media; picture-in-picture';
      f.allowFullscreen = true;
      v.appendChild(f);
      v.classList.add('playing');
    }
    function startAuto() {
      if (!opts.auto || REDUCED || media.length < 2 || timer) return;
      timer = setInterval(function () { go(idx + 1); }, 5000);
    }
    function stopAuto() { clearInterval(timer); timer = null; }
    root.addEventListener('click', function (e) {
      var s = e.target.closest('[data-step]'), pl = e.target.closest('[data-play]');
      if (s) go(idx + +s.dataset.step, true);
      if (pl) play(+pl.dataset.play);
    });
    // Swipe / drag with the finger or mouse
    var x0 = null, dx = 0;
    track.addEventListener('pointerdown', function (e) {
      if (e.target.closest('iframe, button')) return;
      x0 = e.clientX; dx = 0;
      track.classList.add('drag');
    });
    window.addEventListener('pointermove', function (e) {
      if (x0 === null) return;
      dx = e.clientX - x0;
      track.style.transform = 'translate3d(calc(' + (-idx * 100) + '% + ' + dx + 'px),0,0)';
    });
    window.addEventListener('pointerup', function () {
      if (x0 === null) return;
      track.classList.remove('drag');
      x0 = null;
      root.dataset.dragged = Math.abs(dx) > 6 ? '1' : '';
      if (Math.abs(dx) > root.clientWidth * 0.12) go(idx + (dx < 0 ? 1 : -1), true); else go(idx);
    });
    root.addEventListener('mouseenter', stopAuto);
    root.addEventListener('mouseleave', startAuto);
    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(idx + 1, true); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(idx - 1, true); }
    });
    go(idx);
    startAuto();
    return { go: go, index: function () { return idx; }, stop: function () { stopAuto(); stopVideos(); } };
  }

  function lightbox(media, start) {
    var box = document.createElement('div');
    box.className = 'g-lightbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', p.title + ' gallery');
    box.tabIndex = -1;
    box.innerHTML = '<button type="button" class="g-lb-close" aria-label="Close">✕</button>' +
      '<div class="g-stage"><div class="g-track">' + media.map(function (m, i) { return slideHtml(m, i, true); }).join('') + '</div>' +
      (media.length > 1 ? '<button class="gallery-nav prev" data-step="-1" aria-label="Previous">‹</button><button class="gallery-nav next" data-step="1" aria-label="Next">›</button>' : '') +
      '<span class="g-count"></span></div>';
    document.body.appendChild(box);
    document.body.classList.add('g-lock');
    var sl = slider(box.querySelector('.g-stage'), media, { start: start });
    function close() {
      sl.stop();
      document.removeEventListener('keydown', onKey);
      box.classList.remove('open');
      document.body.classList.remove('g-lock');
      setTimeout(function () { box.remove(); }, 250);
    }
    function onKey(e) {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') sl.go(sl.index() + 1, true);
      if (e.key === 'ArrowLeft') sl.go(sl.index() - 1, true);
    }
    document.addEventListener('keydown', onKey);
    box.addEventListener('click', function (e) {
      if (box.querySelector('.g-stage').dataset.dragged) return;
      if (e.target.closest('.g-lb-close') || e.target === box || e.target.classList.contains('g-slide')) close();
    });
    requestAnimationFrame(function () { box.classList.add('open'); box.focus(); });
  }

  function gallery() {
    var media = mediaList();
    var wrap = document.createElement('div');
    wrap.innerHTML = '<div class="gallery-main g-stage" tabindex="0" aria-roledescription="carousel" aria-label="' + esc(p.title) + ' images">' +
        '<div class="g-track">' + media.map(function (m, i) { return slideHtml(m, i, false); }).join('') + '</div>' +
        (media.length > 1 ? '<button class="gallery-nav prev" data-step="-1" aria-label="Previous">‹</button><button class="gallery-nav next" data-step="1" aria-label="Next">›</button><span class="g-count"></span>' : '') +
        (p.badge ? '<span class="pc-badge" style="background:' + esc(p.badge.color || 'var(--accent)') + '">' + esc(p.badge.name) + '</span>' : '') +
        '<span class="g-hint">⤢ Click to enlarge</span></div>' +
      (media.length > 1 ? '<div class="gallery-thumbs">' + media.map(function (x, i) {
        return '<button type="button" data-i="' + i + '" aria-label="Show media ' + (i + 1) + '"><img src="' + esc(x.type === 'video' ? (x.thumb || S.catArt({ slug: 'box' })) : x.src) + '" alt="" loading="lazy">' +
          (x.type === 'video' ? '<span class="play">▶</span>' : '') + '</button>';
      }).join('') + '</div>' : '');
    var stage = wrap.querySelector('.g-stage');
    var thumbs = wrap.querySelectorAll('.gallery-thumbs button');
    var sl = slider(stage, media, { auto: true, onChange: function (i) {
      thumbs.forEach(function (t, k) { t.classList.toggle('on', k === i); });
      var row = thumbs[i] && thumbs[i].parentNode;
      if (row && row.scrollWidth > row.clientWidth) {
        row.scrollTo({ left: thumbs[i].offsetLeft - row.clientWidth / 2 + thumbs[i].clientWidth / 2, behavior: REDUCED ? 'auto' : 'smooth' });
      }
    } });
    wrap.addEventListener('click', function (e) {
      var t = e.target.closest('[data-i]'), z = e.target.closest('[data-zoom]');
      if (t) sl.go(+t.dataset.i, true);
      if (z && !stage.dataset.dragged) { sl.stop(); lightbox(media, +z.dataset.zoom); }
    });
    return wrap;
  }

  // ---------- Buy box ----------
  function buyBox() {
    var onSale = p.sale_price != null && p.sale_price < p.price;
    var price = onSale ? p.sale_price : p.price;
    var compat = (p.compatibility.length ? p.compatibility : p.frameworks.map(function (f) { return f.name; }));
    var action;
    if (owned || included) action = '<a class="btn btn-primary btn-lg" href="api/v1.php?r=account/download/' + encodeURIComponent(p.id) + '">⬇ Download v' + esc(p.version) + '</a>';
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
      (included && !owned ? '<p class="small up" style="margin:0">✓ Included in your <b>' + esc(included) + '</b> plan — download it while you’re subscribed. <a class="link-more" href="dashboard/buyer.html?tab=subscription">Your plan</a></p>' : '') +
      (owned ? '<p class="small up" style="margin:0">✓ You own this — downloads and updates are in <a class="link-more" href="dashboard/buyer.html">your library</a></p>' : '') +
      (staff && !owned ? '<p class="small muted" style="margin:0">👁 You see the customer view. <a class="link-more" href="api/v1.php?r=account/download/' + encodeURIComponent(p.id) + '">⬇ Download (admin)</a></p>' : '') +
      '<div class="facts"><div><small>Version</small><b>' + esc(p.version) + '</b></div><div><small>Updated</small><b>' + date(p.updated_at) + '</b></div>' +
        '<div><small>Category</small><b>' + (p.categories[0] ? '<a href="' + S.catUrl(p.categories[0].slug) + '">' + esc(p.categories[0].name) + '</a>' : '—') + '</b></div>' +
        '<div><small>Type</small><b>' + (p.type === 'server_pack' ? 'Server pack' : esc((p.badge && p.badge.name) || 'Resource')) + '</b></div></div>' +
      '<div class="trustlist"><span>' + check + 'Instant download after payment</span><span>' + check + 'Free lifetime updates</span><span>' + check + 'Support on Discord</span></div>' +
      '<div class="seller-card"><span class="av">' + 'F' + '</span>' +
        '<span><b>' + 'FiveMDepot' + '</b><span class="verified">✓ Made by us</span></span></div>' +
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
          included = (st.included || []).indexOf(p.id) !== -1 ? st.plan : null;
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
