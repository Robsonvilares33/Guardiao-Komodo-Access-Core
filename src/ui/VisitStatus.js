/* UX fase 2 (item 5): "Chegou / Saiu" em 1 toque, com estado claro e desfazer por 10 s (pausa com mouse/foco).
   Estados (mesma coluna status 0/1/2 de sempre — sem mudança de banco): 0 Agendado → 1 Na portaria → 2 Saiu.
   Cada mudança vai à API com o status anterior ("from"): se outro aparelho mudou antes, a API responde 409 e nada é sobrescrito.
   Toda mudança (inclusive o desfazer) é auditada no servidor. DOM só via textContent. */
(function (root) {
  'use strict';
  var LABEL = ['Agendado', 'Na portaria', 'Saiu'];
  var ACTION = ['Chegou', 'Saiu', null];
  var UNDO_MS = 10000;
  function next(s) { s = Number(s) || 0; return s < 2 ? s + 1 : null; }
  function badge(s) { var b = document.createElement('span'); s = Number(s) || 0; b.className = 'status-badge status-' + s; b.textContent = LABEL[s]; return b; }
  function actionButton(item) {
    var s = Number(item.status) || 0; if (next(s) === null) return null;
    var b = document.createElement('button'); b.type = 'button'; b.className = 'btn-status-toggle btn-status-next status-next-' + s;
    b.dataset.id = String(item.id == null ? '' : item.id); b.textContent = ACTION[s];
    b.setAttribute('aria-label', ACTION[s] + ': ' + String(item.nome || 'visita'));
    return b;
  }
  // Aviso com "Desfazer": 10 s, pausa enquanto o mouse está em cima ou o foco está dentro (WCAG 2.2.1).
  var toastTimer = null, remaining = 0, startedAt = 0;
  function toast(text, onUndo, ms) {
    var t = document.getElementById('kacToast');
    if (!t) {
      t = document.createElement('div'); t.id = 'kacToast'; t.className = 'kac-toast'; t.setAttribute('role', 'status'); t.setAttribute('aria-live', 'polite'); document.body.appendChild(t);
      var pause = function () { if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; remaining = Math.max(1000, remaining - (Date.now() - startedAt)); } };
      var resume = function () { if (!t.hidden && !toastTimer && remaining > 0) arm(remaining); };
      if (t.addEventListener) { t.addEventListener('mouseenter', pause); t.addEventListener('focusin', pause); t.addEventListener('mouseleave', resume); t.addEventListener('focusout', resume); }
    }
    function hide() { t.hidden = true; t.textContent = ''; remaining = 0; if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; } }
    function arm(d) { remaining = d; startedAt = Date.now(); toastTimer = setTimeout(hide, d); }
    t.textContent = ''; var msg = document.createElement('span'); msg.textContent = text; t.appendChild(msg);
    if (onUndo) { var u = document.createElement('button'); u.type = 'button'; u.className = 'kac-toast-undo'; u.textContent = 'Desfazer'; u.addEventListener('click', function () { hide(); return onUndo(); }); t.appendChild(u); }
    t.hidden = false; if (toastTimer) clearTimeout(toastTimer); toastTimer = null; arm(ms || UNDO_MS);
    return { hide: hide, el: t };
  }
  // Atualiza só o cartão na tela (sem esperar a API nem recarregar a agenda).
  function paint(card, reg, pending) {
    if (!card || !card.querySelector) return;
    var box = card.querySelector('.status-box'); if (!box) return;
    box.textContent = ''; box.appendChild(badge(reg.status));
    var b = actionButton(reg); if (b) { if (pending) { b.disabled = true; b.setAttribute('aria-busy', 'true'); } box.appendChild(b); }
  }
  var pendingIds = {};
  // Avança 1 estado de forma OTIMISTA: tela e aviso na hora; API em seguida; erro/409 → volta o estado e avisa.
  async function advance(reg, repo, reload, btn) {
    var key = String(reg.id); if (pendingIds[key]) return null;
    var from = Number(reg.status) || 0, to = next(from); if (to === null) return null;
    var card = btn && btn.closest ? btn.closest('.card') : null;
    pendingIds[key] = true; reg.status = to; paint(card, reg, true);
    toast(String(reg.nome || 'Visita') + ': ' + LABEL[to] + '.', function () { return undo(reg, repo, reload, card, from, to); });
    try { await repo.updateStatus(reg.id, to, { from: from }); }
    catch (e) {
      reg.status = from; paint(card, reg, false); delete pendingIds[key];
      toast(e && e.status === 409 ? 'Status já alterado em outro aparelho. Agenda atualizada.' : 'Não foi possível salvar "' + LABEL[to] + '": ' + (e && e.message || 'erro') + '. Tente de novo.');
      try { await reload(); } catch (_) {} return null;
    }
    delete pendingIds[key]; paint(card, reg, false);
    Promise.resolve().then(reload).catch(function () {}); // sincroniza em segundo plano
    return to;
  }
  async function undo(reg, repo, reload, card, from, to) {
    var key = String(reg.id);
    // se a gravação original ainda está em andamento, espera ela terminar
    for (var i = 0; i < 50 && pendingIds[key]; i++) await new Promise(function (r) { setTimeout(r, 100); });
    if (Number(reg.status) !== to) return;
    pendingIds[key] = true; reg.status = from; paint(card, reg, true);
    try { await repo.updateStatus(reg.id, from, { from: to, undo: true }); toast('Desfeito: ' + LABEL[from] + '.', null, 4000); }
    catch (e) { reg.status = to; toast('Não foi possível desfazer: ' + (e && e.message || 'erro')); }
    delete pendingIds[key]; paint(card, reg, false);
    try { await reload(); } catch (_) {}
  }
  root.VisitStatus = { LABEL: LABEL, ACTION: ACTION, UNDO_MS: UNDO_MS, next: next, badge: badge, actionButton: actionButton, advance: advance, toast: toast, paint: paint, _pending: pendingIds };
  if (typeof module !== 'undefined') module.exports = root.VisitStatus;
})(typeof window !== 'undefined' ? window : globalThis);
