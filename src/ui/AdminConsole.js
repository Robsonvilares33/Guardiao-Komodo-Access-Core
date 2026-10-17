/* UX item 9 — Tela única de administração (dentro de /auth.html, sessão Supabase em memória). Permissões aplicadas NO SERVIDOR
   (owner/admin + aal2); aqui só apresentação. DOM só via textContent/createElement. Abas acessíveis (setas/Home/End). */
(function (root) {
  'use strict';
  var ROLE = { owner: 'Proprietário', admin: 'Administrador', operator: 'Operador', viewer: 'Visualizador' };
  var ACTION = { 'member.role': 'Papel alterado', 'member.remove': 'Membro removido', 'invite.create': 'Convite criado', 'invite.revoke': 'Convite revogado', 'invite.accept': 'Convite aceito', 'org.update': 'Empresa atualizada', 'org.onboard': 'Empresa criada', 'visit.create': 'Visita criada', 'visit.update': 'Visita editada', 'visit.delete': 'Visita excluída', 'visit.status': 'Status da visita' };
  function fmt(d) { try { return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }).format(new Date(d)); } catch (_) { return String(d || ''); } }
  function canManage(actor, target, next) { if (target === 'owner') return false; if (next !== undefined && ['admin', 'operator', 'viewer'].indexOf(next) < 0) return false; if (actor === 'owner') return true; if (actor === 'admin') return target !== 'admin' && next !== 'admin'; return false; }
  function mount(o) {
    var c = o.client, doc = o.doc, guard = o.guard, msg = o.msg; var $ = function (id) { return doc.getElementById(id); };
    var me = null, lastAudit = null;
    function el(tag, cls, text) { var e = doc.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
    function btn(text, label, fn, cls) { var b = el('button', cls || 'sec small', text); b.type = 'button'; b.setAttribute('aria-label', label); b.addEventListener('click', function () { guard(fn); }); return b; }
    // Abas
    var tabs = Array.prototype.slice.call(doc.querySelectorAll('.adm-tabs [role="tab"]'));
    function select(t, focus) { tabs.forEach(function (x) { var on = x === t; x.setAttribute('aria-selected', on ? 'true' : 'false'); x.tabIndex = on ? 0 : -1; $(x.getAttribute('aria-controls')).hidden = !on; }); if (focus) t.focus(); if (t.id === 'tab-auditoria' && lastAudit === null) guard(function () { return audit(false); }); }
    tabs.forEach(function (t, i) { t.addEventListener('click', function () { select(t); }); t.addEventListener('keydown', function (e) { var n = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key]; if (n === undefined) return; e.preventDefault(); select(tabs[(n + tabs.length) % tabs.length], true); }); });
    async function members() {
      var list = (await c.admin('/admin/membros')).data || []; var ul = $('admMembers'); ul.textContent = '';
      $('admNewLogin').textContent = list.filter(function (m) { return m.newLogin; }).length + ' de ' + list.length;
      list.forEach(function (m) {
        var li = el('li', 'adm-item'); var who = el('div', 'adm-who'); who.appendChild(el('strong', null, m.email || m.userId)); who.appendChild(el('span', 'adm-meta', ROLE[m.role] || m.role)); li.appendChild(who);
        var self = me && m.email && me.email && m.email.toLowerCase() === String(me.email).toLowerCase();
        if (!self && canManage(me.role, m.role)) {
          var act = el('div', 'adm-act'); var id = 'role-' + String(m.userId).replace(/[^A-Za-z0-9_-]/g, '');
          var lab = el('label', 'sr-only', 'Papel de ' + (m.email || m.userId)); lab.htmlFor = id; var sel = el('select'); sel.id = id;
          ['admin', 'operator', 'viewer'].forEach(function (r) { if (!canManage(me.role, m.role, r)) return; var op = el('option', null, ROLE[r]); op.value = r; if (r === m.role) op.selected = true; sel.appendChild(op); });
          sel.addEventListener('change', function () { guard(async function () { await c.admin('/admin/membros/' + encodeURIComponent(m.userId), 'PUT', { role: sel.value }); msg('Papel atualizado.'); await members(); }); });
          act.appendChild(lab); act.appendChild(sel);
          act.appendChild(btn('Remover', 'Remover ' + (m.email || m.userId) + ' da empresa', async function () { if (!root.confirm || root.confirm('Remover ' + (m.email || 'este membro') + ' da empresa?')) { await c.admin('/admin/membros/' + encodeURIComponent(m.userId), 'DELETE'); msg('Membro removido.'); await members(); } }, 'danger small'));
          li.appendChild(act);
        } else if (self) who.appendChild(el('span', 'adm-meta', '(você)'));
        ul.appendChild(li);
      });
    }
    async function invites() {
      var list = (await c.admin('/admin/convites')).data || []; var ul = $('admInvites'); ul.textContent = '';
      if (!list.length) ul.appendChild(el('li', 'adm-empty', 'Nenhum convite pendente.'));
      list.forEach(function (v) { var li = el('li', 'adm-item'); var who = el('div', 'adm-who'); who.appendChild(el('strong', null, v.email)); who.appendChild(el('span', 'adm-meta', (ROLE[v.role] || v.role) + ' · expira ' + fmt(v.expiresAt))); li.appendChild(who);
        if (v.role !== 'admin' || me.role === 'owner') li.appendChild(btn('Revogar', 'Revogar convite de ' + v.email, async function () { await c.admin('/admin/convites/' + v.id, 'DELETE'); msg('Convite revogado.'); await invites(); }, 'danger small'));
        ul.appendChild(li); });
    }
    async function audit(more) {
      var q = '/admin/auditoria?limit=30' + (more && lastAudit ? '&antes=' + lastAudit : ''); var rows = (await c.admin(q)).data || []; var ol = $('admAudit'); if (!more) ol.textContent = '';
      if (!rows.length && !more) ol.appendChild(el('li', 'adm-empty', 'Sem registros ainda.'));
      rows.forEach(function (r) { var li = el('li', 'adm-item'); var who = el('div', 'adm-who'); who.appendChild(el('strong', null, ACTION[r.action] || r.action)); who.appendChild(el('span', 'adm-meta', fmt(r.at) + ' · ' + r.actor)); li.appendChild(who); ol.appendChild(li); });
      lastAudit = rows.length ? rows[rows.length - 1].id : (lastAudit || 0); $('btnAuditMore').hidden = rows.length < 30;
    }
    $('btnAuditMore').addEventListener('click', function () { guard(function () { return audit(true); }); });
    $('formOrg').addEventListener('submit', function (e) { e.preventDefault(); guard(async function () {
      var data = { name: $('orgNameIn').value, kind: $('orgKind').value, cnpj: $('orgCnpj').value.trim() || null, timezone: $('orgTz').value };
      $('orgNameErr').textContent = data.name.trim().length < 2 ? 'Informe o nome da empresa.' : ''; $('orgCnpjErr').textContent = data.cnpj && root.SupabaseAuthClient && !root.SupabaseAuthClient._util.validCnpj(data.cnpj) ? 'CNPJ inválido.' : '';
      if ($('orgNameErr').textContent || $('orgCnpjErr').textContent) throw new Error('Revise os campos destacados.');
      var b = $('btnOrgSave'); b.disabled = true; var r; try { r = await c.admin('/admin/empresa', 'PUT', data); } finally { b.disabled = false; }
      msg(r.data && r.data.changed && r.data.changed.length ? 'Empresa atualizada.' : 'Nada mudou.'); $('admOrg').textContent = data.name.trim(); }); });
    // LGPD (achado 3): exportar/apagar dados de um titular. O arquivo é gerado no aparelho (Blob), sem passar por terceiros.
    function titular() { var n = $('titNome').value.trim(), p = $('titPlaca').value.trim(); if (!n && !p) throw new Error('Informe o nome completo ou a placa.'); return { nome: n || null, placa: p || null }; }
    $('formTitular').addEventListener('submit', function (e) { e.preventDefault(); guard(async function () {
      var r = await c.admin('/admin/titular/exportar', 'POST', titular()); var d = r.data || { visits: [] };
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' })); a.download = 'dados-titular.json'; document.body.appendChild(a); a.click(); a.remove();
      msg((d.visits || []).length + ' visita(s) exportada(s).'); }); });
    $('btnTitDelete').addEventListener('click', function () { guard(async function () {
      var t = titular(); if (!root.confirm('Apagar definitivamente todas as visitas de "' + (t.nome || t.placa) + '"? Não dá para desfazer.')) return;
      var r = await c.admin('/admin/titular/apagar', 'POST', Object.assign(t, { confirmar: true })); msg((r.data && r.data.apagadas || 0) + ' visita(s) apagada(s).'); }); });
    return {
      load: async function () {
        var d = (await c.admin('/admin/resumo')).data; me = d.me; lastAudit = null;
        $('admOrg').textContent = d.org.name || 'Empresa'; $('admMe').textContent = (ROLE[me.role] || me.role) + ' · ' + (me.email || '');
        $('orgNameIn').value = d.org.name || ''; if (d.org.kind) $('orgKind').value = d.org.kind; $('orgCnpj').value = d.org.cnpj || ''; $('orgTz').value = d.org.timezone || 'America/Sao_Paulo';
        $('admPlan').textContent = d.plan ? 'Plano: ' + d.plan.id + ' (' + d.plan.status + ')' : '';
        $('admMfa').textContent = me.mfa ? 'MFA ativo nesta sessão (verificação em duas etapas confirmada).' : 'MFA não confirmado nesta sessão.';
        var adminOpt = doc.querySelector('#invRole option[value="admin"]'); if (adminOpt) adminOpt.disabled = me.role !== 'owner';
        select(tabs[0]); await Promise.all([members(), invites()]);
      },
      _canManage: canManage,
    };
  }
  root.AdminConsole = { mount: mount, canManage: canManage };
})(typeof window !== 'undefined' ? window : globalThis);
