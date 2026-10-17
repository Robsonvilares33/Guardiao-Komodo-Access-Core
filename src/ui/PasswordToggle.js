/* Mostrar/ocultar senha acessível: botão com ícone de olho dentro do campo, aria-pressed + aria-label, alvo de toque 44 px.
   Aprimora todo input[type=password] da página que ainda não tem botão (auth.html, cadastro, bootstrap do login.html).
   Botões já existentes com data-pw-toggle (login.html) só recebem o ícone: o clique deles continua no login-init.js. */
(function (root) {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var PATHS = {
    show: ['M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z', 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z'],
    hide: ['M17.94 17.94A10.07 10.07 0 0 1 12 19c-7 0-11-7-11-7a18.45 18.45 0 0 1 5.06-5.94', 'M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 7 11 7a18.5 18.5 0 0 1-2.16 3.19', 'M14.12 14.12a3 3 0 1 1-4.24-4.24', 'M1 1l22 22']
  };
  function icon(doc, kind) {
    var s = doc.createElementNS(NS, 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', '22'); s.setAttribute('height', '22'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false'); s.setAttribute('class', 'pw-ico pw-ico-' + kind);
    PATHS[kind].forEach(function (d) { var p = doc.createElementNS(NS, 'path'); p.setAttribute('d', d); s.appendChild(p); }); return s;
  }
  function decorate(doc, btn) { while (btn.firstChild) btn.removeChild(btn.firstChild); btn.appendChild(icon(doc, 'show')); btn.appendChild(icon(doc, 'hide')); btn.classList.add('pw-eye'); }
  function setState(input, btn, show) { input.type = show ? 'text' : 'password'; btn.setAttribute('aria-pressed', show ? 'true' : 'false'); btn.setAttribute('aria-label', show ? 'Ocultar senha' : 'Mostrar senha'); }
  function enhance(doc) {
    doc = doc || root.document; var n = 0;
    Array.prototype.forEach.call(doc.querySelectorAll('[data-pw-toggle]'), function (b) { if (!b.classList.contains('pw-eye')) decorate(doc, b); });
    Array.prototype.forEach.call(doc.querySelectorAll('input[type="password"]'), function (input) {
      if (!input.id || doc.querySelector('[data-pw-toggle="' + input.id + '"],[data-pw-for="' + input.id + '"]')) return;
      var wrap = doc.createElement('span'); wrap.className = 'pw-wrap'; input.parentNode.insertBefore(wrap, input); wrap.appendChild(input);
      var btn = doc.createElement('button'); btn.type = 'button'; btn.setAttribute('data-pw-for', input.id); btn.setAttribute('aria-controls', input.id); decorate(doc, btn); setState(input, btn, false);
      btn.addEventListener('click', function () { setState(input, btn, input.type === 'password'); });
      // Ao enviar o formulário a senha volta a ficar oculta (não fica exposta na tela seguinte nem no autocompletar).
      if (input.form) input.form.addEventListener('submit', function () { setState(input, btn, false); });
      wrap.appendChild(btn); n++;
    });
    return n;
  }
  root.KacPasswordToggle = { enhance: enhance };
  if (root.document) { if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', function () { enhance(); }); else enhance(); }
})(typeof window !== 'undefined' ? window : globalThis);
