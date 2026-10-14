/* Fase F — UI de revisão ALPR (flag KAC_ALPR). Só textContent; decisões ficam em memória (sem migração kac_alpr_reads). */
(function (root) {
  'use strict';
  var REASONS = { exact_high_confidence: 'Placa exata com confiança alta: confirme com o motorista.', exact_mid_confidence: 'Placa exata, confiança média: confira.', near_match: 'Placa parecida (1 caractere diferente): confira.', ambiguous: 'Mais de uma visita com esta placa hoje.', no_match: 'Nenhuma visita de hoje com esta placa.', low_confidence: 'Confiança baixa: leitura descartada.', invalid_format: 'Formato de placa inválido.', invalid_confidence: 'Confiança inválida.' };
  var ACTIONS = { suggest: 'Sugestão', review: 'Revisão', discard: 'Descartada' };
  function label(r) { return { badge: ACTIONS[r.action] || r.action, reason: REASONS[r.reason] || r.reason, cls: 'badge ' + r.action }; }
  function fmtConf(v) { return Number(v).toFixed(2).replace('.', ','); }
  function entry(r, decision, corrected) { return { at: new Date().toISOString(), plate: r.plate, confidence: r.confidence, system: r.action, decision: decision, corrected: decision === 'corrected' ? String(corrected || '').toUpperCase().replace(/[^A-Z0-9]/g, '') : null }; }
  root.AlprReview = { label: label, fmtConf: fmtConf, entry: entry };
  if (typeof document === 'undefined' || !document.getElementById) return;
  var $ = function (id) { return document.getElementById(id); }; var last = null;
  function msg(t, bad) { var m = $('alprMsg'); m.textContent = t || ''; m.className = bad ? 'auth-msg bad' : 'auth-msg'; }
  async function api(path, method, body) { var r = await fetch('/api' + path, { method: method || 'GET', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }); var j = null; try { j = await r.json(); } catch (_) {} if (!r.ok) { var e = new Error((j && j.message) || ('HTTP ' + r.status)); e.status = r.status; throw e; } return j; }
  function li(text) { var e = document.createElement('li'); e.textContent = text; return e; }
  function render(r) {
    last = r; var l = label(r); $('resBadge').textContent = l.badge; $('resBadge').className = l.cls; $('resReason').textContent = l.reason + ' (confiança ' + fmtConf(r.confidence) + ')';
    var ul = $('resCands'); ul.replaceChildren(); (r.candidates || []).forEach(function (c) { ul.appendChild(li((c.hora || '--:--') + ' · ' + (c.nome || '') + ' · ' + (c.unidade || '') + ' · ' + (c.placa || ''))); }); if (!(r.candidates || []).length) ul.appendChild(li('Sem candidatas.'));
    $('btnAccept').disabled = r.action === 'discard'; $('result').hidden = false; $('resTitle').tabIndex = -1; $('resTitle').focus();
  }
  function decide(kind) { if (!last) return; if (kind === 'corrected' && !/^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test($('corr').value.toUpperCase().replace(/[^A-Z0-9]/g, ''))) { msg('Digite uma placa corrigida válida.', true); $('corr').focus(); return; } var e = entry(last, kind, $('corr').value); $('log').prepend(li(new Date(e.at).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' }) + ' · ' + e.plate + ' → ' + ({ accepted: 'confirmada', corrected: 'corrigida para ' + e.corrected, rejected: 'rejeitada' })[kind] + ' (sistema: ' + (ACTIONS[e.system] || e.system) + ')')); msg('Decisão registrada nesta sessão (não gravada).'); $('result').hidden = true; $('corr').value = ''; $('plate').value = ''; $('plate').focus(); last = null; }
  document.addEventListener('DOMContentLoaded', async function () {
    try { await api('/alpr/config'); } catch (e) { if (e.status === 401) { location.replace('login.html'); return; } $('secOff').hidden = false; return; }
    $('secOff').hidden = true; $('secOn').hidden = false;
    $('conf').addEventListener('input', function () { $('confOut').textContent = fmtConf($('conf').value); });
    $('formRead').addEventListener('submit', async function (ev) { ev.preventDefault(); msg(''); try { var r = await api('/alpr/decide', 'POST', { plate: $('plate').value, confidence: Number($('conf').value) }); render(r.data); } catch (e) { msg(e.message, true); } });
    $('btnAccept').addEventListener('click', function () { decide('accepted'); }); $('btnCorrect').addEventListener('click', function () { decide('corrected'); }); $('btnReject').addEventListener('click', function () { decide('rejected'); });
  });
})(typeof window !== 'undefined' ? window : globalThis);
