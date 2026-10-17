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
