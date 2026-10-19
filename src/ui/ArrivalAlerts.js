/* Avisos de chegada (Onda 1, item 3): o usuário liga/desliga o aviso no celular (Web Push) e por e-mail, e envia um teste.
   Funciona no Chrome do Android e no iPhone/iPad com o app instalado na Tela de Início (iOS 16.4+). Opt-in: nada é ligado sozinho.
   Dados só de /api/avisos (sempre do próprio usuário). <dialog> acessível; DOM só via textContent. */
(function (root) {
  'use strict';
  var doc = root.document, nav = root.navigator;
  function api() { return root.apiService; }
  function remote() { try { return !!(root.authService && root.authService.isRemoteMode && root.authService.isRemoteMode()); } catch (_) { return false; } }
  function el(tag, cls, text) { var e = doc.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = String(text); return e; }
  function btn(cls, text) { var b = el('button', cls, text); b.type = 'button'; return b; }
  function isIOS() { return /iPad|iPhone|iPod/.test(nav.userAgent) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1); }
  function standalone() { try { return root.matchMedia('(display-mode: standalone)').matches || nav.standalone === true; } catch (_) { return false; } }
  function pushSupported() { return 'serviceWorker' in nav && 'PushManager' in root && 'Notification' in root; }
  function deviceLabel() { var ua = nav.userAgent; var os = /Android/.test(ua) ? 'Android' : isIOS() ? 'iPhone/iPad' : /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'Aparelho';
    var br = /Edg\//.test(ua) ? 'Edge' : /SamsungBrowser/.test(ua) ? 'Samsung' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Navegador'; return os + ' (' + br + ')'; }
  function keyBytes(b64) { var s = String(b64).replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; var bin = root.atob(s); var a = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return a; }
  function reg() { return nav.serviceWorker.getRegistration('/').then(function (r) { return r || nav.serviceWorker.register('/sw.js', { scope: '/' }); }).then(function () { return nav.serviceWorker.ready; }); }
  function currentSub() { if (!pushSupported()) return Promise.resolve(null); return reg().then(function (r) { return r.pushManager.getSubscription(); }).catch(function () { return null; }); }
  function sendSub(sub) { var j = sub.toJSON(); return api().post('/avisos/aparelhos', { endpoint: j.endpoint, keys: j.keys, label: deviceLabel() }); }
  function enablePush(vapid) {
    if (!pushSupported()) return Promise.reject(new Error(isIOS() && !standalone() ? 'No iPhone, primeiro adicione o app à Tela de Início (Compartilhar > Adicionar à Tela de Início) e abra pelo ícone.' : 'Este navegador não aceita avisos. Use o Chrome no Android ou o app instalado no iPhone.'));
    if (!vapid) return Promise.reject(new Error('Os avisos no celular ainda não estão disponíveis neste sistema.'));
    return root.Notification.requestPermission().then(function (perm) {
      if (perm !== 'granted') throw new Error(perm === 'denied' ? 'As notificações estão bloqueadas para este site. Libere nas configurações do navegador (Notificações) e tente de novo.' : 'Você não permitiu as notificações. Toque de novo e escolha Permitir.');
      return reg();
    }).then(function (r) {
      return r.pushManager.getSubscription().then(function (s) { return s || r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(vapid) }); });
    }).then(sendSub);
  }
  function disablePush() { return currentSub().then(function (s) { var ep = s && s.endpoint; return (s ? s.unsubscribe().catch(function () {}) : Promise.resolve()).then(function () { return ep ? api().post('/avisos/aparelhos/remover', { endpoint: ep }).catch(function () {}) : null; }); }).then(function () { return api().put('/avisos', { push: false }); }); }

  function open(opener) {
    if (!remote()) { root.alert('Avisos de chegada ficam disponíveis com a conta online.'); return null; }
    var old = doc.getElementById('alertsDialog'); if (old) old.remove();
    var dlg = el('dialog', 'sv-dialog inv-dialog al-dialog'); dlg.id = 'alertsDialog'; dlg.setAttribute('aria-labelledby', 'alTitle');
    var head = el('div', 'sv-head'); var h = el('h2', 'sv-title', 'Avisos de chegada'); h.id = 'alTitle'; var x = btn('btn-icon sv-close', '×'); x.setAttribute('aria-label', 'Fechar'); head.append(h, x);
    var body = el('div', 'sv-body');
    var intro = el('p', 'sv-hint', 'Quando a portaria marcar a chegada de um visitante seu, você recebe um aviso. O aviso não mostra o nome do visitante, só o horário agendado.');
    var status = el('p', 'sv-status'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    function sw(id, label, hint) {
      var w = el('div', 'al-row'); var l = el('label', 'al-switch'); l.htmlFor = id; var i = el('input'); i.type = 'checkbox'; i.id = id; i.setAttribute('role', 'switch');
      var t = el('span', 'al-label'); t.append(el('strong', null, label), el('span', 'auto-doc', hint)); l.append(i, t); w.appendChild(l); return { wrap: w, input: i, hint: t.lastChild };
    }
    var sp = sw('alPush', 'Aviso neste celular', 'Notificação na tela, mesmo com o app fechado.');
    var se = sw('alEmail', 'Aviso por e-mail', 'Se o celular não receber, mandamos um e-mail curto.');
    var ios = el('p', 'al-note'); ios.hidden = true;
    var devH = el('h3', 'inv-sub', 'Aparelhos com aviso ligado'); var devs = el('ul', 'sv-rows'); devs.setAttribute('aria-label', 'Aparelhos com aviso ligado');
    var tb = btn('btn-gold sv-btn al-test', 'Enviar aviso de teste');
    body.append(intro, sp.wrap, ios, se.wrap, tb, status, devH, devs);
    dlg.append(head, body); doc.body.appendChild(dlg);
    var state = null;
    x.addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('close', function () { dlg.remove(); var back = opener && opener.offsetParent !== null ? opener : doc.querySelector('.bn-more summary'); if (back && back.focus) back.focus(); });
    function drawDevices() {
      devs.replaceChildren(); var list = (state && state.aparelhos) || [];
      if (!list.length) devs.appendChild(el('li', 'sv-hint', 'Nenhum aparelho ainda.'));
      list.forEach(function (d) {
        var li = el('li', 'sv-row'); var info = el('div', 'sv-info'); info.append(el('span', 'auto-name', d.label), el('span', 'auto-doc', d.ultimoOk ? 'Último aviso recebido: ' + new Date(d.ultimoOk).toLocaleString('pt-BR') : 'Ligado em ' + new Date(d.desde).toLocaleDateString('pt-BR')));
        var rm = btn('btn-cancel sv-btn', 'Remover'); rm.setAttribute('aria-label', 'Remover ' + d.label);
        rm.addEventListener('click', function () { rm.disabled = true; api().post('/avisos/aparelhos/remover', { id: d.id }).then(load).then(function () { status.textContent = 'Aparelho removido.'; }).catch(function (e) { rm.disabled = false; status.textContent = e.message; }); });
        var act = el('div', 'sv-actions'); act.appendChild(rm); li.append(info, act); devs.appendChild(li);
      });
    }
    function load() {
      return Promise.all([api().get('/avisos'), currentSub()]).then(function (r) {
        state = r[0] || {}; var here = r[1];
        sp.input.checked = !!(state.push && here); se.input.checked = !!state.email;
        se.input.disabled = !state.emailDisponivel; if (!state.emailDisponivel) se.hint.textContent = 'Ainda não disponível neste sistema.'; else if (state.emailConta) se.hint.textContent = 'Se o celular não receber, mandamos um e-mail curto para ' + state.emailConta + '.';
        if (isIOS() && !standalone()) { ios.hidden = false; ios.textContent = 'No iPhone/iPad: toque em Compartilhar e em "Adicionar à Tela de Início". Depois abra o Guardião Komodo pelo ícone e ligue o aviso aqui.'; }
        else if (!pushSupported()) { ios.hidden = false; ios.textContent = 'Este navegador não aceita avisos. Use o Chrome no Android ou o app instalado no iPhone.'; }
        else if (root.Notification.permission === 'denied') { ios.hidden = false; ios.textContent = 'As notificações estão bloqueadas para este site. Libere em Configurações do navegador > Notificações.'; }
        drawDevices();
      }).catch(function (e) { status.textContent = e.message || 'Não foi possível carregar agora.'; });
    }
    sp.input.addEventListener('change', function () {
      var on = sp.input.checked; sp.input.disabled = true; status.textContent = on ? 'Ligando...' : 'Desligando...';
      (on ? enablePush(state && state.vapidPublicKey) : disablePush()).then(function () { status.textContent = on ? 'Aviso ligado neste celular.' : 'Aviso desligado neste celular.'; return load(); })
        .catch(function (e) { sp.input.checked = !on; status.textContent = e.message || 'Não foi possível agora.'; }).then(function () { sp.input.disabled = false; });
    });
    se.input.addEventListener('change', function () {
      var on = se.input.checked; se.input.disabled = true;
      api().put('/avisos', { email: on }).then(function () { status.textContent = on ? 'Aviso por e-mail ligado.' : 'Aviso por e-mail desligado.'; return load(); })
        .catch(function (e) { se.input.checked = !on; status.textContent = e.message; }).then(function () { se.input.disabled = !(state && state.emailDisponivel); });
    });
    tb.addEventListener('click', function () {
      tb.disabled = true; status.textContent = 'Enviando teste...';
      api().post('/avisos/teste', { email: se.input.checked && !sp.input.checked }).then(function (r) {
        var p = r && r.push || {}; var parts = [];
        if (p.sent) parts.push(p.sent === 1 ? 'Aviso enviado para 1 aparelho.' : 'Aviso enviado para ' + p.sent + ' aparelhos.');
        if (p.failed) parts.push(p.failed + ' aparelho(s) não recebeu(ram).');
        if (r && r.email === 'sent') parts.push('E-mail de teste enviado.'); else if (r && r.email && r.email !== 'off') parts.push('E-mail não enviado agora.');
        status.textContent = parts.join(' ') || 'Nenhum aviso ligado. Ligue o aviso no celular ou por e-mail.'; return load();
      }).catch(function (e) { status.textContent = e.message || 'Não foi possível enviar o teste.'; }).then(function () { tb.disabled = false; });
    });
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    sp.input.focus(); status.textContent = 'Carregando...'; load().then(function () { if (status.textContent === 'Carregando...') status.textContent = ''; });
    return dlg;
  }
  // Inscrição renovada pelo navegador: reenvia ao servidor (sem pedir nada ao usuário).
  if (nav && nav.serviceWorker && nav.serviceWorker.addEventListener) nav.serviceWorker.addEventListener('message', function (e) { if (e.data && e.data.type === 'KAC_PUSH_RESUBSCRIBE' && remote()) currentSub().then(function (s) { if (s) sendSub(s).catch(function () {}); }); });
  root.KacArrivalAlerts = { open: open };
  function bind() { if (!doc) return; var b = doc.getElementById('btnAlerts'); if (b && !b.__al) { b.__al = true; b.addEventListener('click', function () { open(b); }); } }
  if (doc) { if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', bind); else bind(); }
})(typeof window !== 'undefined' ? window : globalThis);
