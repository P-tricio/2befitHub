
const API_KEY = import.meta.env.VITE_SPOONACULAR_API_KEY;
const BASE_URL = 'https://api.spoonacular.com/food/ingredients';

/**
 * Search for generic ingredients
 * @param {string} query 
 */
export const searchIngredientsSpoon = async (query) => {
    if (!API_KEY) throw new Error('Spoonacular API Key missing in .env');

    try {
        const url = new URL(`${BASE_URL}/search`);
        url.searchParams.append('apiKey', API_KEY);
        url.searchParams.append('query', query);
        url.searchParams.append('number', '10');

        const response = await fetch(url.toString());
        if (!response.ok) throw new Error('Spoonacular API Error');

        const data = await response.json();
        return data.results || [];
    } catch (error) {
        console.error('Spoonacular Search Error:', error);
        throw error;
    }
};

/**
 * Get nutrition details for an ingredient
 * @param {number} id 
 * @param {number} amount 
 * @param {string} unit 
 */
export const getIngredientNutrition = async (id, amount = 100, unit = 'g') => {
    if (!API_KEY) return null;

    try {
        const url = new URL(`${BASE_URL}/${id}/information`);
        url.searchParams.append('apiKey', API_KEY);
        url.searchParams.append('amount', amount);
        url.searchParams.append('unit', unit);

        const response = await fetch(url.toString());
        if (!response.ok) throw new Error('Spoonacular Details Error');

        return await response.json();
    } catch (error) {
        console.error('Spoonacular Nutrition Error:', error);
        return null;
    }
};
