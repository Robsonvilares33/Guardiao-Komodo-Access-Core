/* Fase C — página /auth.html: login e-mail/Google, MFA TOTP, aceitar convite, vincular conta. DOM só via textContent. */
(function () {
  'use strict';
  var U = window.SupabaseAuthClient._util; var c = window.SupabaseAuthClient.create();
  var $ = function (id) { return document.getElementById(id); };
  var invite = U.inviteFrom(location.search); var pendingFactor = null;
  function back() { return location.origin + location.pathname + (invite ? '?convite=' + encodeURIComponent(invite) : ''); }
  function show(id) { ['secOff', 'secLogin', 'secMfa', 'secReady'].forEach(function (s) { $(s).hidden = s !== id; }); var h = $(id).querySelector('h2'); if (h) { h.tabIndex = -1; h.focus(); } }
  function msg(t, bad) { var m = $('authMsg'); m.textContent = t || ''; m.className = bad ? 'auth-msg bad' : 'auth-msg'; }
  async function guard(fn) { msg(''); try { await fn(); } catch (e) { msg(e.message || 'Erro.', true); } }
  async function afterLogin() {
    var fs = await c.factors(); var verified = fs.filter(function (x) { return x.status === 'verified'; });
    if (c.aal() !== 'aal2' && verified.length) { pendingFactor = verified[0].id; $('mfaQr').hidden = true; $('mfaHint').textContent = 'Digite o código de 6 dígitos do seu app autenticador.'; return show('secMfa'); }
    $('who').textContent = (c.claims() || {}).email || ''; $('mfaState').textContent = c.aal() === 'aal2' ? 'MFA ativo nesta sessão (aal2).' : 'MFA não configurado. Obrigatório para administradores.';
    $('btnEnroll').hidden = c.aal() === 'aal2'; $('btnInvite').hidden = !invite; show('secReady');
  }
  async function start() {
    var cfg = null; try { cfg = await c.loadConfig(); } catch (_) {}
    if (!cfg) return show('secOff');
    if (location.hash) { await guard(async function () { c.fromRedirect(location.hash); }); history.replaceState(null, '', back()); if (c.session()) return guard(afterLogin); }
    show('secLogin');
  }
  document.addEventListener('DOMContentLoaded', function () {
    $('formLogin').addEventListener('submit', function (e) { e.preventDefault(); guard(async function () { await c.signIn($('email').value.trim(), $('password').value); $('password').value = ''; await afterLogin(); }); });
    $('btnSignup').addEventListener('click', function () { guard(async function () { await c.signUp($('email').value.trim(), $('password').value, back()); $('password').value = ''; msg('Enviamos um link de confirmação para o seu e-mail.'); }); });
    $('btnGoogle').addEventListener('click', function () { location.assign(c.googleUrl(back())); });
    $('btnEnroll').addEventListener('click', function () { guard(async function () { var r = await c.enroll(); pendingFactor = r.id; var img = $('mfaQr'); img.src = r.totp.qr_code; img.hidden = false; $('mfaHint').textContent = 'Leia o QR code no app autenticador e digite o código de 6 dígitos.'; show('secMfa'); }); });
    $('formMfa').addEventListener('submit', function (e) { e.preventDefault(); guard(async function () { await c.verify(pendingFactor, $('mfaCode').value.trim()); $('mfaCode').value = ''; $('mfaQr').removeAttribute('src'); await afterLogin(); }); });
    $('btnLink').addEventListener('click', function () { guard(async function () { await c.link(); msg('Conta vinculada ao seu usuário atual.'); }); });
    $('btnInvite').addEventListener('click', function () { guard(async function () { var r = await c.acceptInvite(invite); invite = null; $('btnInvite').hidden = true; msg(r.data && r.data.status === 'already_member' ? 'Você já é membro desta organização.' : 'Convite aceito.'); }); });
    $('btnOut').addEventListener('click', function () { guard(async function () { await c.signOut(); show('secLogin'); }); });
    start();
  });
})();
