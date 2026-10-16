/* UX fase 2 (item 5): "Chegou / Saiu" em 1 toque, com estado claro e desfazer por 5 s.
   Estados (mesma coluna status 0/1/2 de sempre — sem mudança de banco): 0 Agendado → 1 Na portaria → 2 Saiu.
   Cada mudança vai à API com o status anterior ("from"): se outro aparelho mudou antes, a API responde 409 e nada é sobrescrito.
   Toda mudança (inclusive o desfazer) é auditada no servidor. DOM só via textContent. */
(function (root) {
  'use strict';
  var LABEL = ['Agendado', 'Na portaria', 'Saiu'];
  var ACTION = ['Chegou', 'Saiu', null];
  var UNDO_MS = 5000;
  function next(s) { s = Number(s) || 0; return s < 2 ? s + 1 : null; }
  function badge(s) { var b = document.createElement('span'); s = Number(s) || 0; b.className = 'status-badge status-' + s; b.textContent = LABEL[s]; return b; }
  function actionButton(item) {
    var s = Number(item.status) || 0; if (next(s) === null) return null;
    var b = document.createElement('button'); b.type = 'button'; b.className = 'btn-status-toggle btn-status-next status-next-' + s;
    b.dataset.id = String(item.id == null ? '' : item.id); b.textContent = ACTION[s];
    b.setAttribute('aria-label', ACTION[s] + ': ' + String(item.nome || 'visita'));
    return b;
  }
  var toastTimer = null;
  function toast(text, onUndo) {
    var t = document.getElementById('kacToast');
    if (!t) { t = document.createElement('div'); t.id = 'kacToast'; t.className = 'kac-toast'; t.setAttribute('role', 'status'); t.setAttribute('aria-live', 'polite'); document.body.appendChild(t); }
    t.textContent = ''; var msg = document.createElement('span'); msg.textContent = text; t.appendChild(msg);
    if (onUndo) { var u = document.createElement('button'); u.type = 'button'; u.className = 'kac-toast-undo'; u.textContent = 'Desfazer'; u.addEventListener('click', function () { hide(); return onUndo(); }); t.appendChild(u); }
    t.hidden = false; if (toastTimer) clearTimeout(toastTimer); toastTimer = setTimeout(hide, UNDO_MS);
    function hide() { t.hidden = true; t.textContent = ''; if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; } }
    return { hide: hide };
  }
  // Avança 1 estado; oferece desfazer por 5 s. repo = VisitorRepository; reload() redesenha a agenda.
  async function advance(reg, repo, reload) {
    var from = Number(reg.status) || 0, to = next(from); if (to === null) return null;
    try { await repo.updateStatus(reg.id, to, { from: from }); }
    catch (e) { toast(e && e.status === 409 ? 'Status já alterado em outro aparelho. Agenda atualizada.' : 'Não foi possível atualizar: ' + (e && e.message || 'erro')); await reload(); return null; }
    reg.status = to; await reload();
    toast(String(reg.nome || 'Visita') + ': ' + LABEL[to] + '.', async function () {
      try { await repo.updateStatus(reg.id, from, { from: to, undo: true }); reg.status = from; toast('Desfeito: ' + LABEL[from] + '.'); }
      catch (e) { toast('Não foi possível desfazer: ' + (e && e.message || 'erro')); }
      await reload();
    });
    return to;
  }
  root.VisitStatus = { LABEL: LABEL, ACTION: ACTION, UNDO_MS: UNDO_MS, next: next, badge: badge, actionButton: actionButton, advance: advance, toast: toast };
  if (typeof module !== 'undefined') module.exports = root.VisitStatus;
})(typeof window !== 'undefined' ? window : globalThis);
