/**
 * ApiService â€” API local do backend.
 * As rotas protegidas recebem o token de sessÃ£o emitido pelo servidor.
 */
class ApiService {
  constructor() {
    this.baseUrl = '/api';
  }

  _headers(extra = {}) {
    return { ...extra };
  }

  async _request(method, endpoint, payload) {
    const options = { method, headers: this._headers(), credentials: 'same-origin' };
    if (payload !== undefined) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(payload);
    }
    let response;
    try {
      response = await fetch(this.baseUrl + endpoint, options);
    } catch {
      throw new Error('NÃ£o foi possÃ­vel conectar ao serviÃ§o local. Verifique se ele estÃ¡ iniciado.');
    }
    if (response.status === 204) return null;
    let data;
    try { data = await response.json(); }
    catch { throw new Error('O serviÃ§o retornou uma resposta invÃ¡lida.'); }
    if (!response.ok || data?.success !== true) {
      const message = data?.message || (response.status === 401 ? 'SessÃ£o expirada. Entre novamente.' : 'NÃ£o foi possÃ­vel concluir a operaÃ§Ã£o.');
      if (response.status === 401 && !endpoint.startsWith('/auth/login') && !endpoint.startsWith('/auth/bootstrap')) {
        try { sessionStorage.removeItem('komodo_session'); } catch {}
      }
      throw new Error(message);
    }
    return data.data;
  }

  get(endpoint) { return this._request('GET', endpoint); }
  post(endpoint, payload) { return this._request('POST', endpoint, payload); }
  put(endpoint, payload) { return this._request('PUT', endpoint, payload); }
  delete(endpoint) { return this._request('DELETE', endpoint); }
}
window.apiService = new ApiService();

