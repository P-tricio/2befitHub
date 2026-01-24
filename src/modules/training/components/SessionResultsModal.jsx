import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Clock, Zap, Star, MessageSquare, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp } from 'lucide-react';
import { TrainingDB } from '../services/db';
import { format } from 'date-fns';

const SessionResultsModal = ({ task, session, onClose, userId }) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedBlocks, setExpandedBlocks] = useState({});

    const results = task?.results || {};
    const dateKey = task?.scheduledDate || format(new Date(task?.completedAt || Date.now()), 'yyyy-MM-dd');

    useEffect(() => {
        const fetchLogs = async () => {
            if (!userId || !session?.id) return;
            try {
                const sessionLogs = await TrainingDB.logs.getBySession(userId, session.id, dateKey);
                setLogs(sessionLogs);
            } catch (error) {
                console.error("Error fetching session logs:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchLogs();
    }, [userId, session?.id, dateKey]);

    const toggleBlock = (idx) => {
        setExpandedBlocks(prev => ({ ...prev, [idx]: !prev[idx] }));
    };

    if (!session) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[1000] flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-white rounded-[2.5rem] w-full max-w-lg max-h-[85vh] overflow-hidden shadow-2xl flex flex-col border border-slate-100"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header Section Redesigned */}
                <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-900 p-8 text-white relative shrink-0 overflow-hidden">
                    {/* Decorative Background Element */}
                    <div className="absolute -top-12 -right-12 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl" />
                    <div className="absolute top-20 -left-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl" />

                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-2xl transition-all hover:rotate-90"
                    >
                        <X size={20} />
                    </button>

                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-16 h-16 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl flex items-center justify-center shadow-2xl">
                            <Trophy size={32} className="text-indigo-400" />
                        </div>
                        <div>
                            <p className="text-white/50 text-[10px] font-black uppercase tracking-[0.3em]">Resumen de Rendimiento</p>
                            <h2 className="text-2xl font-black leading-tight tracking-tight">{session.name}</h2>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 relative z-10">
                        <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex flex-col items-center">
                            <div className="flex items-center gap-2 text-white/40 mb-1">
                                <Clock size={12} />
                                <span className="text-[9px] font-black uppercase tracking-wider">Duración</span>
                            </div>
                            <p className="text-xl font-black">{results.durationMinutes || results.duration || '--'} <span className="text-[10px] font-normal opacity-60">min</span></p>
                        </div>
                        <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex flex-col items-center">
                            <div className="flex items-center gap-2 text-white/40 mb-1">
                                <Star size={12} />
                                <span className="text-[9px] font-black uppercase tracking-wider">RPE</span>
                            </div>
                            <p className="text-xl font-black">{results.rpe || '--'}</p>
                        </div>
                        <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex flex-col items-center">
                            <div className="flex items-center gap-2 text-white/40 mb-1">
                                <Zap size={12} />
                                <span className="text-[9px] font-black uppercase tracking-wider">Bloques</span>
                            </div>
                            <p className="text-xl font-black">{session.blocks?.length || '--'}</p>
                        </div>
                    </div>
                </div>

                {/* Content Section Redesigned */}
                <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/50">
                    {/* Insights/Analysis */}
                    {results.analysis && results.analysis.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 px-1 mb-4">
                                <div className="h-4 w-1 bg-indigo-600 rounded-full" />
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Cifras Clave</h3>
                            </div>
                            <div className="grid gap-3">
                                {results.analysis.map((insight, idx) => (
                                    <div key={idx} className="bg-white p-5 rounded-3xl border border-slate-100 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${insight.type === 'up' ? 'bg-emerald-50 text-emerald-600 shadow-emerald-100' :
                                            insight.type === 'down' ? 'bg-rose-50 text-rose-600 shadow-rose-100' :
                                                'bg-indigo-50 text-indigo-600 shadow-indigo-100'
                                            } shadow-inner`}>
                                            {insight.type === 'up' && <TrendingUp size={24} />}
                                            {insight.type === 'down' && <TrendingDown size={24} />}
                                            {insight.type === 'keep' && <Minus size={24} />}
                                        </div>
                                        <p className="text-sm font-black text-slate-800 leading-tight">{insight.msg}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Detailed Logs per Block */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 px-1 mb-4">
                            <div className="h-4 w-1 bg-indigo-600 rounded-full" />
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Desglose de Bloques</h3>
                        </div>

                        {loading ? (
                            <div className="py-12 flex flex-col items-center gap-4 text-slate-400">
                                <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent animate-spin rounded-full" />
                                <p className="text-xs font-black uppercase tracking-widest">Calculando Métricas...</p>
                            </div>
                        ) : logs.length === 0 ? (
                            <div className="py-16 text-center text-slate-300 text-[10px] font-black uppercase tracking-[0.2em] bg-white rounded-[2.5rem] border-4 border-dashed border-slate-50">
                                No se encontraron registros detallados
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {logs.map((log, lIdx) => (
                                    <div key={log.id || lIdx} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden group">
                                        <button
                                            onClick={() => toggleBlock(lIdx)}
                                            className="w-full px-6 py-5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-black tracking-widest ${log.blockType === 'BOOST' ? 'bg-orange-600 text-white' :
                                                    log.blockType === 'BASE' ? 'bg-emerald-600 text-white' :
                                                        log.blockType === 'BUILD' ? 'bg-indigo-600 text-white' :
                                                            log.blockType === 'BURN' ? 'bg-rose-600 text-white' :
                                                                'bg-slate-900 text-white'
                                                    }`}>
                                                    {log.blockType?.[0]}
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                                        {log.blockType}
                                                        <span className="h-1 w-1 bg-slate-300 rounded-full" />
                                                        <span className="text-slate-400 font-bold">{log.protocol === 'T' ? 'AMRAP' : log.protocol === 'R' ? 'FOR TIME' : 'EMOM'}</span>
                                                    </p>
                                                    {log.feedback?.rpe && (
                                                        <p className="text-[10px] font-bold text-slate-400 mt-0.5">Esfuerzo Percibido: {log.feedback.rpe}/10</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="p-2 rounded-xl bg-slate-50 text-slate-300 group-hover:text-slate-900 transition-colors">
                                                {expandedBlocks[lIdx] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                            </div>
                                        </button>

                                        <AnimatePresence>
                                            {expandedBlocks[lIdx] && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden bg-slate-50/50"
                                                >
                                                    <div className="p-6 pt-0 space-y-3">
                                                        {Object.entries(log.results?.reps || {}).map(([exIdx, reps], idx) => {
                                                            const blockMetadata = session.blocks?.find(b => b.name === log.blockType || b.id === log.moduleId);
                                                            const exercise = blockMetadata?.exercises?.[exIdx];
                                                            const weight = log.results.actualWeights?.[exIdx] || log.results.weights?.[exIdx] || 0;

                                                            return (
                                                                <div key={idx} className="flex items-center justify-between gap-4 p-4 bg-white rounded-3xl border border-slate-100 shadow-sm">
                                                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                                                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full shrink-0" />
                                                                        <div className="min-w-0">
                                                                            <p className="font-black text-slate-800 text-sm truncate">
                                                                                {exercise?.name_es || exercise?.nameEs || exercise?.name || `Ejercicio ${parseInt(exIdx) + 1}`}
                                                                            </p>
                                                                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-0.5">{exercise?.manifestation || 'Fuerza'}</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-3 shrink-0">
                                                                        <div className="text-right">
                                                                            <p className="text-sm font-black text-slate-900">{reps} <span className="text-[10px] font-normal opacity-40">reps</span></p>
                                                                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{log.protocol === 'E' ? 'Ronda' : 'Total'}</p>
                                                                        </div>
                                                                        {parseFloat(weight) > 0 && (
                                                                            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex flex-col items-center justify-center text-white shadow-lg shadow-slate-900/10">
                                                                                <span className="text-sm font-black leading-none">{weight}</span>
                                                                                <span className="text-[8px] font-black opacity-50 tracking-tighter">KG</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}

                                                        {log.blockType === 'EMOM' && log.results?.emomResults && (
                                                            <div className="pt-4 border-t border-slate-100 mt-2">
                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Distribución de Rondas</p>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {Object.entries(log.results.emomResults).map(([round, status]) => (
                                                                        <div
                                                                            key={round}
                                                                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-black transition-all ${status === 'success' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' :
                                                                                status === 'fail' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' :
                                                                                    'bg-slate-200 text-slate-400'
                                                                                }`}
                                                                        >
                                                                            {parseInt(round) + 1}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {log.feedback?.notes && (
                                                            <div className="bg-amber-50/50 p-4 rounded-3xl border border-amber-100 flex gap-4 mt-2">
                                                                <MessageSquare size={16} className="text-amber-500 shrink-0 mt-0.5" />
                                                                <p className="text-xs font-medium text-amber-800 italic leading-relaxed">{log.feedback.notes}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* General Notes Redesigned */}
                    {results.notes && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 px-1">
                                <div className="h-4 w-1 bg-indigo-600 rounded-full" />
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Observaciones Finales</h3>
                            </div>
                            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-900" />
                                <p className="text-slate-700 text-sm font-medium leading-relaxed italic">
                                    "{results.notes}"
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Section Redesigned */}
                <div className="p-8 bg-white border-t border-slate-100 shrink-0 shadow-[0_-8px_30px_-15px_rgba(0,0,0,0.1)]">
                    <button
                        onClick={onClose}
                        className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-[2rem] font-black text-lg shadow-2xl shadow-slate-900/30 active:scale-95 transition-all uppercase tracking-[0.1em]"
                    >
                        Entendido
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default SessionResultsModal;
