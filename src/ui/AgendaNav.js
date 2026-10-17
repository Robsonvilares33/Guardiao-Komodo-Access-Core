/**
 * AgendaNav — navegação da agenda (semana anterior/próxima, seletor de data, "Hoje")
 * e visões Hoje / Próximos / Histórico, sem exigir mudança de esquema.
 * Datas sempre no fuso America/Sao_Paulo (KomodoDate).
 */
(function () {
  function modulo() { return window.location.pathname.includes('residencial') ? 'residencial' : 'empresarial'; }
  function KD() { return window.KomodoDate; }
  function activeDay() { const t = document.querySelector('.tab.active'); return t ? t.getAttribute('data-dia') : KD().todayKey(); }
  function el(tag, attrs, text) { const e = document.createElement(tag); Object.assign(e, attrs || {}); if (text) e.textContent = text; return e; }

  function goToDate(iso) {
    const kd = KD(); if (!kd || !iso) return;
    const today = kd.todayISO();
    kd.setReference(iso === today ? null : iso);
    if (window.renderController) window.renderController.updateCalendarUI();
    const day = kd.weekdayKeyOfISO(iso);
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.getAttribute('data-dia') === day));
    const picker = document.getElementById('agendaDate'); if (picker) picker.value = iso;
    setViewLabel('');
    if (window.renderController) window.renderController.reloadDailyData(day, modulo());
  }

  function shiftWeek(n) {
    const kd = KD(); const ref = kd.getReference() || kd.todayISO();
    const base = kd.weekDates(new Date(ref + 'T15:00:00Z'))[activeDay()];
    const cur = base ? kd.toISO(base) : ref;
    goToDate(kd.addDaysISO(cur, 7 * n));
  }

  function setViewLabel(text) { const l = document.getElementById('agendaViewLabel'); if (l) l.textContent = text; }

  async function showView(kind) {
    const kd = KD(); const today = kd.todayISO();
    let de = null, ate = null, label = '';
    if (kind === 'hoje') return goToDate(today);
    if (kind === 'futuro') { de = kd.addDaysISO(today, 1); label = 'Próximos agendamentos (a partir de amanhã)'; }
    if (kind === 'historico') { ate = kd.addDaysISO(today, -1); label = 'Histórico (até ontem)'; }
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    setViewLabel(label + '…');
    try {
      let rows = await window.VisitorRepository.getRange(modulo(), de, ate);
      if (kind === 'historico') rows = rows.slice().reverse();
      setViewLabel(label + ' — ' + rows.length + ' registro(s)');
      if (typeof window.renderDaily === 'function') window.renderDaily(rows, '', true);
    } catch (e) { setViewLabel('Falha ao carregar: ' + e.message); }
  }

  function build() {
    const nav = document.querySelector('.calendar-nav'); const tabs = document.getElementById('tabs');
    if (!nav || !tabs || !KD() || document.getElementById('agendaNav')) return;
    const bar = el('div', { id: 'agendaNav', className: 'agenda-nav' });
    const mk = (id, text, title, fn) => { const b = el('button', { type: 'button', id, className: 'btn-outline agenda-btn', title }, text); b.addEventListener('click', fn); return b; };
    bar.append(
      mk('agendaPrevWeek', '◀ Semana', 'Semana anterior', () => shiftWeek(-1)),
      mk('agendaToday', 'Hoje', 'Voltar para hoje', () => showView('hoje')),
      mk('agendaNextWeek', 'Semana ▶', 'Próxima semana', () => shiftWeek(1))
    );
    const picker = el('input', { type: 'date', id: 'agendaDate', className: 'agenda-date', title: 'Ir para a data' });
    picker.value = KD().todayISO();
    picker.addEventListener('change', () => goToDate(picker.value));
    bar.append(picker,
      mk('agendaViewFuture', 'Próximos', 'Agendamentos futuros', () => showView('futuro')),
      mk('agendaViewHistory', 'Histórico', 'Registros anteriores', () => showView('historico')));
    const label = el('div', { id: 'agendaViewLabel', className: 'agenda-view-label' });
    // Achado 8 (CLS): o espaço já vem reservado no HTML (#agendaNavSlot); sem ele, insere após as abas como antes.
    const slot = document.getElementById('agendaNavSlot');
    if (slot) slot.append(bar, label);
    else { tabs.insertAdjacentElement('afterend', bar); bar.insertAdjacentElement('afterend', label); }
    // Ao clicar numa aba, sincroniza o seletor de data com a semana em exibição.
    tabs.addEventListener('click', e => {
      const t = e.target.closest('.tab'); if (!t) return;
      const w = KD().weekDates()[t.getAttribute('data-dia')]; if (w) picker.value = KD().toISO(w);
      setViewLabel('');
    });
  }

  window.AgendaNav = { goToDate, shiftWeek, showView, build };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
