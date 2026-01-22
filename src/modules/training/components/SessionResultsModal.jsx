import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Clock, Zap, Dumbbell, Star, MessageSquare, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp } from 'lucide-react';
import { TrainingDB } from '../services/db';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

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
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white rounded-[32px] w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header Section */}
                <div className="bg-slate-900 p-6 text-white relative shrink-0">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>

                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <Trophy size={32} className="text-white" />
                        </div>
                        <div>
                            <p className="text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em]">Sesión Completada</p>
                            <h2 className="text-2xl font-black leading-tight">{session.name}</h2>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
                            <div className="flex items-center gap-2 text-slate-400 mb-1">
                                <Clock size={14} />
                                <span className="text-[10px] font-bold uppercase">Tiempo</span>
                            </div>
                            <p className="text-lg font-black">{results.durationMinutes || '--'} min</p>
                        </div>
                        <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
                            <div className="flex items-center gap-2 text-slate-400 mb-1">
                                <Star size={14} />
                                <span className="text-[10px] font-bold uppercase">RPE</span>
                            </div>
                            <p className="text-lg font-black">{results.rpe || '--'}</p>
                        </div>
                        <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
                            <div className="flex items-center gap-2 text-slate-400 mb-1">
                                <Zap size={14} />
                                <span className="text-[10px] font-bold uppercase">Bloques</span>
                            </div>
                            <p className="text-lg font-black">{session.blocks?.length || '--'}</p>
                        </div>
                    </div>
                </div>

                {/* Content Section */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
                    {/* Insights/Analysis */}
                    {results.analysis && results.analysis.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Análisis de Cargas</h3>
                            <div className="grid gap-2">
                                {results.analysis.map((insight, idx) => (
                                    <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-4 shadow-sm">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${insight.type === 'up' ? 'bg-emerald-50 text-emerald-500' :
                                                insight.type === 'down' ? 'bg-amber-50 text-amber-500' :
                                                    'bg-blue-50 text-blue-500'
                                            }`}>
                                            {insight.type === 'up' && <TrendingUp size={20} />}
                                            {insight.type === 'down' && <TrendingDown size={20} />}
                                            {insight.type === 'keep' && <Minus size={20} />}
                                        </div>
                                        <p className="text-sm font-bold text-slate-700 leading-tight">{insight.msg}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Detailed Logs per Block */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Desglose de Trabajo</h3>

                        {loading ? (
                            <div className="py-10 text-center text-slate-400 text-sm font-medium">Cargando detalles...</div>
                        ) : logs.length === 0 ? (
                            <div className="py-10 text-center text-slate-400 text-sm italic bg-white rounded-3xl border-2 border-dashed border-slate-100">
                                No hay datos detallados guardados para esta sesión.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {logs.map((log, lIdx) => (
                                    <div key={log.id || lIdx} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                        <button
                                            onClick={() => toggleBlock(lIdx)}
                                            className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${log.blockType === 'BOOST' ? 'bg-orange-100 text-orange-600' :
                                                        log.blockType === 'BASE' ? 'bg-emerald-100 text-emerald-600' :
                                                            log.blockType === 'BUILD' ? 'bg-blue-100 text-blue-600' :
                                                                log.blockType === 'BURN' ? 'bg-rose-100 text-rose-600' :
                                                                    'bg-slate-100 text-slate-600'
                                                    }`}>
                                                    {log.blockType}
                                                </span>
                                                <span className="font-bold text-slate-800 text-sm">
                                                    {log.protocol === 'T' ? 'AMRAP' : log.protocol === 'R' ? 'FOR TIME' : 'EMOM'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {log.feedback?.rpe && (
                                                    <span className="text-[10px] font-black text-slate-400 uppercase">RPE {log.feedback.rpe}</span>
                                                )}
                                                {expandedBlocks[lIdx] ? <ChevronUp size={18} className="text-slate-300" /> : <ChevronDown size={18} className="text-slate-300" />}
                                            </div>
                                        </button>

                                        <AnimatePresence>
                                            {expandedBlocks[lIdx] && (
                                                <motion.div
                                                    initial={{ height: 0 }}
                                                    animate={{ height: 'auto' }}
                                                    exit={{ height: 0 }}
                                                    className="overflow-hidden border-t border-slate-50"
                                                >
                                                    <div className="p-4 space-y-3 bg-slate-50/30">
                                                        {/* Individual Exercises inside Log */}
                                                        {Object.entries(log.results?.reps || {}).map(([exIdx, reps], idx) => {
                                                            // We might not have exercise names in LOGS directly, but we can match with session blocks
                                                            // For now, let's just show indices or find in session if provided
                                                            const blockMetadata = session.blocks?.find(b => b.name === log.blockType || b.id === log.moduleId);
                                                            const exercise = blockMetadata?.exercises?.[exIdx];
                                                            const weight = log.results.actualWeights?.[exIdx] || log.results.weights?.[exIdx] || 0;

                                                            return (
                                                                <div key={idx} className="flex items-center justify-between gap-4 p-3 bg-white rounded-xl border border-slate-100">
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="font-bold text-slate-700 text-sm truncate">{exercise?.nameEs || exercise?.name || `Ejercicio ${parseInt(exIdx) + 1}`}</p>
                                                                        <p className="text-[10px] text-slate-400 font-bold uppercase">{exercise?.manifestation || ''}</p>
                                                                    </div>
                                                                    <div className="flex items-center gap-3 shrink-0">
                                                                        <div className="text-right">
                                                                            <p className="text-sm font-black text-slate-900">{reps} reps</p>
                                                                            <p className="text-[10px] text-slate-400 font-bold uppercase">Realizadas</p>
                                                                        </div>
                                                                        {parseFloat(weight) > 0 && (
                                                                            <div className="w-12 h-10 bg-slate-900 rounded-lg flex flex-col items-center justify-center text-white">
                                                                                <span className="text-xs font-black leading-none">{weight}</span>
                                                                                <span className="text-[8px] font-bold opacity-60">KG</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}

                                                        {log.feedback?.notes && (
                                                            <div className="flex gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                                                                <MessageSquare size={14} className="text-amber-500 shrink-0 mt-0.5" />
                                                                <p className="text-xs text-amber-700 italic leading-relaxed">{log.feedback.notes}</p>
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

                    {/* General Notes */}
                    {results.notes && (
                        <div className="space-y-3">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Notas Generales</h3>
                            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm italic text-slate-600 text-sm leading-relaxed">
                                "{results.notes}"
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Section */}
                <div className="p-6 bg-white border-t border-slate-100 shrink-0">
                    <button
                        onClick={onClose}
                        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-xl shadow-slate-900/20 active:scale-95 transition-all"
                    >
                        Cerrar Resumen
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default SessionResultsModal;
