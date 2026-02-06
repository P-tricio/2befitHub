
const APP_ID = import.meta.env.VITE_EDAMAM_APP_ID;
const APP_KEY = import.meta.env.VITE_EDAMAM_APP_KEY;
const BASE_URL = 'https://api.edamam.com/api/recipes/v2';

/**
 * Search for recipes using the Edamam API
 * @param {Object} params - Search parameters
 * @param {string} params.q - Query string (e.g., 'chicken', 'pasta')
 * @param {string} [params.mealType] - Meal type (Breakfast, Lunch, Dinner, Snack, Teatime)
 * @param {Array<string>} [params.health] - Health labels (e.g., 'vegan', 'gluten-free', 'high-protein')
 * @param {Array<string>} [params.cuisineType] - Cuisine type (e.g., 'American', 'Asian')
 * @param {string} [params.nextPageUrl] - URL for the next page of results (from previous response)
 * @returns {Promise<Object>} - API response containing hits and pagination links
 */
export const searchRecipes = async ({ q, mealType, health, cuisineType, nextPageUrl }) => {
    if (nextPageUrl) {
        try {
            const response = await fetch(nextPageUrl);
            if (!response.ok) throw new Error('Network response was not ok');
            return await response.json();
        } catch (error) {
            console.error('Error fetching next page of recipes:', error);
            throw error;
        }
    }

    const url = new URL(BASE_URL);
    url.searchParams.append('type', 'public');
    url.searchParams.append('app_id', APP_ID);
    url.searchParams.append('app_key', APP_KEY);

    if (q) url.searchParams.append('q', q);

    if (mealType) url.searchParams.append('mealType', mealType);

    if (health && health.length > 0) {
        health.forEach(label => url.searchParams.append('health', label));
    }

    if (cuisineType && cuisineType.length > 0) {
        cuisineType.forEach(cuisine => url.searchParams.append('cuisineType', cuisine));
    }

    // Default fields to retrieve to optimize payload
    const fields = [
        'uri',
        'label',
        'image',
        'images',
        'source',
        'url',
        'yield',
        'dietLabels',
        'healthLabels',
        'cautions',
        'ingredientLines',
        'calories',
        'totalWeight',
        'totalTime',
        'cuisineType',
        'mealType',
        'dishType',
        'totalNutrients',
        'totalDaily'
    ];
    fields.forEach(field => url.searchParams.append('field', field));

    try {
        const response = await fetch(url.toString(), {
            headers: {
                'Edamam-Account-User': 'befithub_user'
            }
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Edamam API Error: ${response.status} ${errorData.message || response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error searching recipes:', error);
        throw error;
    }
};

/**
 * Get a specific recipe by ID
 * @param {string} id - Recipe ID (from URI)
 * @returns {Promise<Object>} - Recipe data
 */
export const getRecipeById = async (id) => {
    const url = new URL(`${BASE_URL}/${id}`);
    url.searchParams.append('type', 'public');
    url.searchParams.append('app_id', APP_ID);
    url.searchParams.append('app_key', APP_KEY);

    try {
        const response = await fetch(url.toString(), {
            headers: {
                'Edamam-Account-User': 'befithub_user'
            }
        });
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
    } catch (error) {
        console.error('Error fetching recipe details:', error);
        throw error;
    }
};
