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
    serverTimestamp
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

export const TrainingDB = {
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
        }
    },

    // --- LOGS (User Performance) ---
    logs: {
        async create(userId, data) {
            return await addDoc(collection(db, LOGS), {
                userId,
                ...data, // result: { reps, time, weight, rpe }, moduleId, sessionId
                date: serverTimestamp()
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
        }
    }
};
