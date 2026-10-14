'use strict';
/* Fase E — provedor Mercado Pago em modo SANDBOX (credenciais TEST-). Só ativo com KAC_BILLING=on.
   - Recusa credenciais de produção (APP_USR-) e notificações live_mode=true.
   - Webhook: x-signature "ts=..,v1=.." = HMAC-SHA256(secret, "id:<data.id>;request-id:<x-request-id>;ts:<ts>;") (docs MP),
     janela anti-replay, idempotência, org resolvida no servidor (external_reference assinado + consulta do pagamento na API).
   - Nunca loga nem devolve segredos. Persistência: kac_payment_events + kac_subscriptions (migração 007 aplicada em 14/10/2026). */
const crypto = require('node:crypto');
const API = 'https://api.mercadopago.com';
const WINDOW_SEC = 300;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUS_EVENT = { approved: 'checkout.completed', rejected: 'invoice.payment_failed', cancelled: 'invoice.payment_failed' };

function config(env = process.env) {
  const token = String(env.MP_TEST_ACCESS_TOKEN || ''), pub = String(env.MP_TEST_PUBLIC_KEY || ''), secret = String(env.MP_WEBHOOK_SECRET || '');
  if (!token || !pub || !secret) throw new Error('PROVIDER_NOT_CONFIGURED');
  if (!token.startsWith('TEST-') || !pub.startsWith('TEST-')) throw new Error('PRODUCTION_CREDENTIALS_REFUSED');
  if (secret.length < 32) throw new Error('WEBHOOK_SECRET_TOO_SHORT');
  return { token, pub, secret };
}
const hmac = (secret, s) => crypto.createHmac('sha256', secret).update(s).digest('hex');
function eqHex(a, b) { if (!/^[a-f0-9]{64}$/.test(a) || !/^[a-f0-9]{64}$/.test(b)) return false; return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex')); }
function normDataId(id) { const s = String(id == null ? '' : id); return /^[a-z0-9]+$/i.test(s) ? s.toLowerCase() : s; }
function manifest({ dataId, requestId, ts }) { let m = ''; if (dataId) m += `id:${normDataId(dataId)};`; if (requestId) m += `request-id:${requestId};`; m += `ts:${ts};`; return m; }
function parseSig(h) { const out = {}; String(h || '').split(',').forEach(p => { const i = p.indexOf('='); if (i > 0) out[p.slice(0, i).trim()] = p.slice(i + 1).trim(); }); return out; }
// ts do MP pode vir em segundos ou milissegundos.
function tsSeconds(ts) { const n = Number(ts); if (!Number.isFinite(n) || n <= 0) return NaN; return n > 1e12 ? Math.floor(n / 1000) : n; }
function verifySignature({ xSignature, xRequestId, dataId, secret, nowSec = Math.floor(Date.now() / 1000), windowSec = WINDOW_SEC }) {
  const p = parseSig(xSignature); if (!p.ts || !p.v1) throw new Error('BAD_SIGNATURE');
  const t = tsSeconds(p.ts); if (!Number.isFinite(t)) throw new Error('BAD_SIGNATURE');
  if (Math.abs(nowSec - t) > windowSec) throw new Error('STALE_SIGNATURE');
  if (!eqHex(hmac(secret, manifest({ dataId, requestId: xRequestId, ts: p.ts })), String(p.v1).toLowerCase())) throw new Error('BAD_SIGNATURE');
  return true;
}
function signForTest({ dataId, requestId, ts, secret }) { return `ts=${ts},v1=${hmac(secret, manifest({ dataId, requestId, ts }))}`; }
// external_reference: "kac1.<orgId>.<planId>.<nonce>.<tag>" com tag = HMAC(secret) truncado — impede referência forjada.
function makeRef(secret, orgId, planId) { if (!UUID.test(orgId)) throw new Error('INVALID_ORG'); const nonce = crypto.randomBytes(8).toString('hex'); const base = `kac1.${orgId}.${planId}.${nonce}`; return base + '.' + hmac(secret, base).slice(0, 32); }
function parseRef(secret, ref) {
  const m = /^kac1\.([0-9a-f-]{36})\.([a-z]+)\.([a-f0-9]{16})\.([a-f0-9]{32})$/.exec(String(ref || '')); if (!m) return null;
  const base = `kac1.${m[1]}.${m[2]}.${m[3]}`; const exp = hmac(secret, base).slice(0, 32);
  if (!crypto.timingSafeEqual(Buffer.from(exp), Buffer.from(m[4]))) return null; return { orgId: m[1], planId: m[2] };
}
async function api(cfg, fetchFn, path, { method = 'GET', body, idem } = {}) {
  const headers = { Authorization: `Bearer ${cfg.token}`, Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json'; if (idem) headers['X-Idempotency-Key'] = idem;
  const r = await fetchFn(API + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const j = await r.json().catch(() => null); if (!r.ok) { const e = new Error('MP_API_' + r.status); e.status = r.status; throw e; } return j;
}

function mercadoPagoProvider({ env = process.env, fetchFn = globalThis.fetch, plans, store = defaultStore } = {}) {
  const cfg = config(env);
  return {
    name: 'mercadopago', live: false, publicKey: cfg.pub,
    async createCheckout({ orgId, planId, returnUrl }) {
      const p = plans[planId]; if (!p || !p.priceCents) throw new Error('INVALID_PLAN');
      if (!/^https:\/\//.test(String(returnUrl || ''))) throw new Error('INVALID_RETURN_URL');
      const ref = makeRef(cfg.secret, orgId, planId);
      const pref = await api(cfg, fetchFn, '/checkout/preferences', { method: 'POST', idem: crypto.randomUUID(), body: {
        items: [{ id: 'kac-' + planId, title: 'Guardião Komodo — plano ' + p.name, quantity: 1, currency_id: 'BRL', unit_price: p.priceCents / 100 }],
        external_reference: ref, back_urls: { success: returnUrl, failure: returnUrl, pending: returnUrl }, auto_return: 'approved' } });
      return { id: pref.id, url: pref.sandbox_init_point, amountCents: p.priceCents, currency: 'BRL', orgId, planId, sandbox: true };
    },
    /* Processa notificação. Retorna {status, result}. Não confia no corpo: busca o pagamento na API com o token de teste. */
    async handleWebhook({ headers = {}, query = {}, body = {}, nowSec } = {}) {
      const dataId = query['data.id'] ?? body?.data?.id; const reqId = headers['x-request-id'];
      try { verifySignature({ xSignature: headers['x-signature'], xRequestId: reqId, dataId, secret: cfg.secret, nowSec }); } catch (e) { return { status: 401, result: 'invalid_signature' }; }
      if (body && body.live_mode === true) return { status: 200, result: 'ignored_live_mode' };
      const type = String(body?.type || query.type || query.topic || '');
      if (type !== 'payment') return { status: 200, result: 'ignored_type' };
      if (!/^\d{1,20}$/.test(String(dataId || ''))) return { status: 200, result: 'ignored_bad_id' };
      let pay; try { pay = await api(cfg, fetchFn, '/v1/payments/' + dataId); } catch (e) { if (e.status === 404) return { status: 200, result: 'ignored_unknown_payment' }; throw e; }
      if (pay.live_mode === true) return { status: 200, result: 'ignored_live_mode' };
      const ref = parseRef(cfg.secret, pay.external_reference); if (!ref) return { status: 200, result: 'ignored_unknown_reference' };
      const evType = STATUS_EVENT[pay.status]; if (!evType) return { status: 200, result: 'ignored_status' };
      const eventId = `mp:payment:${pay.id}:${pay.status}`;
      // Idempotência atômica: o store grava o evento uma única vez (UNIQUE provider+evento na 007) e diz se já existia.
      const rec = { provider: 'mercadopago', eventId, type: evType, orgId: ref.orgId, planId: ref.planId, paymentId: String(pay.id), status: pay.status, amountCents: Math.round(Number(pay.transaction_amount || 0) * 100) };
      const r = await store.record(eventId, rec); if (r && r.duplicate) return { status: 200, result: 'duplicate' };
      return { status: 200, result: 'accepted', event: { id: eventId, type: evType, orgId: ref.orgId, planId: ref.planId } };
    }
  };
}
// Store em memória: só para testes/ambiente sem banco. Em produção a API injeta o store do banco (kac_payment_events, migração 007).
function memoryStore(max = 1000) { const m = new Map(); return { async record(id, v) { if (m.has(id)) return { duplicate: true }; m.set(id, v); if (m.size > max) m.delete(m.keys().next().value); return { duplicate: false }; }, size: () => m.size }; }
const defaultStore = memoryStore();
/* Store persistente (007): insere o evento (409 = duplicado → idempotente) e atualiza a assinatura da org.
   db(table,{method,query,body,prefer}) é o cliente PostgREST com service_role da API. Payload sem dados pessoais do pagador. */
function dbStore(db) {
  return { async record(id, v) {
    try { await db('kac_payment_events', { method: 'POST', body: [{ provider: v.provider, provider_event_id: id, organization_id: v.orgId, type: v.type, payload: { paymentId: v.paymentId, status: v.status, planId: v.planId, amountCents: v.amountCents } }], prefer: 'return=minimal' }); }
    catch (e) { if (e && (e.status === 409 || e.code === '23505')) return { duplicate: true }; throw e; }
    const sub = v.type === 'checkout.completed' ? { plan_id: v.planId, status: 'active' } : { status: 'past_due' };
    await db('kac_subscriptions', { method: 'POST', query: 'on_conflict=organization_id', body: [{ organization_id: v.orgId, ...sub, provider: v.provider, provider_ref: v.paymentId, updated_at: new Date().toISOString() }], prefer: 'resolution=merge-duplicates,return=minimal' });
    return { duplicate: false };
  } };
}
module.exports = { config, verifySignature, signForTest, manifest, makeRef, parseRef, mercadoPagoProvider, memoryStore, dbStore, WINDOW_SEC };
