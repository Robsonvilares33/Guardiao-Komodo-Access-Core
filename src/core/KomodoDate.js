/**
 * KomodoDate — data "de hoje" sempre no fuso America/Sao_Paulo,
 * independente do fuso do aparelho/navegador.
 */
(function (root) {
  const TZ = 'America/Sao_Paulo';
  const KEYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
  const WEEK_ORDER = { seg: 0, ter: 1, qua: 2, qui: 3, sex: 4, sab: 5, dom: 6 };

  function todayParts(now = new Date(), timeZone = TZ) {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(now).reduce((acc, p) => { acc[p.type] = p.value; return acc; }, {});
    const year = Number(parts.year), month = Number(parts.month), day = Number(parts.day);
    // Data civil pura (UTC ao meio-dia) para fazer aritmética de dias sem efeito de fuso.
    const civil = new Date(Date.UTC(year, month - 1, day, 12));
    return { year, month, day, weekday: civil.getUTCDay(), dayKey: KEYS[civil.getUTCDay()], civil };
  }

  function todayKey(now, timeZone) { return todayParts(now, timeZone).dayKey; }

  /** Datas (dia do mês) da semana corrente, de segunda a domingo. */
  let reference = null; // ISO 'YYYY-MM-DD' da semana em exibição (null = semana atual)
  function setReference(iso) { reference = iso && /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : null; }
  function getReference() { return reference; }
  function toISO(p) { return p.year + '-' + String(p.month).padStart(2, '0') + '-' + String(p.day).padStart(2, '0'); }
  function todayISO(now, timeZone) { return toISO(todayParts(now, timeZone)); }
  function addDaysISO(iso, n) { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function weekdayKeyOfISO(iso) { return KEYS[new Date(iso + 'T12:00:00Z').getUTCDay()]; }

  function weekDates(now, timeZone) {
    if (now === undefined && reference) now = new Date(reference + 'T15:00:00Z');
    const t = todayParts(now, timeZone);
    const offsetToMonday = (t.weekday + 6) % 7;
    const monday = new Date(t.civil.getTime() - offsetToMonday * 86400000);
    const out = {};
    Object.keys(WEEK_ORDER).forEach(k => {
      const d = new Date(monday.getTime() + WEEK_ORDER[k] * 86400000);
      out[k] = { day: d.getUTCDate(), month: d.getUTCMonth() + 1, year: d.getUTCFullYear() };
    });
    return out;
  }

  const api = { TZ, KEYS, todayParts, todayKey, weekDates, setReference, getReference, toISO, todayISO, addDaysISO, weekdayKeyOfISO };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.KomodoDate = api;
})(typeof window !== 'undefined' ? window : null);
