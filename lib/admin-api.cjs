'use strict';
// Tela única de administração (UX item 9). Só com KAC_SUPABASE_AUTH=on e SOMENTE sessão Supabase (Bearer) com aal2 + papel owner/admin
// na organização da sessão. Tudo escopado à org resolvida no servidor; nenhum dado de outras orgs; sem hashes/segredos na resposta.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const USER_ID_RE = /^[A-Za-z0-9_.:@-]{1,80}$/;
const ROLES = ['owner', 'admin', 'operator', 'viewer'];
// Quem pode atribuir/remover qual papel (owner é intocável por esta tela).
function canManage(actorRole, targetRole, newRole) {
  if (targetRole === 'owner') return false;
  if (newRole !== undefined && !['admin', 'operator', 'viewer'].includes(newRole)) return false;
  if (actorRole === 'owner') return true;
  if (actorRole === 'admin') return targetRole !== 'admin' && newRole !== 'admin';
  return false;
}
function createAdmin({ db, reply, audit, bearerSession, ONB, clean }) {
  async function guard(req, res) {
    const s = await bearerSession(req);
    if (!s) { reply(res, 401, { success: false, message: 'Entre com o novo login para administrar.' }); return null; }
    if (!s.orgId) { reply(res, 403, { success: false, message: 'Usuário sem organização vinculada.' }); return null; }
    if (!['owner', 'admin'].includes(String(s.orgRole))) { reply(res, 403, { success: false, code: 'forbidden', message: 'Apenas administradores.' }); return null; }
    if (s.aal !== 'aal2') { reply(res, 403, { success: false, code: 'mfa_required', message: 'Conclua a verificação em duas etapas (MFA) para administrar.' }); return null; }
    return s;
  }
  async function members(orgId) {
    const ms = await db('kac_memberships', { query: `select=user_id,role,created_at&organization_id=eq.${orgId}&order=created_at.asc` }) || [];
    const ids = ms.map(m => m.user_id).filter(id => USER_ID_RE.test(String(id)));
    const us = ids.length ? (await db('komodo_tbl_usuarios', { query: `select=id,email,auth_user_id&id=in.(${ids.map(encodeURIComponent).join(',')})` }) || []) : [];
    const by = Object.fromEntries(us.map(u => [u.id, u]));
    return ms.map(m => ({ userId: m.user_id, email: by[m.user_id]?.email || null, role: m.role, since: m.created_at, newLogin: Boolean(by[m.user_id]?.auth_user_id) }));
  }
  return async function handle(req, res, route, body, query) {
    const s = await guard(req, res); if (!s) return;
    const M = req.method;
    if (M === 'GET' && route === '/admin') route = '/admin/resumo';
    if (M === 'GET' && route === '/admin/seguranca') { let ret = null; try { ret = (await db('kac_organizations', { query: `select=retention_months&id=eq.${s.orgId}&limit=1` }))?.[0]?.retention_months ?? null; } catch (_) {} return reply(res, 200, { success: true, data: { mfa: s.aal === 'aal2', role: s.orgRole, retentionMonths: ret } }); }
    if (M === 'GET' && route === '/admin/resumo') {
      const org = (await db('kac_organizations', { query: `select=name,kind,cnpj,timezone,status,created_at&id=eq.${s.orgId}&limit=1` }))?.[0] || {};
      let plan = null; try { plan = (await db('kac_subscriptions', { query: `select=plan_id,status&organization_id=eq.${s.orgId}&limit=1` }))?.[0] || null; } catch (_) {}
      const ms = await members(s.orgId);
      return reply(res, 200, { success: true, data: { org: { name: org.name || null, kind: org.kind || null, cnpj: org.cnpj || null, timezone: org.timezone || 'America/Sao_Paulo', status: org.status || null }, plan: plan ? { id: plan.plan_id, status: plan.status } : null, me: { email: s.email, role: s.orgRole, mfa: s.aal === 'aal2' }, counts: { members: ms.length } } });
    }
    if (M === 'GET' && route === '/admin/membros') return reply(res, 200, { success: true, data: await members(s.orgId) });
    const mm = route.match(/^\/admin\/membros\/([^/]+)$/);
    if (mm && (M === 'PUT' || M === 'DELETE')) {
      const uid = decodeURIComponent(mm[1]); if (!USER_ID_RE.test(uid)) return reply(res, 400, { success: false, message: 'Usuário inválido.' });
      if (uid === s.userId) return reply(res, 403, { success: false, message: 'Você não pode alterar o próprio acesso por aqui.' });
      const target = (await db('kac_memberships', { query: `select=user_id,role&organization_id=eq.${s.orgId}&user_id=eq.${encodeURIComponent(uid)}&limit=1` }))?.[0];
      if (!target) return reply(res, 404, { success: false, message: 'Membro não encontrado.' });
      if (M === 'PUT') {
        const role = clean(body.role, 20);
        if (!canManage(s.orgRole, target.role, role)) return reply(res, 403, { success: false, message: 'Permissão insuficiente para este papel.' });
        if (role === target.role) return reply(res, 200, { success: true, data: { userId: uid, role } });
        await db('kac_memberships', { method: 'PATCH', query: `organization_id=eq.${s.orgId}&user_id=eq.${encodeURIComponent(uid)}`, body: { role }, prefer: 'return=minimal' });
        await audit(s, 'member.role', uid, { from: target.role, to: role }, 'member');
        return reply(res, 200, { success: true, data: { userId: uid, role } });
      }
      if (!canManage(s.orgRole, target.role)) return reply(res, 403, { success: false, message: 'Permissão insuficiente.' });
      await db('kac_memberships', { method: 'DELETE', query: `organization_id=eq.${s.orgId}&user_id=eq.${encodeURIComponent(uid)}` });
      await audit(s, 'member.remove', uid, { role: target.role }, 'member');
      return reply(res, 200, { success: true, data: { userId: uid, removed: true } });
    }
    if (M === 'GET' && route === '/admin/convites') {
      const rows = await db('kac_invites', { query: `select=id,email,role,expires_at,created_at&organization_id=eq.${s.orgId}&accepted_at=is.null&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&order=created_at.desc&limit=100` }) || [];
      return reply(res, 200, { success: true, data: rows.map(r => ({ id: r.id, email: r.email, role: r.role, expiresAt: r.expires_at })) });
    }
    const ci = route.match(/^\/admin\/convites\/([^/]+)$/);
    if (ci && M === 'DELETE') {
      const id = decodeURIComponent(ci[1]); if (!UUID_RE.test(id)) return reply(res, 400, { success: false, message: 'Convite inválido.' });
      const inv = (await db('kac_invites', { query: `select=id,role,accepted_at&organization_id=eq.${s.orgId}&id=eq.${id}&limit=1` }))?.[0];
      if (!inv || inv.accepted_at) return reply(res, 404, { success: false, message: 'Convite pendente não encontrado.' });
      if (inv.role === 'admin' && s.orgRole !== 'owner') return reply(res, 403, { success: false, message: 'Só o proprietário revoga convites de administrador.' });
      await db('kac_invites', { method: 'DELETE', query: `organization_id=eq.${s.orgId}&id=eq.${id}&accepted_at=is.null` });
      await audit(s, 'invite.revoke', id, { role: inv.role }, 'invite');
      return reply(res, 200, { success: true, data: { id, revoked: true } });
    }
    if (M === 'PUT' && route === '/admin/empresa') {
      const v = ONB.validateOnboarding(body); if (!v.ok) return reply(res, 422, { success: false, code: 'invalid', errors: v.errors, message: 'Revise os campos destacados.' });
      const cur = (await db('kac_organizations', { query: `select=name,kind,cnpj,timezone&id=eq.${s.orgId}&limit=1` }))?.[0] || {};
      const next = { name: v.value.name, kind: v.value.kind, cnpj: v.value.cnpj, timezone: v.value.timezone };
      const changed = Object.keys(next).filter(k => (cur[k] ?? null) !== (next[k] ?? null));
      if (changed.length) { await db('kac_organizations', { method: 'PATCH', query: `id=eq.${s.orgId}`, body: { ...next, updated_at: new Date().toISOString() }, prefer: 'return=minimal' }); await audit(s, 'org.update', s.orgId, { fields: changed }, 'organization'); }
      return reply(res, 200, { success: true, data: { changed } });
    }
    if (M === 'GET' && route === '/admin/auditoria') {
      const lim = Math.min(100, Math.max(1, parseInt(query?.limit, 10) || 50)); const before = parseInt(query?.antes, 10);
      const rows = await db('kac_audit_log', { query: `select=id,actor_user_id,action,entity,created_at&organization_id=eq.${s.orgId}${Number.isFinite(before) && before > 0 ? `&id=lt.${before}` : ''}&order=id.desc&limit=${lim}` }) || [];
      const emails = Object.fromEntries((await members(s.orgId)).map(m => [m.userId, m.email]));
      return reply(res, 200, { success: true, data: rows.map(r => ({ id: r.id, at: r.created_at, action: r.action, entity: r.entity, actor: emails[r.actor_user_id] || (r.actor_user_id ? 'ex-membro' : 'sistema') })) });
    }
    // LGPD (achado 3): pedido do titular — exportar/apagar os dados de UMA pessoa nesta empresa. Exige owner/admin + aal2 (guard).
    if (M === 'POST' && (route === '/admin/titular/exportar' || route === '/admin/titular/apagar')) {
      const nome = clean(body.nome, 120) || null; const placa = clean(body.placa, 12).toUpperCase() || null;
      if (!nome && !placa) return reply(res, 422, { success: false, message: 'Informe o nome completo ou a placa.' });
      const del = route.endsWith('/apagar');
      if (del && body.confirmar !== true) return reply(res, 422, { success: false, code: 'confirm_required', message: 'Confirme a exclusão definitiva.' });
      try {
        if (del) { const n = await db('rpc/kac_subject_delete', { method: 'POST', body: { p_org: s.orgId, p_nome: nome, p_placa: placa, p_actor: s.userId } }); return reply(res, 200, { success: true, data: { apagadas: Number(n) || 0 } }); }
        const data = await db('rpc/kac_subject_export', { method: 'POST', body: { p_org: s.orgId, p_nome: nome, p_placa: placa } });
        await audit(s, 'lgpd.subject_export', null, { visits: (data?.visits || []).length, saved_visitors: (data?.saved_visitors || []).length }, 'visit');
        return reply(res, 200, { success: true, data });
      } catch (e) { if (e.status === 404 || e.code === 'PGRST202') return reply(res, 501, { success: false, code: 'migration_pending', message: 'Recurso LGPD aguardando a atualização do banco (migração 010).' }); throw e; }
    }
    return reply(res, 404, { success: false, message: 'Rota não encontrada.' });
  };
}
module.exports = { createAdmin, canManage, ROLES };
