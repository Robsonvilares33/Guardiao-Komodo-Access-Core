/* Página pública do convite de visita (Onda 1, item 2). Sem conta e sem cookies.
   O token vem no fragmento (#t=...), que o navegador não envia ao servidor nem a terceiros; aqui ele vai só no corpo do POST.
   Logo depois de lido, o fragmento sai da barra de endereço (history.replaceState). DOM só via textContent. */
(function () {
  'use strict';
  var d = document;
  function $(id) { return d.getElementById(id); }
  var m = /(?:^|[#&])t=([A-Za-z0-9_-]{43})(?:&|$)/.exec(location.hash || '');
  var token = m ? m[1] : '';
  try { if (location.hash) history.replaceState(null, '', location.pathname + location.search); } catch (_) {}
  var status = $('invStatus');
  function say(t) { status.textContent = t; }
  function post(path, body) {
    return fetch('/api/convite-publico/' + path, { method: 'POST', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return { success: false }; }).then(function (j) { j.httpStatus = r.status; return j; }); });
  }
  function fmtDate(iso) { var p = String(iso || '').split('-'); if (p.length !== 3) return iso; var dt = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2], 12)); try { return new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', timeZone: 'UTC' }).format(dt); } catch (_) { return p[2] + '/' + p[1] + '/' + p[0]; } }
  function quando(v) { return fmtDate(v.data) + ', das ' + v.inicio + ' às ' + v.fim; }
  function row(id, val) { var r = $('invRow' + id); if (!val) { r.hidden = true; return; } $('inv' + id).textContent = val; }
  if (!token) { say('Link de convite incompleto. Abra o link exatamente como recebeu ou peça um novo a quem convidou você.'); return; }
  post('ver', { token: token }).then(function (j) {
    if (!j.success) { say(j.message || 'Não foi possível abrir o convite agora. Tente de novo em instantes.'); return; }
    var v = j.data || {};
    row('Empresa', v.empresa); row('Anfitriao', v.anfitriao); row('Unidade', v.unidade); $('invQuando').textContent = quando(v);
    $('invDetails').hidden = false; $('invForm').hidden = false;
    if (v.nome) $('invNome').value = v.nome;
    say(v.restantes > 1 ? 'Convite válido. Pode ser usado por mais ' + v.restantes + ' pessoas.' : 'Convite válido.');
    $('invNome').focus();
  }).catch(function () { say('Sem conexão. Verifique a internet e recarregue a página.'); });
  $('invPlaca').addEventListener('input', function () { var e = this; var p = e.selectionStart; e.value = e.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''); try { e.setSelectionRange(p, p); } catch (_) {} });
  var busy = false;
  $('invForm').addEventListener('submit', function (ev) {
    ev.preventDefault(); if (busy) return;
    var nome = $('invNome').value.trim().replace(/\s+/g, ' '), ok = true;
    $('invNomeErr').textContent = ''; $('invConsentErr').textContent = ''; $('invNome').removeAttribute('aria-invalid'); $('invConsent').removeAttribute('aria-invalid');
    if (nome.length < 3) { $('invNomeErr').textContent = 'Informe o nome completo (pelo menos 3 letras).'; $('invNome').setAttribute('aria-invalid', 'true'); ok = false; }
    if (!$('invConsent').checked) { $('invConsentErr').textContent = 'Para continuar, marque que você leu o aviso de privacidade.'; $('invConsent').setAttribute('aria-invalid', 'true'); ok = false; }
    if (!ok) { (nome.length < 3 ? $('invNome') : $('invConsent')).focus(); return; }
    busy = true; var b = $('invSubmit'); b.disabled = true; b.setAttribute('aria-busy', 'true'); b.textContent = 'Enviando...';
    post('confirmar', { token: token, nome: nome, placa: $('invPlaca').value.trim(), consentimento: true, website: $('invSite').value }).then(function (j) {
      if (!j.success) { busy = false; b.disabled = false; b.removeAttribute('aria-busy'); b.textContent = 'Confirmar visita'; say(j.message || 'Não foi possível confirmar agora. Tente de novo.'); if (j.code && j.code !== 'invalid' && j.code !== 'consent_required' && j.code !== 'rate_limited') $('invForm').hidden = true; status.focus && status.setAttribute('tabindex', '-1'); status.focus(); return; }
      $('invForm').hidden = true; say('');
      $('invDoneText').textContent = 'Tudo certo, ' + nome.split(' ')[0] + '. A sua visita está pré-cadastrada para ' + quando(j.data || {}) + '.';
      var done = $('invDone'); done.hidden = false; done.focus();
      token = '';
    }).catch(function () { busy = false; b.disabled = false; b.removeAttribute('aria-busy'); b.textContent = 'Confirmar visita'; say('Sem conexão. Verifique a internet e tente de novo.'); });
  });
})();
