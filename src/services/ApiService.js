/**
 * ApiService — API local do backend.
 * As rotas protegidas recebem o token de sessão emitido pelo servidor.
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
      throw new Error('Não foi possível conectar ao serviço local. Verifique se ele está iniciado.');
    }
    if (response.status === 204) return null;
    let data;
    try { data = await response.json(); }
    catch { throw new Error('O serviço retornou uma resposta inválida.'); }
    if (!response.ok || data?.success !== true) {
      const message = data?.message || (response.status === 401 ? 'Sessão expirada. Entre novamente.' : 'Não foi possível concluir a operação.');
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

