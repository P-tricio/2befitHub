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
    setDoc
} from 'firebase/firestore';

// Collection References
const FOODS = 'nutri_ingredients';
const RECIPES = 'nutri_recipes';
const DAYS = 'nutrition_days';
const PLANS = 'nutrition_plans';
const LOGS = 'nutrition_logs';

/**
 * @typedef {Object} FoodItem
 * @property {string} id
 * @property {string} name
 * @property {number} calories - per 100g/ml or per unit
 * @property {number} protein
 * @property {number} carbs
 * @property {number} fats
 * @property {string} unit - 'g', 'ml', 'unit'
 * @property {string} category - 'protein', 'carb', 'fat', 'vegetable', 'fruit', 'dairy', 'other'
 * @property {boolean} is verified - Admin verified
 */

/**
 * @typedef {Object} NutritionDay
 * @property {string} id
 * @property {string} name
 * @property {Object[]} meals - List of meal blocks (Breakfast, Lunch, etc.)
 */

export const NutritionDB = {
    // --- FOODS (Ingredients) ---
    foods: {
        async getAll() {
            const q = query(collection(db, FOODS), orderBy('name'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        },
        async create(data) {
            return await addDoc(collection(db, FOODS), {
                ...data,
                createdAt: serverTimestamp()
            });
        },
        async update(id, data) {
            const ref = doc(db, FOODS, id);
            await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
        },
        async delete(id) {
            await deleteDoc(doc(db, FOODS, id));
        },
        async search(term) {
            // Basic client-side filtering for MVP (Firestore native search is limited)
            // In a real app with many foods, we'd use Algolia or a dedicated search index.
            const all = await this.getAll();
            const lowerTerm = term.toLowerCase();
            return all.filter(f => f.name.toLowerCase().includes(lowerTerm));
        }
    },

    // --- RECIPES (Meals/Dishes) ---
    recipes: {
        async getAll() {
            const snapshot = await getDocs(collection(db, RECIPES));
            return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        },
        async create(data) {
            return await addDoc(collection(db, RECIPES), {
                ...data,
                createdAt: serverTimestamp()
            });
        },
        async update(id, data) {
            const ref = doc(db, RECIPES, id);
            await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
        },
        async delete(id) {
            await deleteDoc(doc(db, RECIPES, id));
        }
    },

    // --- DAYS (Daily Templates) ---
    days: {
        async getAll() {
            const snapshot = await getDocs(collection(db, DAYS));
            return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        },
        async create(data) {
            return await addDoc(collection(db, DAYS), {
                ...data,
                createdAt: serverTimestamp()
            });
        },
        async getById(id) {
            const snap = await getDoc(doc(db, DAYS, id));
            return snap.exists() ? { id: snap.id, ...snap.data() } : null;
        },
        async update(id, data) {
            const ref = doc(db, DAYS, id);
            await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
        },
        async delete(id) {
            if (!id) {
                console.error("Attempted to delete nutrition day with invalid ID:", id);
                return;
            }
            try {
                await deleteDoc(doc(db, DAYS, String(id)));
            } catch (error) {
                console.error("Error deleting nutrition day:", error);
                throw error;
            }
        }
    },

    // --- PLANS (Weekly Schedules) ---
    plans: {
        async getAll() {
            const snapshot = await getDocs(collection(db, PLANS));
            return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        },
        async create(data) {
            return await addDoc(collection(db, PLANS), {
                ...data,
                createdAt: serverTimestamp()
            });
        },
        async update(id, data) {
            const ref = doc(db, PLANS, id);
            await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
        },
        async delete(id) {
            await deleteDoc(doc(db, PLANS, id));
        }
    },

    // --- LOGS (User Tracking) ---
    logs: {
        async getDailyLog(userId, date) {
            // Logs are stored as: nutrition_logs/{userId}_{date} 
            // OR nutrition_logs where userId==X and date==Y.
            // Let's use ID strategy: userId_date for O(1) access
            const docId = `${userId}_${date}`;
            const snap = await getDoc(doc(db, LOGS, docId));
            return snap.exists() ? { id: snap.id, ...snap.data() } : null;
        },
        async updateMealStatus(userId, date, mealIndex, itemIndex, status, customKey = null, dayId = null) {
            const docId = `${userId}_${date}`;
            const ref = doc(db, LOGS, docId);

            const snap = await getDoc(ref);
            let data = snap.exists() ? snap.data() : { userId, date };

            // Let's store a simple map of checkbox states: completedItems: { "mealIdx-itemIdx": true }
            const currentCompleted = data.completedItems || {};
            const key = customKey || `${mealIndex}-${itemIndex}`;

            if (status) {
                currentCompleted[key] = true;
            } else {
                delete currentCompleted[key];
            }

            const updateData = {
                userId,
                date,
                completedItems: currentCompleted,
                updatedAt: serverTimestamp()
            };

            if (dayId) updateData.dayId = dayId;
            // Preserve extraItems if they exist in the document but aren't being updated here
            if (data.extraItems && !updateData.extraItems) updateData.extraItems = data.extraItems;

            await setDoc(ref, updateData, { merge: true });
        },
        async saveDailyLog(userId, date, completedItems, dayId, extraItems = []) {
            const docId = `${userId}_${date}`;
            const ref = doc(db, LOGS, docId);

            // Fetch current doc to preserve fields if necessary (like existing extraItems if passing empty)
            const snap = await getDoc(ref);
            const currentData = snap.exists() ? snap.data() : {};

            const data = {
                userId,
                date,
                completedItems: completedItems || currentData.completedItems || {},
                updatedAt: serverTimestamp()
            };

            if (dayId) data.dayId = dayId;
            // Only update extraItems if provided, otherwise keep current ones
            if (extraItems && extraItems.length > 0) {
                data.extraItems = extraItems;
            } else if (currentData.extraItems) {
                data.extraItems = currentData.extraItems;
            }

            await setDoc(ref, data, { merge: true });
        }
    }
};
