
import React, { useState, useEffect } from 'react';
import { searchProductsOFF, getProductByBarcode } from '../../services/openFoodFactsService';
import { searchLocalIngredients, searchLocalRecipes } from '../../services/nutritionDBService';
import { Search, Loader2, Flame, Wheat, Drumstick, Droplets, Utensils, Database, Globe, Filter, X, ScanBarcode, Camera } from 'lucide-react';
import { useZxing } from 'react-zxing';

const ScannerView = ({ onScan }) => {
    const { ref } = useZxing({
        onDecodeResult(result) {
            onScan(null, { text: result.getText() });
        },
        onError(error) {
            // console.error(error); // Keep silent or handle if needed
        }
    });

    return (
        <video ref={ref} className="w-full h-full object-cover" />
    );
};

const NutritionTest = () => {
    const [query, setQuery] = useState('');
    const [offProducts, setOffProducts] = useState([]);
    const [localResults, setLocalResults] = useState({ ingredients: [], recipes: [] });

    // Filters State
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        nutriscore: '',
        category: ''
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [seeding, setSeeding] = useState(false);

    // Scanner State
    const [showScanner, setShowScanner] = useState(false);

    // Effect to trigger search when scanner returns a result (optional, but good UX)
    // We won't auto-trigger to avoid loops, but we'll populate the field.

    const handleSearch = async (e, overrideQuery = null) => {
        if (e && e.preventDefault) e.preventDefault();

        const searchQuery = overrideQuery || query;

        if (!searchQuery || !searchQuery.trim()) return;

        setLoading(true);
        setError(null);
        setOffProducts([]);
        setLocalResults({ ingredients: [], recipes: [] });

        try {
            // DETECT BARCODE: If query is numeric and long enough (EAN-8/13)
            // Some barcodes are 8, 12, 13 digits.
            const isBarcode = /^\d{8,14}$/.test(searchQuery.trim());

            if (isBarcode) {
                // Barcode Search Only
                try {
                    const barcodeData = await getProductByBarcode(searchQuery.trim());
                    setOffProducts(barcodeData);
                    if (barcodeData.length === 0) {
                        setError('Producto no encontrado por código de barras.');
                    }
                } catch (err) {
                    setError('Error buscando código de barras.');
                }
            } else {
                // Regular Text Search (Hybrid)

                // 1. Local Search
                const localPromise = Promise.all([
                    searchLocalIngredients(searchQuery),
                    searchLocalRecipes(searchQuery)
                ]).then(([ings, recs]) => {
                    if (filters.category) {
                        const catLower = filters.category.toLowerCase();
                        ings = ings.filter(i =>
                            (i.category?.toLowerCase() || '').includes(catLower) ||
                            catLower === 'all'
                        );
                    }
                    setLocalResults({ ingredients: ings, recipes: recs });
                });

                // 2. OFF Search
                const apiPromise = (async () => {
                    const data = await searchProductsOFF(searchQuery, filters);
                    setOffProducts(data);
                })();

                await Promise.all([localPromise, apiPromise]);
            }

        } catch (err) {
            let msg = err.message || 'Error executing search';
            setError(msg);
            console.error(err);
        } finally {
            setLoading(false);
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

    const clearFilters = () => {
        setFilters({ nutriscore: '', category: '' });
    };

    const handleScan = (err, result) => {
        if (result) {
            const code = result.text;
            setQuery(code);
            setShowScanner(false);
            if (navigator.vibrate) navigator.vibrate(200);

            // Trigger search immediately with the scanned code
            handleSearch(null, code);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="text-center space-y-2">
                    <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent">
                        Nutrition Explorer
                    </h1>
                    <p className="text-slate-400">Buscador Unificado (Local + OpenFoodFacts + Barcode)</p>
                </div>

                {/* Search Bar & Filters */}
                <div className="max-w-2xl mx-auto space-y-4">
                    <form onSubmit={handleSearch} className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-11 pr-32 py-4 bg-slate-800 border-2 border-slate-700 rounded-2xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-0 transition-all shadow-xl text-lg"
                            placeholder="Busca alimentos o escanea..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                        <div className="absolute inset-y-2 right-2 flex items-center gap-2">
                            {/* Scanner Button */}
                            <button
                                type="button"
                                onClick={() => setShowScanner(true)}
                                className="p-2 rounded-xl text-slate-400 hover:text-emerald-400 hover:bg-slate-700/50 transition-colors"
                                title="Escanear Código de Barras"
                            >
                                <ScanBarcode size={24} />
                            </button>

                            <button
                                type="button"
                                onClick={() => setShowFilters(!showFilters)}
                                className={`p-2 rounded-xl transition-colors ${showFilters || filters.nutriscore || filters.category ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                <Filter size={20} />
                            </button>
                            <button
                                id="search-btn"
                                type="submit"
                                disabled={loading}
                                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-colors flex items-center gap-2"
                            >
                                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Buscar'}
                            </button>
                        </div>
                    </form>

                    {/* Scanner Modal */}
                    {showScanner && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                            <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-md overflow-hidden shadow-2xl relative">
                                <div className="p-4 flex justify-between items-center border-b border-slate-800">
                                    <h3 className="font-bold text-white flex items-center gap-2">
                                        <Camera size={20} className="text-emerald-400" /> Escanear Producto
                                    </h3>
                                    <button onClick={() => setShowScanner(false)} className="text-slate-400 hover:text-white">
                                        <X size={24} />
                                    </button>
                                </div>
                                <div className="aspect-square bg-black relative flex items-center justify-center overflow-hidden">
                                    <ScannerView onScan={handleScan} />
                                    {/* Overlay guide */}
                                    <div className="absolute inset-0 border-2 border-emerald-500/50 m-12 rounded-lg pointer-events-none flex items-center justify-center z-10">
                                        <div className="w-full h-0.5 bg-red-500/50"></div>
                                    </div>
                                </div>
                                <div className="p-4 text-center text-sm text-slate-400">
                                    Apunta la cámara al código de barras del producto.
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Collapsible Filters */}
                    {showFilters && (
                        <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 animate-in slide-in-from-top-2 duration-200">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Filtros Avanzados</h3>
                                {(filters.nutriscore || filters.category) && (
                                    <button onClick={clearFilters} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                                        <X size={12} /> Limpiar filtros
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* NutriScore */}
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 ml-1">Nutri-Score</label>
                                    <div className="flex gap-2">
                                        {['A', 'B', 'C', 'D', 'E'].map((score) => (
                                            <button
                                                key={score}
                                                type="button"
                                                onClick={() => setFilters(prev => ({ ...prev, nutriscore: prev.nutriscore === score.toLowerCase() ? '' : score.toLowerCase() }))}
                                                className={`flex-1 h-10 rounded-lg font-black text-lg transition-all border-2 ${filters.nutriscore === score.toLowerCase()
                                                    ? 'border-white scale-105 shadow-lg'
                                                    : 'border-transparent opacity-50 hover:opacity-100 hover:scale-105'
                                                    }`}
                                                style={{
                                                    backgroundColor:
                                                        score === 'A' ? '#038141' :
                                                            score === 'B' ? '#85BB2F' :
                                                                score === 'C' ? '#FECB02' :
                                                                    score === 'D' ? '#EE8100' : '#E63E11'
                                                }}
                                            >
                                                {score}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Categories */}
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 ml-1">Categoría</label>
                                    <select
                                        value={filters.category}
                                        onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-emerald-500 transition-colors"
                                    >
                                        <option value="">Todas las categorías</option>
                                        <option value="snack">Snacks / Aperitivos</option>
                                        <option value="dairy">Lácteos / Quesos</option>
                                        <option value="meat">Carnes / Embutidos</option>
                                        <option value="cereal">Cereales / Panes</option>
                                        <option value="beverage">Bebidas</option>
                                        <option value="plant-based">Vegano / Vegetal</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-center max-w-2xl mx-auto">
                            {error}
                        </div>
                    )}

                    {/* No Results State */}
                    {!loading && !error && query && localResults.ingredients.length === 0 && localResults.recipes.length === 0 && offProducts.length === 0 && (
                        <div className="text-center py-12 text-slate-500">
                            <Search size={48} className="mx-auto mb-4 text-slate-700" />
                            <p>No se encontraron resultados para "{query}"</p>
                            <button onClick={handleSeed} className="mt-4 text-emerald-500 hover:underline">¿Base de datos vacía? Intenta re-sembrar</button>
                        </div>
                    )}


                    {/* RESULTS SECTION */}
                    <div className="space-y-8">

                        {/* 1. LOCAL RESULTS */}
                        {(localResults.ingredients.length > 0 || localResults.recipes.length > 0) && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex items-center gap-4">
                                    <h2 className="text-xl font-black bg-gradient-to-r from-amber-200 to-yellow-500 bg-clip-text text-transparent flex items-center gap-2">
                                        <Utensils size={24} className="text-amber-400" />
                                        Resultados Locales (Genéricos Recomendados)
                                    </h2>
                                    <div className="h-px bg-slate-800 flex-1"></div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {localResults.ingredients.map((ing, idx) => (
                                        <div key={'ing-' + idx} className="bg-slate-800/80 backdrop-blur p-4 rounded-xl border border-amber-500/30 hover:bg-slate-800 transition-all group">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-bold text-amber-100 group-hover:text-amber-400 transition-colors">{ing.name}</h3>
                                                <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20">{ing.category}</span>
                                            </div>
                                            <div className="grid grid-cols-4 gap-2 text-center mt-3 bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                                                <div className="flex flex-col items-center gap-1"><Flame size={12} className="text-orange-400" /><span className="text-xs font-bold text-slate-300">{ing.calories}</span></div>
                                                <div className="flex flex-col items-center gap-1"><Drumstick size={12} className="text-blue-400" /><span className="text-xs font-bold text-slate-300">{ing.protein}g</span></div>
                                                <div className="flex flex-col items-center gap-1"><Wheat size={12} className="text-yellow-400" /><span className="text-xs font-bold text-slate-300">{ing.carbs}g</span></div>
                                                <div className="flex flex-col items-center gap-1"><Droplets size={12} className="text-purple-400" /><span className="text-xs font-bold text-slate-300">{ing.fats}g</span></div>
                                            </div>
                                        </div>
                                    ))}
                                    {localResults.recipes.map((rec, idx) => (
                                        <div key={'rec-' + idx} className="bg-slate-800/80 backdrop-blur p-4 rounded-xl border border-emerald-500/30 hover:bg-slate-800 transition-all group">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-bold text-emerald-100 group-hover:text-emerald-400 transition-colors">{rec.name}</h3>
                                                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 uppercase tracking-wider">Receta</span>
                                            </div>
                                            <div className="grid grid-cols-4 gap-2 text-center mt-3 bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                                                <div className="flex flex-col items-center gap-1"><Flame size={12} className="text-orange-400" /><span className="text-xs font-bold text-slate-300">{rec.totalMacros.calories}</span></div>
                                                <div className="flex flex-col items-center gap-1"><Drumstick size={12} className="text-blue-400" /><span className="text-xs font-bold text-slate-300">{rec.totalMacros.protein}g</span></div>
                                                <div className="flex flex-col items-center gap-1"><Wheat size={12} className="text-yellow-400" /><span className="text-xs font-bold text-slate-300">{rec.totalMacros.carbs}g</span></div>
                                                <div className="flex flex-col items-center gap-1"><Droplets size={12} className="text-purple-400" /><span className="text-xs font-bold text-slate-300">{rec.totalMacros.fats}g</span></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 2. OPEN FOOD FACTS RESULTS */}
                        {offProducts.length > 0 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                                <div className="flex items-center gap-4">
                                    <h2 className="text-xl font-black text-slate-400 flex items-center gap-2">
                                        <Globe size={24} />
                                        Resultados Externos (OpenFoodFacts)
                                    </h2>
                                    <div className="h-px bg-slate-800 flex-1"></div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {offProducts.map((product, index) => (
                                        <div key={index} className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 hover:border-orange-500/30 transition-all shadow-lg group">
                                            <div className="relative aspect-video bg-slate-900 flex items-center justify-center p-2">
                                                {product.image ? (
                                                    <img src={product.image} alt={product.label} className="h-full object-contain group-hover:scale-105 transition-transform" />
                                                ) : (
                                                    <Database size={32} className="text-slate-700" />
                                                )}
                                                {product.nutriscore && (
                                                    <div className={`absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-black uppercase text-white shadow-sm
                                                        ${product.nutriscore === 'a' ? 'bg-[#038141]' :
                                                            product.nutriscore === 'b' ? 'bg-[#85BB2F]' :
                                                                product.nutriscore === 'c' ? 'bg-[#FECB02] text-black' :
                                                                    product.nutriscore === 'd' ? 'bg-[#EE8100]' : 'bg-[#E63E11]'
                                                        }`}>
                                                        {product.nutriscore.toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-3">
                                                <h3 className="font-bold text-sm text-slate-200 mb-0.5 line-clamp-1" title={product.label}>{product.label}</h3>
                                                <p className="text-[10px] font-bold text-orange-400 mb-2 truncate">{product.brand}</p>

                                                <div className="grid grid-cols-4 gap-1 text-center bg-slate-900/30 p-1.5 rounded-lg">
                                                    <div className="flex flex-col items-center"><span className="text-[10px] font-bold text-slate-300">{Math.round(product.nutrition.energy) || '-'}</span><span className="text-[8px] text-slate-600">Kcal</span></div>
                                                    <div className="flex flex-col items-center"><span className="text-[10px] font-bold text-slate-300">{Math.round(product.nutrition.protein) || '-'}</span><span className="text-[8px] text-slate-600">Prot</span></div>
                                                    <div className="flex flex-col items-center"><span className="text-[10px] font-bold text-slate-300">{Math.round(product.nutrition.carbs) || '-'}</span><span className="text-[8px] text-slate-600">Carb</span></div>
                                                    <div className="flex flex-col items-center"><span className="text-[10px] font-bold text-slate-300">{Math.round(product.nutrition.fat) || '-'}</span><span className="text-[8px] text-slate-600">Gras</span></div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Restore DB Button (Bottom, subtle) */}
                        <div className="flex justify-center pt-8 border-t border-slate-800">
                            <button
                                onClick={handleSeed}
                                disabled={seeding}
                                className="text-slate-600 hover:text-amber-500 text-xs flex items-center gap-2 transition-colors"
                            >
                                <Database size={12} />
                                {seeding ? 'Sincronizando...' : 'Restaurar Base de Datos Local'}
                            </button>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default NutritionTest;
