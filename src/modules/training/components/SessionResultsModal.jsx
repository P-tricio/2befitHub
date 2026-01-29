import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Clock, Zap, Star, MessageSquare, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, Dumbbell, CheckCircle, Activity } from 'lucide-react';
import { TrainingDB } from '../services/db';
import { format } from 'date-fns';

const SessionResultsModal = ({ task, session, onClose, userId }) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedAdjustments, setExpandedAdjustments] = useState(true);
    const [expandedBlocks, setExpandedBlocks] = useState({});
    const [libraryExercises, setLibraryExercises] = useState([]);

    const results = task?.results || {};
    const dateKey = task?.scheduledDate || format(new Date(task?.completedAt || Date.now()), 'yyyy-MM-dd');

    useEffect(() => {
        const fetchLogsAndLibrary = async () => {
            if (!userId || !session?.id) return;
            try {
                const [sessionLogs, exercises] = await Promise.all([
                    TrainingDB.logs.getBySession(userId, session.id, dateKey),
                    TrainingDB.exercises.getAll()
                ]);
                // Filter out metadata logs
                setLogs(sessionLogs.filter(l => l.moduleId && l.results));
                setLibraryExercises(exercises);
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchLogsAndLibrary();
    }, [userId, session?.id, dateKey]);

    const libraryMap = new Map(libraryExercises.map(e => [e.id, e]));

    // Generic robust normalization for name matching
    const normalizeName = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '').replace(/s$/, '');

    // Enhanced name map for better matching
    const libraryNameMap = new Map();
    libraryExercises.forEach(e => {
        if (e.name) libraryNameMap.set(normalizeName(e.name), e);
        if (e.nameEs) libraryNameMap.set(normalizeName(e.nameEs), e);
    });

    // Helper to get reps with EMOM inference
    const getInferredReps = (log, exIdx, exercise, blockMetadata) => {
        let reps = log.results?.reps?.[exIdx];

        // EMOM Reps Inference
        if ((reps === undefined || reps === 0) && log.protocol === 'E') {
            const successCount = Object.values(log.results?.emomResults || {}).filter(s => s === 'success').length;
            const targetPerRound = exercise?.targetReps || blockMetadata?.module?.targeting?.[0]?.volume || 0;
            reps = successCount * targetPerRound;
        }
        return reps || 0;
    };

    // Helper for fuzzy matching names
    const getSpanishName = (ex, fallbackIdx) => {
        if (ex?.nameEs) return ex.nameEs;

        const target = normalizeName(ex?.name);

        let libEx = libraryMap.get(ex?.id);
        if (!libEx && target) libEx = libraryNameMap.get(target);

        return libEx?.nameEs || libEx?.name || ex?.nameEs || ex?.name || `Ejercicio ${fallbackIdx + 1}`;
    };

    // Calculate fallback metrics if missing from task
    const calculatedResults = useMemo(() => {
        // If task has valid results, use them as primary source
        if (task?.results && Object.keys(task.results).length > 0 && (task.results.totalVolume > 0 || task.results.efficiency > 0)) {
            return task.results;
        }

        if (loading || logs.length === 0) return task?.results || {};

        let totalVolume = 0;
        let totalEfficiency = 0;
        let blocksWithEfficiency = 0;

        logs.forEach(log => {
            if (!log.results) return;
            const blockMetadata = session.blocks?.find(b => b.id === log.moduleId || b.name === log.blockType);
            const exercises = blockMetadata?.exercises || log.exercises || [];

            exercises.forEach((ex, idx) => {
                const reps = getInferredReps(log, idx, ex, blockMetadata);
                const weight = parseFloat(log.results.actualWeights?.[idx] || log.results.weights?.[idx] || 0) || 0;
                totalVolume += (reps * weight);
            });

            // Basic efficiency estimation for legacy/missing data: 100% if not skipped and has results
            totalEfficiency += 100;
            blocksWithEfficiency++;
        });

        return {
            ...task?.results,
            totalVolume: Math.round(totalVolume),
            efficiency: blocksWithEfficiency > 0 ? Math.round(totalEfficiency / blocksWithEfficiency) : 100,
            durationMinutes: task?.results?.durationMinutes || task?.results?.duration || logs.reduce((acc, l) => acc + (l.results?.durationMinutes || 0), 0) || '--'
        };
    }, [task?.results, logs, loading, session?.blocks]);

    const toggleBlock = (idx) => {
        setExpandedBlocks(prev => ({
            ...prev,
            [idx]: prev[idx] === false // If explicitly false, set to true. Else (undefined/true) set to false.
                ? true
                : false
        }));
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
                            <p className="text-base font-black uppercase tracking-widest">{calculatedResults.durationMinutes || '--'} <span className="text-[8px] opacity-40">min</span></p>
                        </div>
                        <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 text-center">
                            <Dumbbell size={12} className="text-blue-500 mx-auto mb-1" />
                            <p className="text-base font-black uppercase tracking-widest">{calculatedResults.totalVolume !== undefined ? (calculatedResults.totalVolume >= 1000 ? `${(calculatedResults.totalVolume / 1000).toFixed(1)}k` : calculatedResults.totalVolume) : '--'} <span className="text-[8px] opacity-40">kg</span></p>
                        </div>
                        <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 text-center">
                            <Zap size={12} className="text-amber-500 mx-auto mb-1" />
                            <p className="text-base font-black uppercase tracking-widest">{calculatedResults.efficiency || calculatedResults.metrics?.efficiency || '--'} <span className="text-[8px] opacity-40">%</span></p>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">

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
                                                <div key={idx} className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center gap-4">
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
                                {logs.map((log, lIdx) => {
                                    const isExpanded = expandedBlocks[lIdx] !== false; // Default expanded
                                    const blockMetadata = session.blocks?.find(b => b.id === log.moduleId || b.name === log.blockType);
                                    const exercisesToShow = blockMetadata?.exercises || log.exercises || [];
                                    const hasWork = exercisesToShow.some((ex, idx) => getInferredReps(log, idx, ex, blockMetadata) > 0);

                                    return (
                                        <div key={log.id || lIdx} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                                            <button
                                                onClick={() => toggleBlock(lIdx)}
                                                className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-all text-left"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black tracking-widest ${log.blockType === 'BOOST' ? 'bg-orange-500/10 text-orange-600' :
                                                        log.blockType === 'BASE' ? 'bg-emerald-500/10 text-emerald-600' :
                                                            log.blockType === 'BUILD' ? 'bg-blue-500/10 text-blue-600' :
                                                                log.blockType === 'BURN' ? 'bg-rose-500/10 text-rose-600' :
                                                                    'bg-slate-100 text-slate-600'
                                                        }`}>
                                                        {log.blockType?.[0] || 'S'}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                                                {log.blockType || 'Bloque'}
                                                            </p>
                                                            {log.results?.feedback?.rpe && (
                                                                <span className="text-[9px] font-black bg-slate-900 text-white px-1.5 py-0.5 rounded ml-1">RPE {log.results.feedback.rpe}</span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-slate-900 font-black text-[10px] mt-0.5">
                                                            <Clock size={10} className="text-slate-300" />
                                                            <span>
                                                                {log.results?.skipped
                                                                    ? <span className="text-slate-400 capitalize">Saltado</span>
                                                                    : log.protocol === 'R'
                                                                        ? (log.results?.elapsed > 0
                                                                            ? `${Math.floor(log.results.elapsed / 60)}:${(log.results.elapsed % 60).toString().padStart(2, '0')}`
                                                                            : (hasWork ? 'Completado' : '--'))
                                                                        : log.protocol === 'T'
                                                                            ? `${Math.floor((log.results?.timeCap || log.module?.targeting?.[0]?.timeCap || 240) / 60)} min`
                                                                            : `${log.results?.durationMinutes || log.module?.emomParams?.durationMinutes || Object.keys(log.results?.emomResults || {}).length || '--'} min`}
                                                            </span>
                                                            {(log.results?.rpe || log.feedback?.rpe) && (
                                                                <div className="flex items-center gap-1 ml-1 pl-2 border-l border-slate-100">
                                                                    <Star size={10} className="text-amber-500 fill-amber-500" />
                                                                    <span className="text-slate-900">RPE {log.results?.rpe || log.feedback?.rpe}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-slate-300">
                                                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                </div>
                                            </button>

                                            <AnimatePresence>
                                                {isExpanded && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        className="overflow-hidden"
                                                    >
                                                        <div className="px-5 pb-5 space-y-2">
                                                            {log.protocol === 'E' && log.results?.emomResults && (
                                                                <div className="flex gap-1.5 overflow-x-auto pb-2 no-scrollbar mb-1">
                                                                    {Object.entries(log.results.emomResults).map(([round, status]) => (
                                                                        <div key={round} className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-[10px] font-black ${status === 'success' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/10' : status === 'fail' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/10' : 'bg-slate-200 text-slate-400'}`}>
                                                                            {round}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}

                                                            <div className="grid gap-1.5">
                                                                {(() => {
                                                                    return exercisesToShow.map((exercise, exIdx) => {
                                                                        const reps = getInferredReps(log, exIdx, exercise, blockMetadata);
                                                                        const weight = log.results?.actualWeights?.[exIdx] || log.results?.weights?.[exIdx] || 0;

                                                                        // Localization Enrichment
                                                                        const displayName = getSpanishName(exercise, exIdx);

                                                                        return (
                                                                            <div key={exIdx} className="flex flex-col gap-1.5 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                                                                                <div className="flex justify-between items-start gap-2">
                                                                                    <div className="flex items-start gap-2 min-w-0 flex-1">
                                                                                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0 mt-1.5" />
                                                                                        <span className="text-xs font-bold text-slate-700 leading-tight break-words">{displayName}</span>
                                                                                    </div>
                                                                                    <div className="flex items-center gap-2 shrink-0">
                                                                                        <span className="text-xs font-black text-slate-900">{reps || 0} <span className="text-[8px] opacity-40 uppercase">reps</span></span>
                                                                                        {parseFloat(weight) > 0 && (
                                                                                            <span className="bg-slate-900 text-white px-2 py-0.5 rounded-lg text-[9px] font-black font-mono">
                                                                                                {weight}kg
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                                {log.results?.exerciseNotes?.[exIdx] && (
                                                                                    <div className="mt-1 flex items-start gap-2 bg-slate-50/50 p-2 rounded-lg border border-slate-100/50">
                                                                                        <MessageSquare size={10} className="text-slate-300 mt-0.5" />
                                                                                        <p className="text-[10px] text-slate-500 italic leading-tight">"{log.results.exerciseNotes[exIdx]}"</p>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    });
                                                                })()}
                                                            </div>

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
                                    );
                                })}
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
