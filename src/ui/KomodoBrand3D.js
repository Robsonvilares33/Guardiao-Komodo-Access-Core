/* KAC Visual Identity v2 — efeitos da marca (emblema 3D, partículas douradas da entrada, ícones flutuantes).
   Só visual: não lê nem grava dados, não faz rede, não guarda nada. Desliga tudo com prefers-reduced-motion
   e pausa com a aba oculta. Partículas só nas telas de entrada (login/auth), com poucas partículas, para poupar bateria. */
(function (root) {
  'use strict';
  var doc = root.document;
  function reduced() { return !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, cls) { var e = doc.createElement(tag); if (cls) e.className = cls; return e; }

  function wrap(img, small) {
    if (!img || (img.parentNode && img.parentNode.classList && img.parentNode.classList.contains('gk-tilt'))) return null;
    var em = el('span', 'gk-emblem' + (small ? ' gk-sm' : '')); em.setAttribute('aria-hidden', img.alt ? 'false' : 'true');
    var tilt = el('span', 'gk-tilt');
    ['gk-ring gk-r1', 'gk-ring gk-r2', 'gk-ring gk-r3'].forEach(function (c) { em.appendChild(el('span', c)); });
    img.parentNode.insertBefore(em, img); tilt.appendChild(img); tilt.appendChild(el('span', 'gk-shine')); em.appendChild(tilt);
    return em;
  }
  function tiltable(em, host) {
    if (!em || reduced()) return;
    var t = em.querySelector('.gk-tilt'), max = 14;
    function set(x, y) { t.style.setProperty('--gk-ry', (x * max).toFixed(2) + 'deg'); t.style.setProperty('--gk-rx', (-y * max).toFixed(2) + 'deg'); }
    (host || em).addEventListener('pointermove', function (e) {
      var r = em.getBoundingClientRect(); var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      set(Math.max(-1, Math.min(1, x)), Math.max(-1, Math.min(1, y)));
    }, { passive: true });
    (host || em).addEventListener('pointerleave', function () { set(0, 0); });
    // sem mouse: balanço lento automático (3D "vivo"), parado com aba oculta
    var t0 = 0, idle = true; (host || em).addEventListener('pointermove', function () { idle = false; clearTimeout(t0); t0 = setTimeout(function () { idle = true; }, 2500); }, { passive: true });
    (function loop(ts) { if (idle && !doc.hidden) set(Math.sin(ts / 2400) * 0.6, Math.sin(ts / 3100) * 0.35); root.requestAnimationFrame(loop); })(0);
  }
  function particles() {
    var c = el('canvas'); c.id = 'gkParticles'; c.setAttribute('aria-hidden', 'true'); doc.body.insertBefore(c, doc.body.firstChild);
    var ctx = c.getContext && c.getContext('2d'); if (!ctx) return;
    var W, H, P = [], N = root.innerWidth < 600 ? 28 : 55, D = root.innerWidth < 600 ? 120 : 170, dpr = Math.min(root.devicePixelRatio || 1, 2);
    var cols = ['194,160,87', '223,190,118', '181,148,97', '255,215,0'];
    function size() { W = root.innerWidth; H = root.innerHeight; c.width = W * dpr; c.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    size(); root.addEventListener('resize', size);
    for (var i = 0; i < N; i++) P.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .4, vy: (Math.random() - .5) * .4, r: Math.random() * 2 + .5, c: cols[i % 4] });
    (function frame() {
      if (!doc.hidden) {
        ctx.clearRect(0, 0, W, H);
        for (var i = 0; i < N; i++) { var p = P[i]; p.x += p.vx; p.y += p.vy; if (p.x < 0 || p.x > W) p.vx *= -1; if (p.y < 0 || p.y > H) p.vy *= -1;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fillStyle = 'rgba(' + p.c + ',.7)'; ctx.fill();
          for (var j = i + 1; j < N; j++) { var q = P[j], dx = p.x - q.x, dy = p.y - q.y, d = Math.sqrt(dx * dx + dy * dy);
            if (d < D) { ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.strokeStyle = 'rgba(194,160,87,' + ((1 - d / D) * .14).toFixed(3) + ')'; ctx.lineWidth = .5; ctx.stroke(); } } }
      }
      root.requestAnimationFrame(frame);
    })();
  }
  var ICONS = ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4', 'M4 4h16v16H4zM9 9h6v6H9zM9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3',
    'M12 12m-10 0a10 10 0 1 0 20 0a10 10 0 1 0-20 0M12 12m-6 0a6 6 0 1 0 12 0a6 6 0 1 0-12 0M12 12l7-7', 'M3 7h13l4 4v3H3zM7 14v4M16 14v4'];
  var POS = [[15, 8, 0], [35, 92, 1], [60, 4, 2], [75, 86, 0.5], [25, 78, 3], [50, 14, 1.5]];
  function floaters() {
    var box = el('div', 'gk-float'); box.setAttribute('aria-hidden', 'true');
    ICONS.forEach(function (d, i) { var s = doc.createElementNS(NS, 'svg'); s.setAttribute('viewBox', '0 0 24 24');
      s.style.top = POS[i][0] + '%'; s.style.left = POS[i][1] + '%'; s.style.animationDelay = POS[i][2] + 's'; s.style.animationDuration = (7 + i) + 's';
      var p = doc.createElementNS(NS, 'path'); p.setAttribute('d', d); s.appendChild(p); box.appendChild(s); });
    doc.body.insertBefore(box, doc.body.firstChild);
  }
  function init() {
    var entry = !!doc.querySelector('.login-card, main.auth-card');
    var hero = doc.querySelector('.login-card > img.logo-img, .auth-brand img');
    var em = wrap(hero, false); tiltable(em, doc.querySelector('.login-card, main.auth-card'));
    var hdr = doc.querySelector('header img.logo-img'); if (hdr) wrap(hdr, true);
    doc.addEventListener('visibilitychange', function () { doc.body.classList.toggle('gk-paused', doc.hidden); });
    if (reduced()) return;
    floaters();
    if (entry) particles();
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init); else init();
  root.KomodoBrand3D = { wrap: wrap };
})(window);
