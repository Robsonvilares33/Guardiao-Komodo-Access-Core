/**
 * OfflineGate (achado 4) — portaria sem internet.
 * - Guarda a agenda do DIA (só campos mínimos: id, hora, nome, unidade, tipo, placa, status, data) CIFRADA com AES-GCM 256.
 * - Fila cifrada de check-in/check-out feitos sem rede; ao voltar a conexão, envia em ordem com "from" (o servidor recusa
 *   com 409 o que mudou em outro aparelho — nada é sobrescrito às cegas).
 * - A chave é gerada no aparelho, NÃO exportável (CryptoKey no IndexedDB). Tudo expira em 24 h e é apagado no logout.
 * - Nunca guarda acompanhantes, histórico, documentos, tokens ou senha.
 */
(function (root) {
  'use strict';
  var TTL = 24 * 60 * 60 * 1000, FIELDS = ['id', 'hora', 'nome', 'unidade', 'tipo', 'placa', 'status', 'data', 'dia', 'modulo'];
  function idbStore() {
    var dbp = null;
    function open() { if (dbp) return dbp; dbp = new Promise(function (ok, ko) { var r = root.indexedDB.open('kac-offline', 1); r.onupgradeneeded = function () { r.result.createObjectStore('kv'); }; r.onsuccess = function () { ok(r.result); }; r.onerror = function () { ko(r.error); }; }); return dbp; }
    function tx(mode, fn) { return open().then(function (db) { return new Promise(function (ok, ko) { var t = db.transaction('kv', mode), s = t.objectStore('kv'), out = fn(s); t.oncomplete = function () { ok(out && out.result); }; t.onerror = function () { ko(t.error); }; }); }); }
    return { get: function (k) { return tx('readonly', function (s) { return s.get(k); }); }, set: function (k, v) { return tx('readwrite', function (s) { s.put(v, k); }); },
      del: function (k) { return tx('readwrite', function (s) { s.delete(k); }); }, clear: function () { return tx('readwrite', function (s) { s.clear(); }); } };
  }
  function create(opts) {
    opts = opts || {}; var store = opts.store || idbStore(), subtle = (opts.crypto || root.crypto).subtle, now = opts.now || Date.now, getRandom = function (n) { return (opts.crypto || root.crypto).getRandomValues(new Uint8Array(n)); };
    var enc = new TextEncoder(), dec = new TextDecoder();
    async function key() { var k = await store.get('key'); if (!k) { k = await subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']); await store.set('key', k); } return k; }
    async function seal(obj) { var iv = getRandom(12); var ct = await subtle.encrypt({ name: 'AES-GCM', iv: iv }, await key(), enc.encode(JSON.stringify(obj))); return { iv: Array.from(iv), ct: new Uint8Array(ct), exp: now() + TTL }; }
    async function open(box) { if (!box || box.exp < now()) return null; try { var pt = await subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(box.iv) }, await key(), box.ct); return JSON.parse(dec.decode(pt)); } catch (_) { return null; } }
    function minimal(rows) { return (rows || []).map(function (r) { var o = {}; FIELDS.forEach(function (f) { if (r[f] !== undefined) o[f] = r[f]; }); return o; }); }
    var dayKey = function (m, d) { return 'day:' + m + ':' + d; };
    var api = {
      FIELDS: FIELDS,
      cacheDay: async function (modulo, day, rows) { await store.set(dayKey(modulo, day), await seal(minimal(rows))); },
      readDay: async function (modulo, day) { var b = await store.get(dayKey(modulo, day)); var rows = await open(b); if (!rows && b) await store.del(dayKey(modulo, day)); return rows; },
      patchDay: async function (modulo, day, id, status) { var rows = await api.readDay(modulo, day); if (!rows) return; rows.forEach(function (r) { if (String(r.id) === String(id)) r.status = status; }); await api.cacheDay(modulo, day, rows); },
      queue: async function () { return (await open(await store.get('queue'))) || []; },
      enqueue: async function (op) { var q = await api.queue(); q.push({ id: String(op.id), status: Number(op.status), from: op.from === undefined ? undefined : Number(op.from), at: now() }); await store.set('queue', await seal(q)); return q.length; },
      // send(op) → resolve ok; rejeita com err.status (409 = conflito; sem status = ainda sem rede → para e mantém o resto)
      flush: async function (send) { var q = await api.queue(), sent = 0, conflicts = 0, failed = 0, rest = [];
        for (var i = 0; i < q.length; i++) { try { await send(q[i]); sent++; } catch (e) { if (e && e.status === 409) conflicts++; else if (e && e.status) failed++; else { rest = q.slice(i); break; } } }
        if (rest.length) await store.set('queue', await seal(rest)); else await store.del('queue');
        return { sent: sent, conflicts: conflicts, failed: failed, pending: rest.length }; },
      clear: function () { return store.clear(); }
    };
    return api;
  }
  root.KomodoOffline = { create: create, isNetworkError: function (e) { return !!(e && (e.network === true || (!e.status && /conectar/i.test(String(e.message || ''))))); } };
  if (root.indexedDB && root.crypto && root.crypto.subtle) { try { root.komodoOffline = create(); } catch (_) {} }
  // Aviso discreto (aria-live) quando algo fica na fila ou é sincronizado.
  if (root.addEventListener && root.document) {
    var note = function (t) { var d = root.document, n = d.getElementById('kacOfflineNote'); if (!n) { n = d.createElement('p'); n.id = 'kacOfflineNote'; n.className = 'pwa-offline'; n.setAttribute('role', 'status'); n.setAttribute('aria-live', 'polite'); (d.body || d.documentElement).appendChild(n); } n.textContent = t; n.hidden = false; clearTimeout(note.t); note.t = setTimeout(function () { n.hidden = true; }, 6000); };
    root.addEventListener('kac:offline-queued', function () { note('Sem internet: registro guardado no aparelho. Será enviado quando a conexão voltar.'); });
    root.addEventListener('kac:offline-synced', function (e) { var r = e.detail || {}; note(r.sent + ' registro(s) enviado(s)' + (r.conflicts ? '; ' + r.conflicts + ' já tinha(m) sido alterado(s) em outro aparelho' : '') + '.'); });
  }
})(typeof window !== 'undefined' ? window : globalThis);
