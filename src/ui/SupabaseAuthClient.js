/* Fase C — cliente Supabase Auth (GoTrue REST, sem SDK). Só funciona se /api/auth/supabase/config existir (flag KAC_SUPABASE_AUTH=on).
   Tokens ficam só em memória (sem armazenamento persistente no navegador). Lógica pura e testável: fetch/location injetáveis. */
(function (root) {
  'use strict';
  function b64url(s) { s = String(s).replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return typeof atob === 'function' ? atob(s) : Buffer.from(s, 'base64').toString('binary'); }
  function claims(token) { try { return JSON.parse(b64url(String(token).split('.')[1])); } catch (_) { return null; } }
  function parseHash(hash) { var out = {}; String(hash || '').replace(/^#/, '').split('&').forEach(function (kv) { if (!kv) return; var i = kv.indexOf('='); var k = decodeURIComponent(i < 0 ? kv : kv.slice(0, i)); var v = i < 0 ? '' : decodeURIComponent(kv.slice(i + 1).replace(/\+/g, ' ')); out[k] = v; }); return out; }
  // GoTrue REST devolve totp.qr_code como SVG cru ("<?xml…<svg…>"), não data URI (o SDK supabase-js é quem prefixa).
  // Converte para data URI codificado (aceito por img-src data:). Data URI de imagem já pronto passa; qualquer outra coisa → null.
  function qrSrc(q) { q = String(q || '').trim(); if (/^data:image\/svg\+xml;base64,/i.test(q) || /^data:image\/(png|gif|jpeg);base64,/i.test(q)) return q; var m = /^data:image\/svg\+xml(;[^,]*)?,/i.exec(q); var svg = m ? q.slice(m[0].length) : q; if (m && /%3Csvg/i.test(svg)) { try { svg = decodeURIComponent(svg); } catch (_) { return null; } } if (!/^(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(svg)) return null; return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); }
  function groupSecret(s) { return String(s || '').replace(/[^A-Za-z2-7=]/g, '').toUpperCase().replace(/(.{4})(?=.)/g, '$1 '); }
  var KINDS = ['condominio', 'predio', 'comercio', 'portaria', 'outro'];
  function validCnpj(v) { var d = String(v || '').replace(/[.\-\/\s]/g, ''); if (!/^\d{14}$/.test(d) || /^(\d)\1{13}$/.test(d)) return false; function dv(n) { var w = n === 12 ? [5,4,3,2,9,8,7,6,5,4,3,2] : [6,5,4,3,2,9,8,7,6,5,4,3,2]; var s = 0; for (var i = 0; i < n; i++) s += w[i] * Number(d[i]); s = s % 11; return s < 2 ? 0 : 11 - s; } return dv(12) === Number(d[12]) && dv(13) === Number(d[13]); }
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
    function schedule() { if (timer) { timers.clear(timer); timer = null; } if (!session || !session.refresh_token) return; var c = claims(session.access_token); if (!c || !c.exp) return; var ms = Math.max(5000, c.exp * 1000 - now() - 60000); timer = timers.set(function () { var used = session; refresh().catch(function () { if (session !== used) return; /* sessão já foi trocada (ex.: verify do MFA): ignora a falha do refresh antigo */ setSession(null); if (onChange) onChange('expired'); }); }, ms); }
    function setSession(s) { session = s && s.access_token ? { access_token: s.access_token, refresh_token: s.refresh_token || null } : null; schedule(); return session; }
    async function refresh() { if (!session || !session.refresh_token) throw new Error('Sem refresh token.'); var used = session; var j = await gt('/token?grant_type=refresh_token', { method: 'POST', auth: false, body: { refresh_token: used.refresh_token } }); if (session !== used) return session; /* trocada no meio (verify/logout): não sobrescreve */ var r = setSession(j); if (onChange) onChange('refreshed'); return r; }
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
      unenroll(factorId) { return gt('/factors/' + encodeURIComponent(factorId), { method: 'DELETE' }); },
      // Reentrada: remove fatores TOTP não verificados (QR antigo abandonado) antes de cadastrar outro; nome único evita 422 mfa_factor_name_conflict.
      async enroll() { var fs = await this.factors(); for (var i = 0; i < fs.length; i++) { if (fs[i].status !== 'verified') await this.unenroll(fs[i].id); } var r = await gt('/factors', { method: 'POST', body: { factor_type: 'totp', friendly_name: 'KAC ' + new Date(now()).toISOString().slice(0, 16).replace('T', ' ') + ' ' + Math.random().toString(36).slice(2, 6) } }); var t = r.totp || {}; return { id: r.id, qrSrc: qrSrc(t.qr_code), secret: String(t.secret || ''), uri: /^otpauth:\/\/totp\//.test(String(t.uri || '')) ? t.uri : null }; },
      async verify(factorId, code) { if (!factorId) throw new Error('Fator MFA não encontrado. Entre novamente.'); if (!/^\d{6}$/.test(String(code))) throw new Error('Código deve ter 6 dígitos.'); if (timer) { timers.clear(timer); timer = null; } /* sem refresh concorrente durante o verify */ try { var c = await gt('/factors/' + encodeURIComponent(factorId) + '/challenge', { method: 'POST' }); return setSession(await gt('/factors/' + encodeURIComponent(factorId) + '/verify', { method: 'POST', body: { challenge_id: c.id, code: String(code) } })); } catch (e) { schedule(); var m = String(e && e.message || ''); if (e && (e.status === 422 || e.status === 400 || /invalid|expired|totp|code/i.test(m))) { var x = new Error('Código inválido ou expirado. Use o código que aparece agora no app (confira se o relógio do celular está automático) e tente de novo.'); x.status = e.status; x.code = e.code || 'mfa_invalid_code'; throw x; } if (e && e.status === 401) { var y = new Error('Sua sessão expirou durante a verificação. Entre novamente.'); y.status = 401; throw y; } throw e; } },
      link() { return api('/auth/supabase/link', 'POST'); },
      refresh: refresh,
      onSessionChange: function (fn) { onChange = fn; },
      createInvite(email, role) { email = String(email || '').trim().toLowerCase(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Promise.reject(new Error('E-mail inválido.')); if (['admin', 'operator', 'viewer'].indexOf(role) < 0) return Promise.reject(new Error('Papel inválido.')); return api('/convites', 'POST', { email: email, role: role }); },
      inviteLink(base, token) { return String(base).replace(/[?#].*$/, '') + '?convite=' + encodeURIComponent(token); },
      me() { return api('/auth/supabase/me', 'GET'); },
      admin(path, method, body) { path = String(path || ''); if (!/^\/admin\/[a-z]+(\/[A-Za-z0-9_.:@%-]+)?(\?[a-z0-9=&]*)?$/.test(path)) return Promise.reject(new Error('Rota inválida.')); return api(path, method || 'GET', body); },
      onboard(o) { o = o || {}; var name = String(o.name || '').trim(); if (name.length < 2 || name.length > 120) return Promise.reject(new Error('Informe o nome da empresa (2 a 120 caracteres).')); if (KINDS.indexOf(o.kind) < 0) return Promise.reject(new Error('Escolha o tipo.')); if (o.cnpj && !validCnpj(o.cnpj)) return Promise.reject(new Error('CNPJ inválido.')); return api('/auth/supabase/onboarding', 'POST', { name: name, kind: o.kind, cnpj: o.cnpj || null, timezone: o.timezone || 'America/Sao_Paulo' }); },
      openApp() { return api('/auth/supabase/session', 'POST', {}); },
      acceptInvite(token) { if (!INVITE_RE.test(String(token))) return Promise.reject(new Error('Convite inválido.')); return api('/convites/aceitar', 'POST', { token: token }); },
      async signOut() { if (session) { try { await gt('/logout', { method: 'POST' }); } catch (_) {} } setSession(null); }
    };
  }
  root.SupabaseAuthClient = { create: create, _util: { qrSrc: qrSrc, groupSecret: groupSecret, claims: claims, parseHash: parseHash, inviteFrom: inviteFrom, validCnpj: validCnpj, KINDS: KINDS } };
})(typeof window !== 'undefined' ? window : globalThis);
