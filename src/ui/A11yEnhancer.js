/* Fase D (D4–D6): melhorias de acessibilidade por observação do DOM — não altera handlers, dados nem fluxo.
   D4 aria-pressed nos botões de alternância; aria-current nas abas de dia.
   D5 aria-invalid + dica ligada ao campo (nome ≥3, placa ABC-1234/ABC1D23 via ValidationManager) — só informa; validação real continua no salvar.
   D6 região role=status anuncia "N registros" ou o estado vazio da agenda. */
(function () {
  'use strict';
  var PLATE = /^[A-Z]{3}-?\d[A-Z0-9]\d{2}$/;
  // Mesma regra do ValidationManager (fonte da verdade) quando disponível.
  function validPlate(p) { var VM = window.ValidationManager; return VM && typeof VM.isValidMercosulOrOld === 'function' ? VM.isValidMercosulOrOld(p) : PLATE.test(String(p).toUpperCase()); }
  function syncToggles(root) { (root || document).querySelectorAll('button.btn-toggle').forEach(function (b) { var v = b.classList.contains('active') ? 'true' : 'false'; if (b.getAttribute('aria-pressed') !== v) b.setAttribute('aria-pressed', v); }); }
  function syncTabs(root) { (root || document).querySelectorAll('.tab[data-dia]').forEach(function (t) { if (t.classList.contains('active')) { if (t.getAttribute('aria-current') !== 'date') t.setAttribute('aria-current', 'date'); } else if (t.hasAttribute('aria-current')) t.removeAttribute('aria-current'); }); }
  function rule(input) { var f = input.getAttribute('data-field'); var v = String(input.value || '').trim(); if (f === 'nome') return v && v.length < 3 ? 'Nome deve ter pelo menos 3 caracteres.' : ''; if (f === 'placa') return v && !validPlate(v.split(' ')[0]) ? 'Placa no formato ABC-1234 ou ABC1D23.' : ''; return ''; }
  var seq = 0;
  function check(input) {
    var msg = rule(input); var id = input.getAttribute('data-a11y-hint');
    if (!id) { id = 'a11yHint' + (++seq); input.setAttribute('data-a11y-hint', id); }
    var hint = document.getElementById(id);
    if (msg) {
      if (!hint) { hint = document.createElement('span'); hint.id = id; hint.className = 'a11y-hint'; input.insertAdjacentElement('afterend', hint); }
      hint.textContent = msg; input.setAttribute('aria-invalid', 'true');
      var d = (input.getAttribute('aria-describedby') || '').split(' ').filter(Boolean); if (d.indexOf(id) < 0) { d.push(id); input.setAttribute('aria-describedby', d.join(' ')); }
    } else {
      if (hint) hint.textContent = ''; input.removeAttribute('aria-invalid');
    }
    return msg;
  }
  function describe(container) {
    if (!container) return '';
    var empty = container.querySelector('.empty-records-message'); if (empty) return empty.textContent;
    var n = container.querySelectorAll('.card[data-id]').length; return n === 1 ? '1 registro na agenda.' : n + ' registros na agenda.';
  }
  function start() {
    syncToggles(); syncTabs();
    new MutationObserver(function (ms) { var t = false, d = false; ms.forEach(function (m) { var el = m.target; if (el.classList && el.classList.contains('btn-toggle')) t = true; if (el.classList && el.classList.contains('tab')) d = true; if (m.type === 'childList') { t = d = true; } }); if (t) syncToggles(); if (d) syncTabs(); })
      .observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'], childList: true });
    document.addEventListener('blur', function (e) { var el = e.target; if (el && el.matches && el.matches('input[data-field="nome"],input[data-field="placa"]')) check(el); }, true);
    document.addEventListener('input', function (e) { var el = e.target; if (el && el.getAttribute && el.getAttribute('aria-invalid') === 'true') check(el); }, true);
    var c = document.getElementById('cardsContainer'); if (!c) return;
    var live = document.createElement('div'); live.id = 'agendaStatus'; live.className = 'sr-only'; live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite'); c.insertAdjacentElement('beforebegin', live);
    var timer = null; var announce = function () { clearTimeout(timer); timer = setTimeout(function () { var s = describe(c); if (live.textContent !== s) live.textContent = s; }, 400); };
    new MutationObserver(announce).observe(c, { childList: true }); announce();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  window.A11yEnhancer = { syncToggles: syncToggles, syncTabs: syncTabs, check: check, rule: rule, describe: describe };
})();
