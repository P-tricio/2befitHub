
import { db } from '../lib/firebase';
import { collection, doc, setDoc, getDocs, query, where } from 'firebase/firestore';
import { curateIngredients, curatedRecipes } from '../data/nutritionData';

/**
 * Seeds the Firestore database with curated nutrition data.
 * This should be called once (or to reset data) from a Dev UI or Console.
 */
export const seedNutritionDB = async () => {
    console.log('Starting nutrition database seed...');

    try {
        // Seed Ingredients
        const ingCol = collection(db, 'nutri_ingredients');
        for (const ing of curateIngredients) {
            const { macros, ...rest } = ing;
            // Normalize unit: if it's "100g" or "100ml", just use "g" or "ml" to avoid "Por 100100g" in UI
            const normalizedUnit = ing.unit?.replace('100', '') || 'g';

            await setDoc(doc(ingCol, ing.id), {
                ...rest,
                unit: normalizedUnit,
                calories: Math.round((macros?.protein || 0) * 4 + (macros?.carbs || 0) * 4 + (macros?.fat || 0) * 9),
                protein: macros?.protein || 0,
                carbs: macros?.carbs || 0,
                fats: macros?.fat || 0,
                fiber: ing.micros?.fiber || 0,
                updatedAt: new Date().toISOString(),
                source: 'BEDCA/Curated'
            });
        }
        console.log(`Successfully seeded ${curateIngredients.length} ingredients.`);

        // Seed Recipes
        const recCol = collection(db, 'nutri_recipes');
        for (const rec of curatedRecipes) {
            const { totalMacros, ingredients: rawIngredients, ...rest } = rec;

            // Map ingredients amount -> quantity for UI compatibility
            const ingredients = (rawIngredients || []).map(ing => ({
                ...ing,
                quantity: ing.amount || 0
            }));

            await setDoc(doc(recCol, rec.id), {
                ...rest,
                ingredients,
                description: rec.description || 'Receta saludable diseñada para optimizar tu rendimiento y nutrición.',
                instructions: rec.instructions || 'Sigue los pasos habituales de preparación para combinar estos ingredientes de forma saludable.',
                totalMacros: {
                    calories: Math.round((totalMacros?.protein || 0) * 4 + (totalMacros?.carbs || 0) * 4 + (totalMacros?.fat || 0) * 9),
                    protein: totalMacros?.protein || 0,
                    carbs: totalMacros?.carbs || 0,
                    fats: totalMacros?.fat || 0,
                    fiber: totalMacros?.fiber || 0
                },
                updatedAt: new Date().toISOString(),
                source: 'Curated'
            });
        }
        console.log(`Successfully seeded ${curatedRecipes.length} recipes.`);

        return { success: true, count: curateIngredients.length + curatedRecipes.length };
    } catch (error) {
        console.error('Error seeding nutrition DB:', error);
        throw error;
    }
};

/**
 * Searches for ingredients in the local curated database (Firestore)
 */
export const searchLocalIngredients = async (searchTerm) => {
    try {
        const ingCol = collection(db, 'nutri_ingredients');
        const snapshot = await getDocs(ingCol);
        const results = [];

        const term = searchTerm.toLowerCase();
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.name?.toLowerCase().includes(term) || data.category?.toLowerCase().includes(term)) {
                results.push(data);
            }
        });

        return results;
    } catch (error) {
        console.error('Error searching local ingredients:', error);
        return [];
    }
};

/**
 * Searches for recipes in the local curated database (Firestore)
 */
export const searchLocalRecipes = async (searchTerm) => {
    try {
        const recCol = collection(db, 'nutri_recipes');
        const snapshot = await getDocs(recCol);
        const results = [];

        const term = searchTerm.toLowerCase();
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.name?.toLowerCase().includes(term) || data.type?.toLowerCase().includes(term)) {
                results.push(data);
            }
        });

        return results;
    } catch (error) {
        console.error('Error searching local recipes:', error);
        return [];
    }
};
