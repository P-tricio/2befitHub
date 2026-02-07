import { NutritionDB } from './nutritionDB';

/**
 * Shopping List Service
 * Aggregates ingredients from nutrition days and recipes.
 */
export const GENERIC_INGREDIENT_IDS = [
    'PGts0PyasG8g58ujB1JN', // Proteína
    'UyEHldyuCI9ZMCljcVZE', // Carbohidrato
    '7hCtyNXuyktok8xOIIRs'  // Grasa
];

export const ShoppingListService = {
    /**
     * Generates a consolidated shopping list for a set of nutrition day IDs.
     * @param {string[]} dayIds - IDs of the nutrition days to process.
     * @returns {Promise<Object[]>} - Consolidated list of ingredients.
     */
    async generateFromDays(dayIds) {
        if (!dayIds || dayIds.length === 0) return [];

        try {
            // 1. Fetch all resources in parallel for lookups
            const [allFoods, allRecipes] = await Promise.all([
                NutritionDB.foods.getAll(),
                NutritionDB.recipes.getAll()
            ]);

            // Create maps for O(1) lookups
            const foodMap = new Map(allFoods.map(f => [f.id, f]));
            const recipeMap = new Map(allRecipes.map(r => [r.id, r]));

            // 2. Fetch the specific days
            const days = await Promise.all(dayIds.map(id => NutritionDB.days.getById(id)));

            // 3. Aggregate ingredients
            const aggregator = new Map();

            const addIngredient = (refId, quantity, name, unit, category) => {
                if (!refId) return;

                // Key includes unit to differentiate if same food has different units (e.g. g vs unit)
                const aggKey = `${refId}_${unit}`;

                if (aggregator.has(aggKey)) {
                    const existing = aggregator.get(aggKey);
                    existing.quantity += quantity;
                } else {
                    aggregator.set(aggKey, {
                        refId,
                        name,
                        quantity,
                        unit,
                        category: category || 'Otros'
                    });
                }
            };

            for (const day of days) {
                if (!day || !day.meals) continue;

                for (const meal of day.meals) {
                    if (!meal.items) continue;

                    for (const item of meal.items) {
                        if (item.type === 'food') {
                            const nutrition = foodMap.get(item.refId);
                            if (nutrition) {
                                addIngredient(item.refId, item.quantity, nutrition.name, nutrition.unit, nutrition.category);
                            } else {
                                // Fallback if food not in DB but has data in item
                                addIngredient(item.refId, item.quantity, item.name, item.unit, 'Otros');
                            }
                        } else if (item.type === 'recipe') {
                            const recipe = recipeMap.get(item.refId);
                            if (recipe && recipe.ingredients) {
                                // Factor is the number of servings or quantity of the recipe in the day
                                const factor = item.quantity || 1;

                                for (const recIng of recipe.ingredients) {
                                    // Ingredient ID in recipe might be 'id' or 'refId' depending on editor/seed
                                    const ingId = recIng.id || recIng.refId;
                                    const ingNutrition = foodMap.get(ingId);

                                    if (ingNutrition) {
                                        addIngredient(
                                            ingId,
                                            (recIng.quantity || recIng.amount || 0) * factor,
                                            ingNutrition.name,
                                            ingNutrition.unit,
                                            ingNutrition.category
                                        );
                                    } else {
                                        // Fallback with data from recipe ingredient object
                                        addIngredient(
                                            ingId,
                                            (recIng.quantity || recIng.amount || 0) * factor,
                                            recIng.name,
                                            recIng.unit,
                                            'Otros'
                                        );
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // 4. Convert Map to sorted array
            return Array.from(aggregator.values())
                .sort((a, b) => {
                    // Sort by category first, then by name
                    const catComp = a.category.localeCompare(b.category);
                    if (catComp !== 0) return catComp;
                    return a.name.localeCompare(b.name);
                });

        } catch (error) {
            console.error('Error generating shopping list:', error);
            throw error;
        }
    },

    /**
     * Checks if a set of days contains at least one non-generic ingredient.
     * @param {string[]} dayIds 
     * @returns {Promise<boolean>}
     */
    async hasRealIngredients(dayIds) {
        if (!dayIds || dayIds.length === 0) return false;

        try {
            // We need to fetch the days to see their items
            const days = await Promise.all(dayIds.map(id => NutritionDB.days.getById(id)));

            // Collect all unique recipe IDs to check their contents
            const recipeIds = new Set();
            for (const day of days) {
                if (!day || !day.meals) continue;
                for (const meal of day.meals) {
                    if (!meal.items) continue;
                    for (const item of meal.items) {
                        if (item.type === 'food') {
                            if (!GENERIC_INGREDIENT_IDS.includes(item.refId)) return true;
                        } else if (item.type === 'recipe') {
                            recipeIds.add(item.refId);
                        }
                    }
                }
            }

            // If no recipes and we found no real food, it's generic (or empty)
            if (recipeIds.size === 0) return false;

            // Check recipes
            const recipes = await Promise.all(Array.from(recipeIds).map(id => NutritionDB.recipes.getById(id)));
            for (const recipe of recipes) {
                if (!recipe || !recipe.ingredients) continue;
                for (const ing of recipe.ingredients) {
                    const ingId = ing.id || ing.refId;
                    if (!GENERIC_INGREDIENT_IDS.includes(ingId)) return true;
                }
            }

            return false;
        } catch (error) {
            console.error('Error checking for real ingredients:', error);
            return false;
        }
    }
};
