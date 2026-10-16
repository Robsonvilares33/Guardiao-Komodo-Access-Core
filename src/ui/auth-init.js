/* Fase C — página /auth.html: login e-mail/Google, MFA TOTP, aceitar convite, vincular conta. DOM só via textContent. */
(function () {
  'use strict';
  var U = window.SupabaseAuthClient._util; var c = window.SupabaseAuthClient.create();
  var $ = function (id) { return document.getElementById(id); };
  var invite = U.inviteFrom(location.search); var pendingFactor = null;
  c.onSessionChange(function (ev) { if (ev === 'expired') { show('secLogin'); msg('Sua sessão expirou. Entre novamente.', true); } });
  function back() { return location.origin + location.pathname + (invite ? '?convite=' + encodeURIComponent(invite) : ''); }
  function show(id) { ['secLoading', 'secOff', 'secLogin', 'secMfa', 'secReady', 'secNoOrg', 'secOnboard', 'secAdmin'].forEach(function (s) { $(s).hidden = s !== id; }); var h = $(id).querySelector('h2'); if (h) { h.tabIndex = -1; h.focus(); } }
  function msg(t, bad) { var m = $('authMsg'); m.textContent = t || ''; m.className = bad ? 'auth-msg bad' : 'auth-msg'; }
  async function guard(fn) { msg(''); try { await fn(); } catch (e) { msg(e.message || 'Erro.', true); } }
  function clearSetup() { var i = $('mfaQr'); i.removeAttribute('src'); i.hidden = true; $('mfaSecret').value = ''; $('mfaSetup').hidden = true; var a = $('mfaUri'); a.removeAttribute('href'); a.hidden = true; }
  async function afterLogin() {
    var fs = await c.factors(); var verified = fs.filter(function (x) { return x.status === 'verified'; });
    if (c.aal() !== 'aal2' && verified.length) { pendingFactor = verified[0].id; clearSetup(); $('mfaHint').textContent = 'Digite o código de 6 dígitos do seu app autenticador.'; return show('secMfa'); }
    $('who').textContent = (c.claims() || {}).email || ''; $('mfaState').textContent = c.aal() === 'aal2' ? 'MFA ativo nesta sessão (aal2).' : 'MFA não configurado. Obrigatório para administradores.';
    $('btnEnroll').hidden = c.aal() === 'aal2'; $('btnInvite').hidden = !invite;
    var st = null; try { st = (await c.me()).data; } catch (_) {}
    if (st && (!st.linked || !st.hasOrg)) { $('btnLinkNoOrg').hidden = !!st.linked; $('whoNoOrg').textContent = st.email || ''; $('btnInviteNoOrg').hidden = !invite; return show('secNoOrg'); }
    $('btnOpenApp').hidden = !(st && st.linked && st.hasOrg && !st.mfaRequired); $('btnAdmin').hidden = !(st && st.hasOrg && (st.orgRole === 'owner' || st.orgRole === 'admin')); if (st && st.mfaRequired) $('mfaState').textContent = 'Ative e confirme o MFA para abrir o sistema como administrador.'; show('secReady');
  }
  async function start() {
    // Mantém "Carregando…" até a config resolver; tenta de novo uma vez em falha transitória (rede/5xx). Só mostra Indisponível em falha definitiva.
    var cfg = null;
    for (var i = 0; i < 2 && !cfg; i++) { try { cfg = await c.loadConfig(); } catch (e) { c.configStatus = 'falha de rede/CSP: ' + String(e && e.message || e).slice(0, 80); } if (cfg || /^HTTP (404|200)/.test(c.configStatus || '')) break; if (i === 0) await new Promise(function (r) { setTimeout(r, 800); }); }
    if (!cfg) { try { sessionStorage.removeItem('kac_newlogin'); } catch (_) {} var d = $('offDetail'); if (d) d.textContent = 'Detalhe técnico: ' + (c.configStatus || 'sem resposta'); return show('secOff'); }
    if (location.hash) { await guard(async function () { c.fromRedirect(location.hash); }); history.replaceState(null, '', back()); if (c.session()) return guard(afterLogin); }
    show('secLogin');
  }
  document.addEventListener('DOMContentLoaded', function () {
    $('formLogin').addEventListener('submit', function (e) { e.preventDefault(); guard(async function () { await c.signIn($('email').value.trim(), $('password').value); $('password').value = ''; await afterLogin(); }); });
    $('btnSignup').addEventListener('click', function () { guard(async function () { await c.signUp($('email').value.trim(), $('password').value, back()); $('password').value = ''; msg('Enviamos um link de confirmação para o seu e-mail.'); }); });
    $('btnGoogle').addEventListener('click', function () { location.assign(c.googleUrl(back())); });
    $('btnEnroll').addEventListener('click', function () { guard(async function () { var b = $('btnEnroll'); b.disabled = true; var r; try { r = await c.enroll(); } finally { b.disabled = false; } pendingFactor = r.id; var img = $('mfaQr'); if (r.qrSrc) { img.src = r.qrSrc; img.hidden = false; } else { img.removeAttribute('src'); img.hidden = true; } $('mfaSecret').value = U.groupSecret(r.secret); var a = $('mfaUri'); if (r.uri) { a.href = r.uri; a.hidden = false; } else { a.removeAttribute('href'); a.hidden = true; } $('mfaSetup').hidden = !r.secret; $('mfaHint').textContent = r.qrSrc ? 'Leia o QR code no app autenticador (ou digite a chave abaixo) e informe o código de 6 dígitos.' : 'Digite a chave abaixo no app autenticador e informe o código de 6 dígitos.'; show('secMfa'); }); });
    $('btnCopySecret').addEventListener('click', function () { guard(async function () { var v = $('mfaSecret').value.replace(/\s/g, ''); try { await navigator.clipboard.writeText(v); } catch (_) { $('mfaSecret').focus(); $('mfaSecret').select(); throw new Error('Não foi possível copiar. A chave foi selecionada: copie manualmente.'); } msg('Chave copiada.'); }); });
    $('formMfa').addEventListener('submit', function (e) { e.preventDefault(); guard(async function () { await c.verify(pendingFactor, $('mfaCode').value.trim()); $('mfaCode').value = ''; clearSetup(); await afterLogin(); }); });
    async function openApp() { var r = await c.openApp(); var d = r.data; try { sessionStorage.setItem('komodo_session', JSON.stringify({ userId: d.user.id, email: d.user.email, role: d.user.role, expiresAt: d.expiresAt })); } catch (_) {} try { sessionStorage.setItem('kac_newlogin', '1'); } catch (_) {} location.assign('index.html'); }
    $('btnOpenApp').addEventListener('click', function () { guard(openApp); });
    $('btnLinkNoOrg').addEventListener('click', function () { guard(async function () { await c.link(); msg('Conta vinculada ao seu usuário atual.'); await afterLogin(); }); });
    $('btnInviteNoOrg').addEventListener('click', function () { $('btnInvite').click(); });
    $('btnSignOutNoOrg').addEventListener('click', function () { guard(async function () { if (c.signOut) await c.signOut(); show('secLogin'); }); });
    $('btnLink').addEventListener('click', function () { guard(async function () { await c.link(); msg('Conta vinculada ao seu usuário atual.'); }); });
    $('btnInvite').addEventListener('click', function () { guard(async function () { var r = await c.acceptInvite(invite); invite = null; $('btnInvite').hidden = true; msg(r.data && r.data.status === 'already_member' ? 'Você já é membro desta organização.' : 'Convite aceito.'); await afterLogin(); }); });
    $('formInvite').addEventListener('submit', function (e) { e.preventDefault(); guard(async function () { var r = await c.createInvite($('invEmail').value, $('invRole').value); var link = c.inviteLink(location.href, r.data.token); $('invLink').value = link; $('invOut').hidden = false; $('invExp').textContent = 'Válido até ' + new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }).format(new Date(r.data.expiresAt)) + ' (horário de Brasília). Envie o link só para a pessoa convidada.'; $('invLink').focus(); $('invLink').select(); if (adm && !$('secAdmin').hidden) adm.load().catch(function () {}); }); });
    $('btnCopy').addEventListener('click', function () { guard(async function () { await navigator.clipboard.writeText($('invLink').value); msg('Link copiado.'); }); });
    $('btnOut').addEventListener('click', function () { guard(async function () { await c.signOut(); show('secLogin'); }); });
    function fieldErr(id, t) { $(id).textContent = t || ''; }
    var adm = window.AdminConsole.mount({ client: c, doc: document, msg: msg, guard: guard });
    $('btnAdmin').addEventListener('click', function () { guard(async function () { if (c.aal() !== 'aal2') throw new Error('Conclua o MFA (verificação em duas etapas) para administrar.'); show('secAdmin'); await adm.load(); }); });
    $('btnAdminBack').addEventListener('click', function () { guard(afterLogin); });
    $('btnCreateOrg').addEventListener('click', function () { msg(''); show('secOnboard'); $('obName').focus(); });
    $('btnObCancel').addEventListener('click', function () { guard(afterLogin); });
    $('obCnpj').addEventListener('blur', function () { var v = $('obCnpj').value.trim(); fieldErr('obCnpjErr', v && !U.validCnpj(v) ? 'CNPJ inválido. Confira os 14 dígitos.' : ''); });
    $('formOnboard').addEventListener('submit', function (e) { e.preventDefault(); guard(async function () {
      var k = document.querySelector('input[name="obKind"]:checked'); var data = { name: $('obName').value, kind: k ? k.value : '', cnpj: $('obCnpj').value.trim(), timezone: $('obTz').value };
      fieldErr('obNameErr', data.name.trim().length < 2 ? 'Informe o nome da empresa.' : ''); fieldErr('obKindErr', k ? '' : 'Escolha o tipo.'); fieldErr('obCnpjErr', data.cnpj && !U.validCnpj(data.cnpj) ? 'CNPJ inválido.' : '');
      if ($('obNameErr').textContent || $('obKindErr').textContent || $('obCnpjErr').textContent) throw new Error('Revise os campos destacados.');
      var b = $('btnObSubmit'); b.disabled = true; try { await c.onboard(data); } finally { b.disabled = false; }
      msg('Empresa criada. Agora ative a verificação em duas etapas para administrar.'); await afterLogin(); }); });
    start();
  });
})();
