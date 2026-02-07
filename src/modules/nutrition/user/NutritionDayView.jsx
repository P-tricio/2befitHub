import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, CheckSquare, ChevronDown, ChevronUp, PieChart, Info, Scale, Zap, X, ShoppingBasket } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { NutritionDB } from '../services/nutritionDB';
import { calculateItemMacros, formatMacroDisplay, gramsToPortions, PORTION_CONSTANTS } from '../services/portionService';
import { GENERIC_INGREDIENT_IDS } from '../services/shoppingListService';
import { TrainingDB } from '../../training/services/db';
import ShoppingListView from './ShoppingListView';

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
            const logData = await NutritionDB.logs.getDailyLog(userId, date);

            setDay(dayData);

            // Scoping fix: If log exists but dayId has changed, it might be stale testing data
            // We'll keep the log but if dayId differs significantly, we might want to alert or just store dayId.
            // For now, let's just initialize if null or store current dayId in log if it doesn't have it.
            if (!logData) {
                setLog({ userId, date, dayId, completedItems: {} });
            } else if (logData.dayId && logData.dayId !== dayId) {
                // If dayId exists and is different, it's definitely another plan.
                // Resetting for clean test/plan switch.
                setLog({ userId, date, dayId, completedItems: {} });
            } else {
                setLog({ ...logData, dayId }); // Ensure current dayId is associated
            }

            // Check if it's a generic plan (only generic ingredients)
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

            // Default expand current meal based on time? 
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

    const toggleItem = async (mealIdx, itemIdx) => {
        const key = `${mealIdx}-${itemIdx}`;
        const isCompleted = !!log.completedItems?.[key];
        const newStatus = !isCompleted;

        // Optimistic Update
        const newLog = {
            ...log,
            completedItems: {
                ...(log.completedItems || {}),
                [key]: newStatus
            }
        };
        // Remove key if false to keep clean? 
        if (!newStatus) delete newLog.completedItems[key];

        setLog(newLog);

        // Sync API
        await NutritionDB.logs.updateMealStatus(userId, date, mealIdx, itemIdx, newStatus);
    };

    const toggleMealExpand = (idx) => {
        setExpandedMeals(prev => ({ ...prev, [idx]: !prev[idx] }));
    };

    const toggleMealComplete = async (mIdx) => {
        if (!day || !day.meals[mIdx]) return;
        const meal = day.meals[mIdx];

        // Check if all items in this meal are completed
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
        await NutritionDB.logs.saveDailyLog(userId, date, newLog.completedItems, dayId);
    };

    const toggleCompleteAll = async () => {
        if (!day) return;

        // Check if all are currently completed
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
            // Mark all as true
            day.meals?.forEach((meal, mIdx) => {
                meal.items?.forEach((item, iIdx) => {
                    const key = `${mIdx}-${iIdx}`;
                    newCompletedItems[key] = true;
                });
            });
        }

        // Optimistic Update
        const newLog = {
            ...log,
            completedItems: newCompletedItems
        };
        setLog(newLog);

        // Sync API (Full update)
        // We need a method to update the whole map or iterate. 
        // Ideally NutritionDB has updateLog.
        // Let's use updateDailyLog if available or fallback to loop (inefficient) or better, create updateLog.
        // Assuming NutritionDB.logs.saveLog exists or similar. 
        // Previously we used updateMealStatus. Let's try to update the whole object log.
        // Let's check updateMealStatus implementation in mind -> it updates a specific field.
        // I will implement a saveLog method or similar if needed, but for now let's assume updateLog or loop.
        // Actually, let's just save the whole completedItems map.
        // Update log with current dayId
        await NutritionDB.logs.saveDailyLog(userId, date, newLog.completedItems, dayId);
    };

    // Calculation
    const calculateProgress = () => {
        if (!day) return { target: {}, current: {} };

        let target = { calories: 0, protein: 0, carbs: 0, fats: 0 };
        let current = { calories: 0, protein: 0, carbs: 0, fats: 0 };

        day.meals?.forEach((meal, mIdx) => {
            meal.items?.forEach((item, iIdx) => {
                // Calculate Item Macros (Need resources? Ideally Day stores snapshot or we need to fetch)
                // In DayEditor we saved RefID + Name + Qty. But we might need real macros.
                // Optimally NutritionDay stores a snapshot of macros to avoid N+1 lookups here.
                // Checks DayEditor: it stores refId. 
                // CRITICAL: We need the macros. 
                // To fix N+1, the UserView should probably get "hydrated" day or we trust we can fetch allFoods cached.
                // Let's assume we fetch all foods once or the Day objects *shouls* have snapshots. 
                // For MVP let's assume we need to fetch all foods/recipes to compute.
                // I'll add a quick fetch of all foods/recipes in loadData for calculation context.
                // ... Wait, that's heavy.
                // Better approach used in Training: Hydration.
                // I'll create a `NutritionRunner` utility later?
                // For now, I'll fetch valid foods.
                // OR: I will assume the Day object has `items` with enough data.
                // If DayEditor *only* saved refId, we have a problem.
                // Let's check DayEditor save logic. 
                // It saves `meals`. `addItemToMeal` saves `refId`, `name`, `quantity`, `unit`.
                // It MISSES macros. This is a flaw in my DayEditor design.
                // I should patch DayEditor or fetch here. 
                // For robustness, I'll fetch here. The list of foods isn't huge for MVP.
            });
        });

        return { target, current };
    };

    const handleCompleteDay = async () => {
        if (!taskId) {
            onClose();
            return;
        }

        try {
            const { t, c } = getStats();
            const pct = t.calories > 0 ? Math.round((c.calories / t.calories) * 100) : 0;
            const summary = `${Math.round(c.calories)}/${Math.round(t.calories)} kcal (${pct}%)`;

            // Enriquecer completedItems con metadatos de los ítems para la revisión del admin
            const enrichedCompletedItems = {};
            if (log.completedItems && day?.meals) {
                Object.keys(log.completedItems).forEach(key => {
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
                        // Fallback por si acaso
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
                    target: t,
                    notes: stats.notes,
                    adherence: stats.adherence,
                    completedItems: enrichedCompletedItems
                }
            });
            onClose();
        } catch (error) {
            console.error("Error completing nutrition day:", error);
        }
    };

    // We need the food database to calculate calories
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
        let t = { calories: 0, protein: 0, carbs: 0, fats: 0 }; // Target
        let c = { calories: 0, protein: 0, carbs: 0, fats: 0 }; // Current (Consumed)

        if (!day || !resources.foods.length) return { t, c };

        day.meals?.forEach((meal, mIdx) => {
            meal.items?.forEach((item, iIdx) => {
                const key = `${mIdx}-${iIdx}`;
                const isConsumed = !!log?.completedItems?.[key];

                let m = { calories: 0, protein: 0, carbs: 0, fat: 0 };

                if (item.type === 'food') {
                    const food = resources.foods.find(f => f.id === item.refId);
                    if (food) m = calculateItemMacros(food, item.quantity, item.unit);
                } else if (item.type === 'recipe') {
                    const recipe = resources.recipes.find(r => r.id === item.refId);
                    if (recipe && recipe.totalMacros) {
                        const ratio = item.quantity; // Assuming 1 serving
                        m = {
                            calories: (recipe.totalMacros.calories || 0) * ratio,
                            protein: (recipe.totalMacros.protein || 0) * ratio,
                            carbs: (recipe.totalMacros.carbs || 0) * ratio,
                            fats: (recipe.totalMacros.fats || 0) * ratio
                        };
                    }
                }

                // Add to Target
                t.calories += m.calories;
                t.protein += m.protein;
                t.carbs += m.carbs;
                t.fats += m.fats;

                // Add to Current if consumed
                if (isConsumed) {
                    c.calories += m.calories;
                    c.protein += m.protein;
                    c.carbs += m.carbs;
                    c.fats += m.fats;
                }
            });
        });

        return { t, c };
    };

    const { t, c } = getStats();

    if (loading) return <div className="p-10 text-center text-slate-400">Cargando nutrición...</div>;
    if (!day) return <div className="p-10 text-center text-slate-400">No hay plan nutricional asignado para hoy.</div>;

    const Ring = ({ current, total, color, label, icon }) => {
        const radius = 36; // Back to larger size
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
                        <span className="text-xl font-black">{viewMode === 'GRAMS' ? Math.round(current) : (current / (label === 'P' ? 25 : (label === 'G' ? 15 : 25))).toFixed(1)}</span>
                        <span className="text-[8px] text-slate-400 font-bold uppercase">{viewMode === 'GRAMS' ? 'g' : 'P'}</span>
                    </div>
                </div>
                <div className="mt-2 text-center">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</div>
                    <div className="text-xs font-bold text-slate-500">
                        / {viewMode === 'GRAMS' ? Math.round(total) : (total / (label === 'P' ? 25 : (label === 'G' ? 15 : 25))).toFixed(1)}
                    </div>
                </div>
            </div>
        );
    };

    return createPortal(
        <div className="fixed inset-0 z-[5000] flex flex-col justify-end">
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Sheet */}
            <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="relative w-full h-[95vh] bg-slate-50 rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)] overflow-hidden flex flex-col"
            >
                <div className="flex-1 overflow-y-auto relative bg-white pb-72">
                    {/* Close Button Floating */}
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 z-10 p-2 bg-white/80 backdrop-blur-md border border-slate-100 rounded-full shadow-sm text-slate-500 hover:text-slate-900 transition-colors"
                    >
                        <X size={20} />
                    </button>

                    {/* Header / Stats */}
                    {/* Header / Stats */}
                    <div className="bg-white text-slate-900 rounded-b-[32px] p-5 pt-6 shadow-xl shadow-slate-200/50 pb-8 relative overflow-hidden ring-1 ring-slate-100 z-0">
                        <div className="flex justify-between items-center mb-3">
                            <div>
                                <h1 className="text-xl font-black tracking-wide flex items-center gap-2">
                                    PLAN DIARIO
                                </h1>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{date}</p>
                            </div>
                        </div>

                        {/* View Mode Toggle */}
                        <div className="flex gap-2 mb-4">
                            <button
                                onClick={toggleCompleteAll}
                                className="bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border border-emerald-200 flex items-center gap-2 shadow-sm text-emerald-600 active:scale-95"
                            >
                                <CheckSquare size={12} /> <span>Marcar Todo</span>
                            </button>
                            {!isGenericPlan && (
                                <button
                                    onClick={() => setShowShoppingList(true)}
                                    className="bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border border-indigo-200 flex items-center gap-2 shadow-sm text-indigo-600 active:scale-95"
                                >
                                    <ShoppingBasket size={12} /> <span>Lista</span>
                                </button>
                            )}
                            <button
                                onClick={() => setViewMode(prev => prev === 'GRAMS' ? 'PORTIONS' : 'GRAMS')}
                                className="bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border border-slate-200 flex items-center gap-2 shadow-sm active:scale-95"
                            >
                                {viewMode === 'GRAMS' ? (
                                    <>
                                        <Scale size={12} className="text-indigo-500" /> <span>Porciones</span>
                                    </>
                                ) : (
                                    <>
                                        <PieChart size={12} className="text-indigo-500" /> <span>Gramos</span>
                                    </>
                                )}
                            </button>
                        </div>

                        <div className="flex justify-between items-center gap-2 px-2">
                            <Ring current={c.protein} total={t.protein} color="text-red-500" label="PROTEIN" />
                            <Ring current={c.carbs} total={t.carbs} color="text-amber-500" label="CARBS" />
                            <Ring current={c.fats} total={t.fats} color="text-yellow-300" label="GRASA" />
                        </div>

                        {/* Calories Linear Progress */}
                        <div className="mt-5 px-3">
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-1.5 text-slate-400">
                                <span>Calorías</span>
                                <span className="text-slate-900">{Math.round(c.calories)} / {Math.round(t.calories)} kcal</span>
                            </div>
                            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(100, (c.calories / t.calories) * 100)}%` }}
                                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Meals List */}
                    <div className="p-6 -mt-4 space-y-6 relative z-10">
                        {day.meals?.map((meal, mIdx) => (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: mIdx * 0.1 }}
                                key={mIdx}
                                className="bg-white rounded-[24px] shadow-lg shadow-slate-200/50 border border-slate-100 overflow-hidden"
                            >
                                {/* Meal Header */}
                                <div
                                    onClick={() => toggleMealExpand(mIdx)}
                                    className="p-5 flex justify-between items-center cursor-pointer bg-white hover:bg-slate-50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <h3 className="font-black text-lg text-slate-900">{meal.name}</h3>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleMealComplete(mIdx);
                                            }}
                                            className="p-1 px-2 bg-slate-100 hover:bg-emerald-500 hover:text-white rounded-lg text-[8px] font-black uppercase tracking-widest transition-all text-slate-400 border border-slate-200"
                                        >
                                            Marcar Todo
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {expandedMeals[mIdx] ? <ChevronUp size={20} className="text-slate-300" /> : <ChevronDown size={20} className="text-slate-300" />}
                                    </div>
                                </div>

                                {/* Items */}
                                <AnimatePresence>
                                    {expandedMeals[mIdx] && (
                                        <motion.div
                                            initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                                            className="border-t border-slate-50"
                                        >
                                            {meal.items?.map((item, iIdx) => {
                                                const key = `${mIdx}-${iIdx}`;
                                                const isChecked = !!log?.completedItems?.[key];
                                                const isExpanded = !!expandedRecipes[key];
                                                const recipe = item.type === 'recipe' ? resources.recipes.find(r => r.id === item.refId) : null;

                                                return (
                                                    <div key={iIdx} className="border-b border-slate-50 last:border-0">
                                                        <div
                                                            onClick={() => toggleItem(mIdx, iIdx)}
                                                            className={`p-4 flex items-center gap-4 cursor-pointer transition-all
                                                                    ${isChecked ? 'bg-slate-50/50 opacity-40' : 'bg-white hover:bg-indigo-50/30'}
                                                                `}
                                                        >
                                                            <div className={`
                                                                    w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0
                                                                    ${isChecked ? 'bg-indigo-600 border-indigo-600' : 'border-slate-200'}
                                                                `}>
                                                                {isChecked && <Check size={14} className="text-white" />}
                                                            </div>

                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2">
                                                                    <div className={`font-bold text-sm ${isChecked ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{item.name}</div>
                                                                    {recipe && (
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setExpandedRecipes(prev => ({ ...prev, [key]: !prev[key] }));
                                                                            }}
                                                                            className={`p-1 rounded-lg border transition-all ${isExpanded ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                                                                        >
                                                                            <Info size={18} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                                <div className="text-xs text-slate-400 font-medium">
                                                                    {item.quantity} {item.unit}
                                                                    {item.type === 'recipe' && <span className="ml-2 text-[8px] font-black uppercase text-indigo-400 tracking-widest border border-indigo-100 px-1 rounded">Receta</span>}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Recipe Details */}
                                                        <AnimatePresence>
                                                            {isExpanded && recipe && (
                                                                <motion.div
                                                                    initial={{ height: 0, opacity: 0 }}
                                                                    animate={{ height: 'auto', opacity: 1 }}
                                                                    exit={{ height: 0, opacity: 0 }}
                                                                    className="px-14 pb-4 bg-slate-50 overflow-hidden"
                                                                >
                                                                    {recipe.ingredients && (
                                                                        <div className="mb-3 pt-2">
                                                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Ingredientes:</p>
                                                                            <ul className="space-y-1">
                                                                                {recipe.ingredients.map((ing, k) => (
                                                                                    <li key={k} className="text-xs text-slate-600 flex justify-between">
                                                                                        <span>• {ing.name}</span>
                                                                                        <span className="font-bold text-slate-400">{ing.quantity || ing.amount} {ing.unit}</span>
                                                                                    </li>
                                                                                ))}
                                                                            </ul>
                                                                        </div>
                                                                    )}
                                                                    {recipe.instructions && (
                                                                        <div>
                                                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Preparación:</p>
                                                                            <p className="text-xs text-slate-500 leading-relaxed whitespace-pre-line italic">
                                                                                {recipe.instructions}
                                                                            </p>
                                                                        </div>
                                                                    )}
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                );
                                            })}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        ))}
                    </div>

                    {onClose && (
                        <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-slate-100 z-50 flex flex-col gap-3">
                            <div className="max-w-md mx-auto w-full space-y-3">
                                {taskId && (
                                    <>
                                        {/* Feedback Section */}
                                        <div className="space-y-3 mb-2">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">¿Qué tal lo has llevado?</p>
                                            <div className="grid grid-cols-3 gap-2">
                                                <button
                                                    onClick={() => setStats(s => ({ ...s, adherence: 'perfect' }))}
                                                    className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${stats.adherence === 'perfect' ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-200 text-slate-400 hover:border-emerald-200 hover:text-emerald-500'}`}
                                                >
                                                    <Zap size={20} />
                                                    <span className="text-[9px] font-black uppercase">Clavado</span>
                                                </button>
                                                <button
                                                    onClick={() => setStats(s => ({ ...s, adherence: 'partial' }))}
                                                    className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${stats.adherence === 'partial' ? 'bg-amber-500 border-amber-500 text-white' : 'bg-white border-slate-200 text-slate-400 hover:border-amber-200 hover:text-amber-500'}`}
                                                >
                                                    <Scale size={20} />
                                                    <span className="text-[9px] font-black uppercase">A medias</span>
                                                </button>
                                                <button
                                                    onClick={() => setStats(s => ({ ...s, adherence: 'missed' }))}
                                                    className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${stats.adherence === 'missed' ? 'bg-rose-500 border-rose-500 text-white' : 'bg-white border-slate-200 text-slate-400 hover:border-rose-200 hover:text-rose-500'}`}
                                                >
                                                    <X size={20} />
                                                    <span className="text-[9px] font-black uppercase">No seguido</span>
                                                </button>
                                            </div>
                                            <input
                                                type="text"
                                                value={stats.notes}
                                                onChange={e => setStats(s => ({ ...s, notes: e.target.value }))}
                                                placeholder="Notas sobre el día (opcional)..."
                                                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
                                            />
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={onClose}
                                                className="flex-1 bg-slate-100 text-slate-500 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                                            >
                                                Cerrar
                                            </button>
                                            <button
                                                onClick={handleCompleteDay}
                                                disabled={!stats.adherence}
                                                className="flex-[2] bg-slate-900 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <Check size={16} className="text-emerald-400" />
                                                Finalizar
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>

            <AnimatePresence>
                {showShoppingList && dayId && (
                    <ShoppingListView
                        dayIds={[dayId]}
                        onClose={() => setShowShoppingList(false)}
                    />
                )}
            </AnimatePresence>
        </div>,
        document.body
    );
};

export default NutritionDayView;
