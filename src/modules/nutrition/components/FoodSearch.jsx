import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Flame, Wheat, Drumstick, Droplets, Utensils, Database, Globe, Filter, X, ScanBarcode, Camera, ArrowLeft, Plus } from 'lucide-react';
import BarcodeScannerComponent from 'react-qr-barcode-scanner';
import { searchProductsOFF, getProductByBarcode } from '../../../services/openFoodFactsService';
import { searchLocalIngredients, searchLocalRecipes } from '../../../services/nutritionDBService';

const FoodSearch = ({ onSelect, onClose }) => {
    const [query, setQuery] = useState('');
    const [offProducts, setOffProducts] = useState([]);
    const [localResults, setLocalResults] = useState({ ingredients: [], recipes: [] });

    // Staging State for Quantity/Unit Selection
    const [selectedItem, setSelectedItem] = useState(null);
    const [quantity, setQuantity] = useState(100);
    const [unit, setUnit] = useState('g');

    // Filters State
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        nutriscore: '',
        category: ''
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [seeding, setSeeding] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [searchTerm, setSearchTerm] = useState(''); // Actual search term executed

    // Scanner State
    const [showScanner, setShowScanner] = useState(false);
    const scanningLock = useRef(false);

    // Reset lock when scanner opens
    useEffect(() => {
        if (showScanner) {
            scanningLock.current = false;
        }
    }, [showScanner]);

    // Debounce Search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (query && query.trim().length > 2) {
                handleSearch(null, query);
            } else if (!query) {
                setHasSearched(false);
                setLocalResults({ ingredients: [], recipes: [] });
                setOffProducts([]);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [query, filters]);

    const handleSearch = async (e, overrideQuery = null) => {
        if (e && e.preventDefault) e.preventDefault();

        const searchQuery = overrideQuery || query;

        if (!searchQuery || !searchQuery.trim()) return;

        setLoading(true);
        setError(null);
        setHasSearched(true);
        setSearchTerm(searchQuery);
        setOffProducts([]);
        setLocalResults({ ingredients: [], recipes: [] });

        try {
            // DETECT BARCODE: If query is numeric and long enough (EAN-8/13)
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
                    try {
                        const data = await searchProductsOFF(searchQuery, filters);
                        setOffProducts(data);
                    } catch (apiErr) {
                        console.warn('OFF API failed, but continuing with local results', apiErr);
                    }
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
            const { seedNutritionDB } = await import('../../../services/nutritionDBService');
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
        if (result && !scanningLock.current) {
            scanningLock.current = true; // Lock immediately
            const code = result.text;
            setQuery(code);
            setShowScanner(false);
            if (navigator.vibrate) navigator.vibrate(200);

            // Trigger search immediately
            handleSearch(null, code);
        }
    };

    const handleSelectItem = (item, type) => {
        let normalizedItem;

        if (type === 'external') {
            // Standardize External Product
            normalizedItem = {
                type: 'external',
                data: {
                    id: item.id || item.code, // Barcode as ID
                    name: item.label || item.product_name,
                    brand: item.brand,
                    macros: { // Normalized snapshot
                        calories: item.nutrition.energy || 0,
                        protein: item.nutrition.protein || 0,
                        carbs: item.nutrition.carbs || 0,
                        fats: item.nutrition.fat || 0,
                        fiber: item.nutrition.fiber || 0,
                    },
                    image: item.image,
                    unit: 'g' // Default unit for OFF items
                }
            };
        } else if (type === 'food') {
            normalizedItem = {
                type: 'food',
                data: item
            };
        } else if (type === 'recipe') {
            // Recipes don't usually need quantity selector in the same way (usually 1 serving), 
            // but let's allow scaling if needed or just pass through for now.
            // For now, let's treat recipes as "1 unit" default but allow editing if we want scaling later.
            // Actually user request implies seeing macros change.
            normalizedItem = {
                type: 'recipe',
                data: item
            };
        }

        // Set Staging
        setSelectedItem(normalizedItem);
        // Default quantity
        const isPortion = normalizedItem.data.unit === 'unit' || normalizedItem.data.unit === 'unidad' || normalizedItem.data.unit === 'porción';
        setQuantity(isPortion ? 1 : 100);
        setUnit(normalizedItem.data.unit || 'g');
    };

    const handleConfirmAdd = () => {
        if (!onSelect || !selectedItem) return;

        onSelect({
            ...selectedItem,
            quantity: Number(quantity),
            unit: unit
        });

        // Reset
        setSelectedItem(null);
        setQuery('');
        setOffProducts([]);
        setLocalResults({ ingredients: [], recipes: [] });
    };

    // Helper for Macro Preview
    const getPreviewMacros = () => {
        if (!selectedItem) return { calories: 0, protein: 0, carbs: 0, fats: 0 };

        if (selectedItem.type === 'recipe') {
            // Simple scaling for recipes if they have totalMacros
            const base = selectedItem.data.totalMacros || { calories: 0, protein: 0, carbs: 0, fats: 0 };
            const ratio = quantity; // Assuming quantity is servings for recipes
            return {
                calories: base.calories * ratio,
                protein: base.protein * ratio,
                carbs: base.carbs * ratio,
                fats: base.fats * ratio,
                fiber: (base.fiber || 0) * ratio
            };
        }

        // Foods / External
        // We need calculateItemMacros. 
        // We can import it or duplicate simple logic here. 
        // Let's use a simple calculation here to avoid complex imports if possible, 
        // OR better: use the one from portionService. 
        // Since I cannot import easily in this replace block without changing top of file, 
        // I'll add the import in a separate block or verify if I can do it here.
        // Wait, I can't easily add import at top with this tool if I'm editing the middle.
        // I will implement a safe helper here or use the one if I added import.
        // I will add import in a separate call. For now, I'll assume it's available or implement simple one.

        let foodData = selectedItem.data;
        if (selectedItem.type === 'external') {
            foodData = { ...selectedItem.data.macros, unit: 'g' };
        }

        // Simple calc logic to mimic portionService just for display if import fails
        // But I should try to use the service. I'll add the import in next step.
        // For now, let's return a placeholder or try to use a locally defined calc.

        // Re-implementing simplified logic for preview:
        const isPortionBased = unit === 'unit' || unit === 'unidad' || unit === 'porción';
        const ratio = isPortionBased ? quantity : (quantity / 100);

        const p = (foodData.protein || foodData.macros?.protein || 0) * ratio;
        const c = (foodData.carbs || foodData.macros?.carbs || 0) * ratio;
        const f = (foodData.fats || foodData.macros?.fat || 0) * ratio;
        const fib = (foodData.fiber || 0) * ratio;

        return {
            calories: (p * 4) + (c * 4) + (f * 9),
            protein: p,
            carbs: c,
            fats: f,
            fiber: fib
        };
    };

    const previewMacros = getPreviewMacros();

    return (
        <div className="flex flex-col h-full bg-slate-50/50 relative">
            {selectedItem ? (
                <div className="flex-1 flex flex-col bg-white animate-in slide-in-from-right duration-200">
                    {/* Staging Header */}
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                        <button
                            onClick={() => setSelectedItem(null)}
                            className="p-2 -ml-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <h3 className="font-black text-slate-800 text-lg">Confirmar Cantidad</h3>
                        <div className="w-8"></div> {/* Spacer */}
                    </div>

                    <div className="flex-1 p-6 flex flex-col items-center overflow-y-auto">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-black text-slate-900 mb-2">{selectedItem.data.name}</h2>
                            <p className="text-slate-400 font-bold text-sm uppercase tracking-wider">{selectedItem.data.brand || 'Alimento'}</p>
                        </div>

                        {/* Quantity Input */}
                        <div className="flex items-end gap-3 mb-10">
                            <input
                                type="number"
                                value={quantity}
                                onChange={(e) => setQuantity(Number(e.target.value))}
                                className="text-5xl font-black text-center w-36 border-b-2 border-slate-200 focus:border-indigo-500 focus:outline-none bg-transparent pb-2 text-slate-800 placeholder-slate-200"
                                autoFocus
                            />
                            <select
                                value={unit}
                                onChange={(e) => setUnit(e.target.value)}
                                className="text-xl font-bold text-slate-400 bg-transparent border-none focus:outline-none mb-4 cursor-pointer"
                            >
                                <option value="g">g</option>
                                <option value="ml">ml</option>
                                <option value="unidad">unidad</option>
                                <option value="porción">porción</option>
                                <option value="oz">oz</option>
                            </select>
                        </div>

                        {/* Macro Preview Cards */}
                        <div className="grid grid-cols-4 gap-3 w-full max-w-sm mb-8">
                            <div className="bg-slate-50 rounded-2xl p-3 text-center border border-slate-100">
                                <div className="text-[10px] font-black uppercase text-slate-400 mb-1">Kcal</div>
                                <div className="text-lg font-black text-slate-800">{Math.round(previewMacros.calories)}</div>
                            </div>
                            <div className="bg-red-50 rounded-2xl p-3 text-center border border-red-100">
                                <div className="text-[10px] font-black uppercase text-red-400 mb-1">Prot</div>
                                <div className="text-lg font-black text-red-600">{Math.round(previewMacros.protein)}</div>
                            </div>
                            <div className="bg-amber-50 rounded-2xl p-3 text-center border border-amber-100">
                                <div className="text-[10px] font-black uppercase text-amber-400 mb-1">Carb</div>
                                <div className="text-lg font-black text-amber-600">{Math.round(previewMacros.carbs)}</div>
                            </div>
                            <div className="bg-yellow-50 rounded-2xl p-3 text-center border border-yellow-100">
                                <div className="text-[10px] font-black uppercase text-yellow-500 mb-1">Grasa</div>
                                <div className="text-lg font-black text-yellow-600">{Math.round(previewMacros.fats)}</div>
                            </div>
                        </div>
                    </div>

                    {/* Action Button */}
                    <div className="p-4 border-t border-slate-100 bg-white">
                        <button
                            onClick={handleConfirmAdd}
                            disabled={!quantity || quantity <= 0}
                            className="w-full bg-slate-900 text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-slate-200 hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <Plus size={20} />
                            Añadir al Diario
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    {/* Search Bar & Filters */}
                    <div className="p-4 bg-white border-b border-slate-100 z-10 sticky top-0">
                        <form onSubmit={handleSearch} className="relative group mb-2">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                            </div>
                            <input
                                type="text"
                                className="block w-full pl-11 pr-32 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-sm"
                                placeholder="Busca alimentos o escanea..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                autoFocus
                            />
                            <div className="absolute inset-y-1 right-1 flex items-center gap-1">
                                {/* Scanner Button */}
                                <button
                                    type="button"
                                    onClick={() => setShowScanner(true)}
                                    className="p-2 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-slate-100 transition-colors"
                                    title="Escanear Código de Barras"
                                >
                                    <ScanBarcode size={20} />
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setShowFilters(!showFilters)}
                                    className={`p-2 rounded-lg transition-colors ${showFilters || filters.nutriscore || filters.category ? 'bg-emerald-50 text-emerald-500' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <Filter size={18} />
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg transition-colors flex items-center gap-2 text-sm"
                                >
                                    {loading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Buscar'}
                                </button>
                            </div>
                        </form>

                        {/* Collapsible Filters */}
                        {showFilters && (
                            <div className="mb-4 pt-2 animate-in slide-in-from-top-2 duration-200 border-t border-slate-50 mt-2">
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Filtros Avanzados</h3>
                                    {(filters.nutriscore || filters.category) && (
                                        <button onClick={clearFilters} className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 font-bold">
                                            <X size={12} /> Limpiar filtros
                                        </button>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {/* NutriScore */}
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Nutri-Score</label>
                                        <div className="flex gap-1.5">
                                            {['A', 'B', 'C', 'D', 'E'].map((score) => (
                                                <button
                                                    key={score}
                                                    type="button"
                                                    onClick={() => setFilters(prev => ({ ...prev, nutriscore: prev.nutriscore === score.toLowerCase() ? '' : score.toLowerCase() }))}
                                                    className={`flex-1 h-8 rounded-md font-black text-sm transition-all border-2 ${filters.nutriscore === score.toLowerCase()
                                                        ? 'border-slate-800 scale-105 shadow-sm'
                                                        : 'border-transparent opacity-60 hover:opacity-100 hover:scale-105'
                                                        }`}
                                                    style={{
                                                        backgroundColor:
                                                            score === 'A' ? '#038141' :
                                                                score === 'B' ? '#85BB2F' :
                                                                    score === 'C' ? '#FECB02' :
                                                                        score === 'D' ? '#EE8100' : '#E63E11',
                                                        color: score === 'C' ? 'black' : 'white'
                                                    }}
                                                >
                                                    {score}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Categories */}
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Categoría</label>
                                        <select
                                            value={filters.category}
                                            onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                                        >
                                            <option value="">Todas</option>
                                            <option value="snack">Snacks</option>
                                            <option value="dairy">Lácteos</option>
                                            <option value="meat">Carnes</option>
                                            <option value="cereal">Cereales</option>
                                            <option value="beverage">Bebidas</option>
                                            <option value="plant-based">Vegano</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-50 text-red-500 px-4 py-2 rounded-lg text-xs font-bold text-center border border-red-100 mt-2">
                                {error}
                            </div>
                        )}
                    </div>

                    {/* Results List */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-6">

                        {/* No Results State */}
                        {!loading && !error && hasSearched && localResults.ingredients.length === 0 && localResults.recipes.length === 0 && offProducts.length === 0 && (
                            <div className="text-center py-10 text-slate-400">
                                <Search size={32} className="mx-auto mb-3 text-slate-300" />
                                <p className="font-medium text-sm">No se encontraron resultados para "{searchTerm}"</p>
                                <button onClick={handleSeed} className="mt-4 text-emerald-500 hover:text-emerald-600 text-xs font-bold uppercase tracking-wider flex items-center gap-1 mx-auto">
                                    <Database size={12} />
                                    Restaurar Base de Datos Local
                                </button>
                            </div>
                        )}

                        {/* 1. LOCAL RESULTS */}
                        {(localResults.ingredients.length > 0 || localResults.recipes.length > 0) && (
                            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                                    <Utensils size={14} />
                                    Resultados Locales
                                </h3>

                                {localResults.ingredients.map((ing) => (
                                    <button
                                        key={`ing-${ing.id}`}
                                        onClick={() => handleSelectItem(ing, 'food')}
                                        className="w-full text-left bg-white p-3 rounded-xl border border-slate-100 hover:border-amber-200 hover:shadow-md transition-all group flex items-center justify-between"
                                    >
                                        <div>
                                            <div className="font-bold text-slate-800 text-sm group-hover:text-amber-600 transition-colors">{ing.name}</div>
                                            <div className="flex gap-2 text-[10px] font-bold text-slate-400 mt-1">
                                                <span className="flex items-center gap-0.5"><Flame size={10} className="text-orange-400" /> {Math.round(ing.calories)} kcal</span>
                                                <span className="flex items-center gap-0.5"><Drumstick size={10} className="text-blue-400" /> P: {ing.protein}g</span>
                                                <span className="flex items-center gap-0.5"><Wheat size={10} className="text-yellow-400" /> C: {ing.carbs}g</span>
                                                <span className="flex items-center gap-0.5"><Droplets size={10} className="text-purple-400" /> G: {ing.fats}g</span>
                                            </div>
                                        </div>
                                        <div className="bg-amber-50 text-amber-500 text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wider">
                                            Local
                                        </div>
                                    </button>
                                ))}

                                {localResults.recipes.map((rec) => (
                                    <button
                                        key={`rec-${rec.id}`}
                                        onClick={() => handleSelectItem(rec, 'recipe')}
                                        className="w-full text-left bg-white p-3 rounded-xl border border-slate-100 hover:border-emerald-200 hover:shadow-md transition-all group flex items-center justify-between"
                                    >
                                        <div>
                                            <div className="font-bold text-slate-800 text-sm group-hover:text-emerald-600 transition-colors">{rec.name}</div>
                                            <div className="flex gap-2 text-[10px] font-bold text-slate-400 mt-1">
                                                <span className="flex items-center gap-0.5"><Flame size={10} className="text-orange-400" /> {Math.round(rec.totalMacros.calories)} kcal</span>
                                                <span className="flex items-center gap-0.5"><Utensils size={10} className="text-emerald-400" /> Receta Completa</span>
                                            </div>
                                        </div>
                                        <div className="bg-emerald-50 text-emerald-500 text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wider">
                                            Receta
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* 2. EXTERNAL RESULTS */}
                        {offProducts.length > 0 && (
                            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300 delay-75">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2 pt-4 border-t border-slate-100">
                                    <Globe size={14} />
                                    Resultados Externos (OpenFoodFacts)
                                </h3>

                                {offProducts.map((product, index) => (
                                    <button
                                        key={`off-${index}`}
                                        onClick={() => handleSelectItem(product, 'external')}
                                        className="w-full text-left bg-white p-3 rounded-xl border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all group flex items-center gap-3 relative overflow-hidden"
                                    >
                                        <div className="w-12 h-12 bg-slate-50 rounded-lg flex-shrink-0 flex items-center justify-center p-1 border border-slate-100">
                                            {product.image ? (
                                                <img src={product.image} alt={product.label} className="w-full h-full object-contain" />
                                            ) : (
                                                <Database size={16} className="text-slate-300" />
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-slate-800 text-sm truncate pr-8 group-hover:text-blue-600 transition-colors">{product.label}</div>
                                            <div className="text-[10px] font-bold text-slate-400 truncate">{product.brand}</div>
                                            <div className="flex gap-2 text-[10px] font-bold text-slate-500 mt-1">
                                                <span className="text-slate-600">{Math.round(product.nutrition.energy)} kcal</span>
                                                <span className="text-slate-400">|</span>
                                                <span className="text-red-400">P:{Math.round(product.nutrition.protein)}</span>
                                                <span className="text-orange-400">C:{Math.round(product.nutrition.carbs)}</span>
                                                <span className="text-amber-400">G:{Math.round(product.nutrition.fat)}</span>
                                            </div>
                                        </div>

                                        {product.nutriscore && (
                                            <div className={`absolute top-0 right-0 px-2 py-1 rounded-bl-xl text-[10px] font-black uppercase text-white
                                        ${product.nutriscore === 'a' ? 'bg-[#038141]' :
                                                    product.nutriscore === 'b' ? 'bg-[#85BB2F]' :
                                                        product.nutriscore === 'c' ? 'bg-[#FECB02] text-black' :
                                                            product.nutriscore === 'd' ? 'bg-[#EE8100]' : 'bg-[#E63E11]'
                                                }`}>
                                                {product.nutriscore.toUpperCase()}
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Scanner Modal */}
            {showScanner && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-md overflow-hidden shadow-2xl relative flex flex-col">
                        <div className="p-4 flex justify-between items-center border-b border-slate-800 bg-slate-900 z-10">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <Camera size={20} className="text-emerald-400" /> Escanear Producto
                            </h3>
                            <button onClick={() => setShowScanner(false)} className="text-slate-400 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="aspect-[4/3] bg-black relative overflow-hidden">
                            <BarcodeScannerComponent
                                width="100%"
                                height="100%"
                                onUpdate={handleScan}
                                facingMode="environment"
                                stopStream={!showScanner}
                            />
                            {/* Overlay guide */}
                            <div className="absolute inset-0 border-2 border-emerald-500/50 m-8 rounded-lg pointer-events-none flex items-center justify-center">
                                <div className="w-full h-0.5 bg-red-500/50"></div>
                            </div>
                        </div>
                        <div className="p-4 text-center text-sm text-slate-400 bg-slate-900">
                            Apunta la cámara al código de barras.
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FoodSearch;
