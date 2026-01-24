import { db } from '../../../lib/firebase';
import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
    setDoc,
    arrayUnion,
    arrayRemove,
    onSnapshot,
    increment
} from 'firebase/firestore';

/**
 * @typedef {Object} Exercise
 * @property {string} id
 * @property {string} name - e.g. "Back Squat"
 * @property {('Push'|'Pull'|'Squat'|'Hinge'|'Lunge'|'Carry'|'Global')} pattern
 * @property {('F'|'E'|'M'|'C')} quality - F=Fuerza, E=Energía, M=Movilidad, C=Control
 * @property {string} mediaUrl - Lightweight GIF URL
 * @property {string[]} tags - [F2, F3, F4, E, M, C]
 */

/**
 * @typedef {Object} AtomicModule
 * @property {string} id
 * @property {string} exerciseId
 * @property {('T'|'R'|'E')} protocol - PDP-T (Time), PDP-R (Reps), PDP-E (EMOM)
 * @property {Object} targeting
 * @property {number} [targeting.volume] - Target Reps (PDP-R)
 * @property {number} [targeting.timeCap] - Seconds (PDP-R / PDP-T)
 * @property {number} [targeting.rpe] - 1-10
 * @property {Object} emomParams - Only for PDP-E
 * @property {number} [emomParams.repsPerMin]
 * @property {number} [emomParams.durationMinutes]
 * @property {string} manifestation - e.g. "BASE-F2"
 */

// Collection References
const EXERCISES = 'exercises';
const MODULES = 'training_modules'; // "modules" is a reserved word in some contexts, safer usage.
const SESSIONS = 'training_sessions';
const PROGRAMS = 'training_programs';
const LOGS = 'training_logs';
const FORMS = 'training_forms';
const HABIT_PACKS = 'training_habit_packs';

export const TrainingDB = {
    forms: {
        async create(data) {
            return await addDoc(collection(db, FORMS), {
                ...data,
                createdAt: serverTimestamp()
            });
        },
        async getAll() {
            const snapshot = await getDocs(collection(db, FORMS));
            return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        },
        async getById(id) {
            const snapshot = await getDoc(doc(db, FORMS, id));
            return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
        },
        async update(id, data) {
            const ref = doc(db, FORMS, id);
            await updateDoc(ref, {
                ...data,
                updatedAt: serverTimestamp()
            });
        },
        async delete(id) {
            await deleteDoc(doc(db, FORMS, id));
        }
    },
    habitPacks: {
        async create(data) {
            return await addDoc(collection(db, HABIT_PACKS), {
                ...data,
                createdAt: serverTimestamp()
            });
        },
        async getAll() {
            const snapshot = await getDocs(collection(db, HABIT_PACKS));
            return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        },
        async getById(id) {
            const snapshot = await getDoc(doc(db, HABIT_PACKS, id));
            return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
        },
        async update(id, data) {
            const ref = doc(db, HABIT_PACKS, id);
            await updateDoc(ref, {
                ...data,
                updatedAt: serverTimestamp()
            });
        },
        async delete(id) {
            await deleteDoc(doc(db, HABIT_PACKS, id));
        }
    },
    // --- EXERCISES (Atoms) ---
    exercises: {
        async getAll() {
            const q = query(collection(db, EXERCISES), orderBy('name'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        },
        async create(data) {
            return await addDoc(collection(db, EXERCISES), {
                ...data,
                createdAt: serverTimestamp()
            });
        },
        async update(id, data) {
            const ref = doc(db, EXERCISES, id);
            await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
        },
        async delete(id) {
            await deleteDoc(doc(db, EXERCISES, id));
        }
    },

    // --- MODULES (Functional Pieces) ---
    modules: {
        async getAll() {
            const snapshot = await getDocs(collection(db, MODULES));
            return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        },
        async getByExercise(exerciseId) {
            // Updated to check array-contains for multi-exercise support
            const q = query(collection(db, MODULES), where('exerciseIds', 'array-contains', exerciseId));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        },
        async create(data) {
            return await addDoc(collection(db, MODULES), {
                ...data, // Protocol, Target, Manifestation
                createdAt: serverTimestamp()
            });
        },
        async update(id, data) {
            const ref = doc(db, MODULES, id);
            await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
        },
        async delete(id) {
            await deleteDoc(doc(db, MODULES, id));
        }
    },

    // --- SESSIONS (Daily Templates) ---
    sessions: {
        async getAll() {
            const snapshot = await getDocs(collection(db, SESSIONS));
            return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        },
        async create(data) {
            // data.blocks = { boost: [id, id], base: [id], ... }
            return await addDoc(collection(db, SESSIONS), {
                ...data,
                createdAt: serverTimestamp()
            });
        },
        async getById(id) {
            const snap = await getDoc(doc(db, SESSIONS, id));
            return snap.exists() ? { id: snap.id, ...snap.data() } : null;
        },
        async update(id, data) {
            const ref = doc(db, SESSIONS, id);
            await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
        },
        async delete(id) {
            await deleteDoc(doc(db, SESSIONS, id));
        }
    },

    // --- PROGRAMS (Macrocycles) ---
    programs: {
        async getAll() {
            const snapshot = await getDocs(collection(db, PROGRAMS));
            return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        },
        async create(data) {
            return await addDoc(collection(db, PROGRAMS), {
                ...data,
                createdAt: serverTimestamp()
            });
        },
        async update(id, data) {
            const ref = doc(db, PROGRAMS, id);
            await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
        },
        async delete(id) {
            await deleteDoc(doc(db, PROGRAMS, id));
        }
    },

    // --- USERS (Athletes) ---
    users: {
        async getAll() {
            // Note: In a real app we might query a "users" collection. 
            // Here we might assume they are in 'users' or we augment the Auth users.
            // For MVP let's assume we have a collection 'users' where we store profiles.
            const snapshot = await getDocs(collection(db, 'users'));
            return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        },
        async getById(id) {
            const snap = await getDoc(doc(db, 'users', id));
            return snap.exists() ? { id: snap.id, ...snap.data() } : null;
        },
        async assignProgram(userId, programId) {
            const ref = doc(db, 'users', userId);
            await updateDoc(ref, {
                currentProgramId: programId,
                programStartDate: serverTimestamp()
            });
        },
        async updateStatus(userId, status) {
            const ref = doc(db, 'users', userId);
            await updateDoc(ref, {
                status: status, // 'active' | 'inactive'
                updatedAt: serverTimestamp()
            });
        },
        async updateSchedule(userId, scheduleData) {
            // scheduleData: { "2024-01-01": "sessionId", ... }
            const ref = doc(db, 'users', userId);
            // We merge the new schedule dates into the existing map
            // Note: In Firestore, to merge map fields, we use dot notation or set with merge.
            // But here we might be storing a simple map. 
            // For simplicity in MVP, let's assume 'schedule' is a map field.
            await updateDoc(ref, {
                schedule: scheduleData, // This replaces the map. Ideally we merge.
                // To merge specific keys:
                // ...Object.keys(scheduleData).reduce((acc, date) => ({...acc, [`schedule.${date}`]: scheduleData[date]}), {})
                updatedAt: serverTimestamp()
            });
        },
        async appendSchedule(userId, newScheduleItems) {
            // Helper to merge specific dates
            const ref = doc(db, 'users', userId);
            // Construct update object for dot notation
            const updates = Object.entries(newScheduleItems).reduce((acc, [date, sessionId]) => {
                acc[`schedule.${date}`] = sessionId;
                return acc;
            }, {});
            updates.updatedAt = serverTimestamp();

            await updateDoc(ref, updates);
        },
        async addTaskToSchedule(userId, date, task) {
            // task: object { type, title, id, ... }
            const ref = doc(db, 'users', userId);
            const updateKey = `schedule.${date}`;
            await updateDoc(ref, {
                [updateKey]: arrayUnion(task),
                updatedAt: serverTimestamp()
            });
        },
        async removeTaskFromSchedule(userId, date, task) {
            const ref = doc(db, 'users', userId);
            const updateKey = `schedule.${date}`;
            await updateDoc(ref, {
                [updateKey]: arrayRemove(task),
                updatedAt: serverTimestamp()
            });
        },
        async updateTaskInSchedule(userId, date, taskId, updateData) {
            const ref = doc(db, 'users', userId);
            const snap = await getDoc(ref);
            if (!snap.exists()) return;

            const data = snap.data();
            const schedule = data.schedule || {};
            const dailyTasks = schedule[date] || [];

            const taskIndex = dailyTasks.findIndex(t => t.id === taskId);
            if (taskIndex === -1) return;

            // Update specific task
            const updatedTask = { ...dailyTasks[taskIndex], ...updateData };
            dailyTasks[taskIndex] = updatedTask;

            // Write back entire array
            const updateKey = `schedule.${date}`;
            await updateDoc(ref, {
                [updateKey]: dailyTasks,
                updatedAt: serverTimestamp()
            });
        },
        async updateProfile(userId, data) {
            const ref = doc(db, 'users', userId);
            await updateDoc(ref, {
                ...data,
                updatedAt: serverTimestamp()
            });
        },
        async updateSessionTaskInSchedule(userId, date, sessionId, updateData) {
            // Find task by sessionId (for session-type tasks) instead of task.id
            const ref = doc(db, 'users', userId);
            const snap = await getDoc(ref);
            if (!snap.exists()) {
                console.warn('[updateSessionTaskInSchedule] User document not found:', userId);
                return;
            }

            const data = snap.data();
            const schedule = data.schedule || {};
            const dailyTasks = schedule[date] || [];

            console.log('[updateSessionTaskInSchedule] Looking for sessionId:', sessionId, 'on date:', date);
            console.log('[updateSessionTaskInSchedule] Daily tasks:', dailyTasks);

            const taskIndex = dailyTasks.findIndex(t => t.type === 'session' && t.sessionId === sessionId);
            if (taskIndex === -1) {
                console.warn('[updateSessionTaskInSchedule] Task not found. Looking for sessionId:', sessionId);
                console.warn('[updateSessionTaskInSchedule] Available tasks:', JSON.stringify(dailyTasks.map(t => ({ type: t.type, sessionId: t.sessionId })), null, 2));
                return;
            }
            console.log('[updateSessionTaskInSchedule] Found task at index:', taskIndex, 'Updating with:', updateData);

            // Update specific task
            const updatedTask = { ...dailyTasks[taskIndex], ...updateData };
            dailyTasks[taskIndex] = updatedTask;

            // Write back entire array
            const updateKey = `schedule.${date}`;
            await updateDoc(ref, {
                [updateKey]: dailyTasks,
                updatedAt: serverTimestamp()
            });
        },
        async updateCustomMeasurements(userId, measurements) {
            // measurements: string[] (e.g. ['Bíceps', 'Muslo', 'Pecho'])
            const ref = doc(db, 'users', userId);
            await updateDoc(ref, {
                customMeasurements: measurements,
                updatedAt: serverTimestamp()
            });
        }
    },

    // --- LOGS (User Performance) ---
    logs: {
        async create(userId, data) {
            return await addDoc(collection(db, LOGS), {
                userId,
                ...data,
                date: data.date || serverTimestamp(),
                timestamp: data.timestamp || new Date().toISOString()
            });
        },
        async getHistory(userId, moduleId) {
            // Get last 5 logs for this specific module to show trends
            const q = query(
                collection(db, LOGS),
                where('userId', '==', userId),
                where('moduleId', '==', moduleId),
                orderBy('date', 'desc')
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        },
        async getLastLog(userId, moduleId) {
            try {
                const q = query(
                    collection(db, LOGS),
                    where('userId', '==', userId),
                    where('moduleId', '==', moduleId),
                    orderBy('date', 'desc'),
                    limit(1)
                );
                const snapshot = await getDocs(q);
                return snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
            } catch (error) {
                console.warn('Could not fetch last log (may need Firestore index):', error);
                return null; // Gracefully return null if query fails
            }
        },
        async getBySession(userId, sessionId, dateKey) {
            // Get all logs for a specific session on a specific date
            // dateKey format: "YYYY-MM-DD"
            try {
                const q = query(
                    collection(db, LOGS),
                    where('userId', '==', userId),
                    where('sessionId', '==', sessionId),
                    orderBy('date', 'asc')
                );
                const snapshot = await getDocs(q);
                // Filter by date client-side (timestamp includes time)
                return snapshot.docs
                    .map(d => ({ id: d.id, ...d.data() }))
                    .filter(log => log.timestamp?.startsWith(dateKey));
            } catch (error) {
                console.warn('Could not fetch session logs:', error);
                return [];
            }
        }
    },
    // --- TRACKING (Check-ins: Weight, Steps, etc.) ---
    tracking: {
        async addEntry(userId, data) {
            // data: { date: "YYYY-MM-DD", weight, steps, ... }
            // Use date as doc ID for easy idempotent access
            const dateKey = data.date;
            const ref = doc(db, 'users', userId, 'tracking', dateKey);

            // Allow merge to update fields lazily
            await setDoc(ref, {
                ...data,
                updatedAt: serverTimestamp()
            }, { merge: true });
        },
        async updateEntry(userId, date, data) {
            const ref = doc(db, 'users', userId, 'tracking', date);
            await updateDoc(ref, {
                ...data,
                updatedAt: serverTimestamp()
            });
        },
        async getByDate(userId, date) {
            const ref = doc(db, 'users', userId, 'tracking', date);
            const snap = await getDoc(ref);
            return snap.exists() ? { id: snap.id, ...snap.data() } : null;
        },
        async getHistory(userId, limitCount = 30) {
            // Last 30 entries for charts
            const q = query(
                collection(db, 'users', userId, 'tracking'),
                orderBy('date', 'desc'),
                limit(limitCount)
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(d => ({ id: d.id, ...d.data() })).reverse(); // Return chronological for charts
        },
        async getAll(userId) {
            const q = query(
                collection(db, 'users', userId, 'tracking'),
                orderBy('date', 'desc')
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        },
        async deleteEntry(userId, date) {
            const ref = doc(db, 'users', userId, 'tracking', date);
            await deleteDoc(ref);
        }
    },
    // --- MESSAGES (Real-time Chat) ---
    messages: {
        async send(athleteId, senderId, text) {
            const chatRef = collection(db, 'chats', athleteId, 'messages');
            const messageData = {
                senderId,
                text,
                timestamp: serverTimestamp(),
                read: false
            };

            // Add message to subcollection
            await addDoc(chatRef, messageData);

            // Update User Document with Chat Metadata (for efficient listing)
            const userRef = doc(db, 'users', athleteId);
            const isFromAdmin = senderId !== athleteId; // If sender is not the athlete, it's the admin/coach

            await updateDoc(userRef, {
                lastMessage: text,
                lastMessageAt: serverTimestamp(),
                unreadAthlete: isFromAdmin ? increment(1) : increment(0),
                unreadAdmin: !isFromAdmin ? increment(1) : increment(0)
            });

            return messageData;
        },
        listen(athleteId, callback) {
            const chatRef = collection(db, 'chats', athleteId, 'messages');
            const q = query(chatRef, orderBy('timestamp', 'asc'));

            return onSnapshot(q, (snapshot) => {
                const msgs = snapshot.docs.map(d => ({
                    id: d.id,
                    ...d.data(),
                    timestamp: d.data().timestamp?.toDate() || new Date()
                }));
                callback(msgs);
            });
        },
        async markAsRead(athleteId, messageId) {
            const ref = doc(db, 'chats', athleteId, 'messages', messageId);
            await updateDoc(ref, { read: true });
        },
        async markConversationRead(athleteId) {
            const userRef = doc(db, 'users', athleteId);
            await updateDoc(userRef, { unreadAdmin: 0 });
        }
    }
};
