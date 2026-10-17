/* Achado 8: sem sessão, sai para o login antes de baixar o bundle da agenda (mesma regra de AuthService.getSession/requireAuth). */
(function () {
  try {
    var l = location, remote = (l.protocol === 'https:' && l.hostname !== 'localhost' && l.hostname !== '127.0.0.1') ||
      (l.protocol === 'http:' && (l.hostname === '127.0.0.1' || l.hostname === 'localhost') && l.port === '32198');
    var raw = (remote ? sessionStorage : localStorage).getItem('komodo_session'), s = raw ? JSON.parse(raw) : null;
    if (s && s.expiresAt && Date.now() <= s.expiresAt) return;
    var hint = false; try { hint = sessionStorage.getItem('kac_newlogin') === '1'; } catch (_) {}
    l.replace(hint ? 'auth.html' : 'login.html');
  } catch (_) { /* em caso de dúvida, o AuthService decide depois */ }
})();
