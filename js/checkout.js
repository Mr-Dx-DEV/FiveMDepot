/* FiveMDepot — Checkout: online gateways (card / crypto / SSLCommerz) and manual transfer with proof */
(function () {
  'use strict';
  var S = window.Store, esc = S.esc;
  var box = document.getElementById('checkout');
  var params = new URLSearchParams(location.search);
  var promo = '';
  try { promo = localStorage.getItem('fivemdepot-promo') || ''; } catch (e) {}
  var quote = null, proofFile = null;

  var ICON = {
    STRIPE: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/></svg>',
    CRYPTO: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 8h4a2 2 0 0 1 0 4h-4m0 0h4.5a2 2 0 0 1 0 4H9.5M9.5 8v8M11 6v2m0 8v2"/></svg>',
    SSLCOMMERZ: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5z"/><path d="m9 12 2 2 4-4"/></svg>',
    MANUAL: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/></svg>'
  };
  var MANUAL_INFO = {
    BKASH: { key: 'bkash', how: 'Send Money to this bKash number' },
    NAGAD: { key: 'nagad', how: 'Send Money to this Nagad number' },
    BANK_TRANSFER: { key: 'bank_account', how: 'Transfer to this bank account' }
  };

  function steps(n) {
    return '<div class="steps">' + ['Cart', 'Payment', 'Done'].map(function (s, i) {
      return '<span class="' + (i <= n ? 'on' : '') + '"><b>' + (i + 1) + '</b>' + s + '</span>';
    }).join('<span class="muted">—</span>') + '</div>';
  }
  function method(id) { return quote.methods.filter(function (m) { return m.id === id; })[0]; }

  function details(id) {
    var m = method(id);
    if (!m) return '';
    if (m.type === 'online') {
      return '<div class="pay-info pay-online">' +
        '<span>You’ll pay <b>' + S.money(quote.total) + ' USD</b> on a secure ' + esc(m.name === 'Card' ? 'Stripe' : m.name) + ' page' +
        (id === 'CRYPTO' ? ' — choose your coin there (USDT, BTC, ETH…)' : '') + '.</span>' +
        '<span class="small muted">Your download unlocks automatically as soon as the payment is confirmed' + (id === 'CRYPTO' ? ' (usually a few minutes for crypto)' : '') + '.</span></div>';
    }
    var info = MANUAL_INFO[id], p = quote.payment, num = p[info.key];
    return '<div class="pay-info"><span>' + info.how + ':</span><span class="num">' + esc(num) +
      ' <button type="button" class="copy-btn" data-copy="' + esc(num) + '">Copy</button></span>' +
      (id === 'BANK_TRANSFER' ? '<span class="small muted">' + esc(p.bank_name) + (p.bank_branch ? ' · ' + esc(p.bank_branch) : '') + '</span>' : '') +
      '<span>Amount: <b>' + S.money(quote.total) + '</b> (send the exact amount)</span>' +
      '<span class="small muted">Then enter the transaction ID and upload a screenshot below. We check it quickly and unlock your download.</span></div>' +
      '<div class="manual-fields" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
        '<label class="field"><span>Transaction ID</span><input class="input" name="transaction_id" maxlength="100" placeholder="e.g. 9JK2XXXXXX" autocomplete="off"></label>' +
        '<label class="field"><span>Your number / account <small class="muted" style="font-weight:400">optional</small></span><input class="input" name="sender_number" maxlength="50"></label></div>' +
      '<div class="field"><span>Payment screenshot</span><label class="proof-drop" id="proofDrop" tabindex="0"><input type="file" name="proof" accept="image/png,image/jpeg,image/webp" hidden>' +
        '<span id="proofLabel"><b class="text-accent">Click to upload</b> or drop the screenshot here · PNG/JPG up to 5 MB</span></label></div>';
  }

  function buttonLabel(id) {
    var m = method(id);
    if (quote.total === 0) return 'Get it free';
    if (!m) return 'Choose a payment method';
    return m.type === 'online' ? 'Pay ' + S.money(quote.total) + ' with ' + m.name + ' →' : 'Submit payment · ' + S.money(quote.total);
  }

  function render() {
    var free = quote.total === 0;
    var buyable = quote.items.filter(function (i) { return !i.owned; });
    var online = quote.methods.filter(function (m) { return m.type === 'online'; });
    var manual = quote.methods.filter(function (m) { return m.type === 'manual'; });
    var first = quote.methods[0];
    var opt = function (m, i) {
      return '<label class="pay-opt"><input type="radio" name="payment_method" value="' + m.id + '"' + (first && m.id === first.id ? ' checked' : '') + '>' +
        '<span><i class="pay-ico">' + (ICON[m.id] || ICON.MANUAL) + '</i>' + esc(m.name) + '<small>' + esc(m.desc) + '</small></span></label>';
    };
    box.innerHTML = steps(1) + '<div class="cart-grid"><form class="panel panel-pad" id="payForm" novalidate>' +
      (free
        ? '<h2 style="font-size:20px;margin-bottom:8px">Free order</h2><p class="muted" style="margin-bottom:18px">Nothing to pay — confirm to add these to your library.</p>'
        : !quote.methods.length
          ? '<div class="notice bad">Payments are being set up. Please contact support on Discord to complete your order.</div>'
          : '<h2 style="font-size:20px;margin-bottom:14px">How would you like to pay?</h2>' +
            (online.length ? '<div class="pay-group"><span class="pay-label">Pay online · instant delivery</span><div class="pay-methods">' + online.map(opt).join('') + '</div></div>' : '') +
            (manual.length ? '<div class="pay-group"><span class="pay-label">Bangladesh · manual transfer</span><div class="pay-methods">' + manual.map(opt).join('') + '</div></div>' : '') +
            '<div id="payInfo">' + (first ? details(first.id) : '') + '</div>') +
      '<div class="form-msg notice bad" hidden></div>' +
      '<button class="btn btn-primary btn-lg btn-block" type="submit"' + (!free && !quote.methods.length ? ' disabled' : '') + '>' + buttonLabel(first && first.id) + '</button>' +
      '<p class="pay-secure">🔒 Secure payment · prices in USD · by paying you agree to our <a href="documentation.html?type=doc&slug=terms">terms</a> and <a href="documentation.html?type=doc&slug=refunds">refund policy</a></p></form>' +
      '<aside class="panel panel-pad summary"><h2 style="font-size:18px;margin-bottom:12px">' + buyable.length + ' item' + (buyable.length === 1 ? '' : 's') + '</h2>' +
        buyable.map(function (i) {
          return '<div class="sum-row"><span>' + esc(i.title) + '</span><span>' + (i.price ? S.money(i.price) : 'Free') +
            (i.original > i.price ? ' <s class="muted small">' + S.money(i.original) + '</s>' : '') + '</span></div>';
        }).join('') +
        (quote.discount ? '<div class="sum-row up"><span>Promo ' + esc(quote.promo.code) + '</span><span>−' + S.money(quote.discount) + '</span></div>' : '') +
        '<div class="sum-row total"><span>Total</span><span>' + S.money(quote.total) + ' USD</span></div>' +
        '<a class="small link-more" href="cart.html" style="margin-top:10px">← Edit cart</a></aside></div>';
    proofFile = null;
  }

  function showErrors(form, msg, fields) {
    form.querySelectorAll('.err').forEach(function (e) { e.remove(); });
    form.querySelectorAll('.bad').forEach(function (e) { e.classList.remove('bad'); });
    var m = form.querySelector('.form-msg'); m.textContent = msg; m.hidden = false;
    Object.keys(fields || {}).forEach(function (k) {
      var i = k === 'proof' ? form.querySelector('#proofDrop') : form.querySelector('[name="' + k + '"]');
      if (!i) return;
      i.classList.add('bad');
      var e = document.createElement('span'); e.className = 'err'; e.textContent = fields[k];
      (i.closest('.field') || i.parentNode).appendChild(e);
    });
  }

  function setProof(f) {
    if (!f) return;
    if (!/^image\/(png|jpe?g|webp)$/.test(f.type)) { S.toast('Upload a PNG, JPG or WEBP image', 'error'); return; }
    if (f.size > 5 * 1048576) { S.toast('Image is larger than 5 MB', 'error'); return; }
    proofFile = f;
    document.getElementById('proofLabel').innerHTML = '<img src="' + URL.createObjectURL(f) + '" alt="Payment screenshot preview">' + esc(f.name) + ' · <b class="text-accent">change</b>';
  }

  function done(status, orderId) {
    S.cart.clear();
    try { localStorage.removeItem('fivemdepot-promo'); } catch (x) {}
    box.innerHTML = steps(2) + '<div class="success panel panel-pad"><div class="ok-ico">✓</div>' +
      (status === 'VERIFIED'
        ? '<h1 class="section-title">Payment received — thank you!</h1><p class="muted" style="margin:10px 0 22px">Your items are in your library and ready to download.</p>'
        : '<h1 class="section-title">Payment submitted</h1><p class="muted" style="margin:10px 0 22px">Order <b class="mono">' + esc(String(orderId).slice(0, 8)) + '</b> is waiting for a quick payment check. You can download as soon as it’s approved.</p>') +
      '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><a class="btn btn-primary" href="dashboard/buyer.html' + (status === 'VERIFIED' ? '' : '?tab=orders') + '">' + (status === 'VERIFIED' ? '⬇ Go to my downloads' : 'View my orders') + '</a>' +
      '<a class="btn btn-ghost" href="category.html?c=all">Keep shopping</a></div></div>';
    window.scrollTo(0, 0);
  }

  // ---------- Returning from a gateway ----------
  function afterGateway(orderId) {
    var cancelled = params.get('cancelled') || params.get('failed');
    box.innerHTML = steps(1) + '<div class="success panel panel-pad"><div class="spin-lg"></div><h1 class="section-title">' + (cancelled ? 'Checking your order…' : 'Confirming your payment…') + '</h1>' +
      '<p class="muted" style="margin-top:10px">This usually takes a few seconds.</p></div>';
    var tries = 0;
    (function poll() {
      S.v1('GET', 'account/orders/' + encodeURIComponent(orderId)).then(function (o) {
        if (o.status === 'VERIFIED' || o.status === 'COMPLETED') { done('VERIFIED', orderId); return; }
        if (o.status === 'AWAITING_PAYMENT' && !cancelled && ++tries < 30) { setTimeout(poll, 2000); return; }
        if (o.status === 'AWAITING_PAYMENT') {
          box.innerHTML = steps(1) + '<div class="success panel panel-pad"><div class="ok-ico" style="background:rgba(251,191,36,.15);color:#f59e0b">!</div>' +
            '<h1 class="section-title">' + (cancelled ? 'Payment not completed' : 'Waiting for confirmation') + '</h1>' +
            '<p class="muted" style="margin:10px 0 22px">' + (cancelled
              ? 'Your order is saved — you can pay now or choose another method. Nothing was charged.'
              : 'Your payment hasn’t been confirmed yet (crypto can take a few more minutes). It will unlock in your library automatically.') + '</p>' +
            '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">' +
              '<button class="btn btn-primary" data-repay="' + esc(o.payment_method) + '">Pay now</button>' +
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
      S.v1('POST', 'account/orders/' + encodeURIComponent(orderId) + '/pay', {}).then(function (r) { location.href = r.redirect_url; })
        .catch(function (err) { S.toast(err.message, 'error'); b.disabled = false; });
    });
  }

  // ---------- Events ----------
  box.addEventListener('change', function (e) {
    if (e.target.name === 'payment_method') {
      document.getElementById('payInfo').innerHTML = details(e.target.value);
      box.querySelector('#payForm [type=submit]').textContent = buttonLabel(e.target.value);
      proofFile = null;
    }
    if (e.target.name === 'proof') setProof(e.target.files[0]);
  });
  box.addEventListener('click', function (e) {
    var c = e.target.closest('[data-copy]');
    if (c) { e.preventDefault(); navigator.clipboard && navigator.clipboard.writeText(c.dataset.copy).then(function () { S.toast('Copied', 'success'); }); }
  });
  box.addEventListener('dragover', function (e) { var d = e.target.closest('#proofDrop'); if (d) { e.preventDefault(); d.classList.add('over'); } });
  box.addEventListener('dragleave', function (e) { var d = e.target.closest('#proofDrop'); if (d) d.classList.remove('over'); });
  box.addEventListener('drop', function (e) { var d = e.target.closest('#proofDrop'); if (d) { e.preventDefault(); d.classList.remove('over'); setProof(e.dataTransfer.files[0]); } });
  box.addEventListener('keydown', function (e) { if (e.target.id === 'proofDrop' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.target.querySelector('input').click(); } });

  box.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target, btn = f.querySelector('[type=submit]');
    var chosen = f.payment_method ? (f.querySelector('[name=payment_method]:checked') || {}).value : null;
    var m = chosen && method(chosen);
    var fd = new FormData();
    fd.append('ids', JSON.stringify(quote.items.filter(function (i) { return !i.owned; }).map(function (i) { return i.id; })));
    if (promo) fd.append('promo_code', promo);
    if (quote.total > 0) {
      if (!m) { showErrors(f, 'Choose a payment method.'); return; }
      fd.append('payment_method', chosen);
      if (m.type === 'manual') {
        fd.append('transaction_id', f.transaction_id.value.trim());
        fd.append('sender_number', f.sender_number.value.trim());
        if (proofFile) fd.append('proof', proofFile);
        var missing = {};
        if (f.transaction_id.value.trim().length < 4) missing.transaction_id = 'Enter the transaction ID';
        if (!proofFile) missing.proof = 'Upload a screenshot of your payment';
        if (Object.keys(missing).length) { showErrors(f, 'Please complete the payment details.', missing); return; }
      }
    }
    var label = btn.textContent;
    btn.disabled = true; btn.textContent = m && m.type === 'online' ? 'Opening secure payment…' : 'Submitting…';
    S.v1('POST', 'checkout/order', fd).then(function (r) {
      if (r.redirect_url) {
        // keep the cart until the payment is confirmed; clear it when we come back paid
        location.href = r.redirect_url;
        return;
      }
      done(r.status, r.order_id);
    }).catch(function (err) {
      showErrors(f, err.message, err.fields);
      btn.disabled = false; btn.textContent = label;
    });
  });

  // ---------- Start ----------
  S.me().then(function (user) {
    if (!user) { location.replace(S.loginUrl('checkout.html' + location.search)); return; }
    if (params.get('order')) { afterGateway(params.get('order')); return; }
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
