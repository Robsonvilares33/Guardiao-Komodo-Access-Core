'use strict';
// Onboarding de empresa (Fase C): validação pura, usada pela API (fonte de verdade) e espelhada no front.
const KINDS = ['condominio', 'predio', 'comercio', 'portaria', 'outro'];
function cnpjDigits(v) { return String(v ?? '').replace(/[.\-\/\s]/g, ''); }
function validCnpj(v) {
  const d = cnpjDigits(v); if (!/^\d{14}$/.test(d) || /^(\d)\1{13}$/.test(d)) return false;
  const dv = (n) => { const w = n === 12 ? [5,4,3,2,9,8,7,6,5,4,3,2] : [6,5,4,3,2,9,8,7,6,5,4,3,2]; const s = w.reduce((a, x, i) => a + x * Number(d[i]), 0) % 11; return s < 2 ? 0 : 11 - s; };
  return dv(12) === Number(d[12]) && dv(13) === Number(d[13]);
}
function validTimezone(tz) { if (typeof tz !== 'string' || !/^[A-Za-z_]+(\/[A-Za-z0-9_+\-]+){0,2}$/.test(tz)) return false; try { new Intl.DateTimeFormat('en', { timeZone: tz }); return true; } catch { return false; } }
function validateOnboarding(body) {
  const b = body && typeof body === 'object' ? body : {}; const errors = {};
  const name = String(b.name ?? '').trim().replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > 120) errors.name = 'Informe o nome da empresa (2 a 120 caracteres).';
  const kind = String(b.kind ?? '').trim().toLowerCase(); if (!KINDS.includes(kind)) errors.kind = 'Escolha o tipo.';
  const rawCnpj = String(b.cnpj ?? '').trim(); const cnpj = rawCnpj ? cnpjDigits(rawCnpj) : null;
  if (cnpj && !validCnpj(cnpj)) errors.cnpj = 'CNPJ inválido.';
  const timezone = String(b.timezone ?? '').trim() || 'America/Sao_Paulo'; if (!validTimezone(timezone)) errors.timezone = 'Fuso horário inválido.';
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value: { name, kind, cnpj, timezone } };
}
module.exports = { KINDS, validCnpj, validTimezone, validateOnboarding, cnpjDigits };
