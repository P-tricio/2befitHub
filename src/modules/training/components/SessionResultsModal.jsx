import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Clock, Zap, Star, MessageSquare, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, Dumbbell, CheckCircle, Activity, Camera, Footprints } from 'lucide-react';
import { TrainingDB } from '../services/db';
import { format } from 'date-fns';
import ExerciseMedia from './ExerciseMedia';

const SessionResultsModal = ({ task, session, onClose, userId }) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedAdjustments, setExpandedAdjustments] = useState(true);
    const [expandedBlocks, setExpandedBlocks] = useState({});
    const [libraryExercises, setLibraryExercises] = useState([]);
    const [sessionFeedback, setSessionFeedback] = useState(null);

    const results = task?.results || {};
    const dateKey = task?.scheduledDate || results?.scheduledDate || format(new Date(task?.completedAt || Date.now()), 'yyyy-MM-dd');

    useEffect(() => {
        const fetchLogsAndLibrary = async () => {
            if (!userId || !session?.id) return;
            try {
                const [sessionLogs, exercises] = await Promise.all([
                    TrainingDB.logs.getBySession(userId, session.id, dateKey),
                    TrainingDB.exercises.getAll()
                ]);

                // Identify standard workload logs
                setLogs(sessionLogs.filter(l => l.moduleId && l.results));

                // Find potential session-level feedback log
                const feedbackLog = sessionLogs.find(l => l.type === 'SESSION_FEEDBACK');
                if (feedbackLog) setSessionFeedback(feedbackLog);

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
    const normalizeName = (s) => (s || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');

    // Enhanced name map for better matching
    const libraryNameMap = new Map();
    libraryExercises.forEach(e => {
        if (e.name) libraryNameMap.set(normalizeName(e.name), e);
        if (e.nameEs) libraryNameMap.set(normalizeName(e.nameEs), e);
    });

    // Helper to get reps with EMOM inference and string-corruption fix
    const getInferredReps = (log, exIdx, exercise, blockMetadata) => {
        // PRIORITY 1: Re-calculate sum from per-set data (seriesReps) to fix string concatenation bugs (e.g. "0555")
        const seriesReps = log.results?.seriesReps?.[exIdx] || log.results?.libreSetReps?.[exIdx];
        if (seriesReps && Array.isArray(seriesReps) && seriesReps.length > 0) {
            return seriesReps.reduce((a, b) => (parseInt(a, 10) || 0) + (parseInt(b, 10) || 0), 0);
        }

        let reps = log.results?.reps?.[exIdx];

        // Handle stringified sums (like "0555") by checking if it's unusually long for a sum
        if (typeof reps === 'string' && reps.length > 3 && reps.startsWith('0')) {
            return parseInt(reps, 10) || 0;
        }

        // PRIORITY 2: EMOM Reps Inference
        if ((reps === undefined || reps === 0) && log.protocol?.includes('E')) {
            const successCount = Object.values(log.results?.emomResults || {}).filter(s => s === 'success').length;
            const targetPerRound = exercise?.targetReps || blockMetadata?.module?.targeting?.[0]?.volume || 0;
            reps = successCount * targetPerRound;
        }
        return parseInt(reps, 10) || 0;
    };

    const getSpanishName = (ex, fallbackIdx) => {
        const exId = ex?.id || ex?.exerciseId;
        if (exId) {
            const libEx = libraryMap.get(exId);
            if (libEx?.nameEs) return libEx.nameEs;
            if (libEx?.name) return libEx.name;
        }
        const target = normalizeName(ex?.name || ex?.nameEs);
        if (target) {
            const libEx = libraryNameMap.get(target);
            if (libEx?.nameEs) return libEx.nameEs;
        }
        return ex?.nameEs || ex?.name || `Ejercicio ${fallbackIdx + 1}`;
    };

    const getProtocolName = (protocol) => {
        const protocols = {
            'E': 'EMOM',
            'A': 'AMRAP',
            'R': 'REPETICIONES',
            'T': 'TIEMPO',
            'F': 'FOR TIME',
            'LIBRE': 'LIBRE'
        };
        const code = protocol?.replace('PDP-', '') || 'LIBRE';
        return protocols[code] || code;
    };

    const getVolumeUnit = (exercise, log) => {
        const exId = exercise?.id || exercise?.exerciseId;
        const libEx = libraryMap.get(exId);
        const qualities = libEx?.qualities || (libEx?.quality ? [libEx.quality] : []);
        const normQualities = qualities.map(q => q.toLowerCase());
        const isBoost = log?.blockType?.toUpperCase().includes('BOOST');

        if (normQualities.includes('e') || normQualities.includes('energía') || normQualities.includes('energia') || isBoost) {
            return "seg";
        }
        if (exercise?.targetUnit) return exercise.targetUnit;
        return "reps";
    };

    const calculatedResults = useMemo(() => {
        // Use real logs if available, otherwise synthesize "virtual logs" from task.results
        // This ensures the summary and breakdown always show data if it was saved to the task

        // First, check if results are in nested format (cardio: { 1: { ...data } })
        // and flatten them if so
        let flattenedResults = task?.results || {};
        const firstKey = Object.keys(flattenedResults)[0];
        if (firstKey && !isNaN(firstKey) && flattenedResults[firstKey]?.type === 'cardio') {
            // Cardio results are nested, flatten the first one for top-level metrics
            flattenedResults = { ...flattenedResults, ...flattenedResults[firstKey] };
        }

        const effectiveLogs = logs.length > 0 ? logs : Object.keys(task?.results || {})
            .filter(key => !isNaN(key) || (typeof key === 'string' && key.length > 30)) // filter metadata keys
            .map(key => {
                const blockResults = task.results[key];
                // Try to find matching block in session to get metadata
                const blockIdx = parseInt(key);
                const blockMetadata = session.blocks?.[blockIdx - 1] || session.blocks?.find(b => b.id === key || b.stableId === key);
                return {
                    id: `vlog-${key}`,
                    isVirtual: true,
                    moduleId: blockMetadata?.id || key,
                    blockType: blockMetadata?.type || 'WORK',
                    protocol: blockMetadata?.protocol || (blockResults.type === 'cardio' ? 'Cardio' : 'LIBRE'),
                    results: blockResults,
                    exercises: blockMetadata?.exercises || blockResults.exercises || []
                };
            });

        if (loading) return task?.results || {};

        let totalVolume = 0;
        let totalEfficiency = 0;
        let blocksWithEfficiency = 0;
        let foundCardioMetrics = { distance: null, pace: null, heartRateAvg: null, durationMinutes: null };

        effectiveLogs.forEach(log => {
            if (!log.results) return;
            const blockMetadata = session.blocks?.find(b => b.id === log.moduleId || b.name === log.blockType);
            const exercises = blockMetadata?.exercises || log.exercises || [];

            // Pull cardio metrics from ANY block that has them
            if (log.results.distance) foundCardioMetrics.distance = log.results.distance;
            if (log.results.pace) foundCardioMetrics.pace = log.results.pace;
            if (log.results.heartRateAvg) foundCardioMetrics.heartRateAvg = log.results.heartRateAvg;
            if (log.results.durationMinutes || log.results.duration) {
                const mins = parseFloat(log.results.durationMinutes || log.results.duration) || 0;
                foundCardioMetrics.durationMinutes = (foundCardioMetrics.durationMinutes || 0) + mins;
            }

            exercises.forEach((ex, idx) => {
                const reps = getInferredReps(log, idx, ex, blockMetadata);
                const weight = parseFloat(log.results.actualWeights?.[idx] || log.results.weights?.[idx] || 0) || 0;
                const unit = getVolumeUnit(ex, log);
                if (unit === 'reps' && weight > 0) {
                    totalVolume += (reps * weight);
                }
            });

            totalEfficiency += log.results.efficiency || 100;
            blocksWithEfficiency++;
        });

        const calculated = {
            ...flattenedResults,
            totalVolume: Math.round(totalVolume),
            efficiency: blocksWithEfficiency > 0 ? Math.round(totalEfficiency / blocksWithEfficiency) : 100,
            durationMinutes: flattenedResults?.durationMinutes || flattenedResults?.duration || foundCardioMetrics.durationMinutes || '--',
            distance: flattenedResults?.distance || foundCardioMetrics.distance || '--',
            pace: flattenedResults?.pace || foundCardioMetrics.pace || '--',
            heartRateAvg: flattenedResults?.heartRateAvg || foundCardioMetrics.heartRateAvg || '--',
            virtualLogs: effectiveLogs.length > 0 && logs.length === 0 ? effectiveLogs : null
        };

        return calculated;
    }, [task?.results, logs, loading, session?.blocks]);

    const toggleBlock = (idx) => {
        setExpandedBlocks(prev => ({
            ...prev,
            [idx]: prev[idx] === false ? true : false
        }));
    };

    if (!session) return null;

    return createPortal(
        <div className="fixed inset-0 z-[5000] flex flex-col justify-end">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                onClick={onClose}
            />
            <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="relative w-full h-[95vh] rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)] overflow-hidden flex flex-col"
            >
                <div className="flex-1 flex flex-col max-w-lg mx-auto w-full bg-white h-full shadow-2xl overflow-hidden relative">
                    {/* Header Section */}
                    <div className="bg-white p-6 pb-2 text-slate-900 relative shrink-0">
                        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all">
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
                                <p className="text-base font-black uppercase tracking-widest">{calculatedResults.durationMinutes || results.duration || results.durationMinutes || '--'} <span className="text-[8px] opacity-40">min</span></p>
                            </div>
                            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 text-center">
                                {(session.isCardio || (calculatedResults.distance && calculatedResults.distance !== '--')) ? (
                                    <>
                                        <Footprints size={12} className="text-orange-500 mx-auto mb-1" />
                                        <p className="text-base font-black uppercase tracking-widest">
                                            {calculatedResults.distance || '--'} <span className="text-[8px] opacity-40">km</span>
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <Dumbbell size={12} className="text-blue-500 mx-auto mb-1" />
                                        <p className="text-base font-black uppercase tracking-widest">
                                            {calculatedResults.totalVolume !== undefined ? (calculatedResults.totalVolume >= 1000 ? `${(calculatedResults.totalVolume / 1000).toFixed(1)}k` : calculatedResults.totalVolume) : '--'} <span className="text-[8px] opacity-40">kg</span>
                                        </p>
                                    </>
                                )}
                            </div>
                            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 text-center">
                                {(session.isCardio || (calculatedResults.pace && calculatedResults.pace !== '--')) ? (
                                    <>
                                        <Zap size={12} className="text-emerald-500 mx-auto mb-1" />
                                        <p className="text-base font-black uppercase tracking-widest">{calculatedResults.pace || '--'}<span className="text-[8px] opacity-40 ml-0.5">/km</span></p>
                                    </>
                                ) : (
                                    <>
                                        <Zap size={12} className="text-amber-500 mx-auto mb-1" />
                                        <p className="text-base font-black uppercase tracking-widest">{calculatedResults.efficiency || calculatedResults.metrics?.efficiency || '--'} <span className="text-[8px] opacity-40">%</span></p>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
                        {/* Technical Adjustments */}
                        {results.analysis && results.analysis.length > 0 && (
                            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                                <button onClick={() => setExpandedAdjustments(!expandedAdjustments)} className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-all">
                                    <div className="flex items-center gap-3">
                                        <TrendingUp size={16} className="text-indigo-500" />
                                        <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Ajustes Técnicos</h3>
                                    </div>
                                    <div className="text-slate-300">{expandedAdjustments ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</div>
                                </button>
                                <AnimatePresence>
                                    {expandedAdjustments && (
                                        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                                            <div className="px-5 pb-5 space-y-2">
                                                {results.analysis.map((insight, idx) => (
                                                    <div key={idx} className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center gap-4">
                                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${insight.type === 'up' ? 'bg-emerald-100 text-emerald-600' : insight.type === 'down' ? 'bg-rose-100 text-rose-600' : insight.type === 'skipped' ? 'bg-slate-100 text-slate-400' : 'bg-blue-100 text-blue-600'}`}>
                                                            {insight.type === 'up' && <TrendingUp size={16} />}
                                                            {insight.type === 'down' && <TrendingDown size={16} />}
                                                            {insight.type === 'skipped' && <X size={16} />}
                                                            {insight.type === 'keep' && <Minus size={16} />}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tight truncate">{insight.exerciseName || 'Bloque'}</p>
                                                            <p className="text-xs font-bold text-slate-700 leading-tight">{insight.athleteMsg || insight.msg}</p>
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
                            ) : (logs.length === 0 && !calculatedResults.virtualLogs) ? (
                                <div className="py-12 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest bg-white rounded-[2rem] border-2 border-dashed border-slate-100">Sin registros detallados</div>
                            ) : (
                                <div className="space-y-3">
                                    {(logs.length > 0 ? logs : (calculatedResults.virtualLogs || [])).map((log, lIdx) => {
                                        const isExpanded = expandedBlocks[lIdx] !== false;
                                        const blockMetadata = session.blocks?.find(b => b.id === log.moduleId || b.name === log.blockType);
                                        const exercisesToShow = blockMetadata?.exercises || log.exercises || [];
                                        const hasWork = exercisesToShow.some((ex, idx) => getInferredReps(log, idx, ex, blockMetadata) > 0);
                                        const proto = log.protocol?.replace('PDP-', '');

                                        return (
                                            <div key={log.id || lIdx} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                                                <button onClick={() => toggleBlock(lIdx)} className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-all text-left">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black tracking-widest ${log.blockType === 'BOOST' ? 'bg-orange-500/10 text-orange-600' : log.blockType === 'BASE' ? 'bg-emerald-500/10 text-emerald-600' : log.blockType === 'BUILD' ? 'bg-blue-500/10 text-blue-600' : log.blockType === 'BURN' ? 'bg-rose-500/10 text-rose-600' : 'bg-slate-100 text-slate-600'}`}>
                                                            {log.blockType?.[0] || 'S'}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{log.blockType || 'Bloque'}</p>
                                                                <span className="text-[8px] font-black bg-indigo-50 text-indigo-500 px-1.5 py-0.5 rounded border border-indigo-100 uppercase tracking-tighter">{getProtocolName(log.protocol)}</span>
                                                                {(log.results?.rpe || log.results?.feedback?.rpe) && (
                                                                    <span className="text-[9px] font-black bg-slate-900 text-white px-1.5 py-0.5 rounded ml-1">RPE {log.results.rpe || log.results.feedback.rpe}</span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2 text-slate-900 font-black text-[11px] mt-1">
                                                                <Clock size={11} className="text-emerald-500" />
                                                                <span className="tracking-tight text-slate-700">
                                                                    {log.results?.skipped ? <span className="text-slate-400 capitalize">Saltado</span> : (
                                                                        proto === 'R' ? (log.results?.elapsed > 0 ? <span className="flex items-center gap-1"><span className="text-[9px] text-slate-400 uppercase font-black">Tiempo:</span> {Math.floor(log.results.elapsed / 60)}:{(log.results.elapsed % 60).toString().padStart(2, '0')}</span> : (hasWork ? 'Completado' : '--')) :
                                                                            proto === 'T' ? <span className="flex items-center gap-1"><span className="text-[9px] text-slate-400 uppercase font-black">Meta:</span> {Math.floor((log.results?.timeCap || log.module?.targeting?.[0]?.timeCap || 240) / 60)} min</span> :
                                                                                `${log.results?.durationMinutes || log.module?.emomParams?.durationMinutes || Object.keys(log.results?.emomResults || {}).length || '--'} min`
                                                                    )}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-slate-300">{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</div>
                                                </button>

                                                <AnimatePresence>
                                                    {isExpanded && (
                                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                                            <div className="px-5 pb-5 space-y-2">
                                                                {proto === 'E' && log.results?.emomResults && (
                                                                    <>
                                                                        <div className="flex gap-1.5 overflow-x-auto pb-2 no-scrollbar mb-1">
                                                                            {Object.entries(log.results.emomResults).map(([round, status]) => (
                                                                                <div key={round} className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-[10px] font-black ${status === 'success' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/10' : status === 'fail' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/10' : 'bg-slate-200 text-slate-400'}`}>
                                                                                    {round}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                        <div className="flex flex-wrap items-center gap-3 mb-2 px-1">
                                                                            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                                                                                {Object.values(log.results.emomResults).filter(s => s === 'success').length} de {Object.keys(log.results.emomResults).length} rondas completas
                                                                            </span>
                                                                            {exercisesToShow[0]?.targetReps && (
                                                                                <span className="text-[10px] font-black text-slate-500 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100 italic">Meta: {exercisesToShow[0].targetReps} reps/ronda</span>
                                                                            )}
                                                                        </div>
                                                                    </>
                                                                )}

                                                                <div className="grid gap-1.5">
                                                                    {exercisesToShow.map((exercise, exIdx) => {
                                                                        const reps = getInferredReps(log, exIdx, exercise, blockMetadata);
                                                                        const weight = log.results?.actualWeights?.[exIdx] || log.results?.weights?.[exIdx] || 0;
                                                                        const unit = getVolumeUnit(exercise, log);
                                                                        const displayName = getSpanishName(exercise, exIdx);

                                                                        return (
                                                                            <div key={exIdx} className="flex flex-col gap-1.5 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                                                                                <div className="flex justify-between items-start gap-2">
                                                                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                                                                        <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                                                                                            <ExerciseMedia exercise={exercise} thumbnailMode={true} />
                                                                                        </div>
                                                                                        <div className="min-w-0">
                                                                                            <span className="text-xs font-bold text-slate-700 leading-tight block truncate">{displayName}</span>
                                                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter block">{unit}</span>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="flex items-center gap-2 shrink-0">
                                                                                        {(!log.results?.seriesReps?.[exIdx] || log.results?.seriesReps?.[exIdx]?.length === 0) && <span className="text-xs font-black text-slate-900">{reps || 0} <span className="text-[8px] opacity-40 lowercase">{unit}</span></span>}
                                                                                        {(!log.results?.seriesWeights?.[exIdx] || log.results?.seriesWeights?.[exIdx]?.length === 0) && parseFloat(weight) > 0 && <span className="bg-slate-900 text-white px-2 py-0.5 rounded-lg text-[9px] font-black font-mono">{weight}kg</span>}
                                                                                    </div>
                                                                                </div>

                                                                                {log.results?.seriesReps?.[exIdx]?.length > 0 && (
                                                                                    <div className="mt-2 bg-slate-50/50 rounded-xl p-2 border border-slate-100/50">
                                                                                        <div className="flex flex-col divide-y divide-slate-100">
                                                                                            {log.results.seriesReps[exIdx].map((sReps, sIdx) => {
                                                                                                const sWeight = log.results.seriesWeights?.[exIdx]?.[sIdx] || 0;
                                                                                                return (
                                                                                                    <div key={sIdx} className="flex items-center justify-between py-1.5 px-1 first:pt-0 last:pb-0">
                                                                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Serie {sIdx + 1}</span>
                                                                                                        <div className="flex items-center gap-2">
                                                                                                            <span className="text-[11px] font-black text-slate-900">{sReps} <span className="text-[8px] opacity-40 lowercase">{unit}</span></span>
                                                                                                            {parseFloat(sWeight) > 0 && <span className="bg-white border border-slate-200 text-slate-700 px-1.5 py-0.5 rounded-md text-[10px] font-black min-w-[45px] text-center shadow-sm">{sWeight}kg</span>}
                                                                                                        </div>
                                                                                                    </div>
                                                                                                );
                                                                                            })}
                                                                                        </div>
                                                                                    </div>
                                                                                )}

                                                                                {log.results?.exerciseNotes?.[exIdx] && (
                                                                                    <div className="mt-1 flex items-start gap-2 bg-slate-50/50 p-2 rounded-lg border border-slate-100/50">
                                                                                        <MessageSquare size={10} className="text-slate-300 mt-0.5" />
                                                                                        <p className="text-[10px] text-slate-500 italic leading-tight">"{log.results.exerciseNotes[exIdx]}"</p>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })}
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

                        {/* Final Notes */}
                        {(results.notes || sessionFeedback?.results?.notes) && (
                            <div className="space-y-3 pt-4 border-t border-slate-200">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Notas Finales</h3>
                                <div className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm">
                                    <p className="text-slate-600 text-xs font-medium leading-relaxed italic">"{results.notes || sessionFeedback?.results?.notes}"</p>
                                </div>
                            </div>
                        )}

                        {/* Evidence Photo */}
                        {(results.evidenceUrl || task?.evidenceUrl || sessionFeedback?.results?.evidenceUrl) && (
                            <div className="space-y-3 pt-4 border-t border-slate-200">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 flex items-center gap-2"><Camera size={12} /> Evidencia</h3>
                                <div className="rounded-[2rem] overflow-hidden border border-slate-200 bg-slate-50 shadow-sm">
                                    <img src={results.evidenceUrl || task?.evidenceUrl || sessionFeedback?.results?.evidenceUrl} alt="Evidencia" className="w-full h-auto aspect-square object-cover" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-6 bg-white border-t border-slate-200 shrink-0 shadow-lg">
                        <button onClick={onClose} className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] transition-all">Entendido</button>
                    </div>
                </div>
            </motion.div>
        </div>,
        document.body
    );
};

export default SessionResultsModal;
