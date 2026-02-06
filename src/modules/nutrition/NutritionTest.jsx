
import React, { useState } from 'react';
import { searchRecipes } from '../../services/edamamService';
import { searchFoodFatSecret, checkFatSecretCredentials } from '../../services/fatSecretService';
import { searchProductsOFF } from '../../services/openFoodFactsService';
import { searchIngredientsSpoon } from '../../services/spoonacularService';
import { Search, Loader2, Flame, Wheat, Drumstick, Droplets, Utensils, Database, Globe, Apple } from 'lucide-react';

const NutritionTest = () => {
    const [query, setQuery] = useState('');
    const [recipes, setRecipes] = useState([]);
    const [fsFoods, setFsFoods] = useState([]);
    const [offProducts, setOffProducts] = useState([]);
    const [spoonIngredients, setSpoonIngredients] = useState([]);
    const [selectedSpoonItem, setSelectedSpoonItem] = useState(null);
    const [spoonDetails, setSpoonDetails] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);

    const [localResults, setLocalResults] = useState({ ingredients: [], recipes: [] });
    const [seeding, setSeeding] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [apiSource, setApiSource] = useState('off'); // Default to OFF for Spain

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        setError(null);
        setRecipes([]);
        setFsFoods([]);
        setOffProducts([]);
        setSpoonIngredients([]);

        try {
            if (apiSource === 'edamam') {
                const data = await searchRecipes({ q: query });
                setRecipes(data.hits);
            } else if (apiSource === 'fatsecret') {
                if (!checkFatSecretCredentials()) {
                    throw new Error('FatSecret credentials missing in .env. Try restarting "npm run dev".');
                }
                const data = await searchFoodFatSecret(query);
                const foods = Array.isArray(data) ? data : (data ? [data] : []);
                setFsFoods(foods);
            } else if (apiSource === 'off') {
                const data = await searchProductsOFF(query);
                setOffProducts(data);
            } else if (apiSource === 'spoon') {
                const data = await searchIngredientsSpoon(query);
                setSpoonIngredients(data);
            } else if (apiSource === 'local') {
                const { searchLocalIngredients, searchLocalRecipes } = await import('../../services/nutritionDBService');
                const [ings, recs] = await Promise.all([
                    searchLocalIngredients(query),
                    searchLocalRecipes(query)
                ]);
                setLocalResults({ ingredients: ings, recipes: recs });
            }
        } catch (err) {
            let msg = err.message || 'Error connecting to API';
            if (apiSource === 'fatsecret' && (msg.includes('Failed to fetch') || msg.includes('NetworkError'))) {
                msg = 'CORS Error: FatSecret requires a server-side proxy. Client-side browser requests are blocked by FatSecret security policies.';
            }
            setError(msg);
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSpoonDetails = async (item) => {
        if (selectedSpoonItem?.id === item.id) {
            setSelectedSpoonItem(null);
            setSpoonDetails(null);
            return;
        }
        setSelectedSpoonItem(item);
        setLoadingDetails(true);
        setSpoonDetails(null);
        try {
            const { getIngredientNutrition } = await import('../../services/spoonacularService');
            const data = await getIngredientNutrition(item.id);
            setSpoonDetails(data);
        } catch (err) {
            console.error('Error fetching details:', err);
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleSeed = async () => {
        if (!confirm('¿Quieres resetear y sembrar la base de datos local con los datos curados?')) return;
        setSeeding(true);
        try {
            const { seedNutritionDB } = await import('../../services/nutritionDBService');
            await seedNutritionDB();
            alert('Base de datos sembrada con éxito.');
        } catch (err) {
            alert('Error al sembrar: ' + err.message);
        } finally {
            setSeeding(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white p-6">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-black bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent">
                        Nutrition API Explorer
                    </h1>
                    <p className="text-slate-400">Find recipes, brands, or generic ingredients</p>
                </div>

                {/* API Selector */}
                <div className="flex flex-wrap justify-center gap-2 md:gap-4">
                    <button
                        onClick={() => setApiSource('off')}
                        className={`px-3 md:px-5 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${apiSource === 'off'
                            ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20 scale-105'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }`}
                    >
                        <Globe size={18} />
                        <span className="hidden md:inline">OpenFoodFacts</span>
                        <span className="md:hidden">OFF</span>
                        <span className="text-[9px] uppercase bg-black/20 px-1.5 py-0.5 rounded ml-1">Spain</span>
                    </button>
                    <button
                        onClick={() => setApiSource('spoon')}
                        className={`px-3 md:px-5 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${apiSource === 'spoon'
                            ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20 scale-105'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }`}
                    >
                        <Apple size={18} />
                        <span className="hidden md:inline">Spoonacular</span>
                        <span className="md:hidden">Spoon</span>
                        <span className="text-[9px] uppercase bg-black/20 px-1.5 py-0.5 rounded ml-1">Generic</span>
                    </button>
                    <button
                        onClick={() => setApiSource('edamam')}
                        className={`px-3 md:px-5 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${apiSource === 'edamam'
                            ? 'bg-emerald-500 text-slate-900 shadow-lg shadow-emerald-500/20 scale-105'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }`}
                    >
                        <Utensils size={18} />
                        <span className="hidden md:inline">Edamam</span>
                        <span className="md:hidden">Eda</span>
                        <span className="text-[9px] uppercase bg-black/20 px-1.5 py-0.5 rounded ml-1">Recipes</span>
                    </button>
                    <button
                        onClick={() => setApiSource('local')}
                        className={`px-3 md:px-5 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${apiSource === 'local'
                            ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20 scale-105'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }`}
                    >
                        <Utensils size={18} />
                        <span className="hidden md:inline">Local DB</span>
                        <span className="md:hidden">Local</span>
                        <span className="text-[9px] uppercase bg-black/20 px-1.5 py-0.5 rounded ml-1">Curated</span>
                    </button>
                    <button
                        onClick={() => setApiSource('fatsecret')}
                        className={`px-3 md:px-5 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${apiSource === 'fatsecret'
                            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20 scale-105'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }`}
                    >
                        <Database size={18} />
                        <span className="hidden md:inline">FatSecret</span>
                        <span className="md:hidden">FS</span>
                        <span className="text-[9px] uppercase bg-black/20 px-1.5 py-0.5 rounded ml-1">Global</span>
                    </button>
                </div>

                {/* Search Bar */}
                <form onSubmit={handleSearch} className="max-w-md mx-auto relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-slate-500 group-focus-within:text-white transition-colors" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-3 border border-slate-700 rounded-xl leading-5 bg-slate-800 text-slate-300 placeholder-slate-500 focus:outline-none focus:bg-slate-800 focus:border-white focus:ring-1 focus:ring-white sm:text-sm transition-all shadow-lg text-center md:text-left"
                        placeholder={
                            apiSource === 'off' ? "Busca marcas (Hacendado, Carrefour)..." :
                                apiSource === 'spoon' ? "Search generic items in English (tomato, chicken)..." :
                                    apiSource === 'edamam' ? "Busca recetas..." :
                                        apiSource === 'local' ? "Busca en la Base de Datos Local (Tortilla, AOVE...)" :
                                            "Busca genéricos o marcas mundiales..."
                        }
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className={`absolute inset-y-1 right-1 px-4 font-bold rounded-lg transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed ${apiSource === 'off' ? 'bg-orange-500 hover:bg-orange-600 text-white' :
                            apiSource === 'spoon' ? 'bg-rose-500 hover:bg-rose-600 text-white' :
                                apiSource === 'local' ? 'bg-amber-500 hover:bg-amber-600 text-white' :
                                    apiSource === 'edamam' ? 'bg-emerald-500 hover:bg-emerald-600 text-slate-900' :
                                        'bg-blue-500 hover:bg-blue-600 text-white'
                            }`}
                    >
                        {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Search'}
                    </button>
                </form>

                {apiSource === 'spoon' && (
                    <p className="text-center text-[10px] text-rose-400 font-bold -mt-6">TIP: Spoonacular only works with English terms (e.g. "tomato" instead of "tomate")</p>
                )}

                {apiSource === 'local' && (
                    <div className="flex flex-col items-center gap-4 -mt-4">
                        <button
                            onClick={handleSeed}
                            disabled={seeding}
                            className="bg-slate-800 hover:bg-slate-700 text-amber-500 border border-amber-500/30 px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2"
                        >
                            {seeding ? <Loader2 className="animate-spin h-3 w-3" /> : <Database size={14} />}
                            {seeding ? 'Sincronizando...' : 'Actualizar Base de Datos Local (Firestore)'}
                        </button>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-center max-w-2xl mx-auto">
                        {error}
                    </div>
                )}

                {/* Results Grid - OpenFoodFacts */}
                {apiSource === 'off' && offProducts.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {offProducts.map((product, index) => (
                            <div key={index} className="bg-slate-800 rounded-2xl overflow-hidden border border-slate-700 hover:border-orange-500/30 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 group">
                                <div className="relative aspect-video overflow-hidden bg-slate-900 flex items-center justify-center p-4">
                                    {product.image ? (
                                        <img src={product.image} alt={product.label} className="max-h-full object-contain group-hover:scale-105 transition-transform duration-500" />
                                    ) : (
                                        <Database size={48} className="text-slate-700" />
                                    )}
                                    {product.nutriscore && (
                                        <div className="absolute top-2 right-2 px-2 py-1 bg-black/40 backdrop-blur-md rounded font-black text-xs uppercase text-orange-400 border border-orange-500/20">
                                            Score: {product.nutriscore}
                                        </div>
                                    )}
                                </div>
                                <div className="p-4">
                                    <h3 className="font-bold text-lg leading-tight text-white mb-1 line-clamp-1">{product.label}</h3>
                                    <p className="text-xs font-bold text-orange-400 mb-4">{product.brand}</p>

                                    <div className="grid grid-cols-4 gap-2 text-center">
                                        <div className="flex flex-col items-center gap-1"><Flame size={14} className="text-orange-400" /><span className="text-xs font-bold text-slate-300">{Math.round(product.nutrition.energy) || '-'}</span><span className="text-[9px] text-slate-500 uppercase">Kcal</span></div>
                                        <div className="flex flex-col items-center gap-1"><Drumstick size={14} className="text-blue-400" /><span className="text-xs font-bold text-slate-300">{Math.round(product.nutrition.protein) || '-'}g</span><span className="text-[9px] text-slate-500 uppercase">Prot</span></div>
                                        <div className="flex flex-col items-center gap-1"><Wheat size={14} className="text-yellow-400" /><span className="text-xs font-bold text-slate-300">{Math.round(product.nutrition.carbs) || '-'}g</span><span className="text-[9px] text-slate-500 uppercase">Carb</span></div>
                                        <div className="flex flex-col items-center gap-1"><Droplets size={14} className="text-purple-400" /><span className="text-xs font-bold text-slate-300">{Math.round(product.nutrition.fat) || '-'}g</span><span className="text-[9px] text-slate-500 uppercase">Gras</span></div>
                                    </div>
                                </div>
                                <div className="px-4 pb-4 pt-2">
                                    <button className="block w-full py-2 bg-slate-700/50 hover:bg-orange-500 text-slate-400 hover:text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors text-center border border-slate-600 hover:border-orange-400">
                                        {product.quantity || 'Ficha Técnica'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Results Grid - Spoonacular */}
                {apiSource === 'spoon' && spoonIngredients.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {spoonIngredients.map((item, index) => (
                            <div key={index} className="bg-slate-800 rounded-2xl overflow-hidden border border-slate-700 hover:border-rose-500/30 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 group p-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-20 h-20 bg-slate-900 rounded-xl border border-slate-700 overflow-hidden flex items-center justify-center p-2">
                                        <img
                                            src={`https://spoonacular.com/cdn/ingredients_100x100/${item.image}`}
                                            alt={item.name}
                                            className="max-h-full object-contain"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-slate-100 capitalize">{item.name}</h3>
                                        <p className="text-xs text-rose-400 font-bold uppercase mt-1">Ingrediente Genérico</p>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-slate-700/50 flex justify-between items-center text-xs text-slate-400">
                                    <span>ID: {item.id}</span>
                                    <button
                                        onClick={() => handleSpoonDetails(item)}
                                        className="px-3 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-bold transition-colors"
                                    >
                                        Ver Nutrición
                                    </button>
                                </div>

                                {selectedSpoonItem?.id === item.id && (
                                    <div className="mt-4 p-3 bg-slate-900/50 rounded-xl border border-rose-500/20 animate-in fade-in slide-in-from-top-2">
                                        {loadingDetails ? (
                                            <div className="flex justify-center py-4"><Loader2 className="animate-spin text-rose-500" /></div>
                                        ) : spoonDetails ? (
                                            <div className="space-y-3">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="bg-slate-800 p-2 rounded-lg text-center">
                                                        <p className="text-[10px] text-slate-500 uppercase">Calorías</p>
                                                        <p className="text-sm font-bold text-orange-400">{spoonDetails.nutrition?.nutrients?.find(n => n.name === 'Calories')?.amount || 0} kcal</p>
                                                    </div>
                                                    <div className="bg-slate-800 p-2 rounded-lg text-center">
                                                        <p className="text-[10px] text-slate-500 uppercase">Proteína</p>
                                                        <p className="text-sm font-bold text-blue-400">{spoonDetails.nutrition?.nutrients?.find(n => n.name === 'Protein')?.amount || 0}g</p>
                                                    </div>
                                                </div>
                                                <div className="text-[10px] text-slate-400 italic">
                                                    Valores por {spoonDetails.amount} {spoonDetails.unit}
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-500">No se pudieron cargar los detalles.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Results Grid - Local DB */}
                {apiSource === 'local' && (localResults.ingredients.length > 0 || localResults.recipes.length > 0) && (
                    <div className="space-y-8">
                        {/* Ingredients Section */}
                        {localResults.ingredients.length > 0 && (
                            <div className="space-y-4">
                                <h2 className="text-xl font-bold flex items-center gap-2 text-amber-400">
                                    <Wheat size={20} /> Ingredientes Curados
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {localResults.ingredients.map((ing, idx) => (
                                        <div key={idx} className="bg-slate-800 p-4 rounded-xl border border-slate-700 border-l-4 border-l-amber-500">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-bold text-slate-100">{ing.name}</h3>
                                                <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full">{ing.category}</span>
                                            </div>
                                            <div className="grid grid-cols-4 gap-2 text-center mt-3 bg-slate-900/50 p-2 rounded-lg">
                                                <div className="flex flex-col items-center gap-1"><Flame size={12} className="text-orange-400" /><span className="text-xs font-bold text-slate-300">{ing.macros.kcal}</span></div>
                                                <div className="flex flex-col items-center gap-1"><Drumstick size={12} className="text-blue-400" /><span className="text-xs font-bold text-slate-300">{ing.macros.protein}g</span></div>
                                                <div className="flex flex-col items-center gap-1"><Wheat size={12} className="text-yellow-400" /><span className="text-xs font-bold text-slate-300">{ing.macros.carbs}g</span></div>
                                                <div className="flex flex-col items-center gap-1"><Droplets size={12} className="text-purple-400" /><span className="text-xs font-bold text-slate-300">{ing.macros.fat}g</span></div>
                                            </div>
                                            <p className="text-[9px] text-slate-500 mt-2 text-right">Por {ing.unit}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Recipes Section */}
                        {localResults.recipes.length > 0 && (
                            <div className="space-y-4">
                                <h2 className="text-xl font-bold flex items-center gap-2 text-emerald-400">
                                    <Utensils size={20} /> Recetas Maetras
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {localResults.recipes.map((rec, idx) => (
                                        <div key={idx} className="bg-slate-800 rounded-2xl overflow-hidden border border-slate-700 border-t-4 border-t-emerald-500">
                                            <div className="p-4">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <h3 className="font-bold text-lg text-white leading-tight">{rec.name}</h3>
                                                        <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">{rec.type}</span>
                                                    </div>
                                                    <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-2 py-1 rounded-lg border border-emerald-500/20">{rec.difficulty}</span>
                                                </div>

                                                <div className="space-y-2 mb-4">
                                                    <p className="text-[10px] text-slate-500 font-bold uppercase">Ingredientes:</p>
                                                    <div className="flex flex-wrap gap-1">
                                                        {rec.ingredients.map((i, k) => (
                                                            <span key={k} className="text-[10px] bg-slate-900 text-slate-400 px-2 py-1 rounded">
                                                                {i.name} ({i.amount}{i.unit})
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-4 gap-2 text-center bg-slate-900 p-2 rounded-xl">
                                                    <div className="flex flex-col items-center gap-0.5"><Flame size={14} className="text-orange-400" /><span className="text-xs font-bold text-slate-300">{rec.totalMacros.kcal}</span><span className="text-[8px] text-slate-500 uppercase">kcal</span></div>
                                                    <div className="flex flex-col items-center gap-0.5"><Drumstick size={14} className="text-blue-400" /><span className="text-xs font-bold text-slate-300">{rec.totalMacros.protein}g</span><span className="text-[8px] text-slate-500 uppercase">prot</span></div>
                                                    <div className="flex flex-col items-center gap-0.5"><Wheat size={14} className="text-yellow-400" /><span className="text-xs font-bold text-slate-300">{rec.totalMacros.carbs}g</span><span className="text-[8px] text-slate-500 uppercase">carb</span></div>
                                                    <div className="flex flex-col items-center gap-0.5"><Droplets size={14} className="text-purple-400" /><span className="text-xs font-bold text-slate-300">{rec.totalMacros.fat}g</span><span className="text-[8px] text-slate-500 uppercase">gras</span></div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Results Grid - Edamam */}
                {apiSource === 'edamam' && recipes.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {recipes.map((hit, index) => {
                            const recipe = hit.recipe;
                            const calories = Math.round(recipe.calories / recipe.yield);
                            const protein = Math.round(recipe.totalNutrients.PROCNT?.quantity / recipe.yield || 0);
                            const carbs = Math.round(recipe.totalNutrients.CHOCDF?.quantity / recipe.yield || 0);
                            const fat = Math.round(recipe.totalNutrients.FAT?.quantity / recipe.yield || 0);

                            return (
                                <div key={index} className="bg-slate-800 rounded-2xl overflow-hidden border border-slate-700 hover:border-emerald-500/30 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 group">
                                    <div className="relative aspect-video overflow-hidden">
                                        <img src={recipe.image} alt={recipe.label} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-80" />
                                        <div className="absolute bottom-3 left-3 right-3">
                                            <h3 className="font-bold text-lg leading-tight text-white mb-1 line-clamp-2">{recipe.label}</h3>
                                        </div>
                                    </div>
                                    <div className="p-4 grid grid-cols-4 gap-2 text-center divide-x divide-slate-700/50">
                                        <div className="flex flex-col items-center gap-1"><Flame size={14} className="text-orange-400" /><span className="text-xs font-bold text-slate-300">{calories}</span></div>
                                        <div className="flex flex-col items-center gap-1"><Drumstick size={14} className="text-blue-400" /><span className="text-xs font-bold text-slate-300">{protein}g</span></div>
                                        <div className="flex flex-col items-center gap-1"><Wheat size={14} className="text-yellow-400" /><span className="text-xs font-bold text-slate-300">{carbs}g</span></div>
                                        <div className="flex flex-col items-center gap-1"><Droplets size={14} className="text-purple-400" /><span className="text-xs font-bold text-slate-300">{fat}g</span></div>
                                    </div>
                                    <div className="px-4 pb-4 pt-2">
                                        <a href={recipe.url} target="_blank" rel="noopener noreferrer" className="block w-full py-2 bg-slate-700/50 hover:bg-emerald-500 hover:text-slate-900 text-slate-400 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors text-center border border-slate-600 hover:border-emerald-400">Ver Receta</a>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Results Grid - FatSecret */}
                {apiSource === 'fatsecret' && fsFoods.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {fsFoods.map((food, index) => (
                            <div key={index} className="bg-slate-800 rounded-2xl overflow-hidden border border-slate-700 hover:border-blue-500/30 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 group">
                                <div className="p-4">
                                    <h3 className="font-bold text-lg leading-tight text-white mb-1 line-clamp-2">{food.food_name}</h3>
                                    {food.brand_name && <span className="text-xs font-bold bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20">{food.brand_name}</span>}
                                    <p className="text-xs text-slate-500 mt-4 line-clamp-3">{food.food_description}</p>
                                </div>
                                <div className="px-4 pb-4 pt-2">
                                    <button className="block w-full py-2 bg-slate-700/50 hover:bg-blue-500 text-slate-400 hover:text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors text-center border border-slate-600 hover:border-blue-400">Ver Detalles</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default NutritionTest;
