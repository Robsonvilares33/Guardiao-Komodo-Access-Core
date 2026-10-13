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

  static async updateStatus(id, newStatus) {
    if (this._remote()) return window.apiService.put('/visitantes/' + encodeURIComponent(id) + '/status', { status: newStatus });
    const status = Number(newStatus);
    if (!Number.isInteger(status) || status < 0 || status > 2) throw new Error('Status inválido.');
    await window.dbService.update('komodo_acessos', { id, status });
    return { id, status };
  }

  static async getAllDaily(dateString, modulo = 'residencial') {
    // API web filtra por dia da semana (seg..dom), não por data ISO completa.
    const day = String(dateString || '').trim().toLowerCase();
    const date = this._dateFor(day);
    if (this._remote()) return window.apiService.get('/visitantes/' + encodeURIComponent(modulo) + '/' + encodeURIComponent(day) + (date ? '?data=' + date : ''));
    const rows = await this._localQuery(modulo);
    return rows.filter(row => row.dia === dateString && (!date || !row.data || row.data === date));
  }

  static async getAllByModule(modulo = 'residencial') {
    if (this._remote()) return window.apiService.get('/visitantes/' + encodeURIComponent(modulo));
    return this._localQuery(modulo);
  }

  static async getIncidentReports(modulo = 'residencial') {
    const allData = await this.getAllByModule(modulo);
    return allData.filter(item => item.alerta === true || item.alerta === 1 || item.alerta === 'true' || item.alerta === '1');
  }
}
window.VisitorRepository = VisitorRepository;
