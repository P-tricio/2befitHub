/* Minimal Service Worker for PWA installability */
const CACHE_NAME = '2befithub-v1';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
    // Minimal fetch listener to satisfy PWA criteria
    event.respondWith(fetch(event.request).catch(() => {
        // Basic offline fallback could go here
    }));
});
