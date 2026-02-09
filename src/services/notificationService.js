/**
 * Push Notification Service
 * Handles FCM token management and notification permissions
 */

import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { app, db } from '../lib/firebase';

// Initialize Firebase Messaging
let messaging = null;

/**
 * Get the messaging instance (lazy initialization)
 */
const getMessagingInstance = () => {
    if (!messaging) {
        try {
            messaging = getMessaging(app);
        } catch (error) {
            console.error('Error initializing Firebase Messaging:', error);
            return null;
        }
    }
    return messaging;
};

/**
 * Check if notifications are supported in this browser
 */
export const isNotificationSupported = () => {
    return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
};

/**
 * Get current notification permission status
 * @returns {'granted' | 'denied' | 'default'}
 */
export const getNotificationPermission = () => {
    if (!isNotificationSupported()) return 'denied';
    return Notification.permission;
};

/**
 * Request notification permission and get FCM token
 * @param {string} userId - The user's ID to save the token
 * @returns {Promise<string|null>} - The FCM token or null if denied
 */
export const requestNotificationPermission = async (userId) => {
    if (!isNotificationSupported()) {
        console.warn('Notifications are not supported in this browser');
        return null;
    }

    try {
        const permission = await Notification.requestPermission();

        if (permission !== 'granted') {
            console.log('Notification permission denied');
            return null;
        }

        // Get FCM token
        const token = await getFCMToken(userId);
        return token;
    } catch (error) {
        console.error('Error requesting notification permission:', error);
        return null;
    }
};

/**
 * Get or refresh FCM token and save to user document
 * @param {string} userId - The user's ID
 * @returns {Promise<string|null>}
 */
export const getFCMToken = async (userId) => {
    const msgInstance = getMessagingInstance();
    if (!msgInstance) return null;

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

    if (!vapidKey) {
        console.error('VAPID key not configured. Add VITE_FIREBASE_VAPID_KEY to .env');
        return null;
    }

    try {
        // Check if we're on localhost (push might not work)
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

        // Register service worker first
        let registration;
        try {
            registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            console.log('Service Worker registered:', registration.scope);

            // Wait for the service worker to be ready/active
            if (registration.installing) {
                console.log('Service Worker installing, waiting for activation...');
                await new Promise((resolve) => {
                    registration.installing.addEventListener('statechange', (e) => {
                        if (e.target.state === 'activated') {
                            console.log('Service Worker activated');
                            resolve();
                        }
                    });
                });
            } else if (registration.waiting) {
                console.log('Service Worker waiting, waiting for activation...');
                await new Promise((resolve) => {
                    registration.waiting.addEventListener('statechange', (e) => {
                        if (e.target.state === 'activated') {
                            console.log('Service Worker activated');
                            resolve();
                        }
                    });
                });
            } else if (registration.active) {
                console.log('Service Worker already active');
            }

            // Extra wait to ensure SW is fully ready
            await navigator.serviceWorker.ready;
            console.log('Service Worker ready');

        } catch (swError) {
            console.error('Service Worker registration failed:', swError);
            if (isLocalhost) {
                console.warn('Push notifications may not work on localhost. Deploy to production to test.');
            }
            throw swError;
        }

        // Get token
        const token = await getToken(msgInstance, {
            vapidKey,
            serviceWorkerRegistration: registration
        });

        if (token && userId) {
            // Save token to user document
            await saveTokenToUser(userId, token);
            console.log('FCM token obtained successfully');
        }

        return token;
    } catch (error) {
        console.error('Error getting FCM token:', error);

        // Provide helpful error messages
        if (error.message?.includes('push service')) {
            console.warn('Push service error - this is common on localhost. The feature will work in production (Vercel).');
        }

        return null;
    }
};

/**
 * Save FCM token to user's Firestore document
 * @param {string} userId 
 * @param {string} token 
 */
const saveTokenToUser = async (userId, token) => {
    try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            fcmToken: token,
            fcmTokenUpdatedAt: serverTimestamp(),
            notificationsEnabled: true
        });
        console.log('FCM token saved to user document');
    } catch (error) {
        console.error('Error saving FCM token:', error);
    }
};

/**
 * Remove FCM token from user document (when user disables notifications)
 * @param {string} userId 
 */
export const removeNotificationToken = async (userId) => {
    try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            fcmToken: null,
            notificationsEnabled: false,
            fcmTokenUpdatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error('Error removing FCM token:', error);
    }
};

/**
 * Set up foreground message handler
 * @param {function} callback - Called when a message is received while app is in foreground
 */
export const onForegroundMessage = (callback) => {
    const msgInstance = getMessagingInstance();
    if (!msgInstance) return () => { };

    return onMessage(msgInstance, (payload) => {
        console.log('Foreground message received:', payload);

        // Show notification manually for foreground
        if (Notification.permission === 'granted') {
            const { title, body } = payload.notification || {};
            new Notification(title || '2BEFITHUB', {
                body: body || 'Nueva notificación',
                icon: '/icon-192.png',
                badge: '/icon-192.png'
            });
        }

        if (callback) {
            callback(payload);
        }
    });
};
