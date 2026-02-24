import React, { useState, useEffect } from 'react';
import { Send, Loader2, Sparkles, Utensils, X, Check, Trash2, Info, Database, AlertCircle, Plus, Edit2, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { parseMealDescription } from '../../services/aiNutritionService';
import { NutritionDB } from '../../services/nutritionDB';
import { findBestDatabaseMatch } from '../../services/nutritionConsistency';
import { format } from 'date-fns';

const AILaboratory = ({ userId, date }) => {
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);
    const [parsedItems, setParsedItems] = useState(null);
    const [error, setError] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [addedSummary, setAddedSummary] = useState(null);
    const [dbFoods, setDbFoods] = useState([]);
    const [editingIdx, setEditingIdx] = useState(null);

    useEffect(() => {
        const fetchFoods = async () => {
            try {
                const foods = await NutritionDB.foods.getAll();
                setDbFoods(foods);
            } catch (e) {
                console.error("Error loading foods for matching:", e);
            }
        };
        fetchFoods();
    }, []);

    const handleParse = async () => {
        if (!text.trim()) return;
        setLoading(true);
        setError(null);
        setParsedItems(null);
        setSuccess(false);
        setAddedSummary(null);
        try {
            const items = await parseMealDescription(text);

            // Enrich with DB matching
            const enrichedItems = items.map(item => {
                const match = findBestDatabaseMatch(item.name, dbFoods);
                if (match) {
                    return {
                        ...item,
                        refId: match.id,
                        matchType: match.matchType,
                        // If exact match, we prefer DB macros
                        ...(match.matchType === 'exact' ? {
                            baseMacros: match.macros || match,
                            isVerified: true
                        } : {
                            dbSuggestion: match
                        })
                    };
                }
                return item;
            });

            if (!enrichedItems || enrichedItems.length === 0) {
                setError("La IA no ha detectado ningún alimento claro. Probemos a ser más específicos con las cantidades.");
            } else {
                setParsedItems(enrichedItems);
            }
        } catch (err) {
            setError(err.message || "Error al procesar el texto con la IA.");
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmAndSave = async () => {
        if (!parsedItems || parsedItems.length === 0) return;
        setIsSaving(true);
        try {
            const currentLog = await NutritionDB.logs.getDailyLog(userId, date);
            console.info(`[AILaboratory] Fetching log for ${userId} on ${date}: `, currentLog);
            const existingExtraItems = currentLog?.extraItems || [];

            // We use a default mealIndex 0 for simplicity as requested
            const newExtraItems = [
                ...existingExtraItems,
                ...parsedItems.map(item => {
                    let baseMacros = item.baseMacros;

                    // If modified manually, we re-calculate baseMacros to ensure scaling works
                    if (item.isModified) {
                        const baseRatio = (item.unit === 'g' || item.unit === 'ml') ? (100 / item.quantity) : (1 / item.quantity);
                        baseMacros = {
                            calories: (item.calories || 0) * baseRatio,
                            protein: (item.protein || 0) * baseRatio,
                            carbs: (item.carbs || 0) * baseRatio,
                            fats: (item.fats || 0) * baseRatio,
                            fiber: (item.fiber || 0) * baseRatio
                        };
                    }

                    return {
                        mealIndex: 0,
                        item: {
                            ...item,
                            baseMacros,
                            isUserAdded: true,
                            cachedMacros: {
                                calories: item.calories || 0,
                                protein: item.protein || 0,
                                carbs: item.carbs || 0,
                                fats: item.fats || 0,
                                fiber: item.fiber || 0
                            }
                        }
                    };
                })
            ];

            console.info(`[AILaboratory] Saving ${newExtraItems.length} extra items: `, newExtraItems);
            await NutritionDB.logs.saveDailyLog(
                userId,
                date,
                currentLog?.completedItems || {},
                currentLog?.dayId || null,
                newExtraItems
            );
            console.info(`[AILaboratory] Save successful.`);

            setAddedSummary({
                count: parsedItems.length,
                items: parsedItems.map(i => i.name).join(', ')
            });
            setSuccess(true);
            setParsedItems(null);
            setText('');
        } catch (err) {
            setError("Error al guardar los alimentos en el registro del usuario.");
        } finally {
            setIsSaving(false);
        }
    };

    const removeItem = (idx) => {
        setParsedItems(prev => prev.filter((_, i) => i !== idx));
        if (editingIdx === idx) setEditingIdx(null);
    };

    const updateItem = (idx, updates) => {
        setParsedItems(prev => prev.map((item, i) => {
            if (i !== idx) return item;

            const newItem = { ...item, ...updates, isModified: true };

            // Helper to get current ratio
            const getRatio = (q, u) => (u === 'g' || u === 'ml') ? (q / 100) : q;

            // 1. If quantity or unit changed, we update current macros based on baseMacros
            if ((updates.quantity !== undefined || updates.unit !== undefined) && newItem.baseMacros) {
                const ratio = getRatio(newItem.quantity, newItem.unit);
                newItem.calories = Math.round((newItem.baseMacros.calories || 0) * ratio);
                newItem.protein = Math.round((newItem.baseMacros.protein || 0) * ratio);
                newItem.carbs = Math.round((newItem.baseMacros.carbs || 0) * ratio);
                newItem.fats = Math.round((newItem.baseMacros.fats || 0) * ratio);
            }

            // 2. If macros changed manually, we MUST update baseMacros so further quantity changes scale correctly
            const macroFields = ['calories', 'protein', 'carbs', 'fats'];
            const changedMacro = macroFields.find(f => updates[f] !== undefined);

            if (changedMacro) {
                const ratio = getRatio(newItem.quantity, newItem.unit);
                const safeRatio = ratio || 1; // Prevent div by zero

                newItem.baseMacros = {
                    ...newItem.baseMacros,
                    calories: (newItem.calories || 0) / safeRatio,
                    protein: (newItem.protein || 0) / safeRatio,
                    carbs: (newItem.carbs || 0) / safeRatio,
                    fats: (newItem.fats || 0) / safeRatio
                };
            }

            return newItem;
        }));
    };

    return (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full bg-gradient-to-b from-white to-slate-50/30">
            <div className="p-6 border-b border-slate-50 bg-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100 ring-4 ring-indigo-50">
                        <Sparkles size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-slate-900 tracking-tight">Laboratorio IA</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Entrada rápida de nutrición</p>
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                <div className="space-y-4">
                    <div className="flex items-center justify-between ml-1">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Utensils size={14} className="text-indigo-400" />
                            ¿Qué ha comido el atleta?
                        </label>
                    </div>
                    <div className="relative group">
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Ej: He cenado 3 filetes de cerdo con 2 patatas medianas cocidas y un yogur..."
                            className="w-full h-40 p-5 bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all resize-none font-bold placeholder:text-slate-300 shadow-inner"
                        />
                        <button
                            onClick={handleParse}
                            disabled={loading || !text.trim()}
                            className="absolute bottom-4 right-4 px-5 py-3 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95 flex items-center gap-2 font-black text-[11px] uppercase tracking-widest"
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                            <span>Analizar</span>
                        </button>
                    </div>
                </div>

                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 text-rose-600 shadow-sm"
                        >
                            <X size={18} className="shrink-0 mt-0.5" />
                            <p className="text-xs font-bold leading-relaxed">{error}</p>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {parsedItems && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-6 p-6 bg-white border-2 border-indigo-50 rounded-[2.5rem] shadow-xl shadow-indigo-500/5"
                        >
                            <div className="space-y-3">
                                <div className="flex items-center justify-between ml-1">
                                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Alimentos Detectados</h4>
                                    <span className="text-[10px] font-black text-indigo-600 px-3 py-1 bg-indigo-50 rounded-full border border-indigo-100">{parsedItems.length} ITEMS</span>
                                </div>

                                <div className="grid grid-cols-1 gap-2.5">
                                    {parsedItems.map((item, idx) => (
                                        <motion.div
                                            layout
                                            key={idx}
                                            className={`flex flex-col p-4 bg-slate-50/50 border rounded-2xl group transition-all shadow-sm ${editingIdx === idx ? 'border-indigo-500 bg-white ring-4 ring-indigo-50' : 'border-slate-100 hover:border-indigo-200 hover:bg-white'}`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${editingIdx === idx ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' : 'bg-white text-slate-400 border-slate-100 group-hover:text-indigo-500'}`}>
                                                        {editingIdx === idx ? <Edit2 size={18} /> : <Plus size={18} />}
                                                    </div>
                                                    {editingIdx !== idx ? (
                                                        <div>
                                                            <p className="text-sm font-black text-slate-900 leading-tight">{item.name}</p>
                                                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                                    {item.quantity} <span className="text-indigo-400">{item.unit}</span>
                                                                </span>
                                                                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 rounded-md text-[9px] font-bold text-slate-500 whitespace-nowrap">
                                                                    <span className="text-indigo-600 font-black">{Math.round(item.calories || 0)} kcal</span>
                                                                    <span className="opacity-30">•</span>
                                                                    <span>P: {Math.round(item.protein || 0)}g</span>
                                                                    <span className="opacity-30">•</span>
                                                                    <span>H: {Math.round(item.carbs || 0)}g</span>
                                                                    <span className="opacity-30">•</span>
                                                                    <span>G: {Math.round(item.fats || 0)}g</span>
                                                                </div>
                                                                {item.isVerified ? (
                                                                    <span className="flex items-center gap-1 text-[8px] font-black uppercase text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                                                        <Database size={10} /> Verificado
                                                                    </span>
                                                                ) : item.isModified ? (
                                                                    <span className="flex items-center gap-1 text-[8px] font-black uppercase text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                                                                        <Edit2 size={10} /> Corregido
                                                                    </span>
                                                                ) : item.isValidEstimation ? (
                                                                    <span className="flex items-center gap-1 text-[8px] font-black uppercase text-indigo-400 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                                                                        <Sparkles size={10} /> Estimado AI
                                                                    </span>
                                                                ) : (
                                                                    <span className="flex items-center gap-1 text-[8px] font-black uppercase text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                                                                        <AlertCircle size={10} /> Revisar Coherencia
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex-1 space-y-3">
                                                            <input
                                                                className="w-full bg-slate-100 border-none rounded-lg px-3 py-1.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500"
                                                                value={item.name}
                                                                onChange={(e) => updateItem(idx, { name: e.target.value })}
                                                                placeholder="Nombre del alimento"
                                                            />
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="number"
                                                                    className="w-20 bg-slate-100 border-none rounded-lg px-3 py-1.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500"
                                                                    value={item.quantity}
                                                                    onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                                                                />
                                                                <select
                                                                    className="bg-slate-100 border-none rounded-lg px-3 py-1.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500"
                                                                    value={item.unit}
                                                                    onChange={(e) => updateItem(idx, { unit: e.target.value })}
                                                                >
                                                                    <option value="g">g</option>
                                                                    <option value="ml">ml</option>
                                                                    <option value="unidad">unidad</option>
                                                                </select>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => setEditingIdx(editingIdx === idx ? null : idx)}
                                                        className={`p-2.5 rounded-xl transition-all ${editingIdx === idx ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-300 hover:text-indigo-600 hover:bg-indigo-50'}`}
                                                    >
                                                        {editingIdx === idx ? <Save size={16} /> : <Edit2 size={16} />}
                                                    </button>
                                                    <button
                                                        onClick={() => removeItem(idx)}
                                                        className="p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>

                                            {editingIdx === idx && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-4 gap-2"
                                                >
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Kcal</label>
                                                        <input
                                                            type="number"
                                                            className="w-full bg-slate-50 border-none rounded-xl px-3 py-2 text-xs font-black text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                                                            value={item.calories}
                                                            onChange={(e) => updateItem(idx, { calories: Number(e.target.value) })}
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Prot</label>
                                                        <input
                                                            type="number"
                                                            className="w-full bg-slate-50 border-none rounded-xl px-3 py-2 text-xs font-bold text-slate-600 focus:ring-2 focus:ring-indigo-500"
                                                            value={item.protein}
                                                            onChange={(e) => updateItem(idx, { protein: Number(e.target.value) })}
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">HC</label>
                                                        <input
                                                            type="number"
                                                            className="w-full bg-slate-50 border-none rounded-xl px-3 py-2 text-xs font-bold text-slate-600 focus:ring-2 focus:ring-indigo-500"
                                                            value={item.carbs}
                                                            onChange={(e) => updateItem(idx, { carbs: Number(e.target.value) })}
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Grasa</label>
                                                        <input
                                                            type="number"
                                                            className="w-full bg-slate-50 border-none rounded-xl px-3 py-2 text-xs font-bold text-slate-600 focus:ring-2 focus:ring-indigo-500"
                                                            value={item.fats}
                                                            onChange={(e) => updateItem(idx, { fats: Number(e.target.value) })}
                                                        />
                                                    </div>
                                                    <div className="col-span-4 mt-2 p-3 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-3">
                                                        <Info size={14} className="text-amber-500 shrink-0 mt-0.5" />
                                                        <p className="text-[10px] text-amber-700 font-bold leading-tight">
                                                            Estás modificando los macros manualmente. Estos valores prevalecerán sobre cualquier estimación automática.
                                                        </p>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </motion.div>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={handleConfirmAndSave}
                                disabled={isSaving}
                                className="w-full py-5 bg-emerald-500 text-white rounded-[1.5rem] shadow-2xl shadow-emerald-200 hover:bg-emerald-600 transition-all font-black text-[13px] uppercase tracking-widest flex items-center justify-center gap-3 ring-4 ring-emerald-50"
                            >
                                {isSaving ? <Loader2 size={24} className="animate-spin" /> : <Check size={24} />}
                                <span>Añadir al registro del {date}</span>
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {success && addedSummary && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="p-10 bg-emerald-50 border-2 border-emerald-100 rounded-[3rem] flex flex-col items-center text-center gap-6"
                        >
                            <div className="w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-2xl shadow-emerald-200 ring-8 ring-emerald-100">
                                <Check size={40} />
                            </div>
                            <div className="space-y-4">
                                <h4 className="text-2xl font-black text-slate-900 tracking-tight">¡Guardado!</h4>
                                <p className="text-sm text-slate-500 font-bold max-w-[280px]">
                                    Los alimentos se han guardado en el registro persistente de este atleta.
                                </p>
                                <div className="p-4 bg-white/50 rounded-2xl border border-emerald-100 inline-block">
                                    <p className="text-[11px] font-bold text-slate-600 italic">"{addedSummary.items}"</p>
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white px-4 py-2 rounded-full border border-emerald-100">
                                    ✓ Disponible incluso si no hay diario asignado
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setSuccess(false);
                                    setAddedSummary(null);
                                }}
                                className="px-8 py-3 bg-white border-2 border-emerald-200 text-emerald-600 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all shadow-md active:scale-95"
                            >
                                Nuevo Análisis
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {!parsedItems && !success && !loading && (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-6 opacity-30 select-none">
                        <div className="w-24 h-24 bg-slate-100 rounded-[2.5rem] flex items-center justify-center text-slate-300 transform -rotate-6">
                            <Sparkles size={48} />
                        </div>
                        <div className="space-y-2">
                            <p className="text-lg font-black text-slate-500 tracking-tight">¿Qué ha comido el atleta?</p>
                            <p className="text-[11px] font-bold text-slate-400 px-12 leading-relaxed">
                                Introduce la descripción y los alimentos se guardarán automáticamente en su registro diario.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AILaboratory;
