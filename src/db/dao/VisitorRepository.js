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

  static async save(visitorDTO) {
    let result;
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
    if (this._remote()) return window.apiService.get('/visitantes/' + encodeURIComponent(modulo) + '/' + encodeURIComponent(day));
    const rows = await this._localQuery(modulo);
    return rows.filter(row => row.dia === dateString);
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
