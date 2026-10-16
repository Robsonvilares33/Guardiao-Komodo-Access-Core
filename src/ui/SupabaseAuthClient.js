/* Fase C — cliente Supabase Auth (GoTrue REST, sem SDK). Só funciona se /api/auth/supabase/config existir (flag KAC_SUPABASE_AUTH=on).
   Tokens ficam só em memória (sem armazenamento persistente no navegador). Lógica pura e testável: fetch/location injetáveis. */
(function (root) {
  'use strict';
  function b64url(s) { s = String(s).replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return typeof atob === 'function' ? atob(s) : Buffer.from(s, 'base64').toString('binary'); }
  function claims(token) { try { return JSON.parse(b64url(String(token).split('.')[1])); } catch (_) { return null; } }
  function parseHash(hash) { var out = {}; String(hash || '').replace(/^#/, '').split('&').forEach(function (kv) { if (!kv) return; var i = kv.indexOf('='); var k = decodeURIComponent(i < 0 ? kv : kv.slice(0, i)); var v = i < 0 ? '' : decodeURIComponent(kv.slice(i + 1).replace(/\+/g, ' ')); out[k] = v; }); return out; }
  var INVITE_RE = /^[A-Za-z0-9_-]{40,64}$/;
  function inviteFrom(search) { var m = /[?&]convite=([^&]+)/.exec(String(search || '')); var t = m ? decodeURIComponent(m[1]) : ''; return INVITE_RE.test(t) ? t : null; }
  function create(opts) {
    opts = opts || {}; var f = opts.fetch || root.fetch.bind(root); var cfg = null; var session = null;
    var timers = opts.timers || { set: function (fn, ms) { return setTimeout(fn, ms); }, clear: function (t) { clearTimeout(t); } }; var now = opts.now || Date.now; var timer = null; var onChange = null;
    function err(r, j) { var e = new Error((j && (j.msg || j.message || j.error_description || j.error)) || ('HTTP ' + r.status)); e.status = r.status; e.code = j && (j.code || j.error_code); return e; }
    async function json(r) { try { return await r.json(); } catch (_) { return null; } }
    async function gt(path, o) { o = o || {}; var h = { apikey: cfg.anonKey, 'Content-Type': 'application/json' }; if (o.auth !== false && session) h.Authorization = 'Bearer ' + session.access_token; var r = await f(cfg.url + '/auth/v1' + path, { method: o.method || 'GET', headers: h, body: o.body ? JSON.stringify(o.body) : undefined }); var j = await json(r); if (!r.ok) throw err(r, j); return j; }
    async function api(path, method, body) { if (!session) throw new Error('Sem sessão Supabase.'); var r = await f('/api' + path, { method: method, credentials: 'same-origin', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token }, body: body ? JSON.stringify(body) : undefined }); var j = await json(r); if (!r.ok) throw err(r, j); return j; }
    // Renovação automática: agenda refresh 60 s antes do exp do JWT (mín. 5 s). Falha → sessão encerrada (novo login).
    function schedule() { if (timer) { timers.clear(timer); timer = null; } if (!session || !session.refresh_token) return; var c = claims(session.access_token); if (!c || !c.exp) return; var ms = Math.max(5000, c.exp * 1000 - now() - 60000); timer = timers.set(function () { refresh().catch(function () { setSession(null); if (onChange) onChange('expired'); }); }, ms); }
    function setSession(s) { session = s && s.access_token ? { access_token: s.access_token, refresh_token: s.refresh_token || null } : null; schedule(); return session; }
    async function refresh() { if (!session || !session.refresh_token) throw new Error('Sem refresh token.'); var r = setSession(await gt('/token?grant_type=refresh_token', { method: 'POST', auth: false, body: { refresh_token: session.refresh_token } })); if (onChange) onChange('refreshed'); return r; }
    return {
      async loadConfig() { var r = await f('/api/auth/supabase/config', { credentials: 'same-origin' }); this.configStatus = 'HTTP ' + r.status + (r.redirected ? ' (redirecionado)' : ''); if (r.status === 404) return null; var j = await json(r); if (!r.ok || !j || !j.data || !j.data.enabled || !j.data.url || !j.data.anonKey) { if (r.ok) this.configStatus += !j ? ' (resposta não-JSON)' : !j.data || !j.data.anonKey ? ' (sem chave pública)' : ' (config incompleta)'; return null; } cfg = j.data; return cfg; },
      config: function () { return cfg; },
      session: function () { return session; },
      claims: function () { return session ? claims(session.access_token) : null; },
      aal: function () { var c = session && claims(session.access_token); return c ? c.aal || 'aal1' : null; },
      fromRedirect(hash) { var p = parseHash(hash); if (p.error || p.error_description) throw new Error(p.error_description || p.error); return p.access_token ? setSession(p) : null; },
      signUp(email, password, redirectTo) { return gt('/signup?redirect_to=' + encodeURIComponent(redirectTo), { method: 'POST', auth: false, body: { email: email, password: password } }); },
      async signIn(email, password) { return setSession(await gt('/token?grant_type=password', { method: 'POST', auth: false, body: { email: email, password: password } })); },
      googleUrl(redirectTo) { return cfg.url + '/auth/v1/authorize?provider=google&redirect_to=' + encodeURIComponent(redirectTo); },
      async factors() { var u = await gt('/user'); return (u.factors || []).filter(function (x) { return x.factor_type === 'totp'; }); },
      enroll() { return gt('/factors', { method: 'POST', body: { factor_type: 'totp', friendly_name: 'KAC ' + new Date().toISOString().slice(0, 10) } }); },
      async verify(factorId, code) { if (!/^\d{6}$/.test(String(code))) throw new Error('Código deve ter 6 dígitos.'); var c = await gt('/factors/' + encodeURIComponent(factorId) + '/challenge', { method: 'POST' }); return setSession(await gt('/factors/' + encodeURIComponent(factorId) + '/verify', { method: 'POST', body: { challenge_id: c.id, code: String(code) } })); },
      link() { return api('/auth/supabase/link', 'POST'); },
      refresh: refresh,
      onSessionChange: function (fn) { onChange = fn; },
      createInvite(email, role) { email = String(email || '').trim().toLowerCase(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Promise.reject(new Error('E-mail inválido.')); if (['admin', 'operator', 'viewer'].indexOf(role) < 0) return Promise.reject(new Error('Papel inválido.')); return api('/convites', 'POST', { email: email, role: role }); },
      inviteLink(base, token) { return String(base).replace(/[?#].*$/, '') + '?convite=' + encodeURIComponent(token); },
      me() { return api('/auth/supabase/me', 'GET'); },
      openApp() { return api('/auth/supabase/session', 'POST', {}); },
      acceptInvite(token) { if (!INVITE_RE.test(String(token))) return Promise.reject(new Error('Convite inválido.')); return api('/convites/aceitar', 'POST', { token: token }); },
      async signOut() { if (session) { try { await gt('/logout', { method: 'POST' }); } catch (_) {} } setSession(null); }
    };
  }
  root.SupabaseAuthClient = { create: create, _util: { claims: claims, parseHash: parseHash, inviteFrom: inviteFrom } };
})(typeof window !== 'undefined' ? window : globalThis);
