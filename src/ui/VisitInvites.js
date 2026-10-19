/* Convites de visita (Onda 1, item 2): o anfitrião cria um convite (link + código curto) e compartilha pelo próprio celular
   (Copiar / Compartilhar — o sistema não envia nada). A portaria busca pelo código e marca a chegada. Revogar a qualquer momento.
   Dados só de /api/convites-visita (org resolvida no servidor). <dialog> acessível; DOM só via textContent. */
(function (root) {
  'use strict';
  var doc = root.document;
  function api() { return root.apiService; }
  function remote() { try { return !!(root.authService && root.authService.isRemoteMode && root.authService.isRemoteMode()); } catch (_) { return false; } }
  function el(tag, cls, text) { var e = doc.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = String(text); return e; }
  function btn(cls, text, label) { var b = el('button', cls, text); b.type = 'button'; if (label) b.setAttribute('aria-label', label); return b; }
  function field(id, label, type, extra) {
    var w = el('div', 'inv-field'); var l = el('label', 'sv-label', label); l.htmlFor = id;
    var i = el(type === 'select' ? 'select' : 'input', 'form-control'); i.id = id; i.name = id; if (type !== 'select') i.type = type;
    Object.keys(extra || {}).forEach(function (k) { if (k === 'options') extra.options.forEach(function (o) { var op = el('option', null, o[1]); op.value = o[0]; i.appendChild(op); }); else i.setAttribute(k, extra[k]); });
    w.append(l, i); return { wrap: w, input: i };
  }
  function today() { try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date()); } catch (_) { return new Date().toISOString().slice(0, 10); } }
  function plusDays(iso, n) { var d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function br(iso) { var p = String(iso || '').split('-'); return p.length === 3 ? p[2] + '/' + p[1] : iso; }
  var STATE = { active: 'Ativo', revoked: 'Revogado', expired: 'Expirado', used_up: 'Usado' };
  var VISIT = { 0: 'Agendado', 1: 'Na portaria', 2: 'Saiu' };
  function linkFor(token) { return root.location.origin + '/convite.html#t=' + token; }
  function copy(text) {
    if (root.navigator.clipboard && root.navigator.clipboard.writeText) return root.navigator.clipboard.writeText(text);
    return new Promise(function (ok, no) { var t = el('textarea'); t.value = text; t.setAttribute('readonly', ''); t.className = 'sv-sr'; doc.body.appendChild(t); t.select(); try { doc.execCommand('copy') ? ok() : no(); } catch (e) { no(e); } t.remove(); });
  }
  function reloadAgenda(modulo) { try { var t = doc.querySelector('.tab.active'); if (root.renderController && t) root.renderController.reloadDailyData(t.getAttribute('data-dia'), modulo); } catch (_) {} }

  function open(modulo, opener, opts) {
    opts = opts || {};
    if (!remote()) { root.alert('Convites ficam disponíveis com a conta online.'); return null; }
    var old = doc.getElementById('invManager'); if (old) old.remove();
    var dlg = el('dialog', 'sv-dialog inv-dialog'); dlg.id = 'invManager'; dlg.setAttribute('aria-labelledby', 'invMgrTitle');
    var head = el('div', 'sv-head'); var h = el('h2', 'sv-title', 'Convites de visita'); h.id = 'invMgrTitle';
    var x = btn('btn-icon sv-close', '×', 'Fechar'); head.append(h, x);
    var body = el('div', 'sv-body');
    var status = el('p', 'sv-status'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');

    // 1) Portaria: buscar por código
    var look = el('form', 'inv-look'); look.noValidate = true; look.setAttribute('role', 'search'); look.setAttribute('aria-label', 'Buscar convite pelo código');
    var lf = field('invCode', 'Código do convite (portaria)', 'text', { maxlength: '9', autocomplete: 'off', autocapitalize: 'characters', placeholder: 'ABCD-2345', inputmode: 'text', spellcheck: 'false' });
    var lb = el('button', 'btn-outline sv-btn', 'Buscar'); lb.type = 'submit';
    var lrow = el('div', 'inv-row'); lrow.append(lf.wrap, lb); look.appendChild(lrow);
    var lres = el('div', 'inv-lookres'); lres.setAttribute('aria-live', 'polite');

    // 2) Novo convite
    var nb = btn('btn-gold sv-btn inv-new', 'Novo convite'); nb.setAttribute('aria-expanded', 'false'); nb.setAttribute('aria-controls', 'invForm');
    var form = el('form', 'sv-form inv-form-host'); form.id = 'invForm'; form.noValidate = true; form.hidden = true; form.setAttribute('aria-label', 'Novo convite');
    var t0 = today();
    var fNome = field('invNomeH', 'Nome do visitante (opcional)', 'text', { maxlength: '120', autocomplete: 'off' });
    var fHost = field('invHost', modulo === 'residencial' ? 'Quem recebe (opcional)' : 'Quem recebe (opcional)', 'text', { maxlength: '120', autocomplete: 'off' });
    var fUni = field('invUni', modulo === 'residencial' ? 'Unidade (ex.: Apto 101)' : 'Destino (opcional)', 'text', { maxlength: '120', autocomplete: 'off' });
    var fData = field('invData', 'Data da visita', 'date', { min: t0, max: plusDays(t0, 60), required: '' }); fData.input.value = t0;
    var fIni = field('invIni', 'Das', 'time', { required: '' }); fIni.input.value = '09:00';
    var fFim = field('invFim', 'Até', 'time', { required: '' }); fFim.input.value = '18:00';
    var times = el('div', 'inv-row inv-times'); times.append(fIni.wrap, fFim.wrap);
    var fUsos = field('invUsos', 'Quantas pessoas podem usar', 'select', { options: [['1', '1 pessoa (uso único)'], ['2', '2 pessoas'], ['3', '3 pessoas'], ['5', '5 pessoas'], ['10', '10 pessoas'], ['20', '20 pessoas']] });
    var fVal = field('invVal', 'Link válido até (opcional)', 'datetime-local', { 'aria-describedby': 'invValHint' });
    var vh = el('p', 'sv-hint', 'Sem preencher, o link vale até o fim do horário da visita.'); vh.id = 'invValHint';
    var ferr = el('p', 'sv-err'); ferr.setAttribute('role', 'alert');
    var fbar = el('div', 'sv-actions'); var fcan = btn('btn-cancel sv-btn', 'Cancelar'); var fok = el('button', 'btn-gold sv-btn', 'Criar convite'); fok.type = 'submit'; fbar.append(fcan, fok);
    form.append(fNome.wrap, fHost.wrap, fUni.wrap, fData.wrap, times, fUsos.wrap, fVal.wrap, vh, ferr, fbar);
    var share = el('div', 'inv-share'); share.hidden = true; share.setAttribute('tabindex', '-1');

    // 3) Lista
    var lh = el('h3', 'inv-sub', 'Convites recentes');
    var ul = el('ul', 'sv-rows'); ul.setAttribute('aria-label', 'Convites recentes');
    body.append(look, lres, el('hr', 'inv-hr'), nb, form, share, status, lh, ul);
    dlg.append(head, body); doc.body.appendChild(dlg);

    function done() { dlg.close(); }
    x.addEventListener('click', done);
    dlg.addEventListener('close', function () { dlg.remove(); var back = opener && opener.offsetParent !== null ? opener : doc.querySelector('.bn-more summary'); if (back && back.focus) back.focus(); });
    nb.addEventListener('click', function () { var on = form.hidden; form.hidden = !on; nb.setAttribute('aria-expanded', on ? 'true' : 'false'); share.hidden = true; if (on) fNome.input.focus(); });
    fcan.addEventListener('click', function () { form.hidden = true; nb.setAttribute('aria-expanded', 'false'); nb.focus(); });

    function regLine(r) {
      var li = el('li', 'inv-reg'); var t = el('span', 'inv-reg-name', r.nome + (r.placa ? ' · ' + r.placa : ''));
      var s = el('span', 'inv-badge', VISIT[r.visitStatus] || 'Visita removida'); li.append(t, s);
      if (r.visitStatus === 0) {
        var c = btn('btn-gold sv-btn', 'Marcar chegada', 'Marcar chegada de ' + r.nome);
        c.addEventListener('click', function () {
          c.disabled = true; c.setAttribute('aria-busy', 'true');
          api().put('/visitantes/' + encodeURIComponent(r.visit_id) + '/status', { status: 1, from: 0 }).then(function () { r.visitStatus = 1; s.textContent = VISIT[1]; c.remove(); status.textContent = r.nome + ': chegada registrada.'; reloadAgenda(modulo); })
            .catch(function (e) { c.disabled = false; c.removeAttribute('aria-busy'); status.textContent = e.status === 409 ? 'Status já alterado em outro aparelho.' : (e.message || 'Não foi possível marcar a chegada agora.'); });
        });
        li.appendChild(c);
      }
      return li;
    }
    function card(i, withRegs) {
      var li = el('li', 'sv-row inv-card'); var info = el('div', 'sv-info');
      info.appendChild(el('span', 'auto-name', i.visitor_name || 'Convite sem nome'));
      var meta = br(i.visit_date) + ' · ' + i.hora_inicio + '–' + i.hora_fim + ' · ' + i.uses + '/' + i.max_uses + (i.max_uses === 1 ? ' uso' : ' usos') + (i.unidade ? ' · ' + i.unidade : '');
      info.appendChild(el('span', 'auto-doc', meta));
      var b = el('span', 'inv-badge inv-' + i.estado, STATE[i.estado] || i.estado); info.appendChild(b);
      li.appendChild(info);
      if ((withRegs || i.cadastros.length) && i.cadastros.length) { var rl = el('ul', 'inv-regs'); rl.setAttribute('aria-label', 'Quem confirmou'); i.cadastros.forEach(function (r) { rl.appendChild(regLine(r)); }); info.appendChild(rl); }
      else if (withRegs) info.appendChild(el('span', 'auto-doc', 'Ninguém confirmou por este convite ainda.'));
      if (i.estado === 'active') {
        var act = el('div', 'sv-actions'); var rv = btn('btn-cancel sv-btn', 'Revogar', 'Revogar convite ' + (i.visitor_name || 'sem nome') + ' de ' + br(i.visit_date));
        rv.addEventListener('click', function () {
          if (!root.confirm('Revogar este convite? O link e o código param de funcionar. Visitas já confirmadas continuam na agenda.')) return;
          rv.disabled = true; api().post('/convites-visita/' + encodeURIComponent(i.id) + '/revogar', {}).then(function () { status.textContent = 'Convite revogado.'; load(); lres.replaceChildren(); })
            .catch(function (e) { rv.disabled = false; status.textContent = e.message || 'Não foi possível revogar agora.'; });
        });
        act.appendChild(rv); li.appendChild(act);
      }
      return li;
    }
    function load() {
      return api().get('/convites-visita?modulo=' + encodeURIComponent(modulo)).then(function (rows) {
        ul.replaceChildren(); rows = Array.isArray(rows) ? rows : [];
        if (!rows.length) ul.appendChild(el('li', 'sv-hint', 'Nenhum convite criado ainda.'));
        rows.forEach(function (i) { ul.appendChild(card(i, false)); });
      }).catch(function (e) { status.textContent = e.message || 'Não foi possível carregar os convites agora.'; });
    }
    lf.input.addEventListener('input', function () { var v = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8); this.value = v.length > 4 ? v.slice(0, 4) + '-' + v.slice(4) : v; });
    look.addEventListener('submit', function (e) {
      e.preventDefault(); var code = lf.input.value.replace(/[^A-Z0-9]/gi, '');
      lres.replaceChildren(); if (code.length !== 8) { lres.appendChild(el('p', 'sv-err', 'O código tem 8 letras e números, como ABCD-2345.')); lf.input.focus(); return; }
      lb.disabled = true; lres.appendChild(el('p', 'sv-hint', 'Buscando...'));
      api().get('/convites-visita/codigo/' + encodeURIComponent(code)).then(function (i) { lres.replaceChildren(); var u = el('ul', 'sv-rows'); u.setAttribute('aria-label', 'Convite encontrado'); u.appendChild(card(i, true)); lres.appendChild(u); })
        .catch(function (er) { lres.replaceChildren(); lres.appendChild(el('p', 'sv-err', er.message || 'Nenhum convite com este código.')); })
        .then(function () { lb.disabled = false; });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault(); ferr.textContent = '';
      var data = { modulo: modulo, nome: fNome.input.value.trim(), anfitriao: fHost.input.value.trim(), unidade: fUni.input.value.trim(), data: fData.input.value, inicio: fIni.input.value, fim: fFim.input.value, usos: Number(fUsos.input.value), validoAte: fVal.input.value || '' };
      if (!data.data || !data.inicio || !data.fim) { ferr.textContent = 'Informe a data e o horário da visita.'; return; }
      if (data.fim <= data.inicio) { ferr.textContent = 'O horário final precisa ser depois do inicial.'; fFim.input.focus(); return; }
      if (data.nome && data.nome.length < 3) { ferr.textContent = 'O nome precisa ter pelo menos 3 letras (ou deixe em branco).'; fNome.input.focus(); return; }
      fok.disabled = true; fok.textContent = 'Criando...';
      api().post('/convites-visita', data).then(function (inv) { form.reset(); fData.input.value = t0; fIni.input.value = '09:00'; fFim.input.value = '18:00'; form.hidden = true; nb.setAttribute('aria-expanded', 'false'); showShare(inv); load(); })
        .catch(function (e2) { ferr.textContent = e2.message || 'Não foi possível criar o convite agora.'; })
        .then(function () { fok.disabled = false; fok.textContent = 'Criar convite'; });
    });
    function showShare(inv) {
      var link = linkFor(inv.token); share.replaceChildren();
      share.appendChild(el('h3', 'inv-sub', 'Convite criado'));
      share.appendChild(el('p', 'sv-hint', 'Envie o link ao visitante pelo seu celular (WhatsApp, e-mail...). O link e o código aparecem só agora: copie ou compartilhe antes de fechar.'));
      var ll = el('label', 'sv-label', 'Link do convite'); ll.htmlFor = 'invLink'; var li = el('input', 'form-control inv-link'); li.id = 'invLink'; li.readOnly = true; li.value = link;
      var cl = el('p', 'inv-codeline'); cl.append(el('span', 'sv-label', 'Código para a portaria: '), el('strong', 'inv-code', inv.codigo));
      var bar = el('div', 'sv-actions inv-share-actions');
      var bl = btn('btn-outline sv-btn', 'Copiar link'), bc = btn('btn-outline sv-btn', 'Copiar código');
      bl.addEventListener('click', function () { copy(link).then(function () { status.textContent = 'Link copiado.'; }, function () { li.select(); status.textContent = 'Selecione e copie o link.'; }); });
      bc.addEventListener('click', function () { copy(inv.codigo).then(function () { status.textContent = 'Código copiado.'; }, function () { status.textContent = 'Anote o código: ' + inv.codigo; }); });
      bar.append(bl, bc);
      if (root.navigator.share) {
        var bs = btn('btn-gold sv-btn', 'Compartilhar');
        bs.addEventListener('click', function () { root.navigator.share({ title: 'Convite de visita', text: 'Seu convite de visita para ' + br(inv.visit_date) + ', das ' + inv.hora_inicio + ' às ' + inv.hora_fim + '. Código: ' + inv.codigo, url: link }).catch(function () {}); });
        bar.appendChild(bs);
      }
      share.append(ll, li, cl, bar); share.hidden = false; share.focus();
      status.textContent = 'Convite criado. Código ' + inv.codigo + '.';
    }
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    if (opts.focus === 'code') lf.input.focus(); else nb.focus();
    status.textContent = 'Carregando...'; load().then(function () { if (status.textContent === 'Carregando...') status.textContent = ''; });
    return dlg;
  }
  root.KacVisitInvites = { open: open };
  function bind() { if (!doc) return; var b = doc.getElementById('btnInvites'); if (b && !b.__inv) { b.__inv = true; b.addEventListener('click', function () { open(b.getAttribute('data-inv-module') || 'empresarial', b); }); } }
  if (doc) { if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', bind); else bind(); }
})(typeof window !== 'undefined' ? window : globalThis);
