import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Footprints, Utensils, ClipboardList, Scale, Ruler, Camera, CheckSquare, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const TaskResultsModal = ({ task, onClose }) => {
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
        if (type === 'nutrition') return 'orange';
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
                            <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.2em]">{task.type}</p>
                            <h2 className="text-xl font-black leading-tight">{task.title || 'Resultados de Tarea'}</h2>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Date/Status Info */}
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <span>{task.completedAt ? format(new Date(task.completedAt), "d 'de' MMMM, HH:mm", { locale: es }) : 'No completado'}</span>
                        <span className={task.status === 'completed' ? 'text-emerald-500' : 'text-amber-500'}>
                            {task.status === 'completed' ? 'Completado' : 'Pendiente'}
                        </span>
                    </div>

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
                    {type === 'nutrition' && results.habitsResults && (
                        <div className="space-y-3">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Cumplimiento</h3>
                            <div className="grid gap-2">
                                {Object.entries(results.habitsResults).map(([habit, done]) => (
                                    <div key={habit} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <span className="text-sm font-bold text-slate-700">{habit}</span>
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${done === true ? 'bg-emerald-500 text-white' : done === false ? 'bg-rose-500 text-white' : 'bg-slate-200'}`}>
                                            {done === true && <Check size={14} strokeWidth={4} />}
                                            {done === false && <X size={14} strokeWidth={4} />}
                                        </div>
                                    </div>
                                ))}
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
                                <div className="space-y-2">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Cuestionario</h3>
                                    <div className="space-y-2">
                                        {Object.entries(results.formAnswers).map(([key, val]) => (
                                            <div key={key} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block mb-1">{key}</span>
                                                <span className="text-sm font-bold text-slate-700">{val?.toString() || '-'}</span>
                                            </div>
                                        ))}
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
