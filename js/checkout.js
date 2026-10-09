/* FiveMDepot — Checkout: Paddle overlay checkout (Paddle is the Merchant of Record) and free orders */
(function () {
  'use strict';
  var S = window.Store, esc = S.esc;
  var box = document.getElementById('checkout');
  var params = new URLSearchParams(location.search);
  var promo = '';
  try { promo = localStorage.getItem('fivemdepot-promo') || ''; } catch (e) {}
  var quote = null;
  var DOC = 'documentation.html?type=doc&slug=';

  function steps(n) {
    return '<div class="steps">' + ['Cart', 'Payment', 'Done'].map(function (s, i) {
      return '<span class="' + (i <= n ? 'on' : '') + '"><b>' + (i + 1) + '</b>' + s + '</span>';
    }).join('<span class="muted">—</span>') + '</div>';
  }

  function render() {
    var free = quote.total === 0;
    var ready = free || quote.methods.length > 0;
    var buyable = quote.items.filter(function (i) { return !i.owned; });
    box.innerHTML = steps(1) + '<div class="cart-grid"><form class="panel panel-pad" id="payForm" novalidate>' +
      (free
        ? '<h2 style="font-size:20px;margin-bottom:8px">Free order</h2><p class="muted" style="margin-bottom:18px">Nothing to pay — confirm to add these to your library.</p>'
        : !ready
          ? '<div class="notice bad">Checkout is not available right now. Please contact us at <a href="mailto:' + esc(quote.support.email) + '">' + esc(quote.support.email) + '</a>.</div>'
          : '<h2 style="font-size:20px;margin-bottom:10px">Payment</h2>' +
            '<div class="pay-info pay-online"><span>Pay <b>' + S.money(quote.total) + ' USD</b> with card, PayPal, Apple Pay or Google Pay in Paddle’s secure checkout.</span>' +
            '<span class="small muted">Sales tax or VAT is added where your country requires it. Your download unlocks automatically as soon as the payment is confirmed.</span></div>') +
      '<div class="form-msg notice bad" hidden></div>' +
      '<button class="btn btn-primary btn-lg btn-block" type="submit"' + (ready ? '' : ' disabled') + '>' + (free ? 'Get it free' : 'Continue to secure payment · ' + S.money(quote.total)) + '</button>' +
      (free ? '' : '<p class="pay-secure">🔒 Our order process is conducted by our online reseller <b>Paddle.com</b>. Paddle.com is the Merchant of Record for all our orders and handles order inquiries and returns.</p>') +
      '<p class="pay-secure">By continuing you agree to our <a href="' + DOC + 'terms">Terms</a>, <a href="' + DOC + 'privacy">Privacy Policy</a> and <a href="' + DOC + 'refunds">Refund Policy</a>.</p></form>' +
      '<aside class="panel panel-pad summary"><h2 style="font-size:18px;margin-bottom:12px">' + buyable.length + ' item' + (buyable.length === 1 ? '' : 's') + '</h2>' +
        buyable.map(function (i) {
          return '<div class="sum-row"><span>' + esc(i.title) + '</span><span>' + (i.price ? S.money(i.price) : 'Free') +
            (i.original > i.price ? ' <s class="muted small">' + S.money(i.original) + '</s>' : '') + '</span></div>';
        }).join('') +
        (quote.discount ? '<div class="sum-row up"><span>Promo ' + esc(quote.promo.code) + '</span><span>−' + S.money(quote.discount) + '</span></div>' : '') +
        '<div class="sum-row total"><span>Total</span><span>' + S.money(quote.total) + ' USD</span></div>' +
        (free ? '' : '<p class="small muted" style="margin-top:8px">Plus tax where applicable, shown in checkout.</p>') +
        '<a class="small link-more" href="cart.html" style="margin-top:10px">← Edit cart</a></aside></div>';
  }

  function showError(form, msg) {
    var m = form.querySelector('.form-msg'); m.textContent = msg; m.hidden = false;
  }

  function done(orderId) {
    S.cart.clear();
    try { localStorage.removeItem('fivemdepot-promo'); } catch (x) {}
    box.innerHTML = steps(2) + '<div class="success panel panel-pad"><div class="ok-ico">✓</div>' +
      '<h1 class="section-title">Payment received — thank you!</h1><p class="muted" style="margin:10px 0 22px">Order <b class="mono">#' + esc(String(orderId).slice(0, 8).toUpperCase()) +
      '</b> is in your library and ready to download. Paddle has emailed you a receipt.</p>' +
      '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><a class="btn btn-primary" href="dashboard/buyer.html">⬇ Go to my downloads</a>' +
      '<a class="btn btn-ghost" href="category.html?c=all">Keep shopping</a></div></div>';
    window.scrollTo(0, 0);
  }

  // ---------- Back from Paddle (successUrl) or opened from My account ----------
  function afterPayment(orderId) {
    box.innerHTML = steps(1) + '<div class="success panel panel-pad"><div class="spin-lg"></div><h1 class="section-title">Confirming your payment…</h1>' +
      '<p class="muted" style="margin-top:10px">This usually takes a few seconds.</p></div>';
    var tries = 0;
    (function poll() {
      S.v1('GET', 'account/orders/' + encodeURIComponent(orderId)).then(function (o) {
        if (o.status === 'VERIFIED' || o.status === 'COMPLETED') { done(orderId); return; }
        if (o.status === 'AWAITING_PAYMENT' && params.get('paid') && ++tries < 30) { setTimeout(poll, 2000); return; }
        if (o.status === 'AWAITING_PAYMENT') {
          box.innerHTML = steps(1) + '<div class="success panel panel-pad"><div class="ok-ico" style="background:rgba(251,191,36,.15);color:#f59e0b">!</div>' +
            '<h1 class="section-title">' + (params.get('paid') ? 'Waiting for confirmation' : 'Payment not completed') + '</h1>' +
            '<p class="muted" style="margin:10px 0 22px">' + (params.get('paid')
              ? 'Your payment hasn’t been confirmed yet. It will unlock in your library automatically — you can safely close this page.'
              : 'Your order is saved and nothing was charged. You can pay now.') + '</p>' +
            '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">' +
              '<button class="btn btn-primary" data-repay>Pay now</button>' +
              '<a class="btn btn-ghost" href="dashboard/buyer.html?tab=orders">My orders</a></div></div>';
          return;
        }
        box.innerHTML = '<div class="empty"><b>Order ' + esc(o.status.toLowerCase()) + '</b>' + esc(o.admin_note || '') + ' <a class="link-more" href="dashboard/buyer.html?tab=orders">My orders →</a></div>';
      }).catch(function (e) { box.innerHTML = '<div class="empty"><b>Could not check the order</b>' + esc(e.message) + '</div>'; });
    })();
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-repay]');
      if (!b) return;
      b.disabled = true;
      S.v1('POST', 'account/orders/' + encodeURIComponent(orderId) + '/pay', {}).then(function (r) {
        return S.paddleCheckout(r.paddle, function () { b.disabled = false; });
      }).catch(function (err) { S.toast(err.message, 'error'); b.disabled = false; });
    });
  }

  box.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target, btn = f.querySelector('[type=submit]'), label = btn.textContent;
    btn.disabled = true; btn.textContent = quote.total > 0 ? 'Opening secure checkout…' : 'Submitting…';
    var ids = quote.items.filter(function (i) { return !i.owned; }).map(function (i) { return i.id; });
    S.v1('POST', 'checkout/order', { ids: ids, promo_code: promo }).then(function (r) {
      if (!r.paddle) { done(r.order_id); return; }
      // The order now exists: retrying uses "Pay now" so the same Paddle transaction is reused
      history.replaceState(null, '', 'checkout.html?order=' + encodeURIComponent(r.order_id));
      return S.paddleCheckout(r.paddle, function () { afterPayment(r.order_id); });
    }).catch(function (err) {
      showError(f, err.message);
      btn.disabled = false; btn.textContent = label;
    });
  });

  // ---------- Start ----------
  S.me().then(function (user) {
    if (!user) { location.replace(S.loginUrl('checkout.html' + location.search)); return; }
    if (params.get('order')) { afterPayment(params.get('order')); return; }
    var ids = S.cart.items().map(function (i) { return i.id; });
    if (!ids.length) { box.innerHTML = '<div class="empty"><b>Your cart is empty</b><a class="link-more" href="category.html?c=all">Browse the store →</a></div>'; return; }
    return S.v1('POST', 'checkout/quote', { ids: ids, promo_code: promo }).then(function (q) {
      quote = q;
      if (!q.items.filter(function (i) { return !i.owned; }).length) {
        box.innerHTML = '<div class="empty"><b>You already own everything in your cart</b><a class="link-more" href="dashboard/buyer.html">Go to your library →</a></div>';
        S.cart.clear();
        return;
      }
      render();
    });
  }).catch(function (e) {
    if (e.fields && e.fields.promo_code) {
      try { localStorage.removeItem('fivemdepot-promo'); } catch (x) {}
      S.toast(e.fields.promo_code + ' — removed', 'error');
      setTimeout(function () { location.reload(); }, 1200);
      return;
    }
    box.innerHTML = '<div class="empty"><b>Could not load checkout</b>' + esc(e.message) + ' <a class="link-more" href="cart.html">Back to cart</a></div>';
  });
})();
