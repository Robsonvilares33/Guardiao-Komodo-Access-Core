/* Fase C — página /auth.html: login e-mail/Google, MFA TOTP, aceitar convite, vincular conta. DOM só via textContent. */
(function () {
  'use strict';
  var U = window.SupabaseAuthClient._util; var c = window.SupabaseAuthClient.create();
  var $ = function (id) { return document.getElementById(id); };
  var invite = U.inviteFrom(location.search); var pendingFactor = null;
  c.onSessionChange(function (ev) { if (ev === 'expired') { show('secLogin'); msg('Sua sessão expirou. Entre novamente.', true); } });
  function back() { return location.origin + location.pathname + (invite ? '?convite=' + encodeURIComponent(invite) : ''); }
  function show(id) { ['secOff', 'secLogin', 'secMfa', 'secReady', 'secNoOrg'].forEach(function (s) { $(s).hidden = s !== id; }); var h = $(id).querySelector('h2'); if (h) { h.tabIndex = -1; h.focus(); } }
  function msg(t, bad) { var m = $('authMsg'); m.textContent = t || ''; m.className = bad ? 'auth-msg bad' : 'auth-msg'; }
  async function guard(fn) { msg(''); try { await fn(); } catch (e) { msg(e.message || 'Erro.', true); } }
  async function afterLogin() {
    var fs = await c.factors(); var verified = fs.filter(function (x) { return x.status === 'verified'; });
    if (c.aal() !== 'aal2' && verified.length) { pendingFactor = verified[0].id; $('mfaQr').hidden = true; $('mfaHint').textContent = 'Digite o código de 6 dígitos do seu app autenticador.'; return show('secMfa'); }
    $('who').textContent = (c.claims() || {}).email || ''; $('mfaState').textContent = c.aal() === 'aal2' ? 'MFA ativo nesta sessão (aal2).' : 'MFA não configurado. Obrigatório para administradores.';
    $('btnEnroll').hidden = c.aal() === 'aal2'; $('btnInvite').hidden = !invite;
    var st = null; try { st = (await c.me()).data; } catch (_) {}
    if (st && !st.linked) { $('whoNoOrg').textContent = st.email || ''; $('btnInviteNoOrg').hidden = !invite; return show('secNoOrg'); }
    $('btnOpenApp').hidden = !(st && st.linked && st.hasOrg); show('secReady');
  }
  async function start() {
    var cfg = null; try { cfg = await c.loadConfig(); } catch (e) { c.configStatus = 'falha de rede/CSP: ' + String(e && e.message || e).slice(0, 80); }
    if (!cfg) { var d = $('offDetail'); if (d) d.textContent = 'Detalhe técnico: ' + (c.configStatus || 'sem resposta'); return show('secOff'); }
    if (location.hash) { await guard(async function () { c.fromRedirect(location.hash); }); history.replaceState(null, '', back()); if (c.session()) return guard(afterLogin); }
    show('secLogin');
  }
  document.addEventListener('DOMContentLoaded', function () {
    $('formLogin').addEventListener('submit', function (e) { e.preventDefault(); guard(async function () { await c.signIn($('email').value.trim(), $('password').value); $('password').value = ''; await afterLogin(); }); });
    $('btnSignup').addEventListener('click', function () { guard(async function () { await c.signUp($('email').value.trim(), $('password').value, back()); $('password').value = ''; msg('Enviamos um link de confirmação para o seu e-mail.'); }); });
    $('btnGoogle').addEventListener('click', function () { location.assign(c.googleUrl(back())); });
    $('btnEnroll').addEventListener('click', function () { guard(async function () { var r = await c.enroll(); pendingFactor = r.id; var img = $('mfaQr'); img.src = r.totp.qr_code; img.hidden = false; $('mfaHint').textContent = 'Leia o QR code no app autenticador e digite o código de 6 dígitos.'; show('secMfa'); }); });
    $('formMfa').addEventListener('submit', function (e) { e.preventDefault(); guard(async function () { await c.verify(pendingFactor, $('mfaCode').value.trim()); $('mfaCode').value = ''; $('mfaQr').removeAttribute('src'); await afterLogin(); }); });
    async function openApp() { var r = await c.openApp(); var d = r.data; try { sessionStorage.setItem('komodo_session', JSON.stringify({ userId: d.user.id, email: d.user.email, role: d.user.role, expiresAt: d.expiresAt })); } catch (_) {} location.assign('index.html'); }
    $('btnOpenApp').addEventListener('click', function () { guard(openApp); });
    $('btnLinkNoOrg').addEventListener('click', function () { guard(async function () { await c.link(); msg('Conta vinculada ao seu usuário atual.'); await afterLogin(); }); });
    $('btnInviteNoOrg').addEventListener('click', function () { $('btnInvite').click(); });
    $('btnSignOutNoOrg').addEventListener('click', function () { guard(async function () { if (c.signOut) await c.signOut(); show('secLogin'); }); });
    $('btnLink').addEventListener('click', function () { guard(async function () { await c.link(); msg('Conta vinculada ao seu usuário atual.'); }); });
    $('btnInvite').addEventListener('click', function () { guard(async function () { var r = await c.acceptInvite(invite); invite = null; $('btnInvite').hidden = true; msg(r.data && r.data.status === 'already_member' ? 'Você já é membro desta organização.' : 'Convite aceito.'); await afterLogin(); }); });
    $('formInvite').addEventListener('submit', function (e) { e.preventDefault(); guard(async function () { var r = await c.createInvite($('invEmail').value, $('invRole').value); var link = c.inviteLink(location.href, r.data.token); $('invLink').value = link; $('invOut').hidden = false; $('invExp').textContent = 'Válido até ' + new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }).format(new Date(r.data.expiresAt)) + ' (horário de Brasília). Envie o link só para a pessoa convidada.'; $('invLink').focus(); $('invLink').select(); }); });
    $('btnCopy').addEventListener('click', function () { guard(async function () { await navigator.clipboard.writeText($('invLink').value); msg('Link copiado.'); }); });
    $('btnOut').addEventListener('click', function () { guard(async function () { await c.signOut(); show('secLogin'); }); });
    start();
  });
})();
