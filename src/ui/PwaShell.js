/* UX item 10 — registra o service worker, mostra aviso "sem conexão" e oferece atualização segura (só recarrega se o usuário pedir). */
(function (root) {
  'use strict';
  var doc = root.document; if (!doc) return;
  function bar(id, text, cls) {
    var b = doc.getElementById(id); if (b) return b;
    b = doc.createElement('div'); b.id = id; b.className = 'pwa-bar ' + cls; b.setAttribute('role', 'status'); b.setAttribute('aria-live', 'polite');
    var s = doc.createElement('span'); s.textContent = text; b.appendChild(s); b.hidden = true; doc.body.appendChild(b); return b;
  }
  var probeFailed = false;
  function offline() { var b = bar('pwaOffline', 'Sem conexão — os dados não são salvos no aparelho. Aguarde a internet voltar para consultar ou registrar visitas.', 'pwa-offline'); b.hidden = root.navigator.onLine !== false && !probeFailed; }
  // navigator.onLine pode dizer "online" sem rede real (Wi-Fi sem internet, DevTools > SW offline). Teste rápido (4 s) no /api/health.
  function probe() { if (typeof root.fetch !== 'function') return Promise.resolve(); var ctl = typeof AbortController === 'function' ? new AbortController() : null; var t = ctl ? setTimeout(function () { ctl.abort(); }, 4000) : null;
    return root.fetch('/api/health', { cache: 'no-store', credentials: 'same-origin', signal: ctl ? ctl.signal : undefined }).then(function () { probeFailed = false; }, function () { probeFailed = true; }).then(function () { if (t) clearTimeout(t); offline(); }); }
  function promptUpdate(reg) {
    var b = bar('pwaUpdate', 'Nova versão disponível.', 'pwa-update');
    if (!b.querySelector('button')) { var btn = doc.createElement('button'); btn.type = 'button'; btn.textContent = 'Atualizar'; btn.addEventListener('click', function () { if (reg.waiting) { btn.disabled = true; root.__kacReloadOnSwap = true; reg.waiting.postMessage({ type: 'SKIP_WAITING' }); } }); b.appendChild(btn);
      var later = doc.createElement('button'); later.type = 'button'; later.className = 'sec'; later.textContent = 'Depois'; later.addEventListener('click', function () { b.hidden = true; }); b.appendChild(later); }
    b.hidden = false;
  }
  function init() {
    root.addEventListener('online', function () { probe(); }); root.addEventListener('offline', offline); root.addEventListener('kac:offline', function () { probeFailed = true; offline(); }); offline(); probe();
    var sw = root.navigator.serviceWorker; if (!sw || root.location.protocol === 'file:' || root.cordova) return;
    sw.register('/sw.js', { scope: '/' }).then(function (reg) {
      if (reg.waiting && sw.controller) promptUpdate(reg);
      reg.addEventListener('updatefound', function () { var n = reg.installing; if (!n) return; n.addEventListener('statechange', function () { if (n.state === 'installed' && sw.controller) promptUpdate(reg); }); });
    }).catch(function () {});
    sw.addEventListener('controllerchange', function () { if (root.__kacReloadOnSwap) { root.__kacReloadOnSwap = false; root.location.reload(); } });
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init); else init();
  root.KacPwa = { _init: init, probe: probe };
})(typeof window !== 'undefined' ? window : globalThis);
