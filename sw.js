/* UX item 10 — Service worker do Guardião Komodo. Guarda SOMENTE o "shell" estático (HTML/CSS/JS/ícones do próprio site).
   NUNCA guarda /api/*, requisições não-GET, outros domínios (Supabase etc.), respostas no-store/privadas, com cookie, redirecionadas ou com erro.
   Nenhum dado pessoal (visitas, nomes, documentos, tokens) é armazenado no aparelho por este arquivo.
   Sempre REDE PRIMEIRO (HTML, JS e CSS): depois de um deploy nunca serve código velho; o cache só é usado sem conexão.
   Atualização segura: a nova versão espera ("waiting") até o usuário tocar em "Atualizar" (mensagem SKIP_WAITING). */
'use strict';
var VERSION = 'kac-shell-2026-10-19-v1';
var SHELL = ['/index.html', '/residencial.html', '/login.html', '/auth.html', '/manifest.webmanifest',
  '/src/ui/styles/design-tokens.css', '/src/ui/styles/main.css', '/src/ui/styles/login.css', '/src/ui/styles/auth.css', '/src/ui/styles/kac-theme.css', '/src/ui/styles/kac-brand.css', '/src/ui/KomodoBrand3D.js', '/src/ui/PasswordToggle.js',
  '/assets/brand/guardiao-komodo-logo-256.webp', '/assets/brand/guardiao-komodo-logo-128.webp', '/assets/fonts/poppins-400-latin.woff2', '/assets/fonts/poppins-700-latin.woff2',
  '/src/ui/PwaShell.js', '/src/ui/AuthGate.js', '/src/bundle/agenda.bundle.js', '/src/bundle/residencial.bundle.js', '/assets/icon-192.png', '/assets/icon-512.png', '/assets/favicon-64.png', '/assets/komodo-access-mark.svg'];
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
// Avisos de chegada (Onda 1, item 3): mostra a notificação recebida por Web Push. O conteúdo vem do servidor SEM dados do visitante.
// Só abre páginas do próprio site ao tocar.
self.addEventListener('push', function (e) {
  var d = {}; try { d = e.data ? e.data.json() : {}; } catch (_) { d = {}; }
  var title = String(d.title || 'Guardião Komodo').slice(0, 80);
  var url = '/index.html'; try { var u = new URL(String(d.url || '/index.html'), self.location.origin); if (u.origin === self.location.origin) url = u.pathname; } catch (_) {}
  e.waitUntil(self.registration.showNotification(title, { body: String(d.body || '').slice(0, 200), tag: String(d.tag || 'kac').slice(0, 40), renotify: true,
    icon: '/assets/icon-192.png', badge: '/assets/icon-192.png', lang: 'pt-BR', data: { url: url } }));
});
self.addEventListener('notificationclick', function (e) {
  e.notification.close(); var url = (e.notification.data && e.notification.data.url) || '/index.html';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (cs) {
    for (var i = 0; i < cs.length; i++) { var c = cs[i]; if (new URL(c.url).pathname === url && 'focus' in c) return c.focus(); }
    return self.clients.openWindow ? self.clients.openWindow(url) : null;
  }));
});
// Inscrição renovada pelo navegador: avisa as páginas abertas para reenviar ao servidor.
self.addEventListener('pushsubscriptionchange', function (e) {
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then(function (cs) { cs.forEach(function (c) { c.postMessage({ type: 'KAC_PUSH_RESUBSCRIBE' }); }); }));
});
