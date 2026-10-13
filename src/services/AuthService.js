/**
 * AuthService — backend no desktop local; autenticação local no Capacitor.
 * O servidor é a autoridade para as sessões do desktop. O modo local permanece
 * para o Android/offline e não é usado para autorizar chamadas ao backend.
 */
class AuthService {
  constructor() {
    this.SESSION_KEY = 'komodo_session';
    this.SESSION_TTL_MS = 12 * 60 * 60 * 1000;
    // Old desktop bearer tokens are no longer accepted; purge only the obsolete desktop key.
    if (this.isRemoteMode()) {
      try { localStorage.removeItem(this.SESSION_KEY); } catch {}
    }
  }

  isRemoteMode() {
    const loc = window.location;
    const hostedHttps = loc.protocol === 'https:' &&
      loc.hostname !== 'localhost' && loc.hostname !== '127.0.0.1';
    const localDesktopBackend = loc.protocol === 'http:' &&
      (loc.hostname === '127.0.0.1' || loc.hostname === 'localhost') &&
      loc.port === '32198';
    return hostedHttps || localDesktopBackend;
  }

  _bufToHex(buf) {
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  _hexToBuf(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    return bytes.buffer;
  }
  _randomSaltHex(bytes = 16) {
    const arr = new Uint8Array(bytes);
    crypto.getRandomValues(arr);
    return this._bufToHex(arr.buffer);
  }
  async _deriveHash(password, saltHex, iterations = 150000) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: this._hexToBuf(saltHex), iterations, hash: 'SHA-256' }, keyMaterial, 256);
    return this._bufToHex(bits);
  }

  async hasAnyUser() {
    if (this.isRemoteMode()) {
      const status = await window.apiService.get('/auth/status');
      return Boolean(status?.hasAdmin);
    }
    const rows = await window.dbService.query('SELECT COUNT(*) as total FROM komodo_tbl_usuarios');
    return Boolean(rows && rows[0] && Number(rows[0].total) > 0);
  }

  async createFirstAdmin(email, password, bootstrapSecret = '') {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPassword = String(password || '');
    if (this.isRemoteMode()) {
      if (!cleanEmail || cleanPassword.length < 12) throw new Error('Defina um e-mail e uma senha com no mínimo 12 caracteres.');
      const secret = String(bootstrapSecret || '');
      if (secret.length < 32) throw new Error('Informe a chave de configuração válida fornecida pelo administrador do ambiente.');
      await window.apiService.post('/auth/bootstrap', { email: cleanEmail, password: cleanPassword, bootstrapSecret: secret });
      return true;
    }
    if (!cleanEmail || cleanPassword.length < 8) throw new Error('Defina um e-mail e uma senha com no mínimo 8 caracteres.');
    if (await this.hasAnyUser()) throw new Error('Já existe um administrador cadastrado.');
    const salt = this._randomSaltHex();
    const hash = await this._deriveHash(cleanPassword, salt);
    await window.dbService.insert('komodo_tbl_usuarios', {
      id: 'user_' + Date.now(), email: cleanEmail, salt, hash, papel: 'admin', criado_em: new Date().toISOString()
    });
    return true;
  }

  async login(email, password) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPassword = String(password || '');
    if (this.isRemoteMode()) {
      const data = await window.apiService.post('/auth/login', { email: cleanEmail, password: cleanPassword });
      const session = {
        userId: data.user.id,
        email: data.user.email,
        role: data.user.role,
        expiresAt: data.expiresAt
      };
      sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
      return session;
    }

    const rows = await window.dbService.query('SELECT * FROM komodo_tbl_usuarios WHERE email = ?', [cleanEmail]);
    if (!rows || rows.length === 0) throw new Error('Credenciais inválidas.');
    const user = rows[0];
    const computed = await this._deriveHash(cleanPassword, user.salt);
    if (computed !== user.hash) throw new Error('Credenciais inválidas.');
    const session = { token: this._randomSaltHex(24), userId: user.id, email: user.email, expiresAt: Date.now() + this.SESSION_TTL_MS };
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
    return session;
  }

  getSession() {
    try {
      const storage = this.isRemoteMode() ? sessionStorage : localStorage;
      const raw = storage.getItem(this.SESSION_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw);
      if (!session.expiresAt || Date.now() > session.expiresAt) {
        storage.removeItem(this.SESSION_KEY);
        return null;
      }
      return session;
    } catch { return null; }
  }
  isAuthenticated() { return Boolean(this.getSession()); }

  logout() {
    const session = this.getSession();
    if (this.isRemoteMode() && session && window.apiService) {
      // Inicia a revogação antes de apagar o token local.
      const pending = window.apiService.post('/auth/logout', {}).catch(() => null);
      sessionStorage.removeItem(this.SESSION_KEY);
      return pending;
    }
    localStorage.removeItem(this.SESSION_KEY);
    return Promise.resolve();
  }

  requireAuth(redirectTo = 'login.html') {
    if (!this.isAuthenticated()) window.location.href = redirectTo;
  }
}
window.authService = new AuthService();

