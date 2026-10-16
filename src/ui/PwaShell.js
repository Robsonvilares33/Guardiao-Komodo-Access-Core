/* UX item 10 — registra o service worker, mostra aviso "sem conexão" e oferece atualização segura (só recarrega se o usuário pedir). */
(function (root) {
  'use strict';
  var doc = root.document; if (!doc) return;
  function bar(id, text, cls) {
    var b = doc.getElementById(id); if (b) return b;
    b = doc.createElement('div'); b.id = id; b.className = 'pwa-bar ' + cls; b.setAttribute('role', 'status'); b.setAttribute('aria-live', 'polite');
    var s = doc.createElement('span'); s.textContent = text; b.appendChild(s); b.hidden = true; doc.body.appendChild(b); return b;
  }
  function offline() { var b = bar('pwaOffline', 'Sem conexão — os dados não são salvos no aparelho. Aguarde a internet voltar para consultar ou registrar visitas.', 'pwa-offline'); b.hidden = root.navigator.onLine !== false; }
  function promptUpdate(reg) {
    var b = bar('pwaUpdate', 'Nova versão disponível.', 'pwa-update');
    if (!b.querySelector('button')) { var btn = doc.createElement('button'); btn.type = 'button'; btn.textContent = 'Atualizar'; btn.addEventListener('click', function () { if (reg.waiting) { btn.disabled = true; root.__kacReloadOnSwap = true; reg.waiting.postMessage({ type: 'SKIP_WAITING' }); } }); b.appendChild(btn);
      var later = doc.createElement('button'); later.type = 'button'; later.className = 'sec'; later.textContent = 'Depois'; later.addEventListener('click', function () { b.hidden = true; }); b.appendChild(later); }
    b.hidden = false;
  }
  function init() {
    root.addEventListener('online', offline); root.addEventListener('offline', offline); offline();
    var sw = root.navigator.serviceWorker; if (!sw || root.location.protocol === 'file:' || root.cordova) return;
    sw.register('/sw.js', { scope: '/' }).then(function (reg) {
      if (reg.waiting && sw.controller) promptUpdate(reg);
      reg.addEventListener('updatefound', function () { var n = reg.installing; if (!n) return; n.addEventListener('statechange', function () { if (n.state === 'installed' && sw.controller) promptUpdate(reg); }); });
    }).catch(function () {});
    sw.addEventListener('controllerchange', function () { if (root.__kacReloadOnSwap) { root.__kacReloadOnSwap = false; root.location.reload(); } });
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init); else init();
  root.KacPwa = { _init: init };
})(typeof window !== 'undefined' ? window : globalThis);
