/* FiveMDepot — Pricing page: plans from the server (edit them in core/plans.php), Lemon Squeezy overlay checkout.
 * The checkout is created by the server for the chosen plan and the signed-in account; prices shown are the
 * plan prices in USD — Lemon Squeezy adds tax where required and shows the final amount before payment. */
(function () {
  'use strict';
  var S = window.Store, esc = S.esc;
  var box = document.getElementById('pricing');

  var state = { frequency: 'month', loading: true, busy: false, error: '', config: null };

  function tiers() { return (state.config && state.config.tiers) || []; }

  function money(n) {
    return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
  }

  function subscribe(tier, btn) {
    if (!state.config.signed_in) { location.href = S.loginUrl('pricing'); return; }
    state.busy = true; btn.disabled = true;
    S.v1('POST', 'pricing/checkout', { plan: tier.key, interval: state.frequency })
      .then(function (r) { return S.openCheckout(r); })
      .catch(function (e) { S.toast(e.message, 'error'); })
      .then(function () { state.busy = false; btn.disabled = false; });
  }

  function render() {
    var f = state.frequency;
    var trial = state.config ? state.config.trial_days : null;
    var ready = state.config && state.config.ready && !state.loading;
    var toggle = '<div class="pr-toggle" role="radiogroup" aria-label="Billing frequency">' +
      [['month', 'Monthly'], ['year', 'Yearly']].map(function (o) {
        return '<button type="button" role="radio" data-freq="' + o[0] + '" aria-checked="' + (f === o[0]) + '">' + o[1] + '</button>';
      }).join('') + '</div>';

    var cards = !tiers().length && !state.error
      ? [0, 1, 2].map(function () { return '<div class="panel pr-card skeleton" style="height:360px"></div>'; }).join('')
      : tiers().map(function (t, i) {
        return '<article class="panel pr-card' + (t.featured ? ' is-featured' : '') + '">' +
          (t.featured ? '<span class="pr-badge">Most popular</span>' : '') +
          '<h2 class="pr-name">' + esc(t.name) + '</h2>' +
          '<p class="muted pr-desc">' + esc(t.description) + '</p>' +
          '<p class="pr-price"><span class="pr-amount">' + esc(money(t.price[f])) + '</span><span class="muted">/' + f + '</span></p>' +
          '<ul class="pr-features">' + t.features.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' +
          '<button type="button" class="btn btn-primary btn-lg btn-block" data-tier="' + i + '"' + (ready && !state.busy ? '' : ' disabled') + '>' +
            (state.config && !state.config.ready && !state.loading ? 'Coming soon' : 'Subscribe') + '</button>' +
        '</article>';
      }).join('');

    box.innerHTML = '<header class="pr-head"><h1 class="section-title">Plans and pricing</h1>' +
      '<p class="muted">Unlimited downloads from the store while you’re subscribed' + (trial ? ' — every plan starts with a ' + trial + '-day free trial' : '') + '. Cancel anytime.</p>' + toggle + '</header>' +
      (state.error ? '<div class="notice bad" role="alert">' + esc(state.error) + '</div>' : '') +
      '<div class="pr-grid">' + cards + '</div>' +
      '<p class="pay-secure">🔒 Prices in USD; tax is added at checkout where required. Our order process is conducted by <b>Lemon Squeezy</b>, the Merchant of Record for all our orders. ' +
      'See our <a href="refunds">Refund &amp; Cancellation Policy</a>.</p>';
  }

  box.addEventListener('click', function (e) {
    var freq = e.target.closest('[data-freq]');
    if (freq) { state.frequency = freq.getAttribute('data-freq'); render(); return; }
    var btn = e.target.closest('[data-tier]');
    if (btn && !btn.disabled) subscribe(tiers()[+btn.getAttribute('data-tier')], btn);
  });

  render();
  S.v1('GET', 'pricing/config')
    .then(function (config) { state.config = config; })
    .catch(function (err) {
      console.error('[pricing]', err);
      state.error = 'Plans could not be loaded right now. Please refresh the page or try again later.';
    })
    .then(function () { state.loading = false; render(); });
})();
