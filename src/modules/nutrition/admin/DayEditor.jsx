import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Search, Trash2, PieChart, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { NutritionDB } from '../services/nutritionDB';
import { calculateItemMacros, formatMacroDisplay, gramsToPortions } from '../services/portionService';

const DayEditor = ({ isOpen, onClose, initialDayId, onSave, availableDays }) => {
    // Editor State
    const [name, setName] = useState('');
    const [meals, setMeals] = useState([]); // [{ name, items: [] }]
    const [macroMode, setMacroMode] = useState('GRAMS'); // GRAMS | PORTIONS

    // Search State (for adding items)
    const [activeMealIndex, setActiveMealIndex] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]); // { type: 'food'|'recipe', data: ... }

    // Cache
    const [allFoods, setAllFoods] = useState([]);
    const [allRecipes, setAllRecipes] = useState([]);

    useEffect(() => {
        loadResources();
        if (initialDayId) {
            loadDay(initialDayId);
        } else {
            // New Day Template
            setName('');
            setMeals([
                { name: 'Desayuno', items: [] },
                { name: 'Almuerzo', items: [] },
                { name: 'Cena', items: [] }
            ]);
        }
    }, [initialDayId]);

    const loadResources = async () => {
        const [f, r] = await Promise.all([
            NutritionDB.foods.getAll(),
            NutritionDB.recipes.getAll()
        ]);
        setAllFoods(f);
        setAllRecipes(r);
    };

    const loadDay = async (id) => {
        // If it's a known day from the parent list, fine. 
        // Or we might need to fetch fresh if parents list is stale? 
        // Parent passes list, but let's trust we need to fetch detail if structure is complex?
        // Actually NutritionDB.days.getAll() returns full objects usually.
        // Let's look it up in availableDays or fetch if missing.
        let day = availableDays?.find(d => d.id === id);
        if (!day) {
            day = await NutritionDB.days.getById(id);
        }

        if (day) {
            setName(day.name);
            setMeals(day.meals || []);
        }
    };

    const handleSave = () => {
        if (!name) return alert('Nombre del día obligatorio');

        const payload = {
            name,
            meals
        };
        // Only include ID if we are editing
        if (initialDayId) {
            payload.id = initialDayId;
        }

        onSave(payload);
    };

    // --- Meal Management ---
    const addMeal = () => {
        setMeals([...meals, { name: 'Nueva Comida', items: [] }]);
    };

    const removeMeal = (idx) => {
        setMeals(meals.filter((_, i) => i !== idx));
    };

    const updateMealName = (idx, newName) => {
        const copy = [...meals];
        copy[idx].name = newName;
        setMeals(copy);
    };

    // --- Item Management ---
    const handleAddItemClick = (mealIdx) => {
        setActiveMealIndex(mealIdx);
        setSearchTerm('');
    };

    const addItemToMeal = (item, type) => {
        // item is Food or Recipe object
        // We structure the Item in the meal

        let newItem = {
            type, // 'food' | 'recipe'
            refId: item.id,
            name: item.name,
            quantity: type === 'food' ? (item.unit === 'unit' ? 1 : 100) : 1, // Recipe usually 1 serving
            unit: type === 'food' ? (item.unit || 'g') : 'ración'
        };

        const copy = [...meals];
        copy[activeMealIndex].items.push(newItem);
        setMeals(copy);
        setActiveMealIndex(null); // Close search
    };

    const removeItemFromMeal = (mealIdx, itemIdx) => {
        const copy = [...meals];
        copy[mealIdx].items.splice(itemIdx, 1);
        setMeals(copy);
    };

    const updateItemQty = (mealIdx, itemIdx, qty) => {
        const copy = [...meals];
        copy[mealIdx].items[itemIdx].quantity = Number(qty);
        setMeals(copy);
    };

    // --- Computation ---
    const calculateStats = () => {
        let total = { calories: 0, protein: 0, carbs: 0, fats: 0 };

        meals.forEach(meal => {
            meal.items.forEach(item => {
                if (item.type === 'food') {
                    const food = allFoods.find(f => f.id === item.refId);
                    if (food) {
                        const m = calculateItemMacros(food, item.quantity);
                        total.calories += m.calories;
                        total.protein += m.protein;
                        total.carbs += m.carbs;
                        total.fats += m.fat;
                    }
                } else if (item.type === 'recipe') {
                    const recipe = allRecipes.find(r => r.id === item.refId);
                    if (recipe && recipe.totalMacros) {
                        // Assumption: Recipe quantity is "servings" if scalable?
                        // For now assume quantity 1 = 1 full recipe as defined.
                        const ratio = item.quantity;
                        total.calories += (recipe.totalMacros.calories || 0) * ratio;
                        total.protein += (recipe.totalMacros.protein || 0) * ratio;
                        total.carbs += (recipe.totalMacros.carbs || 0) * ratio;
                        total.fats += (recipe.totalMacros.fats || 0) * ratio;
                    }
                }
            });
        });

        return total;
    };

    const stats = calculateStats();

    // --- Search Filtering ---
    const getFilteredResults = () => {
        if (!searchTerm) return [];
        const term = searchTerm.toLowerCase();

        const fResults = allFoods.filter(f => f.name.toLowerCase().includes(term))
            .map(f => ({ type: 'food', data: f }));

        const rResults = allRecipes.filter(r => r.name.toLowerCase().includes(term))
            .map(r => ({ type: 'recipe', data: r }));

        return [...rResults, ...fResults]; // Recipes first
    };

    const results = getFilteredResults();

    return (
        <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 w-full max-w-4xl bg-white shadow-2xl z-[120] flex flex-col h-full border-l border-slate-100"
        >
            {/* Header */}
            {/* Header */}
            <div className="p-6 border-b border-slate-100 bg-white z-10 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 leading-tight">Editor de Día Nutricional</h2>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">Configura las comidas y macros</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div className="bg-slate-100 p-1 rounded-xl flex text-[10px] font-black uppercase tracking-widest">
                        <button
                            onClick={() => setMacroMode('GRAMS')}
                            className={`px-3 py-1.5 rounded-lg transition-all ${macroMode === 'GRAMS' ? 'bg-white shadow text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Gramos
                        </button>
                        <button
                            onClick={() => setMacroMode('PORTIONS')}
                            className={`px-3 py-1.5 rounded-lg transition-all ${macroMode === 'PORTIONS' ? 'bg-white shadow text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Porciones
                        </button>
                    </div>

                    <div className="flex items-center gap-2 ml-auto md:ml-0">
                        <button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 whitespace-nowrap shadow-lg shadow-indigo-200">
                            <Save size={16} /> <span className="hidden sm:inline">Guardar</span>
                        </button>
                        <button onClick={onClose} className="p-2.5 bg-slate-50 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"><X size={20} /></button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto bg-slate-50/50 p-8 space-y-6">
                {/* Day Name */}
                <div className="bg-white p-6 rounded-[24px] shadow-sm border border-slate-100">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Nombre del Día</label>
                    <input
                        className="w-full text-xl font-black text-slate-900 border-b-2 border-slate-100 pb-2 focus:outline-none focus:border-slate-900 placeholder:text-slate-200"
                        placeholder="Ej: Día Alto en Carbos"
                        value={name}
                        onChange={e => setName(e.target.value)}
                    />
                </div>

                {/* Stats Summary - Sticky implementation optional but useful */}
                <div className="bg-slate-900 text-white p-6 rounded-[24px] shadow-lg flex justify-between items-center sticky top-0 z-20 mx-[-8px] md:mx-0 backdrop-blur-md bg-opacity-95">
                    <div className="flex items-center gap-4">
                        <PieChart className="text-indigo-400" />
                        <div>
                            <div className="text-xs font-black uppercase tracking-widest text-slate-400">Total Diario</div>
                            <div className="text-xl font-black">{Math.round(stats.calories)} kcal</div>
                        </div>
                    </div>

                    <div className="flex gap-4 sm:gap-6 text-center overflow-x-auto pb-1 md:pb-0">
                        <div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Proteína</div>
                            <div className="text-base sm:text-lg font-bold text-red-400 whitespace-nowrap">{formatMacroDisplay(stats.protein, 'PROTEIN', macroMode)}</div>
                        </div>
                        <div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Carbos</div>
                            <div className="text-base sm:text-lg font-bold text-blue-400 whitespace-nowrap">{formatMacroDisplay(stats.carbs, 'CARBS', macroMode)}</div>
                        </div>
                        <div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Grasa</div>
                            <div className="text-base sm:text-lg font-bold text-yellow-400 whitespace-nowrap">{formatMacroDisplay(stats.fats, 'FAT', macroMode)}</div>
                        </div>
                    </div>
                </div>

                {/* Meals */}
                <div className="space-y-6">
                    {meals.map((meal, mIdx) => (
                        <div key={mIdx} className="bg-white p-6 rounded-[24px] shadow-sm border border-slate-100 relative group/meal">
                            <div className="flex justify-between items-start mb-4">
                                <input
                                    className="font-black text-lg text-slate-900 border-b border-transparent hover:border-slate-100 focus:border-indigo-500 focus:outline-none max-w-[200px]"
                                    value={meal.name}
                                    onChange={e => updateMealName(mIdx, e.target.value)}
                                />
                                <div className="flex gap-2">
                                    <button onClick={() => handleAddItemClick(mIdx)} className="bg-slate-100 text-slate-600 hover:bg-slate-200 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1">
                                        <Plus size={14} /> Añadir Item
                                    </button>
                                    <button onClick={() => removeMeal(mIdx)} className="text-slate-300 hover:text-red-500 p-1.5">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Items List */}
                            <div className="space-y-2">
                                {meal.items.length === 0 && (
                                    <div className="text-center py-6 text-slate-300 text-sm italic border-2 border-dashed border-slate-100 rounded-xl">
                                        Sin alimentos añadidos
                                    </div>
                                )}
                                {meal.items.map((item, iIdx) => (
                                    <div key={iIdx} className="flex items-center justify-between p-3 bg-slate-50/50 rounded-xl hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            {item.type === 'recipe' && <UtensilsIcon size={14} className="text-indigo-500" />}
                                            <span className="font-bold text-slate-900 text-sm">{item.name}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="number"
                                                className={`w-16 bg-white border border-slate-200 rounded px-2 py-1 text-right font-bold text-sm focus:outline-none focus:border-indigo-500 ${item.type === 'recipe' ? 'text-indigo-600' : 'text-slate-700'}`}
                                                value={item.quantity}
                                                onChange={e => updateItemQty(mIdx, iIdx, e.target.value)}
                                            />
                                            <span className="text-xs font-bold text-slate-400 w-12 truncate">
                                                {item.unit}
                                            </span>
                                            <button onClick={() => removeItemFromMeal(mIdx, iIdx)} className="text-slate-300 hover:text-red-500 p-1">
                                                <X size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    <button onClick={addMeal} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-[24px] text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-all font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2">
                        <Plus size={16} /> Añadir Comida
                    </button>
                </div>
            </div>

            {/* Search Overlay (Nested) */}
            {activeMealIndex !== null && (
                <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-md flex flex-col p-8">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-black text-slate-900">Añadir a {meals[activeMealIndex].name}</h3>
                        <button onClick={() => setActiveMealIndex(null)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200"><X size={20} /></button>
                    </div>

                    <div className="relative mb-6">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            autoFocus
                            className="w-full pl-12 pr-6 py-4 bg-white border-2 border-slate-100 rounded-2xl shadow-xl shadow-slate-200/50 font-bold text-lg text-slate-900 focus:outline-none focus:border-indigo-500"
                            placeholder="Buscar alimentos o recetas..."
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2">
                        {searchTerm && results.length === 0 && (
                            <div className="text-center py-10 text-slate-400 font-medium">No hay resultados</div>
                        )}
                        {results.map((res, idx) => (
                            <button
                                key={`${res.type}-${res.data.id}`}
                                onClick={() => addItemToMeal(res.data, res.type)}
                                className="w-full text-left p-4 bg-white border border-slate-100 rounded-2xl hover:bg-indigo-50 hover:border-indigo-200 transition-all flex items-center justify-between group shadow-sm"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs ${res.type === 'recipe' ? 'bg-indigo-500' : 'bg-slate-400'}`}>
                                        {res.type === 'recipe' ? 'R' : 'A'}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-900">{res.data.name}</div>
                                        <div className="text-xs text-slate-400">
                                            {res.type === 'food'
                                                ? `${res.data.calories} kcal / 100${res.data.unit}`
                                                : `${Math.round(res.data.totalMacros?.calories)} kcal total`
                                            }
                                        </div>
                                    </div>
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 text-indigo-600 font-bold text-xs uppercase tracking-wider">
                                    Seleccionar
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </motion.div>
    );
};

const UtensilsIcon = (props) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24" height="24" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        {...props}
    >
        <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
        <path d="M7 2v20" />
        <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
    </svg>
);

export default DayEditor;
