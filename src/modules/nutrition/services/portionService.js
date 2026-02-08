/**
 * Nutrition Portion Service
 * Handles conversion between Grams and "Blocks/Portions"
 * 
 * Equivalencies:
 * 1 Portion Protein = 25g Protein
 * 1 Portion Carbs   = 25g Carbs
 * 1 Portion Fat     = 15g Fat
 */

export const PORTION_CONSTANTS = {
    PROTEIN_G: 25,
    CARB_G: 25,
    FAT_G: 15
};

/**
 * Convert raw gram macros to portions
 * @param {Object} macros - { protein: number, carbs: number, fat: number }
 * @returns {Object} - { protein: number, carbs: number, fat: number } (rounded to 1 decimal)
 */
export const gramsToPortions = (macros) => {
    return {
        protein: Number((macros.protein / PORTION_CONSTANTS.PROTEIN_G).toFixed(1)),
        carbs: Number((macros.carbs / PORTION_CONSTANTS.CARB_G).toFixed(1)),
        fat: Number((macros.fat / PORTION_CONSTANTS.FAT_G).toFixed(1))
    };
};

/**
 * Convert portions to raw gram macros
 * @param {Object} portions - { protein: number, carbs: number, fat: number }
 * @returns {Object} - { protein: number, carbs: number, fat: number }
 */
export const portionsToGrams = (portions) => {
    return {
        protein: Math.round(portions.protein * PORTION_CONSTANTS.PROTEIN_G),
        carbs: Math.round(portions.carbs * PORTION_CONSTANTS.CARB_G),
        fat: Math.round(portions.fat * PORTION_CONSTANTS.FAT_G)
    };
};

/**
 * Calculate macros for a food item based on quantity
 * @param {Object} food - The food object { protein, carbs, fat, calories } (per 100g usually)
 * @param {number} quantity - Quantity in grams (or units)
 * @returns {Object} { protein, carbs, fat, calories }
 */
export const calculateItemMacros = (food, quantity, itemUnit) => {
    // Safety check: if food is undefined or null, return zeroed macros
    if (!food) {
        return { protein: 0, carbs: 0, fats: 0, calories: 0 };
    }

    // 1. Determine if we are calculating based on portions or raw grams.
    // If itemUnit is provided, we trust it. Otherwise we fall back to food.unit.
    const currentUnit = itemUnit || food.unit;
    const isPortionBased = currentUnit === 'unit' || currentUnit === 'unidad' || currentUnit === 'porción' || currentUnit === 'ración';

    let grams = quantity;

    // If it's a portion-based entry and we know the portion weight, convert to grams
    if (isPortionBased && food.portionWeight) {
        grams = quantity * food.portionWeight;
    }

    // 2. Decide if we use the "per 100g" ratio or direct multiplier
    // Weight-based units (g, ml) always use per 100 ratio.
    // Portion-based units with portionWeight also use per 100 ratio (because macros are per 100g).
    // Portion-based units WITHOUT portionWeight use direct multiplier (macros are per unit).

    const isWeightRatio = !isPortionBased || (isPortionBased && food.portionWeight);
    const ratio = isWeightRatio ? (grams / 100) : quantity;

    return {
        protein: Math.round((food.protein || food.macros?.protein || 0) * ratio),
        carbs: Math.round((food.carbs || food.macros?.carbs || 0) * ratio),
        fats: Math.round((food.fats || food.macros?.fat || 0) * ratio),
        calories: Math.round((food.calories || food.macros?.kcal || 0) * ratio)
    };
};

export const formatMacroDisplay = (value, type, mode = 'GRAMS') => {
    if (mode === 'GRAMS') return `${value}g`;

    // Portions mode
    let portionVal = 0;
    if (type === 'PROTEIN') portionVal = (value / PORTION_CONSTANTS.PROTEIN_G).toFixed(1);
    if (type === 'CARBS') portionVal = (value / PORTION_CONSTANTS.CARB_G).toFixed(1);
    if (type === 'FAT') portionVal = (value / PORTION_CONSTANTS.FAT_G).toFixed(1);

    return `${portionVal} P`;
};
