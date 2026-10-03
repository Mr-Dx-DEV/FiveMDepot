/* FiveMDepot — animated "night city" background for the login page (no video needed).
   Canvas: parallax skyline with lit windows, perspective road with car light trails,
   neon ground grid, stars and rising embers. Follows the mouse a little.
   Usage: AuthScene.start(containerElement)  →  returns { stop() } */
(function () {
  'use strict';

  function rgbOf(el, varName, fallback) {
    var probe = document.createElement('i');
    probe.style.cssText = 'position:absolute;visibility:hidden;color:var(' + varName + ',' + fallback + ')';
    el.appendChild(probe);
    var m = getComputedStyle(probe).color.match(/\d+(\.\d+)?/g);
    probe.remove();
    return m ? [+m[0], +m[1], +m[2]] : [225, 29, 72];
  }
  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function rand(a, b) { return a + Math.random() * (b - a); }

  // One skyline layer drawn once to an offscreen canvas (tiles horizontally)
  function makeLayer(w, h, horizon, opt) {
    var c = document.createElement('canvas');
    c.width = Math.ceil(w); c.height = Math.ceil(horizon);
    var g = c.getContext('2d'), x = 0, windows = [], beacons = [];
    while (x < w) {
      var bw = rand(opt.minW, opt.maxW), bh = rand(opt.minH, opt.maxH) * horizon, top = horizon - bh;
      g.fillStyle = opt.body;
      g.fillRect(x, top, bw, bh);
      if (Math.random() < .25) { g.fillRect(x + bw * .4, top - bh * .08, Math.max(2, bw * .08), bh * .08); beacons.push([x + bw * .4 + Math.max(2, bw * .08) / 2, top - bh * .08, rand(0, 6.28)]); } // antenna + red beacon
      else if (opt.neon && Math.random() < .18) { g.fillStyle = opt.neon; g.fillRect(x + (Math.random() < .5 ? 2 : bw - 5), top + bh * .1, 3, bh * rand(.25, .6)); } // neon strip
      var cols = Math.floor(bw / opt.win), rows = Math.floor(bh / (opt.win * 1.4));
      for (var r = 1; r < rows; r++) for (var k = 0; k < cols; k++) {
        if (Math.random() > opt.lit) continue;
        var wx = x + k * opt.win + opt.win * .3, wy = top + r * opt.win * 1.4;
        var warm = Math.random() < .7;
        g.fillStyle = warm ? 'rgba(255,' + (190 + (Math.random() * 50 | 0)) + ',120,' + rand(.35, .9) + ')' : 'rgba(150,200,255,' + rand(.3, .8) + ')';
        g.fillRect(wx, wy, opt.win * .45, opt.win * .6);
        if (Math.random() < .04) windows.push([wx, wy, opt.win * .45, opt.win * .6, rand(0, 6.28), rand(.4, 1.6)]);
      }
      x += bw + rand(0, opt.gap);
    }
    return { canvas: c, w: c.width, blink: windows, beacons: beacons };
  }

  function start(box) {
    var canvas = document.createElement('canvas');
    canvas.className = 'auth-scene';
    canvas.setAttribute('aria-hidden', 'true');
    box.insertBefore(canvas, box.firstChild);
    var ctx = canvas.getContext('2d');
    var calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var accent = rgbOf(box, '--accent', '#e11d48');
    var W = 0, H = 0, HZ = 0, dpr = 1, layers = [], stars = [], cars = [], embers = [], t0 = performance.now(), last = t0, raf = 0, running = true;
    var mouse = { x: 0, y: 0, tx: 0, ty: 0 };

    function resize() {
      var r = box.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      W = Math.max(1, r.width); H = Math.max(1, r.height); HZ = H * .54;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      layers = [
        Object.assign(makeLayer(W * 1.6, H, HZ, { minW: 18, maxW: 46, minH: .12, maxH: .34, win: 5, lit: .25, gap: 4, body: '#0d1324' }), { speed: 3, par: 6 }),
        Object.assign(makeLayer(W * 1.6, H, HZ, { minW: 28, maxW: 70, minH: .18, maxH: .52, win: 7, lit: .3, gap: 10, body: '#090d19', neon: rgba(accent, .8) }), { speed: 7, par: 14 }),
        Object.assign(makeLayer(W * 1.6, H, HZ, { minW: 40, maxW: 110, minH: .1, maxH: .38, win: 9, lit: .22, gap: 30, body: '#05070f', neon: 'rgba(34,211,238,.75)' }), { speed: 13, par: 26 })
      ];
      stars = [];
      for (var i = 0; i < 140; i++) stars.push([Math.random() * W, Math.random() * HZ * .8, rand(.4, 1.4), rand(0, 6.28), rand(.5, 2)]);
      cars = [];
      for (var j = 0; j < 30; j++) cars.push(newCar(true));
      embers = [];
      for (var e = 0; e < 38; e++) embers.push(newEmber(true));
    }

    // Road: oncoming lanes (white headlights) on the left, outgoing lanes (red tail lights) on the right
    function newCar(spread) {
      var away = Math.random() < .5;
      return { lane: away ? (Math.random() < .5 ? 1.1 : 2.9) : (Math.random() < .5 ? -1.1 : -2.9), away: away,
               z: spread ? rand(1, 60) : (away ? 1 : 60), v: rand(7, 15) };
    }
    function newEmber(spread) {
      return { x: Math.random() * W, y: spread ? rand(HZ, H) : H + 10, v: rand(8, 26), drift: rand(-8, 8), r: rand(.6, 2.2), life: rand(0, 1) };
    }
    function proj(x, z) { var f = H - HZ; return [W / 2 + mouse.x * -10 + x * f / z * .9, HZ + f / z]; }

    function frame(now) {
      var dt = Math.min(.05, (now - last) / 1000), t = (now - t0) / 1000;
      last = now;
      mouse.x += (mouse.tx - mouse.x) * .05; mouse.y += (mouse.ty - mouse.y) * .05;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = 'source-over';

      // Sky
      var sky = ctx.createLinearGradient(0, 0, 0, HZ);
      sky.addColorStop(0, '#03050b'); sky.addColorStop(.65, '#0a0d1d'); sky.addColorStop(1, rgba(accent, .35));
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, HZ + 1);
      for (var s = 0; s < stars.length; s++) {
        var st = stars[s];
        ctx.fillStyle = 'rgba(255,255,255,' + (.25 + .5 * (.5 + .5 * Math.sin(st[3] + t * st[4]))) + ')';
        ctx.fillRect(st[0] + mouse.x * -3, st[1], st[2], st[2]);
      }
      // Horizon glow
      var glow = ctx.createRadialGradient(W / 2, HZ, 0, W / 2, HZ, W * .7);
      glow.addColorStop(0, rgba(accent, .55)); glow.addColorStop(.35, rgba(accent, .15)); glow.addColorStop(1, rgba(accent, 0));
      ctx.fillStyle = glow; ctx.fillRect(0, 0, W, HZ + 2);

      // Searchlights sweeping the sky
      ctx.globalCompositeOperation = 'lighter';
      for (var sl = 0; sl < 2; sl++) {
        var bx = W * (sl ? .78 : .22), ang = Math.sin(t * (sl ? .23 : .31) + sl * 2) * .55 - Math.PI / 2, len = H * 1.1, spread = .06;
        var bg = ctx.createLinearGradient(bx, HZ, bx + Math.cos(ang) * len, HZ + Math.sin(ang) * len);
        bg.addColorStop(0, 'rgba(200,220,255,.16)'); bg.addColorStop(1, 'rgba(200,220,255,0)');
        ctx.fillStyle = bg; ctx.beginPath(); ctx.moveTo(bx, HZ);
        ctx.lineTo(bx + Math.cos(ang - spread) * len, HZ + Math.sin(ang - spread) * len); ctx.lineTo(bx + Math.cos(ang + spread) * len, HZ + Math.sin(ang + spread) * len); ctx.closePath(); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';

      // Skyline layers (scroll + mouse parallax) with a few blinking windows
      for (var l = 0; l < layers.length; l++) {
        var L = layers[l], off = -((t * L.speed + mouse.x * L.par) % L.w + L.w) % L.w, dy = mouse.y * L.par * .3;
        for (var px = off; px < W; px += L.w) {
          ctx.drawImage(L.canvas, px, dy, L.w, HZ);
          for (var b = 0; b < L.blink.length; b++) {
            var wb = L.blink[b];
            if (Math.sin(wb[4] + t * wb[5]) > .2) continue;
            ctx.fillStyle = l === 2 ? '#05070f' : l === 1 ? '#090d19' : '#0d1324';
            ctx.fillRect(px + wb[0], dy + wb[1], wb[2], wb[3]);
          }
          for (var bc = 0; bc < L.beacons.length; bc++) { // red aviation lights
            var be = L.beacons[bc], on = Math.sin(be[2] + t * 2.4) > .55;
            if (!on) continue;
            ctx.fillStyle = 'rgba(255,40,40,.95)'; ctx.fillRect(px + be[0] - 1.5, dy + be[1] - 3, 3, 3);
            var bgl = ctx.createRadialGradient(px + be[0], dy + be[1] - 2, 0, px + be[0], dy + be[1] - 2, 9);
            bgl.addColorStop(0, 'rgba(255,40,40,.5)'); bgl.addColorStop(1, 'rgba(255,40,40,0)'); ctx.fillStyle = bgl; ctx.fillRect(px + be[0] - 9, dy + be[1] - 11, 18, 18);
          }
        }
        if (l === 0) { // haze between the far and mid layers
          var hz = ctx.createLinearGradient(0, HZ * .55, 0, HZ);
          hz.addColorStop(0, 'rgba(10,13,29,0)'); hz.addColorStop(1, rgba(accent, .12));
          ctx.fillStyle = hz; ctx.fillRect(0, HZ * .55, W, HZ * .45);
        }
      }

      // Ground
      var ground = ctx.createLinearGradient(0, HZ, 0, H);
      ground.addColorStop(0, '#0b0e1c'); ground.addColorStop(1, '#020309');
      ctx.fillStyle = ground; ctx.fillRect(0, HZ, W, H - HZ);

      // Neon grid on both sides of the road
      ctx.lineWidth = 1;
      var scroll = (t * 6) % 2;
      for (var gz = 1 + (2 - scroll); gz < 60; gz += 2) {
        var p1 = proj(-40, gz), p2 = proj(-4.6, gz), p3 = proj(4.6, gz), p4 = proj(40, gz), a = Math.min(.7, 2.4 / gz);
        ctx.strokeStyle = rgba(accent, a);
        ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.moveTo(p3[0], p3[1]); ctx.lineTo(p4[0], p4[1]); ctx.stroke();
      }
      for (var gx = 6; gx <= 40; gx += 3) {
        [-gx, gx].forEach(function (x) {
          var n = proj(x, 1), f = proj(x, 60), lg = ctx.createLinearGradient(0, f[1], 0, n[1]);
          lg.addColorStop(0, rgba(accent, 0)); lg.addColorStop(1, rgba(accent, .55));
          ctx.strokeStyle = lg; ctx.beginPath(); ctx.moveTo(n[0], n[1]); ctx.lineTo(f[0], f[1]); ctx.stroke();
        });
      }

      // Road surface, edges and lane markings
      var rn1 = proj(-4.4, 1), rn2 = proj(4.4, 1), rf = proj(0, 70);
      ctx.fillStyle = '#06080f';
      ctx.beginPath(); ctx.moveTo(rn1[0], H); ctx.lineTo(rf[0] - 1, rf[1]); ctx.lineTo(rf[0] + 1, rf[1]); ctx.lineTo(rn2[0], H); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1.5;
      [-4.3, 4.3].forEach(function (x) { var n = proj(x, 1), f = proj(x, 70); ctx.beginPath(); ctx.moveTo(n[0], n[1]); ctx.lineTo(f[0], f[1]); ctx.stroke(); });
      ctx.strokeStyle = 'rgba(250,204,21,.55)';
      [-.12, .12].forEach(function (x) { var n = proj(x, 1), f = proj(x, 70); ctx.beginPath(); ctx.moveTo(n[0], n[1]); ctx.lineTo(f[0], f[1]); ctx.stroke(); });
      var dash = (t * 10) % 4;
      ctx.strokeStyle = 'rgba(255,255,255,.4)';
      for (var dz = 1 + (4 - dash); dz < 50; dz += 4) {
        [-2, 2].forEach(function (x) {
          var a1 = proj(x, dz), a2 = proj(x, dz + 1.6);
          ctx.lineWidth = Math.max(.6, 6 / dz); ctx.beginPath(); ctx.moveTo(a1[0], a1[1]); ctx.lineTo(a2[0], a2[1]); ctx.stroke();
        });
      }

      // Cars: light trails (additive)
      ctx.globalCompositeOperation = 'lighter';
      for (var c = 0; c < cars.length; c++) {
        var car = cars[c];
        car.z += (car.away ? 1 : -1) * car.v * dt * (car.z / 12 + .4);
        if (car.z < .9 || car.z > 62) { cars[c] = newCar(false); continue; }
        var trail = car.away ? -2.2 : 2.6, col = car.away ? [255, 40, 60] : [255, 240, 200];
        [-.35, .35].forEach(function (o) {
          var h1 = proj(car.lane + o, car.z), h2 = proj(car.lane + o, Math.max(.9, car.z + trail));
          var lg2 = ctx.createLinearGradient(h1[0], h1[1], h2[0], h2[1]);
          lg2.addColorStop(0, rgba(col, Math.min(.95, 3 / car.z + .25))); lg2.addColorStop(1, rgba(col, 0));
          ctx.strokeStyle = lg2; ctx.lineWidth = Math.max(.8, 9 / car.z); ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(h1[0], h1[1]); ctx.lineTo(h2[0], h2[1]); ctx.stroke();
          var rg = ctx.createRadialGradient(h1[0], h1[1], 0, h1[0], h1[1], Math.max(3, 34 / car.z));
          rg.addColorStop(0, rgba(col, Math.min(.6, 2 / car.z))); rg.addColorStop(1, rgba(col, 0));
          ctx.fillStyle = rg; ctx.fillRect(h1[0] - 40, h1[1] - 40, 80, 80);
        });
      }

      // Embers rising
      for (var e = 0; e < embers.length; e++) {
        var em = embers[e];
        em.y -= em.v * dt; em.x += em.drift * dt; em.life += dt * .25;
        if (em.y < HZ * .4 || em.life > 1.6) { embers[e] = newEmber(false); continue; }
        ctx.fillStyle = rgba(accent, Math.max(0, .7 - em.life * .4));
        ctx.beginPath(); ctx.arc(em.x + mouse.x * -18, em.y, em.r, 0, 6.283); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';

      if (running && !calm) raf = requestAnimationFrame(frame);
    }

    var onMove = function (e) {
      var r = box.getBoundingClientRect();
      mouse.tx = ((e.clientX - r.left) / r.width - .5) * 2;
      mouse.ty = ((e.clientY - r.top) / r.height - .5) * 2;
    };
    var ro = window.ResizeObserver ? new ResizeObserver(function () { resize(); if (calm) frame(performance.now()); }) : null;
    var onVis = function () {
      if (calm) return;
      cancelAnimationFrame(raf);
      if (!document.hidden && running) { last = performance.now(); raf = requestAnimationFrame(frame); }
    };
    resize();
    if (ro) ro.observe(box); else window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('visibilitychange', onVis);
    if (calm) frame(t0 + 8000); else raf = requestAnimationFrame(frame);

    return {
      stop: function () {
        running = false; cancelAnimationFrame(raf);
        if (ro) ro.disconnect();
        window.removeEventListener('pointermove', onMove);
        document.removeEventListener('visibilitychange', onVis);
        canvas.remove();
      }
    };
  }

  window.AuthScene = { start: start };
})();
