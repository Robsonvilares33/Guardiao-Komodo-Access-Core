'use strict';
// Web Push sem dependências: VAPID (RFC 8292, JWT ES256) + criptografia do conteúdo aes128gcm (RFC 8291/8188).
// A chave privada VAPID vem só do ambiente do servidor e nunca é logada. Só envia para serviços de push conhecidos (sem SSRF).
const crypto = require('node:crypto');
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /^android\.googleapis\.com$/, /^updates\.push\.services\.mozilla\.com$/, /^web\.push\.apple\.com$/, /^[a-z0-9-]+\.push\.apple\.com$/, /^[a-z0-9-]+\.notify\.windows\.com$/];
function b64u(b) { return Buffer.from(b).toString('base64url'); }
function unb64u(s) { return Buffer.from(String(s || ''), 'base64url'); }
function allowedEndpoint(ep) {
  let u; try { u = new URL(String(ep)); } catch { return false; }
  return u.protocol === 'https:' && !u.port && !u.username && !u.password && String(ep).length <= 1024 && PUSH_HOSTS.some(r => r.test(u.hostname));
}
function validKeys(k) { const p = unb64u(k?.p256dh), a = unb64u(k?.auth); return p.length === 65 && p[0] === 4 && a.length === 16; }
function vapidKeys(env = process.env) {
  const pub = String(env.KAC_VAPID_PUBLIC_KEY || ''), prv = String(env.KAC_VAPID_PRIVATE_KEY || '');
  const p = unb64u(pub), d = unb64u(prv); if (p.length !== 65 || d.length !== 32) return null;
  return { publicKey: pub, key: crypto.createPrivateKey({ key: { kty: 'EC', crv: 'P-256', d: b64u(d), x: b64u(p.subarray(1, 33)), y: b64u(p.subarray(33, 65)) }, format: 'jwk' }) };
}
function vapidHeader(endpoint, keys, { sub = 'https://guardiao-komodo-access-core.vercel.app', now = Date.now() } = {}) {
  const aud = new URL(endpoint).origin;
  const h = b64u(JSON.stringify({ typ: 'JWT', alg: 'ES256' })), c = b64u(JSON.stringify({ aud, exp: Math.floor(now / 1000) + 12 * 3600, sub }));
  const sig = crypto.sign('sha256', Buffer.from(h + '.' + c), { key: keys.key, dsaEncoding: 'ieee-p1363' });
  return `vapid t=${h}.${c}.${b64u(sig)}, k=${keys.publicKey}`;
}
// RFC 8291: um registro só (conteúdo < 4 KB). Devolve o corpo binário pronto para POST.
function encrypt(payload, sub, { salt = crypto.randomBytes(16), ecdh = null } = {}) {
  const uaPub = unb64u(sub.keys.p256dh), authSecret = unb64u(sub.keys.auth);
  const as = ecdh || crypto.createECDH('prime256v1'); if (!ecdh) as.generateKeys(); const asPub = as.getPublicKey();
  const shared = as.computeSecret(uaPub);
  const ikm = Buffer.from(crypto.hkdfSync('sha256', shared, authSecret, Buffer.concat([Buffer.from('WebPush: info\0'), uaPub, asPub]), 32));
  const cek = Buffer.from(crypto.hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16));
  const nonce = Buffer.from(crypto.hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: nonce\0'), 12));
  const c = crypto.createCipheriv('aes-128-gcm', cek, nonce);
  const ct = Buffer.concat([c.update(Buffer.concat([Buffer.from(payload, 'utf8'), Buffer.from([2])])), c.final(), c.getAuthTag()]);
  const head = Buffer.alloc(21); salt.copy(head, 0); head.writeUInt32BE(4096, 16); head[20] = 65;
  return Buffer.concat([head, asPub, ct]);
}
// Resultado: { ok, status, gone } — gone=true quando o aparelho cancelou (404/410) e a inscrição deve ser apagada.
async function send(sub, payload, { env = process.env, fetchImpl = globalThis.fetch, ttl = 600, timeoutMs = 5000 } = {}) {
  if (!allowedEndpoint(sub.endpoint) || !validKeys(sub.keys)) return { ok: false, status: 0, code: 'bad_subscription', gone: true };
  const keys = vapidKeys(env); if (!keys) return { ok: false, status: 0, code: 'vapid_missing' };
  try {
    const r = await fetchImpl(sub.endpoint, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(timeoutMs), headers: { Authorization: vapidHeader(sub.endpoint, keys), 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: String(ttl), Urgency: 'high' }, body: encrypt(payload, sub) });
    return { ok: r.status >= 200 && r.status < 300, status: r.status, code: 'http_' + r.status, gone: r.status === 404 || r.status === 410 };
  } catch (e) { return { ok: false, status: 0, code: e && e.name === 'TimeoutError' ? 'timeout' : 'network' }; }
}
module.exports = { send, encrypt, vapidHeader, vapidKeys, allowedEndpoint, validKeys };
