'use strict';
/* Fase F — núcleo de decisão ALPR (puro, sem engine/câmera/rede). Flag KAC_ALPR=on (desligado).
   Regra de ouro: nenhuma leitura autoriza sozinha; o operador confirma (autoAuthorize sempre false no MVP). */
const DEFAULTS = Object.freeze({ suggest: 0.90, review: 0.60 });
const enabled = (env = process.env) => env.KAC_ALPR === 'on';
const OLD = /^[A-Z]{3}\d{4}$/, MERCOSUL = /^[A-Z]{3}\d[A-Z]\d{2}$/;
function normalizePlate(p) { return String(p || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
function isValidPlate(p) { const n = normalizePlate(p); return OLD.test(n) || MERCOSUL.test(n); }
function thresholds(t) { const s = Number(t && t.suggest), r = Number(t && t.review); const out = { suggest: Number.isFinite(s) ? s : DEFAULTS.suggest, review: Number.isFinite(r) ? r : DEFAULTS.review }; if (!(out.review >= 0 && out.review < out.suggest && out.suggest <= 1)) throw new Error('INVALID_THRESHOLDS'); return out; }
// Distância de 1 caractere (mesmo tamanho) — confusões típicas de OCR (0/O, 1/I, 8/B…) viram revisão, nunca sugestão.
function oneOff(a, b) { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i] && ++d > 1) return false; return d === 1; }
function decide(read, expected, t) {
  const th = thresholds(t); const plate = normalizePlate(read && read.plate); const conf = Number(read && read.confidence);
  const base = { plate, confidence: conf, autoAuthorize: false, requiresHuman: true };
  if (!Number.isFinite(conf) || conf < 0 || conf > 1) return { ...base, action: 'discard', reason: 'invalid_confidence' };
  if (!isValidPlate(plate)) return { ...base, action: conf >= th.review ? 'review' : 'discard', reason: 'invalid_format' };
  if (conf < th.review) return { ...base, action: 'discard', reason: 'low_confidence' };
  const list = (expected || []).map(v => ({ id: v.id, plate: normalizePlate(v.placa && String(v.placa).split(' ')[0]) })).filter(v => v.plate);
  const exact = list.filter(v => v.plate === plate); const near = list.filter(v => oneOff(v.plate, plate));
  if (exact.length === 1 && conf >= th.suggest) return { ...base, action: 'suggest', match: exact[0].id, reason: 'exact_high_confidence' };
  if (exact.length > 1) return { ...base, action: 'review', candidates: exact.map(v => v.id), reason: 'ambiguous' };
  if (exact.length === 1) return { ...base, action: 'review', candidates: [exact[0].id], reason: 'exact_mid_confidence' };
  if (near.length) return { ...base, action: 'review', candidates: near.map(v => v.id), reason: 'near_match' };
  return { ...base, action: 'review', candidates: [], reason: 'no_match' };
}
// Registro de decisão humana (o que vai para kac_alpr_reads + audit quando houver migração aprovada).
function humanDecision(result, { operatorId, decision, correctedPlate }) {
  if (!operatorId) throw new Error('OPERATOR_REQUIRED'); if (!['accepted', 'corrected', 'rejected'].includes(decision)) throw new Error('INVALID_DECISION');
  if (decision === 'corrected' && !isValidPlate(correctedPlate)) throw new Error('INVALID_CORRECTED_PLATE');
  return { plate_read: result.plate, confidence: result.confidence, system_action: result.action, system_reason: result.reason, operator_id: operatorId, decision, corrected_plate: decision === 'corrected' ? normalizePlate(correctedPlate) : null, decided_at: new Date().toISOString() };
}
module.exports = { DEFAULTS, enabled, normalizePlate, isValidPlate, thresholds, decide, humanDecision };
