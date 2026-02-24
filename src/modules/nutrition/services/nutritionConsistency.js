/**
 * Normalizes a string for comparison (lowercase, removes accents, trims).
 */
export const normalizeString = (str) => {
    if (!str) return '';
    return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
};

/**
 * Attempts to find a high-confidence match for an AI-detected food name
 * within the internal database resources.
 * 
 * @param {string} aiName - Name returned by AI
 * @param {Object[]} dbFoods - List of foods from internal DB
 * @returns {Object|null} - The matched database food item or null
 */
export const findBestDatabaseMatch = (aiName, dbFoods) => {
    if (!aiName || !dbFoods || dbFoods.length === 0) return null;

    const normAI = normalizeString(aiName);

    // 1. Exact Match (Normalized)
    const exactMatch = dbFoods.find(f => normalizeString(f.name) === normAI);
    if (exactMatch) return { ...exactMatch, matchType: 'exact' };

    // 2. Partial Match / Inclusion
    // e.g., "Pechuga de pollo" matches "Pollo" or vice versa
    const partialMatches = dbFoods.filter(f => {
        const normDB = normalizeString(f.name);
        return normDB.includes(normAI) || normAI.includes(normDB);
    });

    if (partialMatches.length === 1) {
        return { ...partialMatches[0], matchType: 'partial' };
    }

    // If multiple partial matches, we could rank them or just return null to be safe
    // For now, if "Arroz" matches "Arroz Blanco" and "Arroz Integral", we let AI estimation stand
    // unless we want to pick the closest length.
    if (partialMatches.length > 1) {
        const sorted = partialMatches.sort((a, b) =>
            Math.abs(normalizeString(a.name).length - normAI.length) -
            Math.abs(normalizeString(b.name).length - normAI.length)
        );
        return { ...sorted[0], matchType: 'multi_partial' };
    }

    return null;
};

/**
 * Standardizes a food item's macros to ensure it contains all required fields.
 */
export const standardizeMacros = (macros) => {
    if (!macros) return { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 };
    return {
        calories: Number(macros.calories) || 0,
        protein: Number(macros.protein) || 0,
        carbs: Number(macros.carbs) || 0,
        fats: Number(macros.fats) || 0,
        fiber: Number(macros.fiber) || 0
    };
};
