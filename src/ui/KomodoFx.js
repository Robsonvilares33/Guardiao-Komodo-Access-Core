/* UX fase 1 (item 2): fundo animado (radar + partículas) DESLIGADO por padrão.
   Liga só se o usuário ativar (preferência local 'kac_fx'='1', não sensível) e o sistema não pedir menos movimento.
   Com aba oculta, a animação CSS pausa (classe kac-fx-paused). */
(function (root) {
  'use strict';
  var KEY = 'kac_fx';
  function reduced() { return !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function wanted() { try { return root.localStorage.getItem(KEY) === '1'; } catch (_) { return false; } }
  var started = false;
  function apply(canvasId, opts) {
    var on = wanted() && !reduced();
    document.body.classList.toggle('kac-fx', on);
    if (on && !started && root.KomodoParticles) { started = true; root.KomodoParticles.init(canvasId || 'particles-canvas', opts || { count: 50 }); }
    return on;
  }
  document.addEventListener('visibilitychange', function () { document.body.classList.toggle('kac-fx-paused', document.hidden); });
  root.KomodoFx = {
    init: function (canvasId, opts) {
      var on = apply(canvasId, opts);
      var box = document.getElementById('fxToggle');
      if (box) {
        box.checked = on; box.disabled = reduced();
        box.addEventListener('change', function () { try { if (box.checked) root.localStorage.setItem(KEY, '1'); else root.localStorage.removeItem(KEY); } catch (_) {} if (box.checked) apply(canvasId, opts); else root.location.reload(); });
      }
      return on;
    },
    enabled: function () { return wanted() && !reduced(); }
  };
})(window);
