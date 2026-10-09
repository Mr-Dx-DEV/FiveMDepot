/* FiveMDepot — Pricing page: localized prices via Paddle.PricePreview, overlay checkout via Paddle.Checkout.open.
 * Prices shown are Paddle's formattedTotals as-is: no math or re-formatting here. */
(function () {
  'use strict';
  var S = window.Store, esc = S.esc;
  var TIERS = window.PRICING_TIERS;
  var box = document.getElementById('pricing');
  var ROOT = (document.currentScript && document.currentScript.src || location.href).replace(/js\/pricing\.js.*$/, '');

  var state = { frequency: 'month', prices: {}, loading: true, error: '', paddle: null, config: null };

  function lineItems() {
    var items = [];
    TIERS.forEach(function (t) {
      items.push({ priceId: t.priceId.month, quantity: 1 }, { priceId: t.priceId.year, quantity: 1 });
    });
    return items;
  }

  // country null => no address: Paddle detects the visitor's location from their IP
  function fetchPrices(paddle, country) {
    var params = { items: lineItems() };
    if (country) params.address = { countryCode: country };
    return paddle.PricePreview(params).then(function (res) {
      var map = {};
      res.data.details.lineItems.forEach(function (li) { map[li.price.id] = li.formattedTotals.total; });
      return map;
    });
  }

  function subscribe(tier) {
    var email = state.config.email;
    state.paddle.Checkout.open({
      items: [{ priceId: tier.priceId[state.frequency], quantity: 1 }],
      customer: email ? { email: email } : undefined,
      settings: {
        displayMode: 'overlay',
        variant: 'one-page',
        theme: document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark',
        allowLogout: !email,
        successUrl: ROOT + 'welcome'
      }
    });
  }

  function render() {
    var f = state.frequency;
    var toggle = '<div class="pr-toggle" role="radiogroup" aria-label="Billing frequency">' +
      [['month', 'Monthly'], ['year', 'Yearly']].map(function (o) {
        return '<button type="button" role="radio" data-freq="' + o[0] + '" aria-checked="' + (f === o[0]) + '">' + o[1] + '</button>';
      }).join('') + '</div>';

    var cards = TIERS.map(function (t, i) {
      var price = state.prices[t.priceId[f]];
      var ready = !state.loading && price && state.paddle;
      return '<article class="panel pr-card' + (t.featured ? ' is-featured' : '') + '">' +
        (t.featured ? '<span class="pr-badge">Most popular</span>' : '') +
        '<h2 class="pr-name">' + esc(t.name) + '</h2>' +
        '<p class="muted pr-desc">' + esc(t.description) + '</p>' +
        '<p class="pr-price" aria-live="polite">' +
          (ready ? '<span class="pr-amount" data-price-id="' + esc(t.priceId[f]) + '">' + esc(price) + '</span>'
                 : '<span class="skeleton pr-amount-skel"></span>') +
          '<span class="muted">/' + f + '</span></p>' +
        '<ul class="pr-features">' + t.features.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' +
        '<button type="button" class="btn btn-primary btn-lg btn-block" data-tier="' + i + '"' + (ready ? '' : ' disabled') + '>Subscribe</button>' +
      '</article>';
    }).join('');

    box.innerHTML = '<header class="pr-head"><h1 class="section-title">Plans and pricing</h1>' +
      '<p class="muted">Every plan starts with a ' + window.PRICING_TRIAL_DAYS + '-day free trial. Cancel anytime.</p>' + toggle + '</header>' +
      (state.error ? '<div class="notice bad" role="alert">' + esc(state.error) + '</div>' : '') +
      '<div class="pr-grid">' + cards + '</div>' +
      '<p class="pay-secure">🔒 Our order process is conducted by our online reseller <b>Paddle.com</b>. Paddle.com is the Merchant of Record for all our orders and handles order inquiries and returns.</p>';
  }

  box.addEventListener('click', function (e) {
    var freq = e.target.closest('[data-freq]');
    if (freq) { state.frequency = freq.getAttribute('data-freq'); render(); return; }
    var btn = e.target.closest('[data-tier]');
    if (btn && !btn.disabled) subscribe(TIERS[+btn.getAttribute('data-tier')]);
  });

  render();
  S.v1('GET', 'pricing/config')
    .then(function (config) {
      state.config = config;
      return S.loadPaddle(config);
    })
    .then(function (paddle) {
      state.paddle = paddle;
      return fetchPrices(paddle, state.config.country);
    })
    .then(function (prices) { state.prices = prices; })
    .catch(function (err) {
      console.error('[pricing]', err);
      state.error = 'Prices could not be loaded right now. Please refresh the page or try again later.';
    })
    .then(function () { state.loading = false; render(); });
})();
