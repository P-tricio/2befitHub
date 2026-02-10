
const BASE_URL = 'https://es.openfoodfacts.org/cgi/search.pl';

/**
 * Search for products using Open Food Facts API (Spanish focus)
 * @param {string} query - Product name
 * @returns {Promise<Array>} - List of products
 */
export const searchProductsOFF = async (query, filters = {}) => {
    try {
        const url = new URL(BASE_URL);
        url.searchParams.append('search_terms', query);
        url.searchParams.append('search_simple', '1');
        url.searchParams.append('action', 'process');
        url.searchParams.append('json', '1');
        url.searchParams.append('page_size', '24');

        // Filter for products available in Spain
        url.searchParams.append('countries', 'Spain');

        // Apply additional filters
        if (filters.nutriscore) {
            url.searchParams.append('nutrition_grades_tags', filters.nutriscore);
        }
        if (filters.category) {
            // Use 'categories_tags_es' for Spanish category names if possible, or general 'categories_tags'
            url.searchParams.append('categories_tags', filters.category);
        }

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

/**
 * Get a single product by barcode
 * @param {string} barcode
 * @returns {Promise<Array>} - Array containing the single product (for consistency)
 */
export const getProductByBarcode = async (barcode) => {
    try {
        const url = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`;

        const response = await fetch(url, {
            headers: {
                //'User-Agent': 'BeFitHub - Web - Version 1.0' // CORS might block this on v0, try without if fails
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch from Open Food Facts');
        }

        const data = await response.json();

        if (data.status === 0 || !data.product) {
            return []; // Product not found
        }

        const product = data.product;

        // Normalize single product to same format as search results
        const normalizedProduct = {
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
        };

        return [normalizedProduct];

    } catch (error) {
        console.error('OFF Barcode Error:', error);
        throw error;
    }
};
