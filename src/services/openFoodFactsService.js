
const BASE_URL = 'https://es.openfoodfacts.org/cgi/search.pl';

/**
 * Search for products using Open Food Facts API (Spanish focus)
 * @param {string} query - Product name
 * @returns {Promise<Array>} - List of products
 */
export const searchProductsOFF = async (query) => {
    try {
        const url = new URL(BASE_URL);
        url.searchParams.append('search_terms', query);
        url.searchParams.append('search_simple', '1');
        url.searchParams.append('action', 'process');
        url.searchParams.append('json', '1');
        url.searchParams.append('page_size', '24');

        // Filter for products available in Spain
        url.searchParams.append('countries', 'Spain');

        const response = await fetch(url.toString(), {
            headers: {
                'User-Agent': 'BeFitHub - Web - Version 1.0 - https://github.com/yourusername/befithub'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch from Open Food Facts');
        }

        const data = await response.json();

        // Normalize results to a common format if possible
        return (data.products || []).map(product => ({
            id: product.id || product.code,
            label: product.product_name_es || product.product_name || 'Sin nombre',
            brand: product.brands || 'Marca desconocida',
            image: product.image_url || product.image_small_url,
            nutrition: {
                energy: product.nutriments?.['energy-kcal_100g'] || product.nutriments?.energy_100g,
                protein: product.nutriments?.proteins_100g,
                carbs: product.nutriments?.carbohydrates_100g,
                fat: product.nutriments?.fat_100g,
                fiber: product.nutriments?.fiber_100g
            },
            nutriscore: product.nutriscore_grade,
            quantity: product.quantity
        }));
    } catch (error) {
        console.error('Open Food Facts Search Error:', error);
        throw error;
    }
};
