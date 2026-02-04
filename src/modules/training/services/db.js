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
const GROUPS = 'training_groups';

export const TrainingDB = {
    groups: {
        async getAll() {
            const q = query(collection(db, GROUPS), orderBy('name'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        },
        async create(data) {
            return await addDoc(collection(db, GROUPS), {
                ...data,
                createdAt: serverTimestamp()
            });
        },
        async update(id, data) {
            const ref = doc(db, GROUPS, id);
            await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
        },
        async delete(id) {
            await deleteDoc(doc(db, GROUPS, id));
        }
    },
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
        async updateSessionTaskInSchedule(userId, date, sessionId, updateData, taskId = null) {
            const ref = doc(db, 'users', userId);
            const snap = await getDoc(ref);
            if (!snap.exists()) return;

            const data = snap.data();
            const schedule = data.schedule || {};
            const targetId = String(sessionId); // Ensure string for comparison

            // 1. Try exact date first
            let dailyTasks = schedule[date] || [];
            let taskIndex = -1;

            // Priority: Try to find by Task ID first if provided
            if (taskId) {
                taskIndex = Array.isArray(dailyTasks) ? dailyTasks.findIndex(t => t.id === taskId) : -1;
            }

            // Fallback: Find by Session ID
            if (taskIndex === -1) {
                taskIndex = Array.isArray(dailyTasks) ? dailyTasks.findIndex(t => t.type === 'session' && String(t.sessionId) === targetId) : -1;
            }

            let targetDate = date;

            // 2. Fallback: Search the entire schedule if not found on current date
            if (taskIndex === -1) {
                console.log(`[updateSessionTaskInSchedule] Task not found on ${date}. Searching entire schedule... (Session: ${targetId}, Task: ${taskId})`);
                const allEntries = Object.entries(schedule);
                for (const [d, tasks] of allEntries) {
                    if (!Array.isArray(tasks)) continue;

                    let idx = -1;
                    if (taskId) {
                        idx = tasks.findIndex(t => t.id === taskId);
                    }
                    if (idx === -1) {
                        idx = tasks.findIndex(t => t.type === 'session' && String(t.sessionId) === targetId);
                    }

                    if (idx !== -1) {
                        targetDate = d;
                        dailyTasks = [...tasks]; // Create a copy of the day's tasks
                        taskIndex = idx;
                        console.log(`[updateSessionTaskInSchedule] Found matched task on ${targetDate}`);
                        break;
                    }
                }
            }

            if (taskIndex === -1) {
                console.warn('[updateSessionTaskInSchedule] Task not found for sessionId:', sessionId, 'taskId:', taskId);
                return;
            }

            // Update specific task
            const updatedDailyTasks = [...dailyTasks];
            updatedDailyTasks[taskIndex] = { ...updatedDailyTasks[taskIndex], ...updateData };

            // Write back entire array
            const updateKey = `schedule.${targetDate}`;
            await updateDoc(ref, {
                [updateKey]: updatedDailyTasks,
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
        },
        async delete(userId) {
            await deleteDoc(doc(db, 'users', userId));
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
            const q = query(
                collection(db, LOGS),
                where('userId', '==', userId),
                where('moduleId', '==', moduleId)
            );
            const snapshot = await getDocs(q);
            return snapshot.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => {
                    const dateA = a.date?.toDate?.() || new Date(a.date || 0);
                    const dateB = b.date?.toDate?.() || new Date(b.date || 0);
                    return dateB - dateA;
                });
        },
        async getLastLog(userId, moduleId, stableId = null) {
            try {
                // Priority query: Using stableId if provided
                const idToUse = stableId || moduleId;
                const fieldToUse = stableId ? 'stableId' : 'moduleId';

                const q = query(
                    collection(db, LOGS),
                    where('userId', '==', userId),
                    where(fieldToUse, '==', idToUse),
                    orderBy('date', 'desc'), // Ensure index exists for this
                    limit(10) // Fetch top 10 to filter out pending ones
                );

                const snapshot = await getDocs(q);
                // Fallback for stableId/moduleId mismatch logic retained if needed, but simplified here for robustness

                if (snapshot.empty && stableId) {
                    // Fallback to moduleId if stableId found nothing (legacy compat)
                    const q2 = query(
                        collection(db, LOGS),
                        where('userId', '==', userId),
                        where('moduleId', '==', moduleId),
                        orderBy('date', 'desc'),
                        limit(10)
                    );
                    const snap2 = await getDocs(q2);
                    const validLogs2 = snap2.docs
                        .map(d => ({ id: d.id, ...d.data() }))
                        .filter(log => log.status !== 'pending'); // Filter out pending
                    return validLogs2[0] || null;
                }

                const validLogs = snapshot.docs
                    .map(d => ({ id: d.id, ...d.data() }))
                    .filter(log => log.status !== 'pending'); // Filter out pending

                return validLogs[0] || null;
            } catch (error) {
                console.warn('Could not fetch last log:', error);
                return null;
            }
        },
        async confirmSessionLogs(userId, sessionId) {
            try {
                const q = query(
                    collection(db, LOGS),
                    where('userId', '==', userId),
                    where('sessionId', '==', sessionId),
                    where('status', '==', 'pending')
                );
                const snapshot = await getDocs(q);
                const promises = snapshot.docs.map(d =>
                    updateDoc(doc(db, LOGS, d.id), { status: 'completed' })
                );
                await Promise.all(promises);
            } catch (err) {
                console.error('Error confirming session logs:', err);
            }
        },
        async getBySession(userId, sessionId, dateKey) {
            try {
                const q = query(
                    collection(db, LOGS),
                    where('userId', '==', userId),
                    where('sessionId', '==', sessionId),
                    where('scheduledDate', '==', dateKey)
                );
                const snapshot = await getDocs(q);
                return snapshot.docs
                    .map(d => ({ id: d.id, ...d.data() }))
                    .sort((a, b) => {
                        const dateA = a.date?.toDate?.() || new Date(a.date || 0);
                        const dateB = b.date?.toDate?.() || new Date(b.date || 0);
                        return dateA - dateB;
                    });
            } catch (error) {
                console.warn('Could not fetch session logs:', error);
                return [];
            }
        },

        async getFeedbackLogs(userId) {
            try {
                const q = query(
                    collection(db, LOGS),
                    where('userId', '==', userId),
                    where('type', '==', 'SESSION_FEEDBACK')
                );
                const snapshot = await getDocs(q);
                return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            } catch (error) {
                console.error("Error fetching feedback logs:", error);
                return [];
            }
        }
    },

    // --- EXERCISE HISTORY (Global per-exercise performance tracking) ---
    exerciseHistory: {
        /**
         * Log a single exercise performance entry
         * @param {string} userId 
         * @param {string} exerciseId 
         * @param {Object} data - { date, sessionId, moduleId, sets, maxWeight, exerciseName }
         */
        async log(userId, exerciseId, data) {
            if (!userId || !exerciseId) {
                console.warn('[exerciseHistory.log] Missing userId or exerciseId');
                return null;
            }
            try {
                const ref = collection(db, 'users', userId, 'exercise_history', exerciseId, 'logs');
                return await addDoc(ref, {
                    ...data,
                    createdAt: serverTimestamp()
                });
            } catch (error) {
                console.error('[exerciseHistory.log] Error:', error);
                return null;
            }
        },

        /**
         * Get exercise history for a specific exercise
         * @param {string} userId 
         * @param {string} exerciseId 
         * @param {number} limitCount - Max entries to return
         * @returns {Array} - Sorted by date descending
         */
        async getHistory(userId, exerciseId, limitCount = 50) {
            if (!userId || !exerciseId) return [];
            try {
                const ref = collection(db, 'users', userId, 'exercise_history', exerciseId, 'logs');
                const q = query(ref, orderBy('date', 'desc'), limit(limitCount));
                const snapshot = await getDocs(q);
                return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            } catch (error) {
                console.warn('[exerciseHistory.getHistory] Error:', error);
                return [];
            }
        },

        /**
         * Get the last weight used for an exercise (global, across all sessions)
         * @param {string} userId 
         * @param {string} exerciseId 
         * @returns {number|null}
         */
        async getLastWeight(userId, exerciseId) {
            const history = await this.getHistory(userId, exerciseId, 1);
            if (history.length === 0) return null;
            return history[0].maxWeight || history[0].sets?.[0]?.weight || null;
        },

        /**
         * Get the personal best (max weight ever) for an exercise
         * @param {string} userId 
         * @param {string} exerciseId 
         * @returns {number|null}
         */
        async getPersonalBest(userId, exerciseId) {
            const history = await this.getHistory(userId, exerciseId, 100);
            if (history.length === 0) return null;
            const maxWeights = history.map(h => h.maxWeight || 0).filter(w => w > 0);
            return maxWeights.length > 0 ? Math.max(...maxWeights) : null;
        },

        /**
         * Get all exercises with history for a user (for exercise picker)
         * @param {string} userId 
         * @returns {Array} - List of exercise IDs with metadata
         */
        async getAllExercises(userId) {
            if (!userId) return [];
            try {
                const ref = collection(db, 'users', userId, 'exercise_history');
                const snapshot = await getDocs(ref);
                return snapshot.docs.map(d => d.id);
            } catch (error) {
                console.warn('[exerciseHistory.getAllExercises] Error:', error);
                return [];
            }
        },

        /**
         * Get the last weight with context-aware matching
         * @param {string} userId 
         * @param {string} exerciseId 
         * @param {Object} context - { protocol, blockType }
         * @returns {Object|null} - { weight, match: 'exact'|'protocol'|'any', context: {...} }
         */
        async getLastWeightByContext(userId, exerciseId, context = {}) {
            const history = await this.getHistory(userId, exerciseId, 20);
            if (history.length === 0) return null;

            const { protocol, blockType } = context;

            // Priority 1: Exact match (same protocol AND blockType)
            if (protocol && blockType) {
                const exactMatch = history.find(h =>
                    h.protocol === protocol && h.blockType === blockType
                );
                if (exactMatch) {
                    return {
                        weight: exactMatch.maxWeight,
                        match: 'exact',
                        contextLabel: blockType || protocol,
                        context: exactMatch
                    };
                }
            }

            // Priority 2: Same protocol (any blockType)
            if (protocol) {
                const protocolMatch = history.find(h => h.protocol === protocol);
                if (protocolMatch) {
                    return {
                        weight: protocolMatch.maxWeight,
                        match: 'protocol',
                        contextLabel: protocolMatch.blockType || protocol,
                        context: protocolMatch
                    };
                }
            }

            // Priority 3: Any recent (fallback)
            const recent = history[0];
            return {
                weight: recent.maxWeight,
                match: 'any',
                contextLabel: recent.blockType || recent.protocol || 'Otro',
                context: recent
            };
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
        async send(athleteId, senderId, text, customTimestamp = null) {
            const chatRef = collection(db, 'chats', athleteId, 'messages');
            const messageData = {
                senderId,
                text,
                timestamp: customTimestamp || serverTimestamp(),
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
    },
    notifications: {
        async create(recipientId, data) {
            return await addDoc(collection(db, 'notifications'), {
                recipientId, // 'admin' or userId
                ...data,
                read: false,
                createdAt: serverTimestamp()
            });
        },
        listen(recipientId, callback) {
            const q = query(
                collection(db, 'notifications'),
                where('recipientId', '==', recipientId)
            );
            return onSnapshot(q, (snapshot) => {
                const notifications = snapshot.docs.map(d => ({
                    id: d.id,
                    ...d.data(),
                    createdAt: d.data().createdAt?.toDate() || new Date()
                }))
                    .sort((a, b) => b.createdAt - a.createdAt)
                    .slice(0, 50);

                callback(notifications);
            });
        },
        async markAsRead(notificationId) {
            const ref = doc(db, 'notifications', notificationId);
            await updateDoc(ref, {
                read: true,
                updatedAt: serverTimestamp()
            });
        },
        async markAllAsRead(recipientId) {
            // Firestore transactions or batch would be better for many docs, 
            // but for a simple bell list, we can fetch unread and update.
            const q = query(
                collection(db, 'notifications'),
                where('recipientId', '==', recipientId),
                where('read', '==', false)
            );
            const snapshot = await getDocs(q);
            const promises = snapshot.docs.map(d =>
                updateDoc(doc(db, 'notifications', d.id), {
                    read: true,
                    updatedAt: serverTimestamp()
                })
            );
            await Promise.all(promises);
        }
    }
};
