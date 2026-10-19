'use strict';
// Cliente SMTP mínimo (sem dependências): TLS direto (porta 465), AUTH PLAIN, um destinatário, texto puro UTF-8.
// Credenciais só do ambiente do servidor; nunca logadas. Timeout curto para não segurar a função.
const tls = require('node:tls'); const crypto = require('node:crypto');
function b64(s) { return Buffer.from(s, 'utf8').toString('base64'); }
function hdr(s) { return /^[\x20-\x7e]*$/.test(s) ? s : '=?UTF-8?B?' + b64(s) + '?='; }
function safeAddr(a) { const s = String(a || '').trim(); return /^[^\s<>@,;:"]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(s) && s.length <= 254 ? s : null; }
function buildMessage({ from, fromName, to, subject, text, now = new Date() }) {
  const body = String(text).replace(/\r?\n/g, '\r\n').replace(/^\./gm, '..');
  return [`From: ${fromName ? hdr(fromName) + ' ' : ''}<${from}>`, `To: <${to}>`, `Subject: ${hdr(subject)}`, `Date: ${now.toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@kac.local>`, 'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', 'Auto-Submitted: auto-generated', '',
    b64(body).replace(/.{1,76}/g, '$&\r\n').trimEnd()].join('\r\n');
}
function session({ host = 'smtp.gmail.com', port = 465, user, pass, timeoutMs = 8000, connect = tls.connect }, steps) {
  return new Promise((resolve, reject) => {
    let buf = '', i = 0, done = false; const sock = connect({ host, port, servername: host });
    const t = setTimeout(() => fail(new Error('smtp_timeout')), timeoutMs);
    function fail(e) { if (done) return; done = true; clearTimeout(t); try { sock.destroy(); } catch (_) {} reject(e); }
    function ok(v) { if (done) return; done = true; clearTimeout(t); try { sock.end(); } catch (_) {} resolve(v); }
    sock.setEncoding('utf8'); sock.on('error', () => fail(new Error('smtp_conn')));
    sock.on('data', d => { buf += d; let m; while ((m = buf.match(/^(\d{3})([ -])[^\r\n]*\r\n/m)) && buf.indexOf(m[0]) === 0) { buf = buf.slice(m[0].length); if (m[2] === ' ') step(Number(m[1])); } });
    function step(code) {
      const s = steps[i++]; if (!s) return ok(true);
      if (!s.expect.includes(code)) return fail(Object.assign(new Error('smtp_' + (s.name || 'step')), { smtpCode: code }));
      if (s.send == null) return ok(true); sock.write(s.send + '\r\n');
    }
  });
}
async function send(opts) {
  const { user, pass, to, subject, text, fromName } = opts; const rcpt = safeAddr(to), from = safeAddr(user);
  if (!rcpt || !from || !pass) throw new Error('smtp_config');
  const msg = buildMessage({ from, fromName, to: rcpt, subject, text });
  return session(opts, [{ expect: [220], send: 'EHLO guardiao-komodo' }, { expect: [250], send: 'AUTH PLAIN ' + Buffer.from('\0' + from + '\0' + pass).toString('base64'), name: 'ehlo' },
    { expect: [235], send: `MAIL FROM:<${from}>`, name: 'auth' }, { expect: [250], send: `RCPT TO:<${rcpt}>`, name: 'mail' }, { expect: [250, 251], send: 'DATA', name: 'rcpt' },
    { expect: [354], send: msg + '\r\n.', name: 'data' }, { expect: [250], send: 'QUIT', name: 'sent' }, { expect: [221], send: null }]);
}
async function verify(opts) { const from = safeAddr(opts.user); if (!from || !opts.pass) throw new Error('smtp_config');
  return session(opts, [{ expect: [220], send: 'EHLO guardiao-komodo' }, { expect: [250], send: 'AUTH PLAIN ' + Buffer.from('\0' + from + '\0' + opts.pass).toString('base64'), name: 'ehlo' }, { expect: [235], send: 'QUIT', name: 'auth' }, { expect: [221], send: null }]); }
module.exports = { send, verify, buildMessage, safeAddr };
