/* Admin — Dashboard */
(function () {
  'use strict';
  var A = window.Admin, h = A.h;

  var ICON = {
    rev: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
    ord: 'M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18',
    prod: 'm21 8-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8',
    user: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'
  };
  function ic(d) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="' + d + '"/></svg>'; }

  function stat(label, value, icon, delta, href) {
    return '<div class="panel stat">' + (href ? '<a class="stat-link" href="' + href + '" aria-label="' + h(label) + '"></a>' : '') +
      '<span class="k">' + ic(icon) + h(label) + '</span><span class="v">' + value + '</span>' + (delta || '') + '</div>';
  }

  function chart(points) {
    var W = 720, H = 240, P = { l: 44, r: 12, t: 14, b: 26 };
    var max = Math.max.apply(null, points.map(function (p) { return p.revenue; }).concat([1]));
    var maxO = Math.max.apply(null, points.map(function (p) { return p.orders; }).concat([1]));
    var nice = Math.pow(10, Math.floor(Math.log10(max))) * Math.ceil(max / Math.pow(10, Math.floor(Math.log10(max))));
    var x = function (i) { return P.l + i * (W - P.l - P.r) / (points.length - 1); };
    var y = function (v) { return H - P.b - v / nice * (H - P.t - P.b); };
    var bw = (W - P.l - P.r) / points.length * 0.55;
    var line = points.map(function (p, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.revenue).toFixed(1); }).join(' ');
    var grid = '';
    for (var g = 0; g <= 4; g++) {
      var v = nice * g / 4, yy = y(v);
      grid += '<line class="grid-line" x1="' + P.l + '" x2="' + (W - P.r) + '" y1="' + yy + '" y2="' + yy + '"/><text x="' + (P.l - 8) + '" y="' + (yy + 4) + '" text-anchor="end">' + (v >= 1000 ? (v / 1000) + 'k' : Math.round(v)) + '</text>';
    }
    var bars = points.map(function (p, i) {
      var bh = p.orders / maxO * (H - P.t - P.b) * 0.5;
      return '<rect class="bar" x="' + (x(i) - bw / 2) + '" y="' + (H - P.b - bh) + '" width="' + bw + '" height="' + bh + '" rx="2"/>';
    }).join('');
    var labels = points.map(function (p, i) {
      if (i % 5 && i !== points.length - 1) return '';
      var d = new Date(p.date + 'T00:00');
      return '<text x="' + x(i) + '" y="' + (H - 8) + '" text-anchor="middle">' + d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) + '</text>';
    }).join('');
    var hits = points.map(function (p, i) {
      return '<g data-i="' + i + '"><rect class="hit" x="' + (x(i) - (W - P.l - P.r) / points.length / 2) + '" y="' + P.t + '" width="' + ((W - P.l - P.r) / points.length) + '" height="' + (H - P.t - P.b) + '" fill="transparent"/>' +
        '<circle class="dot" cx="' + x(i) + '" cy="' + y(p.revenue) + '" r="4.5"/></g>';
    }).join('');
    return '<div style="position:relative"><svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" role="img" aria-label="Revenue last 30 days">' +
      '<defs><linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f97316" stop-opacity=".35"/><stop offset="1" stop-color="#f97316" stop-opacity="0"/></linearGradient></defs>' +
      grid + bars + '<path class="area" d="' + line + ' L' + x(points.length - 1) + ' ' + (H - P.b) + ' L' + x(0) + ' ' + (H - P.b) + ' Z"/>' +
      '<path class="line" d="' + line + '"/>' + labels + hits + '</svg><div class="chart-tip" hidden></div></div>';
  }

  A.page('/', function (el) {
    A.loading(el);
    return A.refreshCounts().then(function (d) {
      if (!d) throw new Error('Could not load the dashboard');
      var s = d.stats;
      var diff = s.revenue_prev_30d ? Math.round((s.revenue_30d - s.revenue_prev_30d) / s.revenue_prev_30d * 100) : null;
      var delta = diff === null ? '<span class="d muted">last 30 days</span>' :
        '<span class="d ' + (diff >= 0 ? 'up' : 'down') + '">' + (diff >= 0 ? '▲ ' : '▼ ') + Math.abs(diff) + '% vs previous 30 days</span>';

      var alerts = [];
      if (s.orders_pending) alerts.push(['#/orders?status=PENDING', s.orders_pending, 'orders waiting for payment check']);
      if (s.products_pending) alerts.push(['#/review', s.products_pending, 'products waiting for review']);
      if (s.sellers_pending) alerts.push(['#/sellers', s.sellers_pending, 'seller applications']);
      if (s.withdrawals_pending) alerts.push(['#/withdrawals', s.withdrawals_pending, 'withdrawal requests']);
      if (s.untagged_products) alerts.push(['#/products?untagged=1', s.untagged_products, 'products without tags (not in any category)']);

      var maxCat = Math.max.apply(null, d.category_revenue.map(function (c) { return c.revenue; }).concat([1]));
      el.innerHTML = A.head('Dashboard', 'Welcome back, ' + h(A.user.name) + '.', '<a class="btn btn-sm btn-primary" href="#/products/new">+ Add product</a>') +
        (alerts.length ? '<div class="alerts">' + alerts.map(function (a) { return '<a class="alert" href="' + a[0] + '"><b>' + a[1] + '</b>' + h(a[2]) + ' →</a>'; }).join('') + '</div>' : '') +
        '<div class="grid g-4" style="margin-bottom:16px">' +
          stat('Revenue (30 days)', A.money(s.revenue_30d), ICON.rev, delta, '#/orders') +
          stat('Paid orders (30 days)', s.orders_30d, ICON.ord, '<span class="d muted">' + s.orders_pending + ' pending check</span>', '#/orders') +
          stat('Live products', s.products_live, ICON.prod, '<span class="d muted">' + s.products_pending + ' awaiting review</span>', '#/products') +
          stat('Users', s.users_total, ICON.user, '<span class="d up">+' + s.users_30d + ' this month</span>', '#/users') +
        '</div>' +
        '<div class="grid g-main" style="margin-bottom:16px">' +
          '<div class="panel"><div class="panel-head"><h3>Revenue — last 30 days</h3><span class="muted small">Total all time: ' + A.money(s.revenue_total) + '</span></div><div class="panel-pad">' + chart(d.chart) + '</div></div>' +
          '<div class="panel"><div class="panel-head"><h3>Revenue by category</h3></div><div class="panel-pad hbar">' +
            (d.category_revenue.length ? d.category_revenue.slice(0, 7).map(function (c) {
              return '<div class="hbar-row"><span>' + h(c.name) + '</span><span class="track"><span class="fill" style="width:' + (c.revenue / maxCat * 100).toFixed(1) + '%"></span></span><span class="num">' + A.money(c.revenue) + '</span></div>';
            }).join('') : '<p class="muted small">No sales yet.</p>') +
          '</div></div>' +
        '</div>' +
        '<div class="grid g-2">' +
          '<div class="panel"><div class="panel-head"><h3>Top products</h3><a class="link small" href="#/products?sort=sales">All →</a></div><div class="list">' +
            (d.top_products.length ? d.top_products.map(function (p, i) {
              return '<a class="list-item" href="#/products/' + h(p.id) + '"><b class="muted">#' + (i + 1) + '</b><span class="grow">' + h(p.title) + '<span class="cell-sub">' + p.sales + ' sales</span></span><b>' + A.money(p.revenue) + '</b></a>';
            }).join('') : '<p class="muted small panel-pad">No sales yet.</p>') +
          '</div></div>' +
          '<div class="panel"><div class="panel-head"><h3>Recent orders</h3><a class="link small" href="#/orders">All →</a></div><div class="list">' +
            (d.recent_orders.length ? d.recent_orders.map(function (o) {
              return '<a class="list-item" href="#/orders?id=' + h(o.id) + '"><span class="grow">' + h(o.customer) + '<span class="cell-sub">' + A.ago(o.created_at) + ' · ' + h(o.payment_method || '') + '</span></span>' + A.badge(o.status) + '<b>' + A.money(o.total_amount) + '</b></a>';
            }).join('') : '<p class="muted small panel-pad">No orders yet.</p>') +
          '</div></div>' +
        '</div>';

      // chart tooltip
      var svg = el.querySelector('.chart'), tip = el.querySelector('.chart-tip');
      svg.addEventListener('mousemove', function (e) {
        var g = e.target.closest('g[data-i]');
        if (!g) { tip.hidden = true; return; }
        var p = d.chart[+g.dataset.i], r = svg.getBoundingClientRect(), dot = g.querySelector('.dot').getBoundingClientRect();
        tip.hidden = false;
        tip.style.left = (dot.left - r.left + dot.width / 2) + 'px';
        tip.style.top = (dot.top - r.top) + 'px';
        tip.innerHTML = '<b>' + A.money(p.revenue) + '</b> · ' + p.orders + ' orders<br><span class="muted">' + h(p.date) + '</span>';
      });
      svg.addEventListener('mouseleave', function () { tip.hidden = true; });
    });
  });
})();
