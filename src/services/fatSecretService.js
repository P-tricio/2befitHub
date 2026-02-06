
const CLIENT_ID = import.meta.env.VITE_FATSECRET_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_FATSECRET_CLIENT_SECRET;
const SCOPE = 'basic';

let accessToken = null;
let tokenExpiration = 0;

/**
 * Validates availability of credentials
 */
export const checkFatSecretCredentials = () => {
    return !!CLIENT_ID && !!CLIENT_SECRET;
};

/**
 * Get Access Token for FatSecret API (OAuth 2.0 Client Credentials)
 * Note: In a production app, this should be done server-side to protect the Client Secret.
 */
const getAccessToken = async () => {
    if (accessToken && Date.now() < tokenExpiration) {
        return accessToken;
    }

    const tokenUrl = 'https://oauth.fatsecret.com/connect/token';
    const credentials = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);

    try {
        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${credentials}`
            },
            body: `grant_type=client_credentials&scope=${SCOPE}`
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error_description || 'Failed to authenticate with FatSecret');
        }

        const data = await response.json();
        accessToken = data.access_token;
        // Set expiration slightly before actual expiry (expires_in is in seconds)
        tokenExpiration = Date.now() + (data.expires_in * 1000) - 60000;

        return accessToken;
    } catch (error) {
        console.error('FatSecret Auth Error:', error);
        throw error;
    }
};

/**
 * Search for food items
 * @param {string} query 
 */
export const searchFoodFatSecret = async (query) => {
    try {
        const token = await getAccessToken();
        const url = new URL('https://platform.fatsecret.com/rest/server.api');
        url.searchParams.append('method', 'foods.search');
        url.searchParams.append('format', 'json');
        url.searchParams.append('search_expression', query);
        url.searchParams.append('region', 'ES');
        // url.searchParams.append('language', 'es'); // Optional: Spanish results

        const response = await fetch(url.toString(), {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch data from FatSecret');
        }

        const data = await response.json();
        return data.foods ? data.foods.food : [];
    } catch (error) {
        console.error('FatSecret Search Error:', error);
        throw error;
    }
};

/**
 * Get detailed food information
 * @param {string} foodId 
 */
export const getFoodDetails = async (foodId) => {
    try {
        const token = await getAccessToken();
        const url = new URL('https://platform.fatsecret.com/rest/server.api');
        url.searchParams.append('method', 'food.get.v2');
        url.searchParams.append('format', 'json');
        url.searchParams.append('food_id', foodId);

        const response = await fetch(url.toString(), {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Failed to fetch details');

        const data = await response.json();
        return data.food;
    } catch (error) {
        console.error('FatSecret Details Error:', error);
        throw error;
    }
};
