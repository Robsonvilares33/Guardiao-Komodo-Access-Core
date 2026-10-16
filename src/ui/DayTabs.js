/* UX fase 1 (item 4): abas de dias acessíveis. Mantém os handlers de clique existentes (init.js/AgendaNav):
   role=tab + aria-selected sincronizado com a classe .active; só a aba ativa entra no Tab (roving tabindex);
   ←/→ trocam de dia, Home/End vão ao primeiro/último, Enter/Espaço ativam. */
(function () {
  'use strict';
  function tabs(list) { return Array.prototype.slice.call(list.querySelectorAll('.tab[data-dia]')); }
  function sync(list) {
    var all = tabs(list); var any = all.some(function (t) { return t.classList.contains('active'); });
    all.forEach(function (t, i) { var on = t.classList.contains('active') || (!any && i === 0); t.setAttribute('role', 'tab'); t.setAttribute('aria-selected', t.classList.contains('active') ? 'true' : 'false'); t.tabIndex = on ? 0 : -1; if (!t.id) t.id = 'tab-' + t.getAttribute('data-dia'); t.setAttribute('aria-controls', 'cardsContainer'); });
  }
  function init() {
    var list = document.getElementById('tabs'); if (!list) return;
    list.setAttribute('role', 'tablist'); if (!list.getAttribute('aria-label')) list.setAttribute('aria-label', 'Dias da semana');
    sync(list);
    new MutationObserver(function () { sync(list); }).observe(list, { subtree: true, attributes: true, attributeFilter: ['class'] });
    list.addEventListener('keydown', function (e) {
      var all = tabs(list); var i = all.indexOf(e.target); if (i < 0) return; var n = null;
      if (e.key === 'ArrowRight') n = (i + 1) % all.length; else if (e.key === 'ArrowLeft') n = (i - 1 + all.length) % all.length;
      else if (e.key === 'Home') n = 0; else if (e.key === 'End') n = all.length - 1;
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); return; }
      if (n === null) return; e.preventDefault(); all[n].click(); all[n].focus();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  if (typeof module !== 'undefined') module.exports = { sync: sync };
})();
