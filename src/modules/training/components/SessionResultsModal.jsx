import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Clock, Zap, Star, MessageSquare, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, Dumbbell, CheckCircle, Activity } from 'lucide-react';
import { TrainingDB } from '../services/db';
import { format } from 'date-fns';

const SessionResultsModal = ({ task, session, onClose, userId }) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedAdjustments, setExpandedAdjustments] = useState(true);
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
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 md:p-6"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 30 }}
                className="bg-white rounded-[2.5rem] w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-slate-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header Section - Premium Light */}
                <div className="bg-white p-6 pb-2 text-slate-900 relative shrink-0">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all"
                    >
                        <X size={20} className="text-slate-500" />
                    </button>

                    <div className="flex items-center gap-4 mb-6 pt-2">
                        <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white">
                            <CheckCircle size={32} />
                        </div>
                        <div>
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">Sesión Completada</p>
                            <h2 className="text-xl font-black truncate max-w-[240px] tracking-tight">{session.name}</h2>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 text-center">
                            <Clock size={12} className="text-emerald-500 mx-auto mb-1" />
                            <p className="text-base font-black uppercase tracking-widest">{results.durationMinutes || results.duration || '--'} <span className="text-[8px] opacity-40">min</span></p>
                        </div>
                        <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 text-center">
                            <Dumbbell size={12} className="text-blue-500 mx-auto mb-1" />
                            <p className="text-base font-black uppercase tracking-widest">{results.totalVolume ? (results.totalVolume >= 1000 ? `${(results.totalVolume / 1000).toFixed(1)}k` : results.totalVolume) : '--'} <span className="text-[8px] opacity-40">kg</span></p>
                        </div>
                        <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 text-center">
                            <Zap size={12} className="text-amber-500 mx-auto mb-1" />
                            <p className="text-base font-black uppercase tracking-widest">{results.metrics?.efficiency || results.efficiency || '--'} <span className="text-[8px] opacity-40">%</span></p>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">

                    {/* Gestión de Carga Section (Collapsible) */}
                    {results.analysis && results.analysis.length > 0 && (
                        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                            <button
                                onClick={() => setExpandedAdjustments(!expandedAdjustments)}
                                className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-all text-left"
                            >
                                <div className="flex items-center gap-3">
                                    <TrendingUp size={16} className="text-indigo-500" />
                                    <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Ajustes Técnicos</h3>
                                </div>
                                <div className="text-slate-300">
                                    {expandedAdjustments ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </div>
                            </button>

                            <AnimatePresence>
                                {expandedAdjustments && (
                                    <motion.div
                                        initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="px-5 pb-5 space-y-2">
                                            {results.analysis.map((insight, idx) => (
                                                <div key={idx} className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${insight.type === 'up' ? 'bg-emerald-100 text-emerald-600' :
                                                        insight.type === 'down' ? 'bg-rose-100 text-rose-600' :
                                                            insight.type === 'skipped' ? 'bg-slate-100 text-slate-400' :
                                                                'bg-blue-100 text-blue-600'
                                                        }`}>
                                                        {insight.type === 'up' && <TrendingUp size={16} />}
                                                        {insight.type === 'down' && <TrendingDown size={16} />}
                                                        {insight.type === 'skipped' && <X size={16} />}
                                                        {insight.type === 'keep' && <Minus size={16} />}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-tight truncate">
                                                            {insight.exerciseName || 'Bloque'}
                                                        </p>
                                                        <p className="text-xs font-bold text-slate-700 leading-tight">
                                                            {insight.athleteMsg || insight.msg}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}

                    {/* Block Breakdown */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 px-2">
                            <div className="h-4 w-1 bg-emerald-500 rounded-full" />
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Desglose de Trabajo</h3>
                        </div>

                        {loading ? (
                            <div className="py-12 flex flex-col items-center gap-4 text-slate-400">
                                <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent animate-spin rounded-full" />
                                <p className="text-xs font-black uppercase tracking-widest">Calculando...</p>
                            </div>
                        ) : logs.length === 0 ? (
                            <div className="py-12 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest bg-white rounded-[2rem] border-2 border-dashed border-slate-100">
                                Sin registros detallados
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {logs.map((log, lIdx) => (
                                    <div key={log.id || lIdx} className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                                        <button
                                            onClick={() => toggleBlock(lIdx)}
                                            className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-all text-left"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black tracking-widest ${log.blockType === 'BOOST' ? 'bg-orange-600 text-white' :
                                                    log.blockType === 'BASE' ? 'bg-emerald-600 text-white' :
                                                        log.blockType === 'BUILD' ? 'bg-indigo-600 text-white' :
                                                            log.blockType === 'BURN' ? 'bg-rose-600 text-white' :
                                                                'bg-slate-900 text-white'
                                                    }`}>
                                                    {log.blockType?.[0] || 'S'}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black text-slate-900 uppercase tracking-widest">
                                                        Bloque {log.blockType}
                                                    </p>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                        {log.protocol === 'T' ? 'AMRAP' : log.protocol === 'R' ? 'FOR TIME' : 'EMOM'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right hidden sm:block">
                                                    <p className="text-xs font-black text-slate-900">
                                                        {log.protocol === 'R'
                                                            ? (log.results?.elapsed > 0
                                                                ? `${Math.floor(log.results.elapsed / 60)}:${(log.results.elapsed % 60).toString().padStart(2, '0')}`
                                                                : <span className="text-[10px] text-emerald-500 uppercase">Completado</span>)
                                                            : log.protocol === 'T'
                                                                ? `${log.module?.targeting?.[0]?.timeCap / 60 || '--'} min`
                                                                : `${log.module?.emomParams?.durationMinutes || '--'} min`}
                                                    </p>
                                                </div>
                                                <div className="text-slate-300">
                                                    {expandedBlocks[lIdx] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                </div>
                                            </div>
                                        </button>

                                        <AnimatePresence>
                                            {expandedBlocks[lIdx] && (
                                                <motion.div
                                                    initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                                                    className="overflow-hidden bg-slate-50/50"
                                                >
                                                    <div className="px-5 pb-5 pt-2 space-y-2">
                                                        {log.protocol === 'E' && log.results?.emomResults && (
                                                            <div className="flex gap-1.5 overflow-x-auto pb-2 no-scrollbar mb-2">
                                                                {Object.entries(log.results.emomResults).map(([round, status]) => (
                                                                    <div key={round} className={`w-7 h-7 rounded-xl flex items-center justify-center text-[10px] font-black ${status === 'success' ? 'bg-emerald-500 text-white' : status === 'fail' ? 'bg-rose-500 text-white' : 'bg-slate-300 text-white'}`}>
                                                                        {round}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {(() => {
                                                            const blockMetadata = session.blocks?.find(b => b.name === log.blockType || b.id === log.moduleId);
                                                            return (blockMetadata?.exercises || []).map((exercise, exIdx) => {
                                                                let reps = log.results?.reps?.[exIdx];

                                                                // Fallback inference for EMOM (Backwards Compatibility)
                                                                if ((reps === undefined || reps === 0) && log.protocol === 'E' && log.results?.emomResults) {
                                                                    const successCount = Object.values(log.results.emomResults).filter(s => s === 'success').length;
                                                                    const target = exercise.targetReps || blockMetadata.module?.targeting?.[0]?.volume || 0;
                                                                    if (target > 0) {
                                                                        reps = successCount * target;
                                                                    }
                                                                }

                                                                reps = reps || 0;
                                                                const weight = log.results.actualWeights?.[exIdx] || log.results.weights?.[exIdx] || 0;

                                                                return (
                                                                    <div key={exIdx} className="flex items-center justify-between gap-4 p-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                                                        <div className="min-w-0 flex items-center gap-2 flex-1">
                                                                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0" />
                                                                            <div className="min-w-0 flex-1">
                                                                                <p className="font-bold text-slate-700 text-xs truncate">
                                                                                    {exercise?.nameEs || exercise?.name || `Ejercicio ${parseInt(exIdx) + 1}`}
                                                                                </p>
                                                                                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{exercise?.manifestation || 'Fuerza'}</p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-3 shrink-0">
                                                                            <div className="text-right">
                                                                                <p className="text-xs font-black text-slate-900">{reps} <span className="text-[9px] font-normal opacity-40 uppercase">reps</span></p>
                                                                            </div>
                                                                            {parseFloat(weight) > 0 && (
                                                                                <div className="bg-slate-900 px-2 py-0.5 rounded-lg text-white text-[9px] font-black font-mono">
                                                                                    {weight}kg
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            });
                                                        })()}

                                                        {log.feedback?.notes && (
                                                            <div className="bg-amber-50/50 p-3 rounded-2xl border border-amber-100 flex gap-3 mt-1 shadow-sm">
                                                                <MessageSquare size={14} className="text-amber-500 shrink-0 mt-0.5" />
                                                                <p className="text-[11px] font-medium text-amber-900/70 italic leading-relaxed">"{log.feedback.notes}"</p>
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

                    {/* Session Notes */}
                    {results.notes && (
                        <div className="space-y-3 pt-4 border-t border-slate-200">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Notas Finales</h3>
                            <div className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm">
                                <p className="text-slate-600 text-xs font-medium leading-relaxed italic">
                                    "{results.notes}"
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Section */}
                <div className="p-6 bg-white border-t border-slate-200 shrink-0 shadow-lg">
                    <button
                        onClick={onClose}
                        className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] transition-all"
                    >
                        Entendido
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default SessionResultsModal;
