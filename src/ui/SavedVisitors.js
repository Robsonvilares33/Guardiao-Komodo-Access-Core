/* Visitantes frequentes (Onda 1, item 1): sugestão de nome ao registrar uma visita, reaproveitar os dados salvos,
   e uma tela para editar/remover visitantes salvos. Dados vêm só de /api/visitantes-salvos (org resolvida no servidor).
   Combobox acessível (ARIA 1.2): setas, Enter, Esc; resultados anunciados numa região polite. DOM só via textContent. */
(function (root) {
  'use strict';
  var doc = root.document;
  var seq = 0;
  function api() { return root.apiService; }
  function remote() { try { return !!(root.authService && root.authService.isRemoteMode && root.authService.isRemoteMode()); } catch (_) { return false; } }
  function el(tag, cls, text) { var e = doc.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = String(text); return e; }
  function qs(o) { return Object.keys(o).filter(function (k) { return o[k] != null && o[k] !== ''; }).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(o[k]); }).join('&'); }
  var cache = new Map();
  function search(modulo, q) {
    var key = modulo + '|' + String(q || '').toLowerCase();
    if (cache.has(key)) return Promise.resolve(cache.get(key));
    return api().get('/visitantes-salvos?' + qs({ modulo: modulo, q: q })).then(function (rows) { rows = Array.isArray(rows) ? rows : []; cache.set(key, rows); if (cache.size > 40) cache.delete(cache.keys().next().value); return rows; });
  }
  function list(modulo) { return api().get('/visitantes-salvos?' + qs({ modulo: modulo, limit: 200 })).then(function (r) { return Array.isArray(r) ? r : []; }); }
  function update(id, data) { cache.clear(); return api().put('/visitantes-salvos/' + encodeURIComponent(id), data); }
  function remove(id) { cache.clear(); return api().delete('/visitantes-salvos/' + encodeURIComponent(id)); }
  function invalidate() { cache.clear(); }
  // Placa no formato que a agenda já usa: "ABC1D23 - Prata (Fiat)".
  function composePlaca(r) { if (!r || !r.placa) return 'Sem veículo'; return r.placa + (r.cor ? ' - ' + r.cor : '') + ' (' + (r.marca || 'Sem Veículo') + ')'; }
  function details(r) {
    var p = [];
    if (r.tipo) p.push(r.tipo);
    if (r.unidade) p.push(r.unidade);
    p.push(r.placa ? r.placa + (r.cor ? ' ' + r.cor : '') : 'sem veículo');
    var n = Number(r.visits_count) || 0; p.push(n === 1 ? '1 visita' : n + ' visitas');
    return p.join(' · ');
  }

  /* Liga a sugestão a um campo de nome.
     opts: modulo, listbox (elemento onde a lista aparece; criado se ausente), host (elemento que recebe .active; padrão: listbox com .sv-open),
           onPick(registro), fallback(termo) -> Promise<registros> (modo local/sem rede), emptyText */
  function attach(input, opts) {
    if (!input || input.__svAttached) return null; input.__svAttached = true; opts = opts || {};
    var id = 'sv' + (++seq);
    var lb = opts.listbox;
    if (!lb) { lb = el('div', 'sv-list'); input.insertAdjacentElement('afterend', lb); if (input.parentNode) input.parentNode.classList.add('sv-anchor'); }
    lb.id = lb.id || id + '-list'; lb.setAttribute('role', 'listbox'); lb.setAttribute('aria-label', 'Visitantes salvos');
    var live = el('div', 'sv-sr'); live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite'); lb.insertAdjacentElement('afterend', live);
    input.setAttribute('role', 'combobox'); input.setAttribute('aria-autocomplete', 'list'); input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-controls', lb.id); input.setAttribute('autocomplete', 'off');
    var rows = [], active = -1, picked = null, version = 0, timer = null;
    function setOpen(open) { input.setAttribute('aria-expanded', open ? 'true' : 'false'); if (opts.host) opts.host.classList.toggle('active', open); else lb.classList.toggle('sv-open', open); if (!open) { active = -1; input.removeAttribute('aria-activedescendant'); } }
    function close() { setOpen(false); }
    function mark() { Array.prototype.forEach.call(lb.querySelectorAll('[role=option]'), function (o, i) { var on = i === active; o.setAttribute('aria-selected', on ? 'true' : 'false'); o.classList.toggle('sv-active', on); if (on) { input.setAttribute('aria-activedescendant', o.id); if (o.scrollIntoView) o.scrollIntoView({ block: 'nearest' }); } }); }
    function render(term) {
      lb.replaceChildren();
      if (!rows.length) {
        var e = el('div', 'auto-item sv-empty', opts.emptyText || 'Nenhum visitante salvo com esse nome. Ao salvar a visita, os dados ficam guardados para a próxima vez.');
        e.setAttribute('aria-hidden', 'true'); lb.appendChild(e); live.textContent = 'Nenhuma sugestão.';
      } else {
        rows.slice(0, 8).forEach(function (r, i) {
          var o = el('div', 'auto-item sv-opt'); o.id = lb.id + '-o' + i; o.setAttribute('role', 'option'); o.setAttribute('aria-selected', 'false'); o.dataset.svIndex = String(i);
          o.appendChild(el('span', 'auto-name', r.nome || '')); o.appendChild(el('span', 'auto-doc', details(r)));
          lb.appendChild(o);
        });
        live.textContent = rows.length === 1 ? '1 sugestão. Use as setas para escolher.' : Math.min(rows.length, 8) + ' sugestões. Use as setas para escolher.';
      }
      setOpen(true); mark();
    }
    function pick(i) { var r = rows[i]; if (!r) return; picked = r; input.value = r.nome || ''; close(); live.textContent = 'Dados de ' + (r.nome || '') + ' preenchidos.'; if (opts.onPick) { try { opts.onPick(r); } catch (e) { console.error('sugestão:', e); } } }
    function run() {
      var term = input.value.trim(); var my = ++version;
      if (term.length < 2) { rows = []; close(); return; }
      var p = remote() && api() ? search(opts.modulo, term) : (opts.fallback ? opts.fallback(term) : Promise.resolve([]));
      p.catch(function () { return opts.fallback ? opts.fallback(term) : []; }).then(function (r) { if (my !== version) return; rows = Array.isArray(r) ? r : []; render(term); });
    }
    input.addEventListener('input', function () { if (picked && input.value.trim().toLowerCase() !== String(picked.nome || '').toLowerCase()) picked = null; clearTimeout(timer); timer = setTimeout(run, 160); });
    input.addEventListener('keydown', function (e) {
      var open = input.getAttribute('aria-expanded') === 'true'; var n = Math.min(rows.length, 8);
      if (e.key === 'ArrowDown') { e.preventDefault(); if (!open) { run(); return; } if (n) { active = (active + 1) % n; mark(); } }
      else if (e.key === 'ArrowUp') { if (open && n) { e.preventDefault(); active = active <= 0 ? n - 1 : active - 1; mark(); } }
      else if (e.key === 'Enter') { if (open && active >= 0) { e.preventDefault(); pick(active); } }
      else if (e.key === 'Escape') { if (open) { e.preventDefault(); e.stopPropagation(); close(); } }
      else if (e.key === 'Tab') close();
    });
    input.addEventListener('blur', function () { setTimeout(close, 150); });
    // pointerdown evita perder o foco antes do clique (mouse e toque)
    lb.addEventListener('mousedown', function (e) { e.preventDefault(); });
    lb.addEventListener('click', function (e) { var o = e.target.closest('[data-sv-index]'); if (o) pick(Number(o.dataset.svIndex)); });
    return { close: close, picked: function () { return picked && input.value.trim().toLowerCase() === String(picked.nome || '').toLowerCase() ? picked : null; }, clear: function () { picked = null; }, refresh: run };
  }

  /* Tela "Visitantes salvos": lista com busca, editar e remover. <dialog> nativo (foco preso e Esc pelo navegador). */
  var FIELDS = [
    ['nome', 'Nome', 'text', 120, true], ['tipo', 'Tipo', 'text', 40], ['placa', 'Placa', 'text', 10], ['cor', 'Cor do veículo', 'text', 40],
    ['marca', 'Marca do veículo', 'text', 60], ['unidade', 'Destino / unidade', 'text', 120], ['observacao', 'Observação', 'textarea', 300]
  ];
  function openManager(modulo, opener) {
    if (!remote()) { root.alert('Visitantes salvos ficam disponíveis com a conta online.'); return null; }
    var dlg = doc.getElementById('svManager');
    if (dlg) dlg.remove();
    dlg = el('dialog', 'sv-dialog'); dlg.id = 'svManager'; dlg.setAttribute('aria-labelledby', 'svTitle');
    var head = el('div', 'sv-head'); var h = el('h2', 'sv-title', 'Visitantes salvos'); h.id = 'svTitle';
    var x = el('button', 'btn-icon sv-close', '×'); x.type = 'button'; x.setAttribute('aria-label', 'Fechar');
    head.append(h, x);
    var hint = el('p', 'sv-hint', 'Quem já visitou fica salvo aqui para preencher a próxima visita mais rápido. Remover daqui não apaga as visitas já registradas.');
    var sl = el('label', 'sv-label', 'Buscar'); sl.htmlFor = 'svSearch';
    var s = el('input', 'form-control sv-search'); s.id = 'svSearch'; s.type = 'search'; s.placeholder = 'Nome do visitante'; s.autocomplete = 'off';
    var status = el('p', 'sv-status'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    var ul = el('ul', 'sv-rows'); ul.setAttribute('aria-label', 'Lista de visitantes salvos');
    var body = el('div', 'sv-body'); body.append(hint, sl, s, status, ul);
    dlg.append(head, body); doc.body.appendChild(dlg);
    var all = [];
    function done() { dlg.close(); }
    x.addEventListener('click', done);
    dlg.addEventListener('close', function () { dlg.remove(); var back = opener && opener.offsetParent !== null ? opener : doc.querySelector('.bn-more summary'); if (back && back.focus) back.focus(); });
    function draw() {
      var t = s.value.trim().toLowerCase(); var shown = all.filter(function (r) { return !t || String(r.nome).toLowerCase().indexOf(t) !== -1 || String(r.placa || '').toLowerCase().indexOf(t) !== -1; });
      ul.replaceChildren();
      status.textContent = all.length ? (shown.length === 1 ? '1 visitante' : shown.length + ' visitantes') : 'Nenhum visitante salvo ainda. Eles aparecem aqui depois da primeira visita registrada.';
      shown.forEach(function (r) {
        var li = el('li', 'sv-row'); var info = el('div', 'sv-info'); info.append(el('span', 'auto-name', r.nome), el('span', 'auto-doc', details(r)));
        if (r.observacao) info.appendChild(el('span', 'sv-obs', r.observacao));
        var act = el('div', 'sv-actions');
        var be = el('button', 'btn-outline sv-btn', 'Editar'); be.type = 'button'; be.setAttribute('aria-label', 'Editar ' + r.nome);
        var bd = el('button', 'btn-cancel sv-btn', 'Remover'); bd.type = 'button'; bd.setAttribute('aria-label', 'Remover ' + r.nome + ' dos visitantes salvos');
        be.addEventListener('click', function () { edit(li, r); });
        bd.addEventListener('click', function () {
          if (!root.confirm('Remover ' + r.nome + ' dos visitantes salvos? As visitas já registradas continuam na agenda.')) return;
          bd.disabled = true; remove(r.id).then(function () { all = all.filter(function (y) { return y.id !== r.id; }); draw(); status.textContent = r.nome + ' removido dos visitantes salvos.'; s.focus(); })
            .catch(function (e) { bd.disabled = false; status.textContent = e.message || 'Não foi possível remover agora.'; });
        });
        act.append(be, bd); li.append(info, act); ul.appendChild(li);
      });
    }
    function edit(li, r) {
      var f = el('form', 'sv-form'); f.noValidate = true; f.setAttribute('aria-label', 'Editar ' + r.nome);
      FIELDS.forEach(function (d) {
        if (d[0] === 'unidade' && modulo !== 'residencial' && !r.unidade) return;
        var fid = 'svf-' + d[0]; var lab = el('label', 'sv-label', d[1]); lab.htmlFor = fid;
        var inp = el(d[2] === 'textarea' ? 'textarea' : 'input', 'form-control'); inp.id = fid; inp.name = d[0]; inp.maxLength = d[3]; if (d[2] !== 'textarea') inp.type = 'text';
        if (d[4]) inp.required = true; if (d[0] === 'placa') { inp.setAttribute('autocapitalize', 'characters'); inp.placeholder = 'ABC1D23'; }
        inp.value = r[d[0]] || ''; f.append(lab, inp);
      });
      var err = el('p', 'sv-err'); err.setAttribute('role', 'alert');
      var bar = el('div', 'sv-actions'); var ok = el('button', 'btn-gold sv-btn', 'Salvar'); ok.type = 'submit'; var no = el('button', 'btn-cancel sv-btn', 'Cancelar'); no.type = 'button';
      bar.append(no, ok); f.append(err, bar);
      li.replaceChildren(f); f.querySelector('input').focus();
      no.addEventListener('click', function () { draw(); });
      f.addEventListener('submit', function (e) {
        e.preventDefault(); var data = {}; FIELDS.forEach(function (d) { var i = f.elements[d[0]]; data[d[0]] = i ? i.value.trim() : (r[d[0]] || ''); });
        if (data.nome.length < 3) { err.textContent = 'O nome precisa ter pelo menos 3 letras.'; f.elements.nome.focus(); return; }
        ok.disabled = true; ok.textContent = 'Salvando...';
        update(r.id, data).then(function (row) { if (row) all = all.map(function (y) { return y.id === r.id ? row : y; }); draw(); status.textContent = 'Alterações salvas.'; })
          .catch(function (e2) { ok.disabled = false; ok.textContent = 'Salvar'; err.textContent = e2.message || 'Não foi possível salvar agora.'; });
      });
    }
    s.addEventListener('input', draw);
    status.textContent = 'Carregando...';
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    s.focus();
    list(modulo).then(function (r) { all = r; draw(); }).catch(function (e) { status.textContent = e.message || 'Não foi possível carregar agora.'; });
    return dlg;
  }
  var API = { attach: attach, openManager: openManager, search: search, list: list, update: update, remove: remove, invalidate: invalidate, composePlaca: composePlaca, details: details };
  root.KacSavedVisitors = API;
  function bindOpeners() { if (!doc) return; var b = doc.getElementById('btnSavedVisitors'); if (b && !b.__sv) { b.__sv = true; b.addEventListener('click', function () { openManager(b.getAttribute('data-sv-module') || 'empresarial', b); }); } }
  if (doc) { if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', bindOpeners); else bindOpeners(); }
  if (root.eventBus && root.SystemEvents) { try { root.eventBus.on(root.SystemEvents.DB_SAVE_SUCCESS, invalidate); } catch (_) {} }
  if (typeof module !== 'undefined') module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
