/**
 * Firebase Messaging Service Worker
 * Handles background push notifications for the PWA
 */

// Import Firebase scripts for the service worker
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
// Note: These values must match your Firebase config
firebase.initializeApp({
    apiKey: "AIzaSyA4X3QjW9jeMdRoHSpun29WvHCVdruTYr4",
    authDomain: "befithub-f6202.firebaseapp.com",
    projectId: "befithub-f6202",
    storageBucket: "befithub-f6202.firebasestorage.app",
    messagingSenderId: "20961130148",
    appId: "1:20961130148:web:df76988bf460dd683fd831"
});

const messaging = firebase.messaging();

/**
 * Handle background messages (when app is not in focus)
 */
messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Background message received:', payload);

    const notificationTitle = payload.notification?.title || '2BEFITHUB';
    const notificationOptions = {
        body: payload.notification?.body || 'Tienes una nueva notificación',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: payload.data?.tag || 'default',
        data: payload.data,
        vibrate: [100, 50, 100],
        actions: [
            {
                action: 'open',
                title: 'Abrir'
            }
        ]
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

/**
 * Handle notification click
 */
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked:', event);
    event.notification.close();

    // Get the URL to open from the notification data, or default to home
    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // If app is already open, focus it
            for (const client of clientList) {
                if (client.url.includes(self.registration.scope) && 'focus' in client) {
                    client.navigate(urlToOpen);
                    return client.focus();
                }
            }
            // Otherwise open a new window
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
