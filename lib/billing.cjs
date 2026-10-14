'use strict';
/* Fase E — planos/assentos + abstração de provedor de pagamento. Só provedor "mock" (sandbox local, sem rede).
   Flag KAC_BILLING=on (padrão desligado). Persistência depende da migração 007 (PROPOSTA, não aplicada). */
const crypto = require('node:crypto');
const PLANS = Object.freeze({
  free: Object.freeze({ id: 'free', name: 'Gratuito', priceCents: 0, maxSeats: 2, maxSites: 1, maxVisitsMonth: 300 }),
  pro: Object.freeze({ id: 'pro', name: 'Profissional', priceCents: 9900, maxSeats: 10, maxSites: 3, maxVisitsMonth: 5000 }),
  business: Object.freeze({ id: 'business', name: 'Empresarial', priceCents: 29900, maxSeats: 50, maxSites: 20, maxVisitsMonth: 50000 })
});
const enabled = () => process.env.KAC_BILLING === 'on';
const plan = id => PLANS[id] || null;
function seatCheck(planId, currentSeats, adding = 1) { const p = plan(planId); if (!p) return { ok: false, reason: 'unknown_plan' }; const after = currentSeats + adding; return after <= p.maxSeats ? { ok: true, remaining: p.maxSeats - after } : { ok: false, reason: 'seat_limit', limit: p.maxSeats, current: currentSeats }; }
function usageCheck(planId, visitsThisMonth) { const p = plan(planId); if (!p) return { ok: false, reason: 'unknown_plan' }; const ratio = visitsThisMonth / p.maxVisitsMonth; return { ok: visitsThisMonth < p.maxVisitsMonth, warn: ratio >= 0.8, used: visitsThisMonth, limit: p.maxVisitsMonth }; }
// Máquina de estados da assinatura (pura; idempotente por event id).
const TRANSITIONS = { 'checkout.completed': ['trialing', 'active', 'past_due', 'canceled', 'expired'], 'invoice.paid': ['active', 'past_due'], 'invoice.payment_failed': ['active', 'past_due'], 'subscription.canceled': ['trialing', 'active', 'past_due'] };
const NEXT = { 'checkout.completed': 'active', 'invoice.paid': 'active', 'invoice.payment_failed': 'past_due', 'subscription.canceled': 'canceled' };
function applyEvent(sub, ev, seen) {
  if (seen && seen.has(ev.id)) return { sub, changed: false, reason: 'duplicate' };
  const allowed = TRANSITIONS[ev.type]; if (!allowed) return { sub, changed: false, reason: 'ignored_type' };
  if (!allowed.includes(sub.status)) return { sub, changed: false, reason: 'invalid_transition' };
  if (ev.type === 'checkout.completed' && !plan(ev.planId)) return { sub, changed: false, reason: 'unknown_plan' };
  if (ev.orgId !== sub.organizationId) return { sub, changed: false, reason: 'org_mismatch' };
  if (seen) seen.add(ev.id);
  const next = { ...sub, status: NEXT[ev.type], planId: ev.type === 'checkout.completed' ? ev.planId : (ev.type === 'subscription.canceled' ? 'free' : sub.planId), currentPeriodEnd: ev.periodEnd || sub.currentPeriodEnd || null };
  return { sub: next, changed: true };
}
// Provedor mock: checkout local e webhook assinado com HMAC (segredo de teste vindo do ambiente/injetado; nunca logado).
function mockProvider(secret) {
  if (!secret || secret.length < 16) throw new Error('MOCK_SECRET_REQUIRED');
  const sign = body => crypto.createHmac('sha256', secret).update(body).digest('hex');
  return {
    name: 'mock', live: false,
    createCheckout({ orgId, planId, returnUrl }) { const p = plan(planId); if (!p || p.priceCents === 0) throw new Error('INVALID_PLAN'); if (!/^https:\/\//.test(String(returnUrl || ''))) throw new Error('INVALID_RETURN_URL'); const id = 'mock_cs_' + crypto.randomUUID(); return { id, url: returnUrl + (returnUrl.includes('?') ? '&' : '?') + 'mock_checkout=' + id, amountCents: p.priceCents, currency: 'BRL', orgId, planId }; },
    signEvent(ev) { const body = JSON.stringify(ev); return { body, signature: 't=' + Math.floor(Date.now() / 1000) + ',v1=' + sign(body) }; },
    verifyWebhook(body, header, nowSec = Math.floor(Date.now() / 1000)) {
      const m = /^t=(\d+),v1=([a-f0-9]{64})$/.exec(String(header || '')); if (!m) throw new Error('BAD_SIGNATURE');
      if (Math.abs(nowSec - Number(m[1])) > 300) throw new Error('STALE_SIGNATURE');
      const exp = Buffer.from(sign(body), 'hex'), got = Buffer.from(m[2], 'hex'); if (exp.length !== got.length || !crypto.timingSafeEqual(exp, got)) throw new Error('BAD_SIGNATURE');
      return JSON.parse(body);
    }
  };
}
// Provedores reais: interface reservada; sem implementação nem chaves (exige autorização + conta sandbox).
function provider(name, env = process.env) { if (name === 'mock') return mockProvider(env.KAC_BILLING_MOCK_SECRET); if (name === 'mercadopago' || name === 'stripe') throw new Error('PROVIDER_NOT_CONFIGURED'); throw new Error('UNKNOWN_PROVIDER'); }
module.exports = { PLANS, enabled, plan, seatCheck, usageCheck, applyEvent, mockProvider, provider };
