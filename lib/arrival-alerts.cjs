'use strict';
// Aviso "seu visitante chegou" (Onda 1, item 3). Quando a portaria marca a chegada, avisa o ANFITRIÃO da visita
// (quem criou a visita/convite, ou o usuário escolhido) por Web Push; se não houver aparelho ou o push falhar, por e-mail (se ligado).
// Tudo opt-in por usuário. Texto SEM dados pessoais do visitante (nada de nome, placa ou documento na tela bloqueada nem no e-mail).
// O registro de envios guarda só canal/tipo/resultado/horário. E-mail: limite por usuário e teto diário global (~500/dia do Gmail).
const WP = require('./webpush.cjs'); const SMTP = require('./smtp.cjs');
const SUBS = 'kac_push_subscriptions', PREFS = 'kac_notification_prefs', LOG = 'kac_notification_log';
const MAX_DEVICES = 10;
function siteUrl(env) { const u = String(env.KAC_PUBLIC_URL || 'https://guardiao-komodo-access-core.vercel.app').replace(/\/+$/, ''); return /^https:\/\/[a-z0-9.-]+$/i.test(u) ? u : 'https://guardiao-komodo-access-core.vercel.app'; }
function smtpReady(env) { return !!(SMTP.safeAddr(env.KAC_SMTP_USER) && String(env.KAC_SMTP_PASS || '').replace(/\s/g, '').length >= 16); }
function dailyCap(env) { const n = Number.parseInt(env.KAC_EMAIL_DAILY_CAP, 10); return Number.isInteger(n) && n > 0 && n <= 500 ? n : 450; }
function maskEmail(e) { const s = String(e || ''); const [u, d] = s.split('@'); if (!u || !d) return null; return (u.length <= 2 ? u[0] : u.slice(0, 2)) + '•••@' + d; }
function texts(kind, hora, modulo, env) {
  const url = siteUrl(env) + (modulo === 'residencial' ? '/residencial.html' : '/index.html');
  if (kind === 'test') return { title: 'Teste de aviso', body: 'Tudo certo: os avisos de chegada estão funcionando neste aparelho.', url,
    subject: 'Teste de aviso do Guardião Komodo', text: `Olá,\n\nEste é um teste: os avisos de chegada por e-mail estão funcionando.\n\nAbrir o Guardião Komodo: ${url}\n\nVocê recebe este e-mail porque ligou os avisos de chegada por e-mail. Para desligar: abra o app, toque em Mais > Avisos de chegada.\n\nGuardião Komodo` };
  const h = /^([01]\d|2[0-3]):[0-5]\d$/.test(String(hora || '')) ? String(hora) : null;
  const body = h ? `Um visitante agendado para as ${h} chegou à portaria.` : 'Um visitante agendado chegou à portaria.';
  return { title: 'Seu visitante chegou', body, url, subject: 'Seu visitante chegou',
    text: `Olá,\n\n${body}\n\nAbra o Guardião Komodo para ver os detalhes: ${url}\n\nVocê recebe este e-mail porque ligou os avisos de chegada por e-mail. Para desligar: abra o app, toque em Mais > Avisos de chegada.\n\nGuardião Komodo` };
}
function createAlerts({ db, reply, audit, rateHit, env = process.env, push = WP, smtp = SMTP }) {
  async function log(orgId, userId, visitId, channel, kind, status, code) {
    try { await db(LOG, { method: 'POST', body: [{ organization_id: orgId, user_id: userId, visit_id: visitId || null, channel, kind, status, error_code: code ? String(code).slice(0, 40) : null }], prefer: 'return=minimal' }); } catch (_) {}
  }
  async function prefsOf(orgId, userId) { const r = await db(PREFS, { query: `select=push_enabled,email_enabled&organization_id=eq.${orgId}&user_id=eq.${encodeURIComponent(userId)}&limit=1` }); return r?.[0] || { push_enabled: false, email_enabled: false }; }
  async function emailsSentToday() {
    const since = new Date(Date.now() - 864e5).toISOString();
    const r = await db(LOG, { query: `select=id&channel=eq.email&status=eq.sent&created_at=gte.${since}&limit=${dailyCap(env) + 1}` }); return Array.isArray(r) ? r.length : 0;
  }
  // Envia para um usuário. kind: 'arrival' | 'test'. Retorna um resumo SEM conteúdo.
  async function deliver(orgId, userId, { kind, visitId = null, hora = null, modulo = 'empresarial', forceEmail = false }) {
    const p = await prefsOf(orgId, userId); const t = texts(kind, hora, modulo, env);
    const out = { push: { sent: 0, failed: 0 }, email: 'off' };
    if (p.push_enabled) {
      const subs = await db(SUBS, { query: `select=id,endpoint,p256dh,auth,fail_count&organization_id=eq.${orgId}&user_id=eq.${encodeURIComponent(userId)}&limit=${MAX_DEVICES}` }) || [];
      const payload = JSON.stringify({ title: t.title, body: t.body, url: t.url, tag: kind === 'test' ? 'kac-test' : 'kac-arrival' });
      await Promise.all(subs.map(async s => {
        const r = await push.send({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { env });
        if (r.ok) { out.push.sent++; await db(SUBS, { method: 'PATCH', query: `id=eq.${s.id}`, body: { fail_count: 0, last_ok_at: new Date().toISOString() }, prefer: 'return=minimal' }).catch(() => {}); }
        else { out.push.failed++; if (r.gone) await db(SUBS, { method: 'DELETE', query: `id=eq.${s.id}` }).catch(() => {}); else await db(SUBS, { method: 'PATCH', query: `id=eq.${s.id}`, body: { fail_count: (s.fail_count || 0) + 1 }, prefer: 'return=minimal' }).catch(() => {}); }
        await log(orgId, userId, visitId, 'push', kind, r.ok ? 'sent' : 'failed', r.ok ? null : r.code);
      }));
    }
    // E-mail: reserva quando o push não chegou a nenhum aparelho (ou no teste, se pedido). Opt-in + limites.
    if (p.email_enabled && (out.push.sent === 0 || forceEmail)) {
      let code = null;
      if (!smtpReady(env)) code = 'smtp_not_configured';
      else if (!(await rateHit('ntf:mail:' + orgId + ':' + userId, 3600, 20))) code = 'user_rate_limited';
      else if ((await emailsSentToday()) >= dailyCap(env)) code = 'daily_cap';
      if (code) { out.email = code; await log(orgId, userId, visitId, 'email', kind, 'skipped', code); }
      else {
        const u = (await db('komodo_tbl_usuarios', { query: `select=email&id=eq.${encodeURIComponent(userId)}&limit=1` }))?.[0];
        if (!SMTP.safeAddr(u?.email)) { out.email = 'no_address'; await log(orgId, userId, visitId, 'email', kind, 'skipped', 'no_address'); }
        else {
          try { await smtp.send({ user: env.KAC_SMTP_USER, pass: String(env.KAC_SMTP_PASS).replace(/\s/g, ''), fromName: 'Guardião Komodo', to: u.email, subject: t.subject, text: t.text }); out.email = 'sent'; await log(orgId, userId, visitId, 'email', kind, 'sent'); }
          catch (e) { out.email = 'failed'; await log(orgId, userId, visitId, 'email', kind, 'failed', (e && e.message) || 'smtp'); }
        }
      }
    }
    return out;
  }
  // Chamado pela rota de status quando a visita passa para "Na portaria". Nunca derruba a marcação de chegada.
  async function onArrival(session, visitId) {
    try {
      const v = (await db('komodo_acessos', { query: `select=id,hora,modulo,host_user_id&organization_id=eq.${session.orgId}&id=eq.${encodeURIComponent(visitId)}&limit=1` }))?.[0];
      if (!v || !v.host_user_id) return { skipped: 'no_host' };
      // Anfitrião precisa continuar na empresa da visita.
      const m = await db('kac_memberships', { query: `select=user_id&organization_id=eq.${session.orgId}&user_id=eq.${encodeURIComponent(v.host_user_id)}&limit=1` });
      if (!m?.length) return { skipped: 'host_not_member' };
      if (!(await rateHit('ntf:visit:' + visitId, 6 * 3600, 1))) return { skipped: 'already_notified' };
      return await deliver(session.orgId, v.host_user_id, { kind: 'arrival', visitId: v.id, hora: v.hora, modulo: v.modulo });
    } catch (e) { console.error('[avisos] falha ao avisar', e && e.message ? e.message.slice(0, 60) : 'erro'); return { error: true }; }
  }
  async function hostFor(session, wanted) {
    const id = String(wanted || '').trim(); if (!id) return session.userId;
    if (!/^[A-Za-z0-9_.:@-]{1,80}$/.test(id)) return null;
    const m = await db('kac_memberships', { query: `select=user_id&organization_id=eq.${session.orgId}&user_id=eq.${encodeURIComponent(id)}&limit=1` });
    return m?.length ? id : null;
  }
  async function handle(req, res, route, body, session) {
    const O = session.orgId, U = String(session.userId || ''), OU = `organization_id=eq.${O}&user_id=eq.${encodeURIComponent(U)}`;
    if (req.method === 'GET' && route === '/avisos') {
      const p = await prefsOf(O, U); const subs = await db(SUBS, { query: `select=id,label,created_at,last_ok_at&${OU}&order=created_at.desc&limit=${MAX_DEVICES}` }) || [];
      const keys = WP.vapidKeys(env);
      return reply(res, 200, { success: true, data: { vapidPublicKey: keys ? keys.publicKey : null, push: !!p.push_enabled, email: !!p.email_enabled, emailDisponivel: smtpReady(env), emailConta: maskEmail(session.email), aparelhos: subs.map(s => ({ id: s.id, label: s.label || 'Aparelho', desde: s.created_at, ultimoOk: s.last_ok_at })) } });
    }
    if (req.method === 'PUT' && route === '/avisos') {
      const row = { organization_id: O, user_id: U, updated_at: new Date().toISOString() };
      if (typeof body.push === 'boolean') row.push_enabled = body.push; if (typeof body.email === 'boolean') row.email_enabled = body.email;
      if (!('push_enabled' in row) && !('email_enabled' in row)) return reply(res, 422, { success: false, message: 'Nada para alterar.' });
      if (row.email_enabled && !smtpReady(env)) return reply(res, 409, { success: false, code: 'email_unavailable', message: 'O aviso por e-mail ainda não está disponível neste sistema.' });
      await db(PREFS, { method: 'POST', query: 'on_conflict=organization_id,user_id', body: [row], prefer: 'resolution=merge-duplicates,return=minimal' });
      if (row.push_enabled === false) await db(SUBS, { method: 'DELETE', query: OU });
      await audit(session, 'alerts.prefs', U, { push: row.push_enabled, email: row.email_enabled }, 'alerts');
      return reply(res, 200, { success: true, data: { ok: true } });
    }
    if (req.method === 'POST' && route === '/avisos/aparelhos') {
      if (!(await rateHit('ntf:sub:' + U, 3600, 30))) return reply(res, 429, { success: false, message: 'Muitas tentativas. Aguarde e tente de novo.' });
      const endpoint = String(body.endpoint || ''), keys = body.keys || {};
      if (!WP.allowedEndpoint(endpoint) || !WP.validKeys(keys)) return reply(res, 422, { success: false, message: 'Este navegador não enviou uma inscrição de aviso válida.' });
      const count = (await db(SUBS, { query: `select=id&${OU}&endpoint=neq.${encodeURIComponent(endpoint)}&limit=${MAX_DEVICES + 1}` }) || []).length;
      if (count >= MAX_DEVICES) return reply(res, 409, { success: false, message: `Limite de ${MAX_DEVICES} aparelhos. Remova um aparelho antigo.` });
      const label = String(body.label || '').replace(/[^\p{L}\p{N} ()./-]/gu, '').slice(0, 60) || null;
      await db(SUBS, { method: 'POST', query: 'on_conflict=endpoint', body: [{ organization_id: O, user_id: U, endpoint, p256dh: String(keys.p256dh), auth: String(keys.auth), label, fail_count: 0, updated_at: new Date().toISOString() }], prefer: 'resolution=merge-duplicates,return=minimal' });
      await db(PREFS, { method: 'POST', query: 'on_conflict=organization_id,user_id', body: [{ organization_id: O, user_id: U, push_enabled: true, updated_at: new Date().toISOString() }], prefer: 'resolution=merge-duplicates,return=minimal' });
      await audit(session, 'alerts.device_add', U, { label }, 'alerts');
      return reply(res, 201, { success: true, data: { ok: true } });
    }
    if (req.method === 'POST' && route === '/avisos/aparelhos/remover') {
      const endpoint = String(body.endpoint || ''), id = String(body.id || '');
      const q = /^[0-9a-f-]{36}$/i.test(id) ? `${OU}&id=eq.${id}` : WP.allowedEndpoint(endpoint) ? `${OU}&endpoint=eq.${encodeURIComponent(endpoint)}` : null;
      if (!q) return reply(res, 422, { success: false, message: 'Aparelho inválido.' });
      await db(SUBS, { method: 'DELETE', query: q }); await audit(session, 'alerts.device_remove', U, {}, 'alerts');
      return reply(res, 200, { success: true, data: { ok: true } });
    }
    if (req.method === 'POST' && route === '/avisos/teste') {
      if (!(await rateHit('ntf:test:' + U, 600, 5))) return reply(res, 429, { success: false, message: 'Muitos testes seguidos. Aguarde alguns minutos.' });
      const r = await deliver(O, U, { kind: 'test', forceEmail: body.email === true });
      return reply(res, 200, { success: true, data: r });
    }
    if (req.method === 'GET' && route === '/avisos/membros') {
      const ms = await db('kac_memberships', { query: `select=user_id,role&organization_id=eq.${O}&order=created_at.asc&limit=200` }) || [];
      const ids = ms.map(m => m.user_id).filter(x => /^[A-Za-z0-9_.:@-]{1,80}$/.test(x));
      const us = ids.length ? (await db('komodo_tbl_usuarios', { query: `select=id,email&id=in.(${ids.map(encodeURIComponent).join(',')})` }) || []) : [];
      const em = Object.fromEntries(us.map(u => [u.id, u.email]));
      return reply(res, 200, { success: true, data: ids.map(id => ({ id, label: id === U ? 'Eu (' + (em[id] || 'minha conta') + ')' : (em[id] || 'Usuário'), eu: id === U })) });
    }
    return reply(res, 404, { success: false, message: 'Rota não encontrada.' });
  }
  return { handle, onArrival, deliver, hostFor };
}
module.exports = { createAlerts, texts, maskEmail, smtpReady, dailyCap };
