/* Reagendar + Histórico da visita (rotas /reagendar e /historico). Datas em America/Sao_Paulo. Sem innerHTML com dados. */
(function () {
  'use strict';
  var TZ = 'America/Sao_Paulo';
  var ACTIONS = { created: 'Criado', rescheduled: 'Reagendado', status_changed: 'Status alterado', deleted: 'Excluído' };
  var STATUS = ['Aguardando', 'Entrada', 'Saída'];
  function modulo() { return /residencial/.test(location.pathname) ? 'residencial' : 'empresarial'; }
  function el(tag, props, text) { var e = document.createElement(tag); Object.keys(props || {}).forEach(function (k) { if (k === 'attrs') Object.keys(props.attrs).forEach(function (a) { e.setAttribute(a, props.attrs[a]); }); else e[k] = props[k]; }); if (text != null) e.textContent = text; return e; }
  function br(iso) { return iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '—'; }
  function stamp(ts) { try { return new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, dateStyle: 'short', timeStyle: 'short' }).format(new Date(ts)); } catch (_) { return String(ts || ''); } }
  function todayISO() { return window.KomodoDate && window.KomodoDate.todayISO ? window.KomodoDate.todayISO() : new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date()); }
  function findVisit(id) { var st = window.appStore && window.appStore.getState('visitors'); return st && (st.dailyData || []).find(function (r) { return String(r.id) === String(id); }); }
  function reload() { var st = window.appStore && window.appStore.getState('visitors'); if (window.renderController) window.renderController.reloadDailyData(st && st.diaAtivo, modulo()); }

  var dlg, lastFocus;
  function dialog() {
    if (dlg) return dlg;
    dlg = el('dialog', { id: 'visitDialog', className: 'visit-dialog', attrs: { 'aria-labelledby': 'visitDialogTitle' } });
    dlg.addEventListener('close', function () { if (lastFocus && lastFocus.focus) lastFocus.focus(); });
    document.body.appendChild(dlg);
    return dlg;
  }
  function open(title, body) {
    var d = dialog(); d.textContent = '';
    var head = el('div', { className: 'visit-dialog-head' });
    head.append(el('h2', { id: 'visitDialogTitle' }, title), el('button', { type: 'button', className: 'visit-dialog-close', attrs: { 'aria-label': 'Fechar' } }, '✕'));
    head.lastChild.addEventListener('click', function () { d.close(); });
    d.append(head, body);
    lastFocus = document.activeElement;
    if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
    var first = d.querySelector('input,button:not(.visit-dialog-close)'); if (first) first.focus();
  }

  function openReschedule(id) {
    var v = findVisit(id); if (!v) return;
    var form = el('form', { className: 'visit-form', noValidate: true });
    var info = el('p', { className: 'visit-dialog-info' }, v.nome + ' — atual: ' + br(v.data) + ' às ' + (v.hora || '—'));
    var lData = el('label', { htmlFor: 'reschedData' }, 'Nova data');
    var iData = el('input', { type: 'date', id: 'reschedData', required: true, value: v.data || todayISO() });
    var lHora = el('label', { htmlFor: 'reschedHora' }, 'Novo horário');
    var iHora = el('input', { type: 'time', id: 'reschedHora', required: true, value: v.hora || '' });
    var msg = el('p', { className: 'visit-form-msg', attrs: { role: 'status', 'aria-live': 'polite' } });
    var actions = el('div', { className: 'visit-form-actions' });
    var cancel = el('button', { type: 'button', className: 'btn-outline' }, 'Cancelar');
    var save = el('button', { type: 'submit', className: 'btn-primary', id: 'reschedSave' }, 'Salvar reagendamento');
    cancel.addEventListener('click', function () { dlg.close(); });
    actions.append(cancel, save);
    form.append(info, lData, iData, lHora, iHora, msg, actions);
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(iData.value) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(iHora.value)) { msg.textContent = 'Informe data e horário válidos.'; return; }
      if (iData.value === v.data && iHora.value === v.hora) { msg.textContent = 'Nada mudou.'; return; }
      save.disabled = true; msg.textContent = 'Salvando…';
      try {
        await window.VisitorRepository.reschedule(v.id, iData.value, iHora.value);
        msg.textContent = 'Reagendado para ' + br(iData.value) + ' às ' + iHora.value + '.';
        dlg.close(); reload();
      } catch (ex) { msg.textContent = 'Erro: ' + (ex && ex.message || 'falha ao reagendar'); save.disabled = false; }
    });
    open('Reagendar visita', form);
  }

  async function openHistory(id) {
    var v = findVisit(id);
    var box = el('div', { className: 'visit-history' });
    var status = el('p', { attrs: { role: 'status', 'aria-live': 'polite' } }, 'Carregando histórico…');
    box.append(status);
    open('Histórico — ' + (v ? v.nome : 'visita'), box);
    try {
      var r = await window.VisitorRepository.history(id);
      var rows = (r && r.data) || [];
      status.textContent = rows.length ? rows.length + ' evento(s)' : 'Sem histórico registrado.';
      var ol = el('ol', { className: 'visit-history-list' });
      rows.forEach(function (h) {
        var li = el('li');
        li.append(el('strong', {}, ACTIONS[h.action] || h.action), el('time', { dateTime: h.created_at || '' }, ' · ' + stamp(h.created_at)));
        var d = '';
        if (h.action === 'rescheduled') d = br(h.old_data) + ' ' + (h.old_hora || '') + ' → ' + br(h.new_data) + ' ' + (h.new_hora || '');
        else if (h.action === 'created') d = 'Agendado para ' + br(h.new_data) + ' ' + (h.new_hora || '');
        else if (h.action === 'status_changed') d = (STATUS[h.old_status] || h.old_status) + ' → ' + (STATUS[h.new_status] || h.new_status);
        if (d) li.append(el('div', { className: 'visit-history-detail' }, d));
        ol.append(li);
      });
      box.append(ol);
    } catch (ex) { status.textContent = (ex && /404|não encontrado/i.test(ex.message)) ? 'Sem histórico registrado.' : 'Erro ao carregar histórico.'; }
  }

  function decorate(root) {
    (root || document).querySelectorAll('#cardsContainer .card[data-id]').forEach(function (card) {
      if (card.querySelector('.visit-actions')) return;
      var id = card.dataset.id; var v = findVisit(id); var nome = v ? v.nome : 'visita';
      var bar = el('div', { className: 'visit-actions' });
      bar.append(
        el('button', { type: 'button', className: 'btn-outline visit-btn', attrs: { 'data-visit-action': 'reschedule', 'data-id': id, 'aria-label': 'Reagendar ' + nome } }, '📅 Reagendar'),
        el('button', { type: 'button', className: 'btn-outline visit-btn', attrs: { 'data-visit-action': 'history', 'data-id': id, 'aria-label': 'Histórico de ' + nome } }, '🕘 Histórico'));
      card.appendChild(bar);
    });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-visit-action]'); if (!b) return;
    e.stopPropagation();
    if (b.dataset.visitAction === 'reschedule') openReschedule(b.dataset.id); else openHistory(b.dataset.id);
  }, true);
  function start() { var c = document.getElementById('cardsContainer'); if (!c) return; decorate(c); new MutationObserver(function () { decorate(c); }).observe(c, { childList: true, subtree: true }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  window.VisitActions = { decorate: decorate, openReschedule: openReschedule, openHistory: openHistory, _fmt: { br: br, stamp: stamp } };
})();
