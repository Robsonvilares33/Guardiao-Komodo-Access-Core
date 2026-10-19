'use strict';
// Visitantes frequentes (migration 013). Tudo escopado à org da SESSÃO (resolvida no servidor); o cliente nunca manda organization_id.
// Sugestão (GET), edição (PUT) e remoção (DELETE). O cadastro é criado/atualizado sozinho ao registrar uma visita (touch).
const TABLE = 'kac_saved_visitors';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MODULES = new Set(['empresarial', 'residencial', 'clinica']);
const FIELDS = 'id,modulo,nome,tipo,placa,cor,marca,unidade,observacao,visits_count,last_seen_at';
const PLATE_RE = /^[A-Z]{3}-?[0-9][A-Z0-9][0-9]{2}$/;
function canEdit(s) { return s.orgRole ? ['owner', 'admin', 'operator'].includes(String(s.orgRole)) : true; }
// Placa: só letras/números/hífen, maiúscula. Vazio = sem placa.
function plate(v) { const p = String(v ?? '').toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 10); return p; }
// Da placa "composta" da visita ("ABC1D23 - Prata (Fiat)") tira só a placa, se for uma placa brasileira válida.
function plateFrom(composite) { const first = String(composite || '').trim().split(/\s+/)[0] || ''; const p = plate(first); return PLATE_RE.test(p) ? p : ''; }
// Tipo sem documento: "Visitante (Pessoal) (123.456.789-00)" vira "Visitante (Pessoal)" — nenhum RG/CPF vai para o cadastro salvo.
function tipoOf(a, b, clean) { const t = clean(a, 60) || clean(b, 120); return t.replace(/\s*\([^)]*\d[^)]*\)/g, '').replace(/\s+-\s+.*$/, '').trim().slice(0, 40); }
function fieldsFrom(body, clean) {
  const f = { nome: clean(body.nome, 120), tipo: clean(body.tipo, 40), placa: plate(body.placa), cor: clean(body.cor, 40), marca: clean(body.marca, 60), unidade: clean(body.unidade, 120), observacao: clean(body.observacao, 300) };
  const errors = []; if (f.nome.length < 3) errors.push('Nome deve conter ao menos 3 caracteres.'); if (f.placa && !PLATE_RE.test(f.placa)) errors.push('Placa inválida.');
  for (const k of ['tipo', 'placa', 'cor', 'marca', 'unidade', 'observacao']) if (!f[k]) f[k] = null;
  return { fields: f, errors };
}
function createSaved({ db, reply, audit, clean, safeSearch }) {
  // Chamado depois de gravar a visita. Falha aqui nunca desfaz a visita (só log sem dados pessoais).
  async function touch(session, record, body) {
    if (body && (body.salvar === false || body.salvar === 'false' || body.salvar === 0)) return null;
    const x = (body && typeof body.visitante === 'object' && body.visitante) || {};
    const p = plate(x.placa) || plateFrom(record.placa);
    try {
      const r = await db('rpc/kac_saved_visitor_touch', { method: 'POST', body: { p_org: session.orgId, p_modulo: record.modulo, p_nome: record.nome, p_tipo: tipoOf(x.tipo, record.tipo, clean) || null, p_placa: PLATE_RE.test(p) ? p : null, p_cor: clean(x.cor, 40) || null, p_marca: clean(x.marca, 60) || null, p_unidade: (/^n[aã]o informada$/i.test(clean(record.unidade, 120)) ? '' : clean(record.unidade, 120)) || null, p_actor: String(session.userId || '').slice(0, 80) } });
      return typeof r === 'string' ? r : null;
    } catch (e) { console.error('KAC saved visitor touch error:', e.status || 'x', e.code || ''); return null; }
  }
  async function handle(req, res, route, body, session) {
    const ORG = `organization_id=eq.${session.orgId}`;
    if (req.method === 'GET' && route === '/visitantes-salvos') {
      const q = req.query || {}; const mod = String(q.modulo || '').toLowerCase();
      if (!MODULES.has(mod)) return reply(res, 400, { success: false, message: 'Módulo inválido.' });
      const term = safeSearch(q.q); const limit = Math.min(Math.max(Number.parseInt(q.limit, 10) || (term ? 8 : 100), 1), 200);
      const parts = [`select=${FIELDS}`, ORG, `modulo=eq.${mod}`, `order=last_seen_at.desc`, `limit=${limit}`];
      if (term) { if (term.length < 2) return reply(res, 200, { success: true, data: [] }); parts.push(`nome=ilike.*${encodeURIComponent(term)}*`); }
      const rows = (await db(TABLE, { query: parts.join('&') })) || [];
      // Quem começa com o termo vem primeiro; depois os mais recentes.
      if (term) { const t = term.toLowerCase(); rows.sort((a, b) => (String(b.nome).toLowerCase().startsWith(t) ? 1 : 0) - (String(a.nome).toLowerCase().startsWith(t) ? 1 : 0)); }
      return reply(res, 200, { success: true, data: rows, meta: { count: rows.length } }, { 'Cache-Control': 'no-store' });
    }
    const m = route.match(/^\/visitantes-salvos\/([^/]+)$/);
    if (m && (req.method === 'PUT' || req.method === 'DELETE')) {
      const id = decodeURIComponent(m[1]); if (!UUID_RE.test(id)) return reply(res, 404, { success: false, message: 'Visitante salvo não encontrado.' });
      if (!canEdit(session)) return reply(res, 403, { success: false, message: 'Permissão insuficiente.' });
      const found = await db(TABLE, { query: `select=id&${ORG}&id=eq.${id}&limit=1` });
      if (!found?.length) return reply(res, 404, { success: false, message: 'Visitante salvo não encontrado.' });
      if (req.method === 'DELETE') { await db(TABLE, { method: 'DELETE', query: `${ORG}&id=eq.${id}` }); await audit(session, 'saved_visitor.delete', id, {}, 'saved_visitor'); return reply(res, 200, { success: true, data: { id, deleted: true } }); }
      const v = fieldsFrom(body, clean); if (v.errors.length) return reply(res, 422, { success: false, message: v.errors[0], errors: v.errors });
      try { const rows = await db(TABLE, { method: 'PATCH', query: `${ORG}&id=eq.${id}&select=${FIELDS}`, body: v.fields, prefer: 'return=representation' }); await audit(session, 'saved_visitor.update', id, {}, 'saved_visitor'); return reply(res, 200, { success: true, data: rows?.[0] || null }); }
      catch (e) { if (e.status === 409 || e.code === '23505') return reply(res, 409, { success: false, code: 'duplicate_name', message: 'Já existe um visitante salvo com este nome.' }); throw e; }
    }
    return reply(res, 404, { success: false, message: 'Rota não encontrada.' });
  }
  return { touch, handle };
}
module.exports = { createSaved, tipoOf, plateFrom, plate, fieldsFrom, canEdit, PLATE_RE };
