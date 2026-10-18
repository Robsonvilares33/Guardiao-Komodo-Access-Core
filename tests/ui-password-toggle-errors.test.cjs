const test = require('node:test'); const assert = require('node:assert'); const fs = require('node:fs'); const path = require('node:path');
const src = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
test('PasswordToggle: acessível (aria-pressed, aria-label PT, botão type=button) e carregado nas páginas com senha', () => {
  const s = src('src/ui/PasswordToggle.js');
  assert.match(s, /aria-pressed/); assert.match(s, /Mostrar senha/); assert.match(s, /Ocultar senha/); assert.match(s, /btn\.type = 'button'/); assert.doesNotMatch(s, /innerHTML/);
  for (const f of ['auth.html', 'login.html']) assert.match(src(f), /src\/ui\/PasswordToggle\.js/);
  const css = src('src/ui/styles/kac-theme.css'); assert.match(css, /\.pw-eye[^{]*\{[^}]*min-height:44px/); assert.match(css, /\.pw-eye:focus-visible/);
  assert.match(src('sw.js'), /'\/src\/ui\/PasswordToggle\.js'/);
});
test('ptError: mensagens do Supabase Auth em português', () => {
  require('../src/ui/SupabaseAuthClient.js'); const p = globalThis.SupabaseAuthClient._util.ptError;
  assert.strictEqual(p(400, 'invalid_credentials', 'Invalid login credentials'), 'E-mail ou senha incorretos. Se você criou a conta com o Google, use "Entrar com Google".');
  assert.match(p(400, null, 'Invalid login credentials'), /^E-mail ou senha incorretos/);
  assert.match(p(400, 'email_not_confirmed', 'Email not confirmed'), /não foi confirmado/);
  assert.match(p(429, 'over_request_rate_limit', 'Request rate limit reached'), /Muitas tentativas/);
  assert.match(p(429, 'over_email_send_rate_limit', 'email rate limit exceeded'), /Muitas tentativas/);
  assert.match(p(422, 'weak_password', 'Password should contain at least one character of each'), /Senha fraca/);
  assert.match(p(422, 'user_already_exists', 'User already registered'), /já tem conta/);
  assert.match(p(422, 'signup_disabled', 'Signups not allowed for this instance'), /desativado/);
  assert.match(p(500, 'unexpected_failure', 'Database error saving new user'), /^Não foi possível concluir agora/);
  assert.match(p(400, null, ''), /^Não foi possível concluir agora/);
});
test('ptError aplicado aos erros do GoTrue no login', async () => {
  const { create } = globalThis.SupabaseAuthClient;
  const f = async (url) => url.includes('/api/auth/supabase/config')
    ? { ok: true, status: 200, json: async () => ({ data: { enabled: true, url: 'https://x.supabase.co', anonKey: 'k' } }) }
    : { ok: false, status: 400, json: async () => ({ code: 'invalid_credentials', msg: 'Invalid login credentials' }) };
  const c = create({ fetch: f }); await c.loadConfig();
  await assert.rejects(c.signIn('a@b.co', 'x'.repeat(12)), (e) => /^E-mail ou senha incorretos/.test(e.message) && e.code === 'invalid_credentials' && e.status === 400);
});
const mk = (routes) => { const calls = []; const f = async (url, o = {}) => { calls.push([o.method || 'GET', url, o.body]); for (const [k, v] of Object.entries(routes)) if (url.includes(k)) return { ok: v[0] < 400, status: v[0], json: async () => v[1] }; return { ok: true, status: 200, json: async () => ({ data: { enabled: true, url: 'https://x.supabase.co', anonKey: 'k' } }) }; }; return { f, calls }; };
test('cadastro: e-mail já existente (identities vazio) é detectado', async () => {
  const { create } = globalThis.SupabaseAuthClient;
  let m = mk({ '/auth/v1/signup': [200, { id: 'fake', identities: [] }] }); let c = create({ fetch: m.f }); await c.loadConfig();
  assert.deepStrictEqual(await c.signUpChecked('a@b.co', 'abcdefgh1234', 'https://s/auth.html'), { exists: true, session: false });
  m = mk({ '/auth/v1/signup': [200, { id: 'n', identities: [{ id: 'i' }] }] }); c = create({ fetch: m.f }); await c.loadConfig();
  assert.deepStrictEqual(await c.signUpChecked('a@b.co', 'abcdefgh1234', 'https://s/auth.html'), { exists: false, session: false });
});
test('recuperação: recover com redirect, link recovery reconhecido, updatePassword valida e usa PUT /user', async () => {
  const { create, _util } = globalThis.SupabaseAuthClient;
  const m = mk({ '/auth/v1/recover': [200, {}], '/auth/v1/user': [200, { id: 'u' }] }); const c = create({ fetch: m.f }); await c.loadConfig();
  await assert.rejects(c.recover('', 'https://s/auth.html'), /e-mail/i);
  await c.recover('a@b.co', 'https://s/auth.html'); const rc = m.calls.find((x) => x[1].includes('/recover')); assert.match(rc[1], /redirect_to=https%3A%2F%2Fs%2Fauth\.html/); assert.strictEqual(JSON.parse(rc[2]).email, 'a@b.co');
  const tok = 'x.' + Buffer.from(JSON.stringify({ exp: 9999999999, aal: 'aal1' })).toString('base64url') + '.y';
  c.fromRedirect('#access_token=' + tok + '&refresh_token=r&type=recovery'); assert.strictEqual(c.redirectType, 'recovery');
  await assert.rejects(c.updatePassword('curta1'), /12 caracteres/);
  await c.updatePassword('SenhaNova2026abc'); const up = m.calls.find((x) => x[0] === 'PUT'); assert.match(up[1], /\/auth\/v1\/user$/); assert.strictEqual(JSON.parse(up[2]).password, 'SenhaNova2026abc');
  assert.throws(() => c.fromRedirect('#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired'), /expirou/);
  assert.strictEqual(_util.checkPassword('abcdefghijkl'), 'Use letras e números na senha (símbolos também ajudam).'); assert.strictEqual(_util.checkPassword('abcdefghijk1'), '');
});
test('auth.html: botão Esqueci minha senha e formulário de nova senha', () => {
  const h = src('auth.html'); assert.match(h, /id="btnForgot"[^>]*>Esqueci minha senha \/ criar senha</); assert.match(h, /id="secSetPw" hidden/); assert.match(h, /id="newPw" type="password" autocomplete="new-password"/);
  const j = src('src/ui/auth-init.js'); assert.match(j, /afterRecovery/); assert.match(j, /signUpChecked/); assert.match(j, /'secSetPw'/);
});
