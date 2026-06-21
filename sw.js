/**
 * Service Worker — PDV Light
 * Cacheia o app inteiro na 1ª visita → funciona offline a partir daí.
 * Atualiza automaticamente quando os arquivos mudam no servidor.
 */

const CACHE = 'pdvlight-v5';   // Incrementar aqui ao publicar nova versão

const SHELL = [
  './',
  './index.html',
  './instalar.html',
  './dashboard.html',
  './produtos.html',
  './configuracoes.html',
  './manifest.json',
  './css/style.css',
  './css/dashboard.css',
  './css/produtos.css',
  './css/configuracoes.css',
  './js/vendors.js',
  './js/products.js',
  './js/config-db.js',
  './js/config-app.js',
  './js/produtos-db.js',
  './js/produtos-app.js',
  './js/db.js',
  './js/app.js',
  './js/sync.js',
  './js/install.js',
  './js/dashboard.js',
  './images/placeholder.svg',
];

// Instala e pré-cacheia o shell do app
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

// Remove caches antigos ao ativar
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Estratégia de fetch:
// CDN (Chart.js) → Network first, fallback para cache
// App shell      → Cache first, fallback para network
self.addEventListener('fetch', e => {
  const url = e.request.url;

  if (url.includes('cdn.jsdelivr.net')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request)
      .then(cached => cached || fetch(e.request)
        .then(res => {
          // Cacheia novas requisições do app
          if (res.ok && e.request.method === 'GET') {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        })
      )
  );
});
