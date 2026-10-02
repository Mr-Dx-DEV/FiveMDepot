/* FiveMDepot — Category / shop page.  URL: category.html?c=<slug>&q=&tags=a,b&min=&max=&sort=&page= */
(function () {
  'use strict';
  var S = window.Store, esc = S.esc;
  var hero = document.getElementById('cat-hero');
  var filtersEl = document.getElementById('filters');
  var grid = document.getElementById('grid');
  var countEl = document.getElementById('count');
  var activeEl = document.getElementById('active-filters');
  var pager = document.getElementById('pager');
  var sortEl = document.getElementById('sort');

  // ---------- State <-> URL ----------
  function readState() {
    var p = new URLSearchParams(location.search);
    return {
      c: p.get('c') || 'all',
      q: p.get('q') || '',
      tags: (p.get('tags') || '').split(',').filter(Boolean),
      min: p.get('min') || '',
      max: p.get('max') || '',
      sort: p.get('sort') || 'featured',
      page: Math.max(1, parseInt(p.get('page'), 10) || 1)
    };
  }
  var state = readState();

  function writeState(push) {
    var q = S.qs({
      c: state.c, q: state.q, tags: state.tags.join(','), min: state.min, max: state.max,
      sort: state.sort === 'featured' ? '' : state.sort, page: state.page > 1 ? state.page : ''
    });
    history[push ? 'pushState' : 'replaceState'](null, '', 'category.html?' + q);
  }
  window.addEventListener('popstate', function () { state = readState(); load(); });

  // ---------- Load ----------
  var lastCategorySlug = null;
  var reqId = 0;
  function load() {
    var id = ++reqId;
    sortEl.value = state.sort;
    grid.innerHTML = new Array(9).join('<div class="skeleton card"></div>');
    S.api('category', {
      slug: state.c, q: state.q, tags: state.tags.join(','), min: state.min, max: state.max,
      sort: state.sort, page: state.page, per_page: 24
    }).then(function (d) {
      if (id !== reqId) return;
      if (lastCategorySlug !== d.category.slug) { renderHero(d); lastCategorySlug = d.category.slug; }
      renderFilters(d.filters);
      renderActive();
      renderGrid(d);
    }).catch(function (e) {
      if (id !== reqId) return;
      hero.querySelector('h1') || (hero.innerHTML = '<div class="container"><h1>Store</h1></div>');
      grid.innerHTML = '<div class="empty" style="grid-column:1/-1"><b>' +
        (/not found/i.test(e.message) ? 'Category not found' : 'Could not load products') + '</b>' +
        (/not found/i.test(e.message) ? '<a class="link-more" href="category.html?c=all">Browse all products →</a>' : 'Please try again in a moment.') + '</div>';
      countEl.textContent = '';
      pager.innerHTML = '';
    });
  }

  // ---------- Render ----------
  function renderHero(d) {
    var c = d.category;
    document.title = (c.seo_title || c.name) + ' — FiveMDepot';
    var md = document.querySelector('meta[name="description"]');
    if (md && (c.seo_description || c.description)) md.setAttribute('content', c.seo_description || c.description);

    var crumbs = '<a href="index.html">Home</a>';
    if (c.slug !== 'all') crumbs += '<span class="sep">/</span><a href="category.html?c=all">Store</a>';
    d.breadcrumb.forEach(function (b, i) {
      crumbs += '<span class="sep">/</span>' + (i === d.breadcrumb.length - 1
        ? '<span>' + esc(b.name) + '</span>' : '<a href="' + S.catUrl(b.slug) + '">' + esc(b.name) + '</a>');
    });

    var subs = d.children.map(function (k) {
      return '<a class="subcat" href="' + S.catUrl(k.slug) + '">' + esc(k.name) + '<small>' + k.product_count + '</small></a>';
    }).join('');

    hero.className = 'page-hero' + (c.banner_url ? ' has-banner' : '');
    hero.style.backgroundImage = c.banner_url ? 'url("' + c.banner_url.replace(/"/g, '') + '")' : '';
    hero.innerHTML = '<div class="container">' +
      '<nav class="crumbs" aria-label="Breadcrumb">' + crumbs + '</nav>' +
      '<h1>' + (c.icon ? '<span>' + S.icon(c.icon) + '</span>' : '') + esc(c.name) + '</h1>' +
      (c.description ? '<p>' + esc(c.description) + '</p>' : '') +
      (subs ? '<div class="subcats">' + subs + '</div>' : '') +
    '</div>';
  }

  function renderFilters(groups) {
    var html = '<div class="filter-box"><h4>Search</h4><form id="f-search"><input class="input" name="q" value="' + esc(state.q) + '" placeholder="Search in this category…"></form></div>';
    groups.forEach(function (g) {
      html += '<div class="filter-box"><h4>' + esc(g.name) + '</h4>' + g.tags.map(function (t) {
        var on = state.tags.indexOf(t.slug) !== -1;
        return '<label class="filter-opt"><input type="checkbox" data-tag="' + esc(t.slug) + '"' + (on ? ' checked' : '') + '>' +
          '<span>' + esc(t.name) + '</span><span class="n">' + t.count + '</span></label>';
      }).join('') + '</div>';
    });
    html += '<div class="filter-box"><h4>Price (USD)</h4><form id="f-price" class="price-row">' +
      '<input class="input" name="min" type="number" min="0" step="1" placeholder="Min" value="' + esc(state.min) + '" aria-label="Minimum price">' +
      '<span style="color:var(--muted)">–</span>' +
      '<input class="input" name="max" type="number" min="0" step="1" placeholder="Max" value="' + esc(state.max) + '" aria-label="Maximum price">' +
      '<button class="btn btn-sm btn-primary" type="submit">Go</button></form></div>';
    filtersEl.innerHTML = html;
  }

  function renderActive() {
    var chips = [];
    if (state.q) chips.push(['q', '', 'Search: ' + state.q]);
    state.tags.forEach(function (t) { chips.push(['tag', t, t]); });
    if (state.min || state.max) chips.push(['price', '', '$' + (state.min || 0) + ' – ' + (state.max ? '$' + state.max : 'any')]);
    activeEl.innerHTML = chips.length
      ? chips.map(function (c) { return '<button data-clear="' + c[0] + '" data-val="' + esc(c[1]) + '">' + esc(c[2]) + ' ✕</button>'; }).join('') +
        '<button data-clear="all">Clear all</button>'
      : '';
  }

  function renderGrid(d) {
    var m = d.meta;
    countEl.textContent = m.total + (m.total === 1 ? ' product' : ' products');
    if (!d.products.length) {
      grid.innerHTML = '<div class="empty" style="grid-column:1/-1"><b>No products found</b>Try removing a filter or browsing another category.</div>';
      pager.innerHTML = '';
      return;
    }
    grid.innerHTML = d.products.map(S.productCard).join('');

    if (m.pages <= 1) { pager.innerHTML = ''; return; }
    var btns = '<button data-page="' + (m.page - 1) + '"' + (m.page <= 1 ? ' disabled' : '') + ' aria-label="Previous page">‹</button>';
    for (var i = 1; i <= m.pages; i++) {
      if (i === 1 || i === m.pages || Math.abs(i - m.page) <= 1) {
        btns += '<button data-page="' + i + '"' + (i === m.page ? ' class="on" aria-current="page"' : '') + '>' + i + '</button>';
      } else if (Math.abs(i - m.page) === 2) {
        btns += '<button disabled>…</button>';
      }
    }
    btns += '<button data-page="' + (m.page + 1) + '"' + (m.page >= m.pages ? ' disabled' : '') + ' aria-label="Next page">›</button>';
    pager.innerHTML = btns;
  }

  // ---------- Events ----------
  function update(changes) {
    Object.assign(state, changes);
    if (!('page' in changes)) state.page = 1;
    writeState(true);
    load();
  }

  filtersEl.addEventListener('change', function (e) {
    var t = e.target.getAttribute('data-tag');
    if (!t) return;
    var tags = state.tags.filter(function (x) { return x !== t; });
    if (e.target.checked) tags.push(t);
    update({ tags: tags });
  });
  filtersEl.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target;
    if (f.id === 'f-search') update({ q: f.q.value.trim() });
    if (f.id === 'f-price') update({ min: f.min.value, max: f.max.value });
    document.body.classList.remove('filters-open');
  });
  activeEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-clear]');
    if (!b) return;
    var k = b.getAttribute('data-clear');
    if (k === 'all') update({ q: '', tags: [], min: '', max: '' });
    if (k === 'q') update({ q: '' });
    if (k === 'price') update({ min: '', max: '' });
    if (k === 'tag') { var v = b.getAttribute('data-val'); update({ tags: state.tags.filter(function (x) { return x !== v; }) }); }
  });
  pager.addEventListener('click', function (e) {
    var b = e.target.closest('[data-page]');
    if (!b || b.disabled) return;
    update({ page: parseInt(b.getAttribute('data-page'), 10) });
    window.scrollTo({ top: hero.offsetHeight, behavior: 'smooth' });
  });
  sortEl.addEventListener('change', function () { update({ sort: sortEl.value }); });
  document.getElementById('filters-toggle').addEventListener('click', function () {
    document.body.classList.add('filters-open');
  });

  // Old shop links (shop.html?category=script) → new categories
  var legacy = { script: 'scripts', mlo: 'mlos-maps', vehicle: 'vehicles' };
  if (legacy[state.c]) { state.c = legacy[state.c]; writeState(false); }

  load();
})();
