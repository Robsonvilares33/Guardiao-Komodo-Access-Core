'use strict';
// Convite de visita por link ou código curto (migration 014). Duas partes:
//  - anfitrião (sessão; org resolvida no servidor): criar, listar, revogar, buscar por código na portaria;
//  - página pública (sem conta): ver o convite e confirmar com dados mínimos + consentimento. Só o hash do token chega ao banco.
// Token do link: 32 bytes aleatórios (256 bits, base64url), mostrado UMA vez. Código: 8 caracteres (sem 0/1/I/O), também só em hash.
const crypto = require('node:crypto');
const T = 'kac_visit_invites', R = 'kac_visit_invite_registrations';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MODULES = new Set(['empresarial', 'residencial', 'clinica']);
const ALPHA = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const CONSENT_VERSION = 'convite-v1';
const TZ = '-03:00'; // America/Sao_Paulo (sem horário de verão desde 2019)
const FIELDS = 'id,modulo,visitor_name,host_label,unidade,note,visit_date,hora_inicio,hora_fim,expires_at,max_uses,uses,status,revoked_at,created_at';
function sha(v) { return crypto.createHash('sha256').update(String(v)).digest('hex'); }
function newToken() { return crypto.randomBytes(32).toString('base64url'); }
function newCode() { const b = crypto.randomBytes(8); let s = ''; for (let i = 0; i < 8; i++) s += ALPHA[b[i] & 31]; return s; }
function normCode(v) { return String(v ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/O/g, '0').slice(0, 8); }
function codeHash(orgId, code) { return sha(String(orgId).toLowerCase() + ':' + code); }
function fmtCode(c) { return c.slice(0, 4) + '-' + c.slice(4); }
function todaySP(now = new Date()) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(now); }
function at(date, hhmm) { return new Date(`${date}T${hhmm}:00${TZ}`); }
function addDays(iso, n) { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function stateOf(i, now = Date.now()) { if (i.status === 'revoked') return 'revoked'; if (Date.parse(i.expires_at) < now) return 'expired'; if (i.uses >= i.max_uses) return 'used_up'; return 'active'; }
function canWrite(s) { return s.orgRole ? ['owner', 'admin', 'operator'].includes(String(s.orgRole)) : true; }
// Validação do convite criado pelo anfitrião. Janela: hoje até 60 dias; fim > início; validade do link ≤ fim da janela.
function validateCreate(body, clean, now = new Date()) {
  const errors = [];
  const v = { modulo: clean(body.modulo, 30).toLowerCase(), visitor_name: clean(body.nome, 120) || null, host_label: clean(body.anfitriao, 120) || null,
    unidade: clean(body.unidade, 120) || null, note: clean(body.observacao, 300) || null, visit_date: clean(body.data, 10), hora_inicio: clean(body.inicio, 5), hora_fim: clean(body.fim, 5),
    max_uses: Number.parseInt(body.usos, 10) || 1 };
  if (!MODULES.has(v.modulo)) errors.push('Módulo inválido.');
  if (v.visitor_name && v.visitor_name.length < 3) errors.push('Nome deve conter ao menos 3 caracteres.');
  const today = todaySP(now);
  if (!ISO_DATE.test(v.visit_date) || Number.isNaN(Date.parse(v.visit_date + 'T12:00:00Z')) || new Date(v.visit_date + 'T12:00:00Z').toISOString().slice(0, 10) !== v.visit_date) errors.push('Data inválida.');
  else if (v.visit_date < today || v.visit_date > addDays(today, 60)) errors.push('A data precisa ser de hoje até 60 dias.');
  if (!HHMM.test(v.hora_inicio) || !HHMM.test(v.hora_fim)) errors.push('Horário inválido.');
  else if (v.hora_fim <= v.hora_inicio) errors.push('O horário final precisa ser depois do inicial.');
  if (!Number.isInteger(v.max_uses) || v.max_uses < 1 || v.max_uses > 20) errors.push('Número de usos precisa ser de 1 a 20.');
  if (!errors.length) {
    const end = at(v.visit_date, v.hora_fim); let exp = end;
    const custom = clean(body.validoAte, 16);
    if (custom) { const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(custom); const c = m && HHMM.test(m[2]) ? at(m[1], m[2]) : null; if (!c || Number.isNaN(c.getTime())) errors.push('Validade do link inválida.'); else if (c > end) errors.push('O link não pode valer depois do fim da visita.'); else exp = c; }
    if (!errors.length && exp.getTime() <= now.getTime()) errors.push('A validade do link já passou.');
    v.expires_at = exp.toISOString();
  }
  return { value: v, errors };
}
function publicView(i, orgName) {
  return { empresa: orgName ? String(orgName).slice(0, 120) : null, anfitriao: i.host_label || null, nome: i.visitor_name || null, unidade: i.unidade || null,
    data: i.visit_date, inicio: i.hora_inicio, fim: i.hora_fim, validoAte: i.expires_at, restantes: Math.max(0, i.max_uses - i.uses), estado: stateOf(i) };
}
const PUBLIC_MSG = { not_found: 'Convite não encontrado. Confira o link com quem convidou você.', revoked: 'Este convite foi cancelado por quem convidou.', expired: 'Este convite expirou. Peça um novo a quem convidou você.', used_up: 'Este convite já foi usado.', invalid: 'Confira os dados: informe o nome completo.' };
function createInvites({ db, reply, audit, clean, rateHit, clientIp }) {
  // Página pública: só POST com JSON da própria origem (o Origin é obrigatório aqui), limite por IP e por token, mensagens genéricas.
  function strictPublic(req) {
    const h = req.headers || {}; const o = String(h.origin || ''); if (!o) return false;
    let host; try { host = new URL(o).host.toLowerCase(); } catch { return false; }
    const own = String(h['x-forwarded-host'] || h.host || '').split(',')[0].trim().toLowerCase();
    return !!own && host === own && /^application\/json\b/i.test(String(h['content-type'] || ''));
  }
  async function publicHandle(req, res, route, body) {
    if (req.method !== 'POST' || !['/convite-publico/ver', '/convite-publico/confirmar'].includes(route)) return reply(res, 404, { success: false, message: 'Rota não encontrada.' });
    if (!strictPublic(req)) return reply(res, 403, { success: false, code: 'bad_origin', message: 'Origem não permitida.' });
    const ip = clientIp(req); const confirm = route.endsWith('/confirmar');
    if (!(await rateHit('inv:ip:' + sha(ip).slice(0, 32), 600, confirm ? 10 : 40))) return reply(res, 429, { success: false, code: 'rate_limited', message: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.' });
    const token = String(body.token || '');
    if (!TOKEN_RE.test(token)) return reply(res, 404, { success: false, code: 'not_found', message: PUBLIC_MSG.not_found });
    const th = sha(token);
    if (!(await rateHit('inv:t:' + th.slice(0, 32), 3600, confirm ? 20 : 120))) return reply(res, 429, { success: false, code: 'rate_limited', message: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.' });
    if (!confirm) {
      const rows = await db(T, { query: `select=${FIELDS},organization_id&token_hash=eq.${th}&limit=1` }); const i = rows?.[0];
      if (!i) return reply(res, 404, { success: false, code: 'not_found', message: PUBLIC_MSG.not_found });
      const st = stateOf(i); if (st !== 'active') return reply(res, 410, { success: false, code: st, message: PUBLIC_MSG[st] });
      const org = (await db('kac_organizations', { query: `select=name&id=eq.${i.organization_id}&limit=1` }))?.[0];
      return reply(res, 200, { success: true, data: publicView(i, org?.name) });
    }
    if (String(body.website || '')) return reply(res, 422, { success: false, code: 'invalid', message: PUBLIC_MSG.invalid }); // armadilha para robôs
    if (body.consentimento !== true) return reply(res, 422, { success: false, code: 'consent_required', message: 'Para continuar, marque que você leu o aviso de privacidade.' });
    const nome = clean(body.nome, 120); const placa = String(body.placa ?? '').toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 10);
    if (nome.length < 3) return reply(res, 422, { success: false, code: 'invalid', message: PUBLIC_MSG.invalid });
    const r = await db('rpc/kac_visit_invite_redeem', { method: 'POST', body: { p_token_hash: th, p_nome: nome, p_placa: placa || null, p_consent_version: CONSENT_VERSION } });
    const out = Array.isArray(r) ? r[0] : r; const st = out?.status || 'not_found';
    if (st !== 'ok') return reply(res, st === 'not_found' ? 404 : st === 'invalid' ? 422 : 410, { success: false, code: st, message: PUBLIC_MSG[st] || PUBLIC_MSG.not_found });
    await audit({ orgId: out.organization_id, userId: 'public:invite' }, 'invite.redeem', out.invite_id, { visit: out.visit_id }, 'visit_invite');
    return reply(res, 201, { success: true, data: { data: out.visit_date, inicio: out.hora_inicio, fim: out.hora_fim } });
  }
  async function regsFor(orgId, ids) {
    if (!ids.length) return [];
    const regs = await db(R, { query: `select=invite_id,visit_id,nome,placa,consent_at&organization_id=eq.${orgId}&invite_id=in.(${ids.join(',')})&order=created_at.asc` }) || [];
    const vids = regs.map(x => x.visit_id).filter(x => /^[A-Za-z0-9-]{1,64}$/.test(x));
    const visits = vids.length ? (await db('komodo_acessos', { query: `select=id,status,data,hora&organization_id=eq.${orgId}&id=in.(${vids.map(encodeURIComponent).join(',')})` }) || []) : [];
    const vs = Object.fromEntries(visits.map(v => [v.id, v]));
    return regs.map(x => ({ invite_id: x.invite_id, visit_id: x.visit_id, nome: x.nome, placa: x.placa || null, consent_at: x.consent_at, visitStatus: vs[x.visit_id]?.status ?? null }));
  }
  function shape(i, regs) { const { organization_id, token_hash, code_hash, created_by, ...rest } = i; return { ...rest, estado: stateOf(i), cadastros: regs.filter(r => r.invite_id === i.id).map(({ invite_id, ...r }) => r) }; }
  async function handle(req, res, route, body, session) {
    const ORG = `organization_id=eq.${session.orgId}`;
    if (req.method === 'POST' && route === '/convites-visita') {
      if (!canWrite(session)) return reply(res, 403, { success: false, message: 'Permissão insuficiente.' });
      if (!(await rateHit('inv:new:' + session.orgId, 3600, 100))) return reply(res, 429, { success: false, message: 'Limite de convites por hora atingido. Tente mais tarde.' });
      const v = validateCreate(body, clean); if (v.errors.length) return reply(res, 422, { success: false, message: v.errors[0], errors: v.errors });
      for (let attempt = 0; attempt < 3; attempt++) {
        const token = newToken(), code = newCode();
        const row = { ...v.value, organization_id: session.orgId, token_hash: sha(token), code_hash: codeHash(session.orgId, code), created_by: String(session.userId || '').slice(0, 80) };
        try {
          const rows = await db(T, { method: 'POST', body: [row], prefer: 'return=representation', query: `select=${FIELDS}` });
          const inv = rows?.[0]; await audit(session, 'invite.create', inv?.id, { usos: v.value.max_uses }, 'visit_invite');
          return reply(res, 201, { success: true, data: { ...shape({ ...inv, organization_id: session.orgId }, []), token, codigo: fmtCode(code) } }, { 'Cache-Control': 'no-store' });
        } catch (e) { if (!(e.status === 409 || e.code === '23505')) throw e; }
      }
      return reply(res, 503, { success: false, message: 'Não foi possível gerar o convite agora. Tente de novo.' });
    }
    if (req.method === 'GET' && route === '/convites-visita') {
      const mod = String(req.query?.modulo || '').toLowerCase(); if (!MODULES.has(mod)) return reply(res, 400, { success: false, message: 'Módulo inválido.' });
      const rows = await db(T, { query: `select=${FIELDS}&${ORG}&modulo=eq.${mod}&order=created_at.desc&limit=50` }) || [];
      const regs = await regsFor(session.orgId, rows.map(r => r.id));
      return reply(res, 200, { success: true, data: rows.map(i => shape(i, regs)) });
    }
    const cm = route.match(/^\/convites-visita\/codigo\/([^/]+)$/);
    if (req.method === 'GET' && cm) {
      // Portaria: busca pelo código DENTRO da própria empresa. Limite por empresa contra tentativa e erro.
      if (!(await rateHit('inv:code:' + session.orgId, 600, 60))) return reply(res, 429, { success: false, message: 'Muitas buscas seguidas. Aguarde alguns minutos.' });
      const code = normCode(decodeURIComponent(cm[1])); if (code.length !== 8) return reply(res, 404, { success: false, message: 'Nenhum convite com este código.' });
      const rows = await db(T, { query: `select=${FIELDS}&${ORG}&code_hash=eq.${codeHash(session.orgId, code)}&limit=1` }) || [];
      if (!rows.length) return reply(res, 404, { success: false, message: 'Nenhum convite com este código.' });
      const regs = await regsFor(session.orgId, [rows[0].id]);
      return reply(res, 200, { success: true, data: shape(rows[0], regs) });
    }
    const rv = route.match(/^\/convites-visita\/([^/]+)\/revogar$/);
    if (req.method === 'POST' && rv) {
      if (!canWrite(session)) return reply(res, 403, { success: false, message: 'Permissão insuficiente.' });
      const id = decodeURIComponent(rv[1]); if (!UUID_RE.test(id)) return reply(res, 404, { success: false, message: 'Convite não encontrado.' });
      const rows = await db(T, { method: 'PATCH', query: `${ORG}&id=eq.${id}&status=eq.active&select=${FIELDS}`, body: { status: 'revoked', revoked_at: new Date().toISOString() }, prefer: 'return=representation' });
      if (!rows?.length) { const ex = await db(T, { query: `select=id&${ORG}&id=eq.${id}&limit=1` }); return reply(res, ex?.length ? 200 : 404, ex?.length ? { success: true, data: { id, estado: 'revoked' } } : { success: false, message: 'Convite não encontrado.' }); }
      await audit(session, 'invite.revoke', id, {}, 'visit_invite');
      return reply(res, 200, { success: true, data: shape({ ...rows[0], organization_id: session.orgId }, []) });
    }
    return reply(res, 404, { success: false, message: 'Rota não encontrada.' });
  }
  return { handle, publicHandle };
}
module.exports = { createInvites, validateCreate, newToken, newCode, normCode, codeHash, fmtCode, stateOf, publicView, TOKEN_RE, CONSENT_VERSION };
