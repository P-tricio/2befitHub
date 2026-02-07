import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { X, Check, Footprints, Utensils, ClipboardList, Scale, Ruler, Camera, CheckSquare, Clock, History, Dumbbell, Zap } from 'lucide-react';

const TaskResultsModal = ({ task, onClose, availableForms }) => {
    if (!task) return null;

    const results = task.results || {};
    const config = task.config || {};
    const type = task.type;

    const getIcon = () => {
        if (type === 'neat') return <Footprints size={24} />;
        if (type === 'nutrition') return <CheckSquare size={24} />;
        if (type === 'tracking' || type === 'checkin') return <ClipboardList size={24} />;
        if (type === 'free_training') return <Dumbbell size={24} />;
        return <Check size={24} />;
    };

    const getColorClass = () => {
        if (type === 'neat') return 'emerald';
        if (type === 'nutrition' || type === 'nutrition_day') return 'orange';
        if (type === 'tracking' || type === 'checkin') return 'blue';
        if (type === 'free_training') return 'indigo';
        return 'slate';
    };

    const color = getColorClass();

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white rounded-[32px] w-full max-w-sm max-h-[85vh] overflow-hidden shadow-2xl flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className={`bg-${color}-500 p-6 text-white relative shrink-0`}>
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>

                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                            {getIcon()}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.2em]">
                                    {type === 'nutrition' || type === 'nutrition_day' ? 'Nutrición' :
                                        type === 'neat' ? 'Movimiento' :
                                            type === 'free_training' ? 'Entrenamiento' :
                                                type === 'tracking' || type === 'checkin' ? 'Seguimiento' : type}
                                </p>
                                {config.retroactive && (
                                    <span className="bg-white/20 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                                        <History size={10} /> Reflexión
                                    </span>
                                )}
                            </div>
                            <h2 className="text-xl font-black leading-tight">{task.title || task.name || 'Resultados de Tarea'}</h2>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Date/Status Info */}
                    <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <span>{task.completedAt ? format(new Date(task.completedAt), "d 'de' MMMM, HH:mm", { locale: es }) : 'No completado'}</span>
                            <span className={task.status === 'completed' ? 'text-emerald-500' : 'text-amber-500'}>
                                {task.status === 'completed' ? 'Completado' : 'Pendiente'}
                            </span>
                        </div>
                        {config.retroactive && task.completedAt && (
                            <p className="text-[9px] font-bold text-slate-400 italic">
                                * Datos referidos al día anterior ({format(subDays(new Date(task.completedAt), 1), "d 'de' MMMM", { locale: es })})
                            </p>
                        )}
                    </div>

                    {/* Nutrition Day Results */}
                    {type === 'nutrition_day' && (
                        <div className="space-y-4">
                            {/* Adherence Badge */}
                            {results.adherence && (
                                <div className={`p-4 rounded-2xl border flex items-center gap-3 ${results.adherence === 'perfect' ? 'bg-emerald-50 border-emerald-100' :
                                    results.adherence === 'partial' ? 'bg-amber-50 border-amber-100' :
                                        'bg-rose-50 border-rose-100'
                                    }`}>
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${results.adherence === 'perfect' ? 'bg-emerald-500 text-white' :
                                        results.adherence === 'partial' ? 'bg-amber-500 text-white' :
                                            'bg-rose-500 text-white'
                                        }`}>
                                        {results.adherence === 'perfect' && <Zap size={20} />}
                                        {results.adherence === 'partial' && <Scale size={20} />}
                                        {results.adherence === 'missed' && <X size={20} />}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cumplimiento</p>
                                        <p className={`font-black text-lg ${results.adherence === 'perfect' ? 'text-emerald-700' :
                                            results.adherence === 'partial' ? 'text-amber-700' :
                                                'text-rose-700'
                                            }`}>
                                            {results.adherence === 'perfect' ? 'Clavado' :
                                                results.adherence === 'partial' ? 'A medias' : 'No seguido'}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Macros Summary */}
                            {results.consumed && results.target && (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 bg-orange-50 rounded-xl border border-orange-100">
                                            <p className="text-[9px] font-black text-orange-400 uppercase tracking-widest">Consumido</p>
                                            <p className="text-lg font-black text-orange-900">{Math.round(results.consumed.calories)} kcal</p>
                                        </div>
                                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Objetivo</p>
                                            <p className="text-lg font-black text-slate-700">{Math.round(results.target.calories)} kcal</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 px-1">
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Proteína</span>
                                            <span className="text-xs font-black text-slate-700">{Math.round(results.consumed.protein)}g <span className="text-[10px] text-slate-300">/ {Math.round(results.target.protein)}g</span></span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Carbs</span>
                                            <span className="text-xs font-black text-slate-700">{Math.round(results.consumed.carbs)}g <span className="text-[10px] text-slate-300">/ {Math.round(results.target.carbs)}g</span></span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Grasas</span>
                                            <span className="text-xs font-black text-slate-700">{Math.round(results.consumed.fats)}g <span className="text-[10px] text-slate-300">/ {Math.round(results.target.fats)}g</span></span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Completed Items */}
                            {results.completedItems && Object.keys(results.completedItems).length > 0 && (
                                <div className="space-y-2">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Items Completados</h3>
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-600 space-y-2 font-medium">
                                        {Object.entries(results.completedItems).map(([key, val]) => {
                                            const isObject = val && typeof val === 'object';
                                            const name = isObject ? val.name : `Comida ${key.split('-')[0]}, Item ${key.split('-')[1]}`;
                                            const detail = isObject ? `${val.quantity} ${val.unit}` : null;
                                            const isDone = isObject ? val.completed : val === true;

                                            return (
                                                <div key={key} className="flex items-center gap-3">
                                                    <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${isDone ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                                                        {isDone && <Check size={10} className="text-white" />}
                                                    </div>
                                                    <div className="flex flex-col min-w-0 leading-tight">
                                                        <span className={`font-bold truncate ${isDone ? 'text-slate-700' : 'text-slate-400'}`}>
                                                            {name}
                                                        </span>
                                                        {detail && (
                                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                                                                {detail}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* User Notes */}
                            {results.notes && (
                                <div className="space-y-2">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Notas del Atleta</h3>
                                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-sm italic text-amber-800 leading-relaxed">
                                        "{results.notes}"
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {type === 'neat' && (
                        <div className="space-y-4">
                            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Registrado</p>
                                    <p className="text-2xl font-black text-emerald-900">
                                        {results.duration || results.value || 0} <span className="text-sm font-bold">{results.activityType === 'steps' ? 'pasos' : 'min'}</span>
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Objetivo</p>
                                    <p className="text-sm font-bold text-slate-600">{config.target || 0}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Free Training Results */}
                    {type === 'free_training' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Duración</p>
                                    <p className="text-xl font-black text-indigo-900">{results.duration || 0} min</p>
                                </div>
                                <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Esfuerzo</p>
                                    <p className="text-xl font-black text-indigo-900">RPE {results.rpe || '-'}</p>
                                </div>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo de actividad</span>
                                <span className="text-sm font-black text-slate-700 uppercase">
                                    {results.activityType === 'gym' ? 'Fuerza' : results.activityType === 'cardio' ? 'Cardio' : 'Otro'}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Habits Results */}
                    {results.habitsResults && (
                        <div className="space-y-3">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Cumplimiento</h3>
                            <div className="grid gap-2">
                                {(() => {
                                    const seen = new Set();
                                    return Object.entries(results.habitsResults)
                                        .filter(([habit, val]) => {
                                            if (val === null || val === undefined) return false;
                                            // Normalize name to catch "Caminar" vs "Caminar."
                                            const normalized = habit.toLowerCase().trim().replace(/\.+$/, "");
                                            if (seen.has(normalized)) return false;
                                            seen.add(normalized);
                                            return true;
                                        })
                                        .map(([habit, val]) => {
                                            const isNumeric = typeof val === 'number';

                                            // Try to find target in task config
                                            let target = 7;
                                            if (config.habits) {
                                                const hConf = config.habits.find(h => (typeof h === 'string' ? h : h.name) === habit);
                                                if (hConf && typeof hConf === 'object') target = hConf.target || 7;
                                            }

                                            const isTargetMet = isNumeric ? val >= target : val === true;

                                            return (
                                                <div key={habit} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                    <span className="text-sm font-bold text-slate-700">{habit}</span>
                                                    {isNumeric ? (
                                                        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg border shadow-sm ${isTargetMet ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-white border-slate-100'}`}>
                                                            <span className={`text-sm font-black ${isTargetMet ? 'text-white' : 'text-indigo-600'}`}>{val}</span>
                                                            <span className={`text-[10px] font-bold ${isTargetMet ? 'text-white/70' : 'text-slate-400'}`}>/ {target}</span>
                                                        </div>
                                                    ) : (
                                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${val === true ? 'bg-emerald-500 text-white' : val === false ? 'bg-rose-500 text-white' : 'bg-slate-200'}`}>
                                                            {val === true && <Check size={14} strokeWidth={4} />}
                                                            {val === false && <X size={14} strokeWidth={4} />}
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })
                                })()}
                            </div>
                        </div>
                    )}

                    {/* Tracking Results */}
                    {(type === 'tracking' || type === 'checkin') && (
                        <div className="space-y-4">
                            {results.weight && (
                                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Scale className="text-blue-500" size={20} />
                                        <span className="text-sm font-bold text-blue-900">Peso Corporal</span>
                                    </div>
                                    <span className="text-lg font-black text-blue-900">{results.weight} kg</span>
                                </div>
                            )}

                            {results.measurements && Object.keys(results.measurements).length > 0 && (
                                <div className="space-y-2">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Medidas</h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        {Object.entries(results.measurements).map(([name, val]) => (
                                            <div key={name} className="p-3 bg-white rounded-xl border border-slate-100 flex flex-col">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter truncate">{name}</span>
                                                <span className="text-sm font-black text-slate-900">{val} cm</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {results.photos && Object.values(results.photos).some(v => v) && (
                                <div className="space-y-2">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Fotos</h3>
                                    <div className="grid grid-cols-3 gap-2">
                                        {Object.entries(results.photos).map(([pos, url]) => url ? (
                                            <div key={pos} className="aspect-square rounded-xl bg-slate-100 overflow-hidden border border-slate-200">
                                                <img src={url} alt={pos} className="w-full h-full object-cover" />
                                            </div>
                                        ) : null)}
                                    </div>
                                </div>
                            )}

                            {results.formAnswers && Object.keys(results.formAnswers).length > 0 && (
                                <div className="space-y-4">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Cuestionario</h3>
                                    <div className="space-y-3">
                                        {(() => {
                                            // Find form definition if available
                                            const formDef = config.formId ? availableForms?.find(f => f.id === config.formId) : null;

                                            return Object.entries(results.formAnswers).map(([key, val]) => {
                                                // Try to find field definition
                                                const field = formDef?.fields?.find(f => f.id === key);
                                                const label = field?.label || key;

                                                return (
                                                    <div key={key} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block mb-2 leading-relaxed">
                                                            {label}
                                                        </p>
                                                        <div className="text-sm font-black text-slate-800 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                                            {val?.toString() || '-'}
                                                        </div>
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Notes */}
                    {results.notes && (
                        <div className="space-y-2">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Comentarios</h3>
                            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-sm italic text-amber-800 leading-relaxed">
                                "{results.notes}"
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 shrink-0">
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-slate-900 text-white rounded-2xl font-black shadow-lg shadow-slate-900/20 active:scale-95 transition-all"
                    >
                        Cerrar
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default TaskResultsModal;
