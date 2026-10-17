/**
 * Repository de acessos: API autenticada no desktop; SQLite local no Capacitor.
 * Não há fallback silencioso do desktop para localStorage se a API falhar.
 */
class VisitorRepository {
  static _remote() { return Boolean(window.authService?.isRemoteMode()); }
  static async _localQuery(modulo) {
    await window.dbService.init();
    return window.dbService.query('SELECT * FROM komodo_acessos WHERE modulo = ?', [modulo]);
  }

  static _dateFor(dia) {
    const KD = window.KomodoDate; if (!KD || !dia) return null;
    const w = KD.weekDates()[dia]; if (!w) return null;
    return w.year + '-' + String(w.month).padStart(2, '0') + '-' + String(w.day).padStart(2, '0');
  }

  static async save(visitorDTO) {
    let result;
    if (!visitorDTO.data) { const d = this._dateFor(visitorDTO.dia); if (d) visitorDTO = { ...visitorDTO, data: d }; }
    if (this._remote()) {
      if (!window.apiService) throw new Error('ApiService não carregado.');
      result = await window.apiService.post('/visitantes', visitorDTO);
    } else {
      result = await window.dbService.insert('komodo_acessos', { ...visitorDTO });
    }
    if (window.eventBus && window.SystemEvents) window.eventBus.emit(window.SystemEvents.DB_SAVE_SUCCESS, result);
    return result;
  }

  static async delete(id) {
    if (this._remote()) return window.apiService.delete('/visitantes/' + encodeURIComponent(id));
    await window.dbService.delete('komodo_acessos', id);
    return { id, deleted: true };
  }

  static async reschedule(id, data, hora) {
    if (!this._remote()) throw new Error('Reagendamento disponível apenas no modo online.');
    return window.apiService.put('/visitantes/' + encodeURIComponent(id) + '/reagendar', { data, hora });
  }

  static async history(id) {
    if (!this._remote()) return { data: [] };
    return window.apiService.get('/visitantes/' + encodeURIComponent(id) + '/historico');
  }

  static async updateStatus(id, newStatus, opts = {}) {
    const body = { status: newStatus };
    if (opts.from !== undefined) body.from = opts.from;
    if (opts.undo === true) body.undo = true;
    if (this._remote()) {
      try { return await window.apiService.put('/visitantes/' + encodeURIComponent(id) + '/status', body); }
      catch (e) {
        // Achado 4: sem rede → fila cifrada no aparelho; envia sozinho quando a conexão voltar.
        const off = window.komodoOffline; if (!off || !window.KomodoOffline.isNetworkError(e) || opts.undo === true) throw e;
        await off.enqueue({ id, status: newStatus, from: opts.from });
        const ld = this._lastDay; if (ld) { try { await off.patchDay(ld.modulo, ld.k, id, Number(newStatus)); } catch (_) {} }
        try { window.dispatchEvent(new CustomEvent('kac:offline-queued')); } catch (_) {}
        return { id, status: Number(newStatus), queued: true };
      }
    }
    const status = Number(newStatus);
    if (!Number.isInteger(status) || status < 0 || status > 2) throw new Error('Status inválido.');
    if (opts.from !== undefined) { await window.dbService.init(); const cur = (await window.dbService.query('SELECT status FROM komodo_acessos WHERE id = ?', [id]))[0]; if (cur && Number(cur.status || 0) !== Number(opts.from)) { const e = new Error('Status alterado em outro aparelho.'); e.status = 409; throw e; } }
    await window.dbService.update('komodo_acessos', { id, status });
    return { id, status };
  }

  static async getAllDaily(dateString, modulo = 'residencial') {
    // API web filtra por dia da semana (seg..dom), não por data ISO completa.
    const day = String(dateString || '').trim().toLowerCase();
    const date = this._dateFor(day);
    if (this._remote()) {
      const off = window.komodoOffline, k = day + ':' + (date || '');
      try { const rows = await window.apiService.get('/visitantes/' + encodeURIComponent(modulo) + '/' + encodeURIComponent(day) + (date ? '?data=' + date : ''));
        this._lastDay = { modulo, k };
        if (off) off.cacheDay(modulo, k, Array.isArray(rows) ? rows : (rows?.data || [])).catch(() => {});
        return rows; }
      catch (e) { this._lastDay = { modulo, k }; const cached = off && window.KomodoOffline.isNetworkError(e) ? await off.readDay(modulo, k) : null; if (cached) { cached.offline = true; return cached; } throw e; }
    }
    const rows = await this._localQuery(modulo);
    return rows.filter(row => row.dia === dateString && (!date || !row.data || row.data === date));
  }

  static async getAllByModule(modulo = 'residencial') {
    if (this._remote()) return window.apiService.get('/visitantes/' + encodeURIComponent(modulo));
    return this._localQuery(modulo);
  }

  /** Registros do módulo num intervalo de datas (inclusive). de/ate: 'YYYY-MM-DD' ou null. */
  static async getRange(modulo, de, ate) {
    if (this._remote()) {
      const qs = [de ? 'de=' + de : '', ate ? 'ate=' + ate : ''].filter(Boolean).join('&');
      return window.apiService.get('/visitantes/' + encodeURIComponent(modulo) + (qs ? '?' + qs : ''));
    }
    const rows = await this._localQuery(modulo);
    return rows.filter(r => r.data && (!de || r.data >= de) && (!ate || r.data <= ate))
      .sort((a, b) => (a.data + (a.hora || '')).localeCompare(b.data + (b.hora || '')));
  }

  static async getIncidentReports(modulo = 'residencial') {
    const allData = await this.getAllByModule(modulo);
    return allData.filter(item => item.alerta === true || item.alerta === 1 || item.alerta === 'true' || item.alerta === '1');
  }
}
window.VisitorRepository = VisitorRepository;

// Achado 4: ao voltar a conexão (e ao abrir o app), envia a fila offline em ordem; conflitos (409) viram aviso, nada é sobrescrito.
if (typeof window !== 'undefined' && window.addEventListener) {
  const kacFlush = async () => { const off = window.komodoOffline; if (!off || !VisitorRepository._remote() || navigator.onLine === false) return;
    try { const r = await off.flush(op => window.apiService.put('/visitantes/' + encodeURIComponent(op.id) + '/status', op.from === undefined ? { status: op.status } : { status: op.status, from: op.from }));
      if (r.sent || r.conflicts || r.failed) window.dispatchEvent(new CustomEvent('kac:offline-synced', { detail: r })); } catch (_) {} };
  window.addEventListener('online', kacFlush); window.addEventListener('load', () => setTimeout(kacFlush, 1500));
}
