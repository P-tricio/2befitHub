import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, CheckSquare, ChevronDown, ChevronUp, PieChart, Info, Scale, Zap, X, ShoppingBasket, Sparkles, Trash2, Utensils, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { NutritionDB } from '../services/nutritionDB';
import { calculateItemMacros, formatMacroDisplay, gramsToPortions, PORTION_CONSTANTS } from '../services/portionService';
import { GENERIC_INGREDIENT_IDS } from '../services/shoppingListService';
import { TrainingDB } from '../../training/services/db';
import ShoppingListView from './ShoppingListView';
import FoodSearch from '../components/FoodSearch';
import { format, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';

const NutritionDayView = ({ userId, date, dayId, taskId, onClose }) => { // dayId is the assigned plan day
    const [day, setDay] = useState(null);
    const [log, setLog] = useState(null); // { completedItems: { 'meal-item': true } }
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('GRAMS'); // GRAMS | PORTIONS
    const [stats, setStats] = useState({ notes: '', adherence: null }); // 'perfect', 'partial', 'missed'
    const [showShoppingList, setShowShoppingList] = useState(false);
    const [isGenericPlan, setIsGenericPlan] = useState(false);
    const [expandedRecipes, setExpandedRecipes] = useState({}); // { 'meal-item': true }

    // Expanded meals state
    const [expandedMeals, setExpandedMeals] = useState({});

    // User Extra Items (Manually added)
    // Structure: { mealIndex: number, item: Object }
    const [extraItems, setExtraItems] = useState([]);
    // State for Search
    const [activeMealIndex, setActiveMealIndex] = useState(null); // For adding items

    useEffect(() => {
        loadData();
    }, [dayId, date]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Fetch Day Plan
            let dayData = null;
            if (dayId) {
                dayData = await NutritionDB.days.getById(dayId);
            }

            // Fetch User Log
            const dateStr = typeof date === 'string' ? date : format(date, 'yyyy-MM-dd');

            const logData = await NutritionDB.logs.getDailyLog(userId, dateStr);


            setDay(dayData);

            // Scoping fix: If log exists but dayId has changed, it might be stale testing data
            if (!logData) {
                setLog({ userId, date, dayId, completedItems: {} });
            } else if (logData.dayId && dayId && logData.dayId !== dayId) {
                // If dayId exists and is different, it's definitely another plan.
                setLog({ userId, date, dayId, completedItems: {} });
            } else {
                setLog({ ...logData, dayId }); // Ensure current dayId is associated
            }

            // Load Extra Items if any
            if (logData && logData.extraItems) {

                setExtraItems(logData.extraItems);
            } else {
                setExtraItems([]);
            }

            // Check if it's a generic plan
            let foundReal = false;
            if (dayData && dayData.meals) {
                for (const meal of dayData.meals) {
                    if (meal.items) {
                        for (const item of meal.items) {
                            if (item.type === 'food') {
                                if (!GENERIC_INGREDIENT_IDS.includes(item.refId)) {
                                    foundReal = true;
                                    break;
                                }
                            } else if (item.type === 'recipe') {
                                foundReal = true;
                                break;
                            }
                        }
                    }
                    if (foundReal) break;
                }
            }
            setIsGenericPlan(!foundReal);

            if (dayData && dayData.meals) {
                const initialExpand = {};
                dayData.meals.forEach((_, i) => initialExpand[i] = true);
                setExpandedMeals(initialExpand);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const toggleItem = async (mealIdx, itemIdx, overrideKey = null) => {
        const key = overrideKey || `${mealIdx}-${itemIdx}`;
        const isCompleted = !!log.completedItems?.[key];
        const newStatus = !isCompleted;

        const newLog = {
            ...log,
            completedItems: {
                ...(log.completedItems || {}),
                [key]: newStatus
            }
        };
        if (!newStatus) delete newLog.completedItems[key];
        setLog(newLog);

        await NutritionDB.logs.updateMealStatus(userId, date, mealIdx, itemIdx, newStatus, overrideKey, dayId);
    };

    const toggleMealExpand = (idx) => {
        setExpandedMeals(prev => ({ ...prev, [idx]: !prev[idx] }));
    };

    const toggleMealComplete = async (mIdx) => {
        if (!day || !day.meals[mIdx]) return;
        const meal = day.meals[mIdx];

        let allInMealDone = true;
        meal.items?.forEach((_, iIdx) => {
            if (!log.completedItems[`${mIdx}-${iIdx}`]) allInMealDone = false;
        });

        const newStatus = !allInMealDone;
        const newCompletedItems = { ...log.completedItems };

        meal.items?.forEach((_, iIdx) => {
            const key = `${mIdx}-${iIdx}`;
            if (newStatus) newCompletedItems[key] = true;
            else delete newCompletedItems[key];
        });

        const newLog = { ...log, completedItems: newCompletedItems };
        setLog(newLog);
        await NutritionDB.logs.saveDailyLog(userId, date, newLog.completedItems, dayId, extraItems);
    };

    const toggleCompleteAll = async () => {
        if (!day) return;

        let allCompleted = true;
        day.meals?.forEach((meal, mIdx) => {
            meal.items?.forEach((item, iIdx) => {
                const key = `${mIdx}-${iIdx}`;
                if (!log.completedItems?.[key]) allCompleted = false;
            });
        });

        const newStatus = !allCompleted;
        const newCompletedItems = {};

        if (newStatus) {
            day.meals?.forEach((meal, mIdx) => {
                meal.items?.forEach((item, iIdx) => {
                    const key = `${mIdx}-${iIdx}`;
                    newCompletedItems[key] = true;
                });
            });
        }

        const newLog = { ...log, completedItems: newCompletedItems };
        setLog(newLog);
        await NutritionDB.logs.saveDailyLog(userId, date, newLog.completedItems, dayId, extraItems);
    };

    const handleFoodSelect = async (result) => {
        // For free mode (no plan), default to meal index 0
        const mealIdx = activeMealIndex !== null ? activeMealIndex : 0;

        // NEW: Batch support for AI parsing
        const results = Array.isArray(result) ? result : [result];

        const newItemsToAppend = results.map(res => {
            const { type, data, quantity, unit } = res;
            return {
                mealIndex: mealIdx,
                item: {
                    type: type === 'external' ? 'food' : type,
                    refId: data?.id || res.refId,
                    name: data?.name || res.name,
                    quantity: Number(quantity || res.quantity) || 1,
                    unit: unit || res.unit || 'g',
                    baseMacros: res.baseMacros || null,
                    cachedMacros: res.cachedMacros || (res.calories !== undefined ? {
                        calories: Math.round(res.calories || 0),
                        protein: Math.round(res.protein || 0),
                        carbs: Math.round(res.carbs || 0),
                        fats: Math.round(res.fats || 0),
                        fiber: Math.round(res.fiber || 0)
                    } : ((type === 'external' && data?.macros) ? data.macros : null)),
                    isUserAdded: true
                }
            };
        });

        const newExtraItems = [...extraItems, ...newItemsToAppend];
        setExtraItems(newExtraItems);
        setActiveMealIndex(null);

        await NutritionDB.logs.saveDailyLog(userId, date, log.completedItems, dayId, newExtraItems);
    };

    const handleRemoveExtraItem = async (index) => {
        const newExtraItems = [...extraItems];
        newExtraItems.splice(index, 1);

        const newLog = { ...log };
        const key = `extra-${index}`;
        if (newLog.completedItems && newLog.completedItems[key]) {
            delete newLog.completedItems[key];
            setLog(newLog);
        }

        setExtraItems(newExtraItems);
        await NutritionDB.logs.saveDailyLog(userId, date, newLog.completedItems, dayId, newExtraItems);
    };

    const handleCompleteDay = async () => {
        if (!taskId) {
            onClose();
            return;
        }

        try {
            const { t, c } = getStats();
            const isFreeMode = !day;
            const calTarget = isFreeMode ? c.calories : t.calories;
            const pct = calTarget > 0 ? Math.round((c.calories / calTarget) * 100) : 0;
            const summary = isFreeMode
                ? `${Math.round(c.calories)} kcal | P:${Math.round(c.protein)}g H:${Math.round(c.carbs)}g G:${Math.round(c.fats)}g`
                : `${Math.round(c.calories)}/${Math.round(t.calories)} kcal (${pct}%)`;

            const enrichedCompletedItems = {};
            if (log.completedItems && day?.meals) {
                Object.keys(log.completedItems).forEach(key => {
                    if (key.startsWith('extra-')) return;

                    const [mIdx, iIdx] = key.split('-').map(Number);
                    const meal = day.meals[mIdx];
                    const item = meal?.items?.[iIdx];
                    if (item) {
                        enrichedCompletedItems[key] = {
                            name: item.name,
                            quantity: item.quantity,
                            unit: item.unit,
                            completed: true
                        };
                    } else {
                        enrichedCompletedItems[key] = true;
                    }
                });
            }

            await TrainingDB.users.updateTaskInSchedule(userId, date, taskId, {
                status: 'completed',
                completedAt: new Date().toISOString(),
                summary: summary,
                results: {
                    consumed: c,
                    target: isFreeMode ? null : t,
                    notes: stats.notes,
                    adherence: isFreeMode ? 'free' : stats.adherence,
                    completedItems: enrichedCompletedItems,
                    extraItems: extraItems
                }
            });
            onClose();
        } catch (error) {
            console.error("Error completing nutrition day:", error);
        }
    };

    const [resources, setResources] = useState({ foods: [], recipes: [] });
    useEffect(() => {
        const fetchResources = async () => {
            const [f, r] = await Promise.all([
                NutritionDB.foods.getAll(),
                NutritionDB.recipes.getAll()
            ]);
            setResources({ foods: f, recipes: r });
        };
        fetchResources();
    }, []);

    const getStats = () => {
        let t = { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 }; // Target
        let c = { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 }; // Current (Consumed)

        if (!resources.foods.length && day) return { t, c };

        // 1. Calculate Plan Items
        if (day) {
            day.meals?.forEach((meal, mIdx) => {
                meal.items?.forEach((item, iIdx) => {
                    const key = `${mIdx}-${iIdx}`;
                    const isConsumed = !!log?.completedItems?.[key];

                    let m = { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 };

                    if (item.type === 'food') {
                        const food = resources.foods.find(f => f.id === item.refId);
                        m = calculateItemMacros(food, item.quantity, item.unit);
                    } else if (item.type === 'recipe') {
                        const recipe = resources.recipes.find(r => r.id === item.refId);
                        if (recipe && recipe.totalMacros) {
                            const ratio = item.quantity;
                            m = {
                                calories: (recipe.totalMacros.calories || 0) * ratio,
                                protein: (recipe.totalMacros.protein || 0) * ratio,
                                carbs: (recipe.totalMacros.carbs || 0) * ratio,
                                fats: (recipe.totalMacros.fats || 0) * ratio,
                                fiber: (recipe.totalMacros.fiber || 0) * ratio
                            };
                        }
                    }

                    t.calories += m.calories;
                    t.protein += m.protein;
                    t.carbs += m.carbs;
                    t.fats += m.fats;
                    t.fiber += m.fiber;

                    if (isConsumed) {
                        c.calories += m.calories;
                        c.protein += m.protein;
                        c.carbs += m.carbs;
                        c.fats += m.fats;
                        c.fiber += m.fiber;
                    }
                });
            });
        }

        // 2. Calculate Extra Items
        extraItems.forEach((entry, idx) => {
            const { item } = entry;
            const key = `extra-${idx}`;
            const isConsumed = !!log?.completedItems?.[key];

            let m = { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 };

            if (item.type === 'food') {
                const foodFromDb = item.refId ? resources.foods.find(f => f.id === item.refId) : null;

                if (foodFromDb) {
                    // Item matched with DB or manually selected from search
                    m = calculateItemMacros(foodFromDb, item.quantity, item.unit);
                } else if (item.baseMacros) {
                    // Item from AI Lab with normalized base calories/macros
                    m = calculateItemMacros(item.baseMacros, item.quantity, item.unit);
                } else if (item.cachedMacros) {
                    // Backwards compat for old AI lab items (non-scaling)
                    m = {
                        calories: item.cachedMacros.calories || 0,
                        protein: item.cachedMacros.protein || 0,
                        carbs: item.cachedMacros.carbs || 0,
                        fats: item.cachedMacros.fats || 0,
                        fiber: item.cachedMacros.fiber || 0
                    };
                }
            } else if (item.type === 'recipe') {
                const recipe = resources.recipes.find(r => r.id === item.refId);
                if (recipe && recipe.totalMacros) {
                    m = {
                        calories: recipe.totalMacros.calories || 0,
                        protein: recipe.totalMacros.protein || 0,
                        carbs: recipe.totalMacros.carbs || 0,
                        fats: recipe.totalMacros.fats || 0,
                        fiber: recipe.totalMacros.fiber || 0
                    };
                }
            }

            if (isConsumed) {
                c.calories += m.calories;
                c.protein += m.protein;
                c.carbs += m.carbs;
                c.fats += m.fats;
                c.fiber += m.fiber;
            }
        });

        if (t.fiber < 40) t.fiber = 40;
        return { t, c };
    };

    const { t, c } = getStats();

    if (loading) return <div className="fixed inset-0 z-[5000] bg-white flex items-center justify-center text-slate-400">Cargando nutrición...</div>;

    // Free mode: no plan assigned — show full tracker instead of empty state
    const isFreeMode = !day;

    if (isFreeMode && extraItems.length === 0 && activeMealIndex === null) {
        return createPortal(
            <div className="fixed inset-0 z-[5000] flex flex-col justify-end">
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                    onClick={onClose}
                />
                <motion.div
                    initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="relative w-full bg-white rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)] overflow-hidden flex flex-col p-8 pb-10"
                >
                    <button onClick={onClose} className="absolute top-5 right-5 p-2 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={18} />
                    </button>

                    <div className="text-center space-y-5">
                        <div className="w-20 h-20 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl flex items-center justify-center mx-auto text-indigo-500 shadow-lg shadow-indigo-500/10 border border-indigo-100">
                            <Utensils size={36} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900">Nutrición Libre</h3>
                            <p className="text-sm text-slate-500 font-medium mt-1">Registra lo que has comido hoy usando la búsqueda, el escáner o la IA.</p>
                        </div>
                        <button
                            onClick={() => setActiveMealIndex(0)}
                            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-200 hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                        >
                            <Plus size={20} />
                            Añadir Alimento
                        </button>
                    </div>
                </motion.div>

                {activeMealIndex !== null && (
                    <div className="absolute inset-0 z-[5010] bg-white flex flex-col animate-in fade-in zoom-in-95 duration-200 rounded-t-3xl overflow-hidden">
                        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-white">
                            <h3 className="text-lg font-black text-slate-900">Añadir Alimento</h3>
                            <button onClick={() => setActiveMealIndex(null)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-500"><X size={20} /></button>
                        </div>
                        <div className="flex-1 overflow-hidden flex flex-col">
                            <FoodSearch onSelect={handleFoodSelect} onClose={() => setActiveMealIndex(null)} />
                        </div>
                    </div>
                )}
            </div>,
            document.body
        );
    }

    const Ring = ({ current, total, color, label }) => {
        const radius = 36;
        const circumference = 2 * Math.PI * radius;
        const percent = Math.min(100, Math.max(0, (current / (total || 1)) * 100));
        const offset = circumference - (percent / 100) * circumference;

        return (
            <div className="flex flex-col items-center">
                <div className="relative w-24 h-24 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle cx="48" cy="48" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-100" />
                        <circle
                            cx="48" cy="48" r={radius}
                            stroke="currentColor" strokeWidth="6" fill="transparent"
                            strokeDasharray={circumference} strokeDashoffset={offset}
                            strokeLinecap="round"
                            className={`transition-all duration-1000 ease-out ${color}`}
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-900">
                        <span className="text-xl font-black">{viewMode === 'GRAMS' ? Math.round(current) : (current / (label === 'PROTEIN' ? 25 : (label === 'GRASA' ? 15 : 25))).toFixed(1)}</span>
                        <span className="text-[8px] text-slate-400 font-bold uppercase">{viewMode === 'GRAMS' ? 'g' : 'P'}</span>
                    </div>
                </div>
                <div className="mt-2 text-center">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label === 'PROTEIN' ? 'P' : label === 'CARBS' ? 'H' : 'G'}</div>
                    <div className="text-xs font-bold text-slate-500">
                        / {viewMode === 'GRAMS' ? Math.round(total) : (total / (label === 'PROTEIN' ? 25 : (label === 'GRASA' ? 15 : 25))).toFixed(1)}
                    </div>
                </div>
            </div>
        );
    };

    return createPortal(
        <div className="fixed inset-0 z-[5000] flex flex-col justify-end">
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                onClick={onClose}
            />

            <motion.div
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="relative w-full h-[95vh] bg-slate-50 rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)] overflow-hidden flex flex-col"
            >
                <div className="flex-1 overflow-y-auto relative bg-white pb-72">
                    <button onClick={onClose} className="absolute top-6 right-6 z-10 p-2 bg-white/80 backdrop-blur-md border border-slate-100 rounded-full shadow-sm text-slate-500 hover:text-slate-900 transition-colors">
                        <X size={20} />
                    </button>

                    <div className="bg-white text-slate-900 rounded-b-[32px] p-5 pt-6 shadow-xl shadow-slate-200/50 pb-8 relative overflow-hidden ring-1 ring-slate-100 z-0">
                        <div className="flex justify-between items-center mb-3">
                            <div>
                                <h1 className="text-xl font-black tracking-wide flex items-center gap-2">{isFreeMode ? 'NUTRICIÓN LIBRE' : 'PLAN DIARIO'}</h1>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{date}</p>
                            </div>
                        </div>

                        <div className="flex gap-2 mb-4">
                            <button onClick={toggleCompleteAll} className="bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border border-emerald-200 flex items-center gap-2 shadow-sm text-emerald-600 active:scale-95">
                                <CheckSquare size={12} /> <span>Marcar Todo</span>
                            </button>
                            {!isGenericPlan && (
                                <button onClick={() => setShowShoppingList(true)} className="bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border border-indigo-200 flex items-center gap-2 shadow-sm text-indigo-600 active:scale-95">
                                    <ShoppingBasket size={12} /> <span>Lista</span>
                                </button>
                            )}
                            <button onClick={() => setViewMode(prev => prev === 'GRAMS' ? 'PORTIONS' : 'GRAMS')} className="bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border border-slate-200 flex items-center gap-2 shadow-sm active:scale-95">
                                {viewMode === 'GRAMS' ? <><Scale size={12} className="text-indigo-500" /> <span>Porciones</span></> : <><PieChart size={12} className="text-indigo-500" /> <span>Gramos</span></>}
                            </button>
                        </div>

                        <div className="flex justify-between items-center gap-2 px-2 mb-4">
                            <Ring current={c.protein} total={t.protein} color="text-red-500" label="PROTEIN" />
                            <Ring current={c.carbs} total={t.carbs} color="text-amber-500" label="CARBS" />
                            <Ring current={c.fats} total={t.fats} color="text-yellow-300" label="GRASA" />
                        </div>

                        <div className="flex justify-center mb-1">
                            <div className="bg-slate-50/80 rounded-full pl-3 pr-4 py-1.5 flex items-center gap-3 border border-slate-100">
                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Fibra</span>
                                <div className="h-1.5 w-20 bg-slate-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(100, (c.fiber / t.fiber) * 100)}%` }}></div>
                                </div>
                                <span className="text-[10px] font-bold text-slate-600">{Math.round(c.fiber)} / {Math.round(t.fiber)}g</span>
                            </div>
                        </div>

                        <div className="mt-5 px-3">
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-1.5 text-slate-400">
                                <span>Calorías</span>
                                <span className="text-slate-900">{Math.round(c.calories)} / {Math.round(t.calories)} kcal</span>
                            </div>
                            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                                <motion.div
                                    initial={{ width: 0 }} animate={{ width: `${Math.min(100, (c.calories / t.calories) * 100)}%` }}
                                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="p-6 -mt-4 space-y-6 relative z-10">
                        {day && day.meals?.map((meal, mIdx) => (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: mIdx * 0.1 }} key={mIdx} className="bg-white rounded-[24px] shadow-lg shadow-slate-200/50 border border-slate-100 overflow-hidden">
                                <div onClick={() => toggleMealExpand(mIdx)} className="p-5 flex justify-between items-center cursor-pointer bg-white hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <h3 className="font-black text-lg text-slate-900">{meal.name}</h3>
                                        <button onClick={(e) => { e.stopPropagation(); toggleMealComplete(mIdx); }} className="p-1 px-2 bg-slate-100 hover:bg-emerald-500 hover:text-white rounded-lg text-[8px] font-black uppercase tracking-widest transition-all text-slate-400 border border-slate-200">Marcar Todo</button>
                                        <button onClick={(e) => { e.stopPropagation(); setActiveMealIndex(mIdx); }} className="p-1 px-2 bg-indigo-50 hover:bg-indigo-500 hover:text-white rounded-lg text-indigo-400 border border-indigo-100 transition-all"><Plus size={14} /></button>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {expandedMeals[mIdx] ? <ChevronUp size={20} className="text-slate-300" /> : <ChevronDown size={20} className="text-slate-300" />}
                                    </div>
                                </div>

                                <AnimatePresence>
                                    {expandedMeals[mIdx] && (
                                        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="border-t border-slate-50">
                                            {meal.items?.map((item, iIdx) => {
                                                const key = `${mIdx}-${iIdx}`;
                                                const isChecked = !!log?.completedItems?.[key];
                                                const isExpanded = !!expandedRecipes[key];
                                                const recipe = item.type === 'recipe' ? resources.recipes.find(r => r.id === item.refId) : null;

                                                return (
                                                    <div key={iIdx} className="border-b border-slate-50 last:border-0">
                                                        <div onClick={() => toggleItem(mIdx, iIdx)} className={`p-4 flex items-center gap-4 cursor-pointer transition-all ${isChecked ? 'bg-slate-50/50 opacity-40' : 'bg-white hover:bg-indigo-50/30'}`}>
                                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${isChecked ? 'bg-indigo-600 border-indigo-600' : 'border-slate-200'}`}>{isChecked && <Check size={14} className="text-white" />}</div>
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2">
                                                                    <div className={`font-bold text-sm ${isChecked ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{item.name}</div>
                                                                    {recipe && <button onClick={(e) => { e.stopPropagation(); setExpandedRecipes(prev => ({ ...prev, [key]: !prev[key] })); }} className={`p-1 rounded-lg border transition-all ${isExpanded ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-slate-50 border-slate-100 text-slate-400'}`}><Info size={18} /></button>}
                                                                </div>
                                                                <div className="text-xs text-slate-400 font-medium">{item.quantity} {item.unit}{item.type === 'recipe' && <span className="ml-2 text-[8px] font-black uppercase text-indigo-400 tracking-widest border border-indigo-100 px-1 rounded">Receta</span>}</div>
                                                            </div>
                                                        </div>
                                                        <AnimatePresence>
                                                            {isExpanded && recipe && (
                                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-14 pb-4 bg-slate-50 overflow-hidden">
                                                                    {recipe.ingredients && <div className="mb-3 pt-2"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Ingredientes:</p><ul className="space-y-1">{recipe.ingredients.map((ing, k) => (<li key={k} className="text-xs text-slate-600 flex justify-between"><span>• {ing.name}</span><span className="font-bold text-slate-400">{ing.quantity || ing.amount} {ing.unit}</span></li>))}</ul></div>}
                                                                    {recipe.instructions && <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Preparación:</p><p className="text-xs text-slate-500 leading-relaxed whitespace-pre-line italic">{recipe.instructions}</p></div>}
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                );
                                            })}

                                            {extraItems.filter(e => e.mealIndex === mIdx).map((entry, idx) => {
                                                const globalIdx = extraItems.indexOf(entry);
                                                const key = `extra-${globalIdx}`;
                                                const item = entry.item;
                                                const isChecked = !!log?.completedItems?.[key];

                                                return (
                                                    <div key={`extra-${idx}`} className="border-b border-slate-50 last:border-0 bg-indigo-50/20">
                                                        <div onClick={() => toggleItem(null, null, key)} className={`p-4 flex items-center gap-4 cursor-pointer transition-all ${isChecked ? 'bg-slate-50/50 opacity-40' : 'hover:bg-indigo-50/40'}`}>
                                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${isChecked ? 'bg-indigo-600 border-indigo-600' : 'border-indigo-200 bg-white'}`}>{isChecked && <Check size={14} className="text-white" />}</div>
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2">
                                                                    <div className={`font-bold text-sm ${isChecked ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{item.name}</div>
                                                                    <span className="text-[8px] font-black uppercase bg-indigo-100 text-indigo-500 px-1.5 py-0.5 rounded tracking-wider">Extra</span>
                                                                </div>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <div className="text-xs text-slate-400 font-medium whitespace-nowrap">{item.quantity} {item.unit}</div>
                                                                    {item.cachedMacros && (
                                                                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100/50 rounded-md text-[8px] font-bold text-slate-500 overflow-x-auto custom-scrollbar-hide">
                                                                            <span className="text-indigo-600">{Math.round(item.cachedMacros.calories || 0)} kcal</span>
                                                                            <span className="opacity-30">•</span>
                                                                            <span>P:{Math.round(item.cachedMacros.protein || 0)}g</span>
                                                                            <span className="opacity-30">•</span>
                                                                            <span>H:{Math.round(item.cachedMacros.carbs || 0)}g</span>
                                                                            <span className="opacity-30">•</span>
                                                                            <span>G:{Math.round(item.cachedMacros.fats || 0)}g</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <button onClick={(e) => { e.stopPropagation(); handleRemoveExtraItem(globalIdx); }} className="text-rose-400 hover:text-rose-600 p-2"><X size={14} /></button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        ))}

                        {!day && extraItems.length > 0 && (
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[24px] shadow-lg shadow-indigo-100 border-2 border-indigo-50 overflow-hidden">
                                <div className="p-5 flex items-center justify-between bg-indigo-50/30 border-b border-indigo-50">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-md"><Sparkles size={18} /></div>
                                        <div>
                                            <h3 className="font-black text-lg text-slate-900 leading-tight">Alimentos Registrados</h3>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Nutrición libre</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setActiveMealIndex(0)}
                                        className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-md hover:bg-indigo-700 active:scale-95 transition-all"
                                    >
                                        <Plus size={18} />
                                    </button>
                                </div>
                                <div className="divide-y divide-slate-50">
                                    {extraItems.map((entry, idx) => {
                                        const key = `extra-${idx}`;
                                        const item = entry.item;
                                        const isChecked = !!log?.completedItems?.[key];

                                        return (
                                            <div key={key} className="bg-white">
                                                <div onClick={() => toggleItem(null, null, key)} className={`p-5 flex items-center gap-4 cursor-pointer transition-all ${isChecked ? 'bg-slate-50/50 opacity-40' : 'hover:bg-indigo-50/20'}`}>
                                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${isChecked ? 'bg-indigo-600 border-indigo-600' : 'border-indigo-200 bg-white shadow-sm'}`}>{isChecked && <Check size={14} className="text-white" />}</div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2"><div className={`font-bold text-sm ${isChecked ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{item.name}</div></div>
                                                        <div className="flex flex-wrap items-center gap-2 mt-1">
                                                            <div className="text-xs text-slate-400 font-medium whitespace-nowrap">{item.quantity} <span className="text-indigo-400">{item.unit}</span></div>
                                                            {(() => {
                                                                const displayMacros = item.cachedMacros || (item.baseMacros ? calculateItemMacros(item.baseMacros, item.quantity, item.unit) : null);
                                                                if (!displayMacros) return null;
                                                                return (
                                                                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100/50 rounded-md text-[8px] font-bold text-slate-500 overflow-x-auto custom-scrollbar-hide">
                                                                        <span className="text-indigo-600">{Math.round(displayMacros.calories || 0)} kcal</span>
                                                                        <span className="opacity-30">•</span>
                                                                        <span>P:{Math.round(displayMacros.protein || 0)}g</span>
                                                                        <span className="opacity-30">•</span>
                                                                        <span>H:{Math.round(displayMacros.carbs || 0)}g</span>
                                                                        <span className="opacity-30">•</span>
                                                                        <span>G:{Math.round(displayMacros.fats || 0)}g</span>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    </div>
                                                    <button onClick={(e) => { e.stopPropagation(); handleRemoveExtraItem(idx); }} className="p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={16} /></button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {onClose && (
                        <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-slate-100 z-50 flex flex-col gap-3">
                            <div className="max-w-md mx-auto w-full space-y-3">
                                {taskId && !isFreeMode && (
                                    <>
                                        <div className="space-y-3 mb-2">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">¿Qué tal lo has llevado?</p>
                                            <div className="grid grid-cols-3 gap-2">
                                                <button onClick={() => setStats(s => ({ ...s, adherence: 'perfect' }))} className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${stats.adherence === 'perfect' ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-200 text-slate-400 hover:border-emerald-200 hover:text-emerald-500'}`}><Zap size={20} /><span className="text-[9px] font-black uppercase">Clavado</span></button>
                                                <button onClick={() => setStats(s => ({ ...s, adherence: 'partial' }))} className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${stats.adherence === 'partial' ? 'bg-amber-500 border-amber-500 text-white' : 'bg-white border-slate-200 text-slate-400 hover:border-amber-200 hover:text-amber-500'}`}><Scale size={20} /><span className="text-[9px] font-black uppercase">A medias</span></button>
                                                <button onClick={() => setStats(s => ({ ...s, adherence: 'missed' }))} className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${stats.adherence === 'missed' ? 'bg-rose-500 border-rose-500 text-white' : 'bg-white border-slate-200 text-slate-400 hover:border-rose-200 hover:text-rose-500'}`}><X size={20} /><span className="text-[9px] font-black uppercase">No seguido</span></button>
                                            </div>
                                            <input type="text" value={stats.notes} onChange={e => setStats(s => ({ ...s, notes: e.target.value }))} placeholder="Notas sobre el día (opcional)..." className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100" />
                                        </div>

                                        <div className="flex gap-2">
                                            <button onClick={onClose} className="flex-1 bg-slate-100 text-slate-500 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Cerrar</button>
                                            <button onClick={handleCompleteDay} disabled={!stats.adherence} className="flex-[2] bg-slate-900 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"><Check size={16} className="text-emerald-400" />Finalizar</button>
                                        </div>
                                    </>
                                )}
                                {taskId && isFreeMode && (
                                    <>
                                        <input type="text" value={stats.notes} onChange={e => setStats(s => ({ ...s, notes: e.target.value }))} placeholder="Notas sobre tu alimentación (opcional)..." className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100" />
                                        <div className="flex gap-2">
                                            <button onClick={onClose} className="flex-1 bg-slate-100 text-slate-500 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Cerrar</button>
                                            <button onClick={handleCompleteDay} disabled={extraItems.length === 0} className="flex-[2] bg-indigo-600 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"><Check size={16} className="text-indigo-300" />Guardar Registro</button>
                                        </div>
                                    </>
                                )}
                                {!taskId && (
                                    <button onClick={onClose} className="w-full bg-slate-100 text-slate-500 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Cerrar</button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>

            <AnimatePresence>
                {showShoppingList && dayId && <ShoppingListView dayIds={[dayId]} onClose={() => setShowShoppingList(false)} />}
            </AnimatePresence>

            {activeMealIndex !== null && (
                <div className="absolute inset-0 z-[5010] bg-white flex flex-col animate-in fade-in zoom-in-95 duration-200 rounded-t-3xl overflow-hidden">
                    <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-white">
                        <h3 className="text-lg font-black text-slate-900">Añadir a {day?.meals?.[activeMealIndex]?.name || 'Registro'}</h3>
                        <button onClick={() => setActiveMealIndex(null)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-500"><X size={20} /></button>
                    </div>
                    <div className="flex-1 overflow-hidden flex flex-col">
                        <FoodSearch onSelect={handleFoodSelect} onClose={() => setActiveMealIndex(null)} />
                    </div>
                </div>
            )}
        </div>,
        document.body
    );
};

export default NutritionDayView;
