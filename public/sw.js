// Service Worker minimale per PWA
self.addEventListener('install', (event) => {
  // Forza l'attivazione immediata
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Qui potremmo gestire la cache offline, per ora lasciamo passare tutto
});
