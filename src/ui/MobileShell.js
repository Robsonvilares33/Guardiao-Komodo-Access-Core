/* UX fase 2: (7) barra de navegação inferior no celular, (6) seções opcionais do cadastro, (backlog) nome da empresa no cabeçalho.
   Só delega para botões que já existem (mesmos handlers, mesmas permissões). DOM só via textContent. */
(function (root) {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var MAP = { 'new': 'btnOpenModal', saved: 'btnSavedVisitors', invites: 'btnInvites', alerts: 'btnAlerts', dashboard: 'btnOpenDashboard', pdf: 'btnExportPDF', config: 'btnOpenConfig', logout: 'btnLogout' };
  function nav(action) {
    if (action === 'agenda') { root.scrollTo({ top: 0, behavior: 'smooth' }); var c = $('cardsContainer'); if (c) c.focus(); return; }
    if (action === 'search') { var s = $('globalSearch'); if (s) { s.scrollIntoView({ block: 'center' }); s.focus(); } return; }
    var b = $(MAP[action]); if (b) b.click();
    var more = document.querySelector('.bn-more'); if (more) more.open = false;
  }
  // (6) abre automaticamente as seções opcionais que já têm dados (ex.: editar um registro)
  function syncSections(root2) {
    (root2 || document).querySelectorAll('details.opt-section').forEach(function (d) {
      var filled = Array.prototype.some.call(d.querySelectorAll('input:not([type=hidden]):not([type=file]), textarea, select'), function (el) { return el.tagName === 'SELECT' ? el.selectedIndex > 0 : String(el.value || '').trim() !== ''; });
      if (filled) d.open = true;
    });
  }
  function watchModal() {
    var m = $('mainModalOverlay'); if (!m) return;
    new MutationObserver(function () {
      if (m.hasAttribute('open') || m.classList.contains('aberto')) { setTimeout(function () { syncSections(m); var n = m.querySelector('[data-field="nome"]'); if (n && !n.closest('[hidden]') && n.offsetParent !== null) n.focus(); }, 50); }
    }).observe(m, { attributes: true, attributeFilter: ['open', 'class', 'style'] });
  }
  // (backlog) nome da empresa da sessão, vindo do servidor (/api/organizacao: só o nome da PRÓPRIA org)
  async function orgName() {
    var el = $('orgName'); if (!el || !root.authService || !root.apiService) return;
    try { if (!root.authService.isRemoteMode() || !root.authService.isAuthenticated()) return; var d = await root.apiService.get('/organizacao'); var n = d && typeof d.name === 'string' ? d.name.trim() : ''; if (!n) return; el.textContent = n; el.title = n; el.hidden = false; } catch (_) { /* silencioso: cabeçalho continua sem nome */ }
  }
  function init() {
    var bar = document.querySelector('.bottom-nav');
    if (bar) bar.addEventListener('click', function (e) { var b = e.target.closest('[data-nav]'); if (b) { e.preventDefault(); nav(b.getAttribute('data-nav')); } });
    watchModal(); orgName();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  root.KacMobileShell = { nav: nav, syncSections: syncSections, orgName: orgName };
  if (typeof module !== 'undefined') module.exports = root.KacMobileShell;
})(typeof window !== 'undefined' ? window : globalThis);
