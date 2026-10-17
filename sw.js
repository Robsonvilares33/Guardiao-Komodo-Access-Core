/* UX item 10 — Service worker do Guardião Komodo. Guarda SOMENTE o "shell" estático (HTML/CSS/JS/ícones do próprio site).
   NUNCA guarda /api/*, requisições não-GET, outros domínios (Supabase etc.), respostas no-store/privadas, com cookie, redirecionadas ou com erro.
   Nenhum dado pessoal (visitas, nomes, documentos, tokens) é armazenado no aparelho por este arquivo.
   Sempre REDE PRIMEIRO (HTML, JS e CSS): depois de um deploy nunca serve código velho; o cache só é usado sem conexão.
   Atualização segura: a nova versão espera ("waiting") até o usuário tocar em "Atualizar" (mensagem SKIP_WAITING). */
'use strict';
var VERSION = 'kac-shell-2026-10-16-vi3';
var SHELL = ['/index.html', '/residencial.html', '/login.html', '/auth.html', '/manifest.webmanifest',
  '/src/ui/styles/design-tokens.css', '/src/ui/styles/main.css', '/src/ui/styles/login.css', '/src/ui/styles/auth.css', '/src/ui/styles/kac-theme.css', '/src/ui/styles/kac-brand.css', '/src/ui/KomodoBrand3D.js',
  '/assets/brand/guardiao-komodo-logo-256.webp', '/assets/brand/guardiao-komodo-logo-128.webp', '/assets/fonts/poppins-400-latin.woff2', '/assets/fonts/poppins-700-latin.woff2',
  '/src/ui/PwaShell.js', '/assets/icon-192.png', '/assets/icon-512.png', '/assets/favicon-64.png', '/assets/komodo-access-mark.svg'];
var STATIC_RE = /^\/(src|assets|vendor)\/[^?]*\.(js|css|png|svg|webp|woff2?|ico)$/;
var PAGE_RE = /^\/(index|residencial|login|auth|privacidade-visitante)\.html$|^\/$/;
function cacheable(req, url) {
  if (req.method !== 'GET' || url.origin !== self.location.origin) return false;
  if (url.pathname.indexOf('/api/') === 0 || url.pathname === '/api' || url.pathname === '/sw.js') return false;
  if (url.search && !PAGE_RE.test(url.pathname)) return false;
  return STATIC_RE.test(url.pathname) || PAGE_RE.test(url.pathname) || url.pathname === '/manifest.webmanifest';
}
function safeToStore(res) {
  if (!res || res.status !== 200 || res.type !== 'basic' || res.redirected) return false;
  var cc = (res.headers.get('Cache-Control') || '').toLowerCase();
  return !/no-store|private/.test(cc) && !res.headers.get('Set-Cookie');
}
self.addEventListener('install', function (e) {
  // credentials 'same-origin': funciona atrás da proteção de deploy (cookie); itens que falham são só ignorados, sem erro.
  e.waitUntil(caches.open(VERSION).then(function (c) { return Promise.all(SHELL.map(function (u) { return fetch(u, { cache: 'no-cache', credentials: 'same-origin', redirect: 'manual' }).then(function (r) { if (safeToStore(r)) return c.put(u, r); }, function () {}); })); }).catch(function () {}));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k.indexOf('kac-shell-') === 0 && k !== VERSION; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('message', function (e) { if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('fetch', function (e) {
  var req = e.request; var url = new URL(req.url);
  if (!cacheable(req, url)) return; // rede direta, sem cache (inclui toda a API)
  var key = url.pathname === '/' ? '/index.html' : url.pathname; var page = req.mode === 'navigate' || PAGE_RE.test(url.pathname);
  e.respondWith(fetch(req).then(function (r) {
    if (safeToStore(r)) { var cp = r.clone(); caches.open(VERSION).then(function (c) { return c.put(key, cp); }).catch(function () {}); }
    return r;
  }, function () {
    return caches.match(key).then(function (m) { return m || (page ? caches.match('/index.html') : null); }).then(function (m) { return m || Response.error(); });
  }));
});
