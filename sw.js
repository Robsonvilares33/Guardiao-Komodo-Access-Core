/* UX item 10 — Service worker do Guardião Komodo. Guarda SOMENTE o "shell" estático (HTML/CSS/JS/ícones do próprio site).
   NUNCA guarda /api/*, requisições não-GET, outros domínios (Supabase etc.), respostas no-store/privadas ou com erro.
   Nenhum dado pessoal (visitas, nomes, documentos, tokens) é armazenado no aparelho por este arquivo.
   Atualização segura: a nova versão espera ("waiting") até o usuário tocar em "Atualizar" (mensagem SKIP_WAITING). */
'use strict';
var VERSION = 'kac-shell-2026-10-16-1';
var SHELL = ['/index.html', '/residencial.html', '/login.html', '/auth.html', '/manifest.webmanifest',
  '/src/ui/styles/design-tokens.css', '/src/ui/styles/main.css', '/src/ui/styles/login.css', '/src/ui/styles/auth.css',
  '/src/ui/PwaShell.js', '/assets/icon-192.png', '/assets/icon-512.png', '/assets/komodo-access-mark.svg'];
var STATIC_RE = /^\/(src|assets|vendor)\/[^?]*\.(js|css|png|svg|webp|woff2?|ico)$/;
var PAGE_RE = /^\/(index|residencial|login|auth)\.html$|^\/$/;
function cacheable(req, url) {
  if (req.method !== 'GET' || url.origin !== self.location.origin) return false;
  if (url.pathname.indexOf('/api/') === 0 || url.pathname === '/api') return false;
  if (url.search && !PAGE_RE.test(url.pathname)) return false;
  return STATIC_RE.test(url.pathname) || PAGE_RE.test(url.pathname) || url.pathname === '/manifest.webmanifest';
}
function safeToStore(res) {
  if (!res || res.status !== 200 || res.type !== 'basic' || res.redirected) return false;
  var cc = (res.headers.get('Cache-Control') || '').toLowerCase();
  return !/no-store|private/.test(cc) && !res.headers.get('Set-Cookie');
}
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return Promise.all(SHELL.map(function (u) { return fetch(u, { cache: 'no-cache', credentials: 'omit' }).then(function (r) { if (safeToStore(r)) return c.put(u, r); }).catch(function () {}); })); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k.indexOf('kac-shell-') === 0 && k !== VERSION; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('message', function (e) { if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('fetch', function (e) {
  var req = e.request; var url = new URL(req.url);
  if (!cacheable(req, url)) return; // rede direta, sem cache (inclui toda a API)
  var key = url.pathname === '/' ? '/index.html' : url.pathname;
  if (req.mode === 'navigate' || PAGE_RE.test(url.pathname)) {
    // Páginas: rede primeiro; offline cai no shell guardado.
    e.respondWith(fetch(req).then(function (r) { if (safeToStore(r)) { var cp = r.clone(); caches.open(VERSION).then(function (c) { c.put(key, cp); }); } return r; })
      .catch(function () { return caches.match(key).then(function (m) { return m || caches.match('/index.html'); }); }));
    return;
  }
  // Estáticos: cache e revalida em segundo plano.
  e.respondWith(caches.open(VERSION).then(function (c) { return c.match(key).then(function (hit) {
    var net = fetch(req).then(function (r) { if (safeToStore(r)) c.put(key, r.clone()); return r; }).catch(function () { return hit; });
    return hit || net; }); }));
});
