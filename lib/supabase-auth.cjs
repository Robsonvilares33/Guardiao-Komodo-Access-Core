'use strict';
// Fase C: identidade via Supabase Auth, coexistindo com as sessões próprias. DESLIGADO por padrão (KAC_SUPABASE_AUTH=on liga).
// O token é sempre validado no servidor pelo GoTrue (/auth/v1/user). Nada aqui confia em claims sem essa validação.
const crypto = require('node:crypto');

function enabled(env = process.env) { return String(env.KAC_SUPABASE_AUTH || '').toLowerCase() === 'on'; }
function bearerFrom(req) { const m = /^Bearer\s+([A-Za-z0-9._-]{20,4096})$/.exec(String(req.headers?.authorization || '')); return m ? m[1] : null; }
// Lê o payload do JWT já validado pelo GoTrue (só para aal/amr). Nunca usar sem a validação.
function payloadOf(token) { try { return JSON.parse(Buffer.from(String(token).split('.')[1] || '', 'base64url').toString('utf8')) || {}; } catch { return {}; } }

async function verifyAccessToken(token, { url, key, fetchImpl = fetch }) {
  if (!token) return null;
  const r = await fetchImpl(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${token}`, Accept: 'application/json' } });
  if (r.status === 401 || r.status === 403) return null;
  if (!r.ok) { const e = new Error('AUTH_PROVIDER_ERROR'); e.status = r.status; throw e; }
  const u = JSON.parse(await r.text() || 'null');
  if (!u || !u.id) return null;
  const p = payloadOf(token);
  if (p.sub && p.sub !== u.id) return null;
  return {
    authUserId: u.id,
    email: String(u.email || '').toLowerCase(),
    emailVerified: Boolean(u.email_confirmed_at || u.confirmed_at),
    aal: p.aal === 'aal2' ? 'aal2' : 'aal1',
    provider: u.app_metadata?.provider || null,
  };
}

const ADMIN_ROLES = new Set(['admin', 'owner']);
// Admin/owner exigem MFA (aal2) quando entram por Supabase Auth.
function mfaRequired(identity, { appRole, orgRole }) { return identity?.aal !== 'aal2' && (ADMIN_ROLES.has(appRole) || ADMIN_ROLES.has(orgRole)); }

const INVITE_ROLES = new Set(['admin', 'operator', 'viewer']);
function canInvite(inviterOrgRole, role) { if (!INVITE_ROLES.has(role)) return false; if (inviterOrgRole === 'owner') return true; if (inviterOrgRole === 'admin') return role !== 'admin'; return false; }
function newInviteToken() { const token = crypto.randomBytes(32).toString('base64url'); return { token, hash: crypto.createHash('sha256').update(token).digest('hex') }; }
function hashToken(t) { return crypto.createHash('sha256').update(String(t || '')).digest('hex'); }

module.exports = { enabled, bearerFrom, payloadOf, verifyAccessToken, mfaRequired, canInvite, newInviteToken, hashToken, INVITE_ROLES };
