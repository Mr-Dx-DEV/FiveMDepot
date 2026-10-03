/* FiveMDepot — Complete Server Pack landing page (data: api/store.php?r=packs) */
(function () {
  'use strict';
  var S = window.Store, esc = S.esc;
  var check = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';

  function kpis(t, packs) {
    var resmon = packs.map(function (p) { return p.pack.resmon_idle_ms; }).filter(Boolean)[0] || '0.4–0.6ms';
    var items = [
      [(t.resources ? t.resources + '+' : '400+'), 'Systems included'],
      [resmon, 'Idle resmon'],
      ['Lifetime', 'Free updates'],
      ['24/7', 'Discord support']
    ];
    document.getElementById('kpis').innerHTML = items.map(function (k) { return '<div><b>' + esc(k[0]) + '</b><span>' + esc(k[1]) + '</span></div>'; }).join('');
  }

  function packCard(p, best) {
    var onSale = p.sale_price != null && p.sale_price < p.price;
    var price = onSale ? p.sale_price : p.price;
    var feats = (p.features.length ? p.features : (p.pack.features || [])).slice(0, 8);
    var more = Math.max(0, (p.features.length || (p.pack.features || []).length) - feats.length);
    var fw = (p.pack.frameworks && p.pack.frameworks.length ? p.pack.frameworks : p.compatibility);
    S.productCard(p); // registers the product for the shared cart handler
    return '<article class="pack-card' + (best ? ' best' : '') + '">' + (best ? '<span class="ribbon">MOST POPULAR</span>' : '') +
      '<a class="media" href="' + S.productUrl(p.slug) + '"><img src="' + esc(p.image || 'images/photos/server-packs-640.jpg') + '" alt="' + esc(p.title) + '" data-fallback="images/photos/server-packs-640.jpg"></a>' +
      '<div class="body"><h3>' + esc(p.title) + '</h3>' +
      '<div class="mini">' + (p.pack.resources ? '<span>' + esc(p.pack.resources) + '+ systems</span>' : '') +
        (p.pack.resmon_idle_ms ? '<span>' + esc(p.pack.resmon_idle_ms) + ' resmon</span>' : '') +
        (fw || []).slice(0, 3).map(function (f) { return '<span>' + esc(f) + '</span>'; }).join('') + '</div>' +
      '<div class="price">' + S.money(price) + (onSale ? '<s>' + S.money(p.price) + '</s>' : '') + '</div>' +
      '<ul>' + feats.map(function (f) { return '<li>' + check + '<span>' + esc(f) + '</span></li>'; }).join('') +
        (more ? '<li class="muted">+ ' + more + ' more systems</li>' : '') +
        (p.pack.lifetime_updates ? '<li>' + check + '<span><b>Lifetime updates</b></span></li>' : '') + '</ul>' +
      '<button class="btn btn-primary btn-lg btn-block" data-buy="' + esc(p.id) + '">Buy now</button>' +
      '<a class="btn btn-ghost btn-block" href="' + S.productUrl(p.slug) + '">See full details</a></div></article>';
  }

  function compare(packs) {
    if (packs.length < 2) { document.getElementById('compare').hidden = true; return; }
    var all = [];
    packs.forEach(function (p) { (p.features.length ? p.features : (p.pack.features || [])).forEach(function (f) { if (all.indexOf(f) === -1) all.push(f); }); });
    var has = function (p, f) { return (p.features.length ? p.features : (p.pack.features || [])).indexOf(f) !== -1; };
    var rows = [
      ['Price', packs.map(function (p) { return '<b>' + S.money(p.sale_price != null ? p.sale_price : p.price) + '</b>'; })],
      ['Systems included', packs.map(function (p) { return p.pack.resources ? esc(p.pack.resources) + '+' : '—'; })],
      ['Idle resmon', packs.map(function (p) { return esc(p.pack.resmon_idle_ms || '—'); })],
      ['Frameworks', packs.map(function (p) { return esc(((p.pack.frameworks && p.pack.frameworks.length) ? p.pack.frameworks : p.compatibility).join(', ') || '—'); })],
      ['Lifetime updates', packs.map(function (p) { return p.pack.lifetime_updates ? '<span class="yes">✓</span>' : '<span class="no">—</span>'; })]
    ].concat(all.slice(0, 14).map(function (f) {
      return [esc(f), packs.map(function (p) { return has(p, f) ? '<span class="yes">✓</span>' : '<span class="no">—</span>'; })];
    }));
    document.getElementById('compareBox').innerHTML = '<div class="section-head center"><div><span class="eyebrow">Compare</span><h2 class="section-title">Side-by-side</h2></div></div>' +
      '<div class="panel tbl-wrap"><table class="cmp"><thead><tr><th></th>' + packs.map(function (p) { return '<th>' + esc(p.title) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(function (r) { return '<tr><td>' + r[0] + '</td>' + r[1].map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>'; }).join('') +
      '<tr><td></td>' + packs.map(function (p) { return '<td><button class="btn btn-primary btn-sm" data-buy="' + esc(p.id) + '">Buy</button></td>'; }).join('') + '</tr></tbody></table></div>';
  }

  function included(packs) {
    var biggest = packs.slice().sort(function (a, b) { return ((b.pack.resources || 0) - (a.pack.resources || 0)) || ((b.features.length) - (a.features.length)); })[0];
    var list = biggest.features.length ? biggest.features : (biggest.pack.features || []);
    if (list.length < 4) return;
    document.getElementById('included-sec').hidden = false;
    document.getElementById('incSub').textContent = 'Highlights from ' + biggest.title;
    document.getElementById('included').innerHTML = list.map(function (f) { return '<li>' + esc(f) + '</li>'; }).join('');
  }

  var byId = {};
  document.getElementById('sp').addEventListener('click', function (e) {
    var b = e.target.closest('[data-buy]');
    if (!b) return;
    var p = byId[b.dataset.buy];
    if (!S.cart.has(p.id)) S.cart.add(p);
    location.href = 'checkout.html';
  });

  S.api('packs').then(function (d) {
    var packs = d.packs;
    packs.forEach(function (p) { p.pack = p.pack || {}; byId[p.id] = p; });
    kpis(d.totals, packs);
    var list = document.getElementById('packList');
    if (!packs.length) {
      list.innerHTML = '<div class="empty" style="grid-column:1/-1"><b>New server packs are coming soon</b>Join our Discord to be the first to know — or build your own server from our <a class="link-more" href="category.html?c=scripts">scripts</a>.</div>';
      document.getElementById('compare').hidden = true;
      return;
    }
    var best = packs.length >= 3 ? 1 : packs.findIndex(function (p) { return p.featured; });
    list.innerHTML = packs.map(function (p, i) { return packCard(p, i === best); }).join('');
    compare(packs);
    included(packs);
  }).catch(function () {
    kpis({ resources: 0 }, []);
    document.getElementById('packList').innerHTML = '<div class="empty" style="grid-column:1/-1"><b>Could not load server packs</b>Please refresh the page.</div>';
  });
})();
