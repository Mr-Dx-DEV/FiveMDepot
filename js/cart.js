/* FiveMDepot — Cart (prices always re-checked by the server) */
(function () {
  'use strict';
  var S = window.Store, esc = S.esc;
  var box = document.getElementById('cart');
  var PROMO_KEY = 'fivemdepot-promo';
  var promo = '';
  try { promo = localStorage.getItem(PROMO_KEY) || ''; } catch (e) {}

  function savePromo(v) { promo = v; try { v ? localStorage.setItem(PROMO_KEY, v) : localStorage.removeItem(PROMO_KEY); } catch (e) {} }

  function empty() {
    box.innerHTML = '<div class="empty"><b>Your cart is empty</b>Find scripts, maps, vehicles and server packs for your server.<br><br>' +
      '<a class="btn btn-primary" href="category.html?c=all">Browse the store</a></div>';
  }

  function load(promoError) {
    var ids = S.cart.items().map(function (i) { return i.id; });
    if (!ids.length) { empty(); return; }
    S.v1('POST', 'checkout/quote', { ids: ids, promo_code: promo }).then(function (q) {
      // Drop items that no longer exist / are unpublished
      var live = q.items.map(function (i) { return i.id; });
      var gone = S.cart.items().filter(function (i) { return live.indexOf(i.id) === -1; });
      gone.forEach(function (g) { S.cart.remove(g.id); });
      if (gone.length) S.toast(gone.length + ' item(s) are no longer available and were removed', 'error');
      if (!q.items.length) { empty(); return; }
      draw(q, promoError);
    }).catch(function (e) {
      if (e.fields && e.fields.promo_code) { var bad = promo; savePromo(''); load(e.fields.promo_code + ' (' + bad + ')'); return; }
      box.innerHTML = '<div class="empty"><b>Could not load your cart</b>' + esc(e.message) + '</div>';
    });
  }

  function draw(q, promoError) {
    var owned = q.items.filter(function (i) { return i.owned; });
    box.innerHTML = '<div class="cart-grid"><div class="panel">' + q.items.map(function (i) {
      return '<div class="cart-line"><a href="' + S.productUrl(i.slug) + '"><img src="' + esc(i.image || S.catArt({ slug: 'box' })) + '" alt="" data-fallback="images/store/cat-default.svg"></a>' +
        '<div><h3><a href="' + S.productUrl(i.slug) + '">' + esc(i.title) + '</a></h3>' +
        (i.owned ? '<span class="small up">✓ You already own this — it won’t be charged</span>' : '<span class="small muted">Instant download · lifetime updates</span>') +
        '<br><button class="rm" data-rm="' + esc(i.id) + '">Remove</button></div>' +
        '<b style="font-size:17px">' + (i.owned ? '<s class="muted">' + S.money(i.price) + '</s>' : i.price === 0 ? '<span class="up">Free</span>' : S.money(i.price)) + '</b></div>';
    }).join('') + '</div>' +
    '<aside class="panel panel-pad summary"><h2 style="font-size:18px;margin-bottom:12px">Order summary</h2>' +
      '<div class="sum-row"><span>Subtotal</span><span>' + S.money(q.subtotal) + '</span></div>' +
      (q.discount ? '<div class="sum-row up"><span>Promo ' + esc(q.promo.code) + '</span><span>−' + S.money(q.discount) + '</span></div>' : '') +
      '<div class="sum-row total"><span>Total</span><span>' + S.money(q.total) + '</span></div>' +
      (q.promo
        ? '<p class="small up" style="margin:12px 0">✓ Code ' + esc(q.promo.code) + ' applied · <button class="link-more" data-unpromo>remove</button></p>'
        : '<form class="promo-row" id="promoForm"><input class="input" name="code" placeholder="Promo code" maxlength="50" aria-label="Promo code"><button class="btn btn-ghost" type="submit">Apply</button></form>' +
          (promoError ? '<p class="small down" style="margin:-6px 0 12px">' + esc(promoError) + '</p>' : '')) +
      (owned.length === q.items.length
        ? '<p class="small muted">You already own everything here. <a class="link-more" href="dashboard/buyer.html">Go to your library →</a></p>'
        : '<a class="btn btn-primary btn-lg btn-block" href="checkout.html">' + (q.total === 0 ? 'Get it free' : 'Checkout') + '</a>') +
      '<p class="small muted" style="text-align:center;margin-top:12px">Card, PayPal, Apple Pay &amp; Google Pay · secure checkout by Paddle</p></aside></div>';
  }

  box.addEventListener('click', function (e) {
    var rm = e.target.closest('[data-rm]');
    if (rm) { S.cart.remove(rm.dataset.rm); load(); }
    if (e.target.closest('[data-unpromo]')) { savePromo(''); load(); }
  });
  box.addEventListener('submit', function (e) {
    if (e.target.id !== 'promoForm') return;
    e.preventDefault();
    var code = e.target.code.value.trim().toUpperCase();
    if (!code) return;
    savePromo(code);
    load();
  });
  window.addEventListener('storage', function (e) { if (e.key === 'fivemdepot-cart') load(); });
  load();
})();
