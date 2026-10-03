/* FiveMDepot — Checkout: manual payment (bKash / Nagad / bank) + proof upload */
(function () {
  'use strict';
  var S = window.Store, esc = S.esc;
  var box = document.getElementById('checkout');
  var promo = '';
  try { promo = localStorage.getItem('fivemdepot-promo') || ''; } catch (e) {}
  var quote = null, proofFile = null;

  var METHODS = [
    { id: 'BKASH', name: 'bKash', key: 'bkash', how: 'Send Money to this bKash number' },
    { id: 'NAGAD', name: 'Nagad', key: 'nagad', how: 'Send Money to this Nagad number' },
    { id: 'BANK_TRANSFER', name: 'Bank', key: 'bank_account', how: 'Transfer to this bank account' }
  ];

  function steps(n) {
    return '<div class="steps">' + ['Cart', 'Payment', 'Done'].map(function (s, i) {
      return '<span class="' + (i <= n ? 'on' : '') + '"><b>' + (i + 1) + '</b>' + s + '</span>';
    }).join('<span class="muted">—</span>') + '</div>';
  }

  function payInfo(method) {
    var m = METHODS.filter(function (x) { return x.id === method; })[0];
    var p = quote.payment, num = p[m.key];
    if (!num) return '<div class="pay-info"><span class="down">This payment method isn’t set up yet. Please choose another one or contact support.</span></div>';
    return '<div class="pay-info"><span>' + m.how + ':</span><span class="num">' + esc(num) +
      ' <button type="button" class="copy-btn" data-copy="' + esc(num) + '">Copy</button></span>' +
      (method === 'BANK_TRANSFER' ? '<span class="small muted">' + esc(p.bank_name) + (p.bank_branch ? ' · ' + esc(p.bank_branch) : '') + '</span>' : '') +
      '<span>Amount: <b>' + S.money(quote.total) + '</b> (send the exact amount)</span>' +
      '<span class="small muted">Then enter the transaction ID and upload a screenshot below. We verify payments quickly — you’ll be able to download as soon as it’s approved.</span></div>';
  }

  function render() {
    var free = quote.total === 0;
    var buyable = quote.items.filter(function (i) { return !i.owned; });
    box.innerHTML = steps(1) + '<div class="cart-grid"><form class="panel panel-pad" id="payForm" novalidate>' +
      (free
        ? '<h2 style="font-size:20px;margin-bottom:8px">Free order</h2><p class="muted" style="margin-bottom:18px">Nothing to pay — confirm to add these to your library.</p>'
        : '<h2 style="font-size:20px;margin-bottom:14px">Payment method</h2>' +
          '<div class="pay-methods" role="radiogroup">' + METHODS.map(function (m, i) {
            return '<label class="pay-opt"><input type="radio" name="payment_method" value="' + m.id + '"' + (i === 0 ? ' checked' : '') + '><span>' + m.name + '<small>' + (quote.payment[m.key] ? 'Manual transfer' : 'Not available') + '</small></span></label>';
          }).join('') + '</div><div id="payInfo">' + payInfo('BKASH') + '</div>' +
          '<div class="row-2" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
            '<label class="field"><span>Transaction ID</span><input class="input" name="transaction_id" maxlength="100" required placeholder="e.g. 9JK2XXXXXX" autocomplete="off"></label>' +
            '<label class="field"><span>Your number / account <small class="muted" style="font-weight:400">optional</small></span><input class="input" name="sender_number" maxlength="50" placeholder="01XXXXXXXXX"></label></div>' +
          '<div class="field"><span>Payment screenshot</span><label class="proof-drop" id="proofDrop" tabindex="0"><input type="file" name="proof" accept="image/png,image/jpeg,image/webp" hidden>' +
            '<span id="proofLabel"><b class="text-accent">Click to upload</b> or drop the screenshot here · PNG/JPG up to 5 MB</span></label></div>') +
      '<div class="form-msg notice bad" hidden></div>' +
      '<button class="btn btn-primary btn-lg btn-block" type="submit">' + (free ? 'Get it free' : 'Submit payment · ' + S.money(quote.total)) + '</button>' +
      '<p class="small muted" style="text-align:center;margin-top:12px">By placing the order you agree to our terms and refund policy.</p></form>' +
      '<aside class="panel panel-pad summary"><h2 style="font-size:18px;margin-bottom:12px">' + buyable.length + ' item' + (buyable.length === 1 ? '' : 's') + '</h2>' +
        buyable.map(function (i) { return '<div class="sum-row"><span>' + esc(i.title) + '</span><span>' + (i.price ? S.money(i.price) : 'Free') + '</span></div>'; }).join('') +
        (quote.discount ? '<div class="sum-row up"><span>Promo ' + esc(quote.promo.code) + '</span><span>−' + S.money(quote.discount) + '</span></div>' : '') +
        '<div class="sum-row total"><span>Total</span><span>' + S.money(quote.total) + '</span></div>' +
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
    var url = URL.createObjectURL(f);
    document.getElementById('proofLabel').innerHTML = '<img src="' + url + '" alt="Payment screenshot preview">' + esc(f.name) + ' · <b class="text-accent">change</b>';
  }

  box.addEventListener('change', function (e) {
    if (e.target.name === 'payment_method') document.getElementById('payInfo').innerHTML = payInfo(e.target.value);
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
    var fd = new FormData();
    fd.append('ids', JSON.stringify(quote.items.filter(function (i) { return !i.owned; }).map(function (i) { return i.id; })));
    if (promo) fd.append('promo_code', promo);
    if (quote.total > 0) {
      fd.append('payment_method', f.payment_method.value);
      fd.append('transaction_id', f.transaction_id.value.trim());
      fd.append('sender_number', f.sender_number.value.trim());
      if (proofFile) fd.append('proof', proofFile);
      var missing = {};
      if (f.transaction_id.value.trim().length < 4) missing.transaction_id = 'Enter the transaction ID';
      if (!proofFile) missing.proof = 'Upload a screenshot of your payment';
      if (Object.keys(missing).length) { showErrors(f, 'Please complete the payment details.', missing); return; }
    }
    btn.disabled = true; btn.textContent = 'Submitting…';
    S.v1('POST', 'checkout/order', fd).then(function (r) {
      S.cart.clear();
      try { localStorage.removeItem('fivemdepot-promo'); } catch (x) {}
      box.innerHTML = steps(2) + '<div class="success panel panel-pad"><div class="ok-ico">✓</div>' +
        (r.status === 'VERIFIED'
          ? '<h1 class="section-title">You’re all set!</h1><p class="muted" style="margin:10px 0 22px">Your items are in your library and ready to download.</p>'
          : '<h1 class="section-title">Payment submitted</h1><p class="muted" style="margin:10px 0 22px">Order <b class="mono">' + esc(r.order_id.slice(0, 8)) + '</b> is waiting for a quick payment check. You can download as soon as it’s approved — we’ll show it in your account.</p>') +
        '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><a class="btn btn-primary" href="dashboard/buyer.html' + (r.status === 'VERIFIED' ? '' : '?tab=orders') + '">' + (r.status === 'VERIFIED' ? 'Go to my library' : 'View my orders') + '</a>' +
        '<a class="btn btn-ghost" href="category.html?c=all">Keep shopping</a></div></div>';
      window.scrollTo(0, 0);
    }).catch(function (err) {
      showErrors(f, err.message, err.fields);
      btn.disabled = false; btn.textContent = quote.total === 0 ? 'Get it free' : 'Submit payment · ' + S.money(quote.total);
    });
  });

  S.me().then(function (user) {
    if (!user) { location.replace(S.loginUrl('checkout.html')); return; }
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
  }).catch(function (e) { box.innerHTML = '<div class="empty"><b>Could not load checkout</b>' + esc(e.message) + ' <a class="link-more" href="cart.html">Back to cart</a></div>'; });
})();
