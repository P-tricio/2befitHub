import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle, Clock, Activity, Dumbbell, Zap, TrendingUp, ChevronUp,
    ChevronDown, TrendingDown, X, Minus, MessageSquare, Camera, Check
} from 'lucide-react';
import { uploadToImgBB } from '../../services/imageService';
import { generateSessionAnalysis } from '../utils/analysisUtils';
import RPESelector from '../../components/RPESelector';

const SummaryBlock = ({ session, sessionState, timeline, history, setSessionState, onFinish, globalTime, isProcessing }) => {
    const { insights, metrics } = generateSessionAnalysis(sessionState.results || {}, timeline, history);
    const [expandedAdjustments, setExpandedAdjustments] = useState(true);
    const [expandedWork, setExpandedWork] = useState(true);
    const [expandedBlockIndex, setExpandedBlockIndex] = useState({}); // Tracking individual block expansion
    const totalMinutes = Math.floor(globalTime / 60);

    // Evidence upload state
    const [evidenceUrl, setEvidenceUrl] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        try {
            const url = await uploadToImgBB(file);
            setEvidenceUrl(url);
            // Also save to feedback state
            setSessionState(prev => ({
                ...prev,
                feedback: { ...prev.feedback, evidenceUrl: url }
            }));
        } catch (err) {
            console.error("Error uploading evidence:", err);
        }
        setIsUploading(false);
    };

    return (
        <div className="flex-1 flex flex-col pt-4 max-w-xl mx-auto w-full bg-white min-h-screen">
            {/* Celebration Header - Premium Light */}
            <div className="text-center mb-6 px-4 pt-4">
                <motion.div
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto text-white shadow-lg shadow-emerald-500/20 mb-3"
                >
                    <CheckCircle size={32} strokeWidth={3} />
                </motion.div>
                <h2 className="text-2xl font-black text-slate-900 mb-0.5 tracking-tight">¡Sesión Completada!</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Rendimiento guardado con éxito</p>
            </div>

            {/* Premium Metrics Grid - Light Theme */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 px-4 mb-6">
                <div className="bg-slate-50 p-3 sm:p-4 rounded-3xl border border-slate-100 text-center">
                    <Clock size={16} className="text-emerald-500 mx-auto mb-1.5" />
                    <p className="text-xl font-black text-slate-900 leading-none mb-1">{totalMinutes || '--'}</p>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Minutos</p>
                </div>
                <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 text-center">
                    {metrics.isPureCardio ? (
                        <>
                            <Activity size={16} className="text-red-500 mx-auto mb-1.5" />
                            <p className="text-xl font-black text-slate-900 leading-none mb-1">
                                {metrics.avgHR || '--'}
                            </p>
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Pulsaciones</p>
                        </>
                    ) : (
                        <>
                            <Dumbbell size={16} className="text-blue-500 mx-auto mb-1.5" />
                            <p className="text-xl font-black text-slate-900 leading-none mb-1">
                                {metrics.totalVolume >= 1000 ? `${(metrics.totalVolume / 1000).toFixed(1)}k` : metrics.totalVolume}
                            </p>
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">KG Totales</p>
                        </>
                    )}
                </div>
                <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 text-center">
                    {metrics.isPureCardio ? (
                        <>
                            <Zap size={16} className="text-blue-500 mx-auto mb-1.5" />
                            <p className="text-xl font-black text-slate-900 leading-none mb-1">{metrics.cardioPace || '--'}</p>
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Ritmo min/km</p>
                        </>
                    ) : (
                        <>
                            <Zap size={16} className="text-amber-500 mx-auto mb-1.5" />
                            <p className="text-xl font-black text-slate-900 leading-none mb-1">{metrics.efficiency}%</p>
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Eficacia</p>
                        </>
                    )}
                </div>
            </div>

            <div className="space-y-4 px-4">
                {/* Gestión de Carga Section (Collapsible) */}
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                    <button
                        onClick={() => setExpandedAdjustments(!expandedAdjustments)}
                        className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-all"
                    >
                        <div className="flex items-center gap-3">
                            <TrendingUp size={18} className="text-indigo-500" />
                            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Ajustes Técnicos</h3>
                        </div>
                        <div className="text-slate-300">
                            {expandedAdjustments ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                    </button>

                    <AnimatePresence>
                        {expandedAdjustments && (
                            <motion.div
                                initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="px-5 pb-5 space-y-2">
                                    {insights.length > 0 ? insights.map((insight, idx) => (
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
                                    )) : (
                                        <p className="text-center py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">No hay ajustes pendientes</p>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Resumen de Trabajo Section (Collapsible) */}
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                    <button
                        onClick={() => setExpandedWork(!expandedWork)}
                        className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-all"
                    >
                        <div className="flex items-center gap-3">
                            <Activity size={18} className="text-emerald-500" />
                            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Resumen de Trabajo</h3>
                        </div>
                        <div className="text-slate-300">
                            {expandedWork ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                    </button>

                    <AnimatePresence>
                        {expandedWork && (
                            <motion.div
                                initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="px-5 pb-5 space-y-3">
                                    {timeline.map((step, idx) => {
                                        if (step.type !== 'WORK') return null;
                                        const result = sessionState.results[idx];
                                        if (!result) return null;

                                        const rawProtocol = step.module.protocol || 'LIBRE';
                                        const protocol = rawProtocol.replace('PDP-', '').toUpperCase() === 'MIX' ? 'LIBRE' : rawProtocol.replace('PDP-', '').toUpperCase();
                                        const isBlockExpanded = expandedBlockIndex[idx] !== false; // Default expanded

                                        return (
                                            <div key={idx} className="bg-slate-50/50 rounded-2xl border border-slate-100 overflow-hidden">
                                                <button
                                                    onClick={() => setExpandedBlockIndex(prev => ({ ...prev, [idx]: !isBlockExpanded }))}
                                                    className="w-full p-4 flex justify-between items-center hover:bg-slate-100/50 transition-colors"
                                                >
                                                    <div className="flex flex-col items-start">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{step.blockType || step.module.name}</span>
                                                            {result.feedback?.rpe && (
                                                                <span className="text-[9px] font-black bg-slate-900 text-white px-1.5 py-0.5 rounded ml-1">RPE {result.feedback.rpe}</span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-slate-900 font-black text-[10px] mt-0.5">
                                                            <Clock size={10} className="text-slate-300" />
                                                            <span>
                                                                {result.skipped
                                                                    ? <span className="text-slate-400 capitalize">Saltado</span>
                                                                    : protocol === 'R'
                                                                        ? (result.elapsed > 0
                                                                            ? `${Math.floor(result.elapsed / 60)}:${(result.elapsed % 60).toString().padStart(2, '0')}`
                                                                            : ((result.reps && Object.values(result.reps).some(r => r > 0)) ? 'Completado' : '--'))
                                                                        : protocol === 'T'
                                                                            ? `${Math.floor((step.module.targeting?.[0]?.timeCap || 0) / 60)} min`
                                                                            : protocol === 'E'
                                                                                ? `${step.module.emomParams?.durationMinutes || '--'} min`
                                                                                : 'Tradicional'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="text-slate-300">
                                                        {isBlockExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                    </div>
                                                </button>

                                                <AnimatePresence>
                                                    {isBlockExpanded && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: 'auto', opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            className="overflow-hidden"
                                                        >
                                                            <div className="px-4 pb-4 space-y-2">
                                                                {protocol === 'E' && result.emomResults ? (
                                                                    <div className="flex flex-col gap-3">
                                                                        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                                                                            {Object.entries(result.emomResults).map(([round, status]) => (
                                                                                <div key={round} className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-[10px] font-black ${status === 'success' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/10' : status === 'fail' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/10' : 'bg-slate-200 text-slate-400'}`}>
                                                                                    {round}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                        <div className="grid gap-1.5">
                                                                            {step.module.exercises?.map((ex, exIdx) => (
                                                                                <div key={exIdx} className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-100">
                                                                                    <span className="text-xs font-bold text-slate-700 truncate max-w-[60%]">{ex.nameEs || ex.name}</span>
                                                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                                                                        {result.actualWeights?.[exIdx] || result.weights?.[exIdx] || 0}kg
                                                                                    </span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                ) : protocol === 'LIBRE' ? (
                                                                    <div className="grid gap-2">
                                                                        {step.module.exercises?.map((ex, exIdx) => (
                                                                            <div key={exIdx} className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-2">
                                                                                <div className="flex justify-between items-start">
                                                                                    <span className="text-xs font-black text-slate-900 leading-tight flex-1 mr-2">{ex.nameEs || ex.name}</span>
                                                                                    <span className="text-[10px] font-black bg-blue-500 text-white px-2 py-0.5 rounded-lg">
                                                                                        {result.libreSetsDone?.[exIdx] || 0} Sets
                                                                                    </span>
                                                                                </div>

                                                                                {/* Per-Set Details */}
                                                                                <div className="flex flex-wrap gap-1.5">
                                                                                    {Array.from({ length: result.libreSetsDone?.[exIdx] || 0 }).map((_, sIdx) => {
                                                                                        const reps = result.libreSetReps?.[exIdx]?.[sIdx] || 0;
                                                                                        const weight = result.libreSeriesWeights?.[exIdx]?.[sIdx] || 0;
                                                                                        return (
                                                                                            <div key={sIdx} className="bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg flex items-center gap-1">
                                                                                                <span className="text-[10px] font-black text-slate-900">{reps}</span>
                                                                                                <span className="text-[8px] text-slate-400 font-bold">@</span>
                                                                                                <span className="text-[10px] font-black text-slate-600 font-mono">{weight}kg</span>
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <div className="grid gap-1.5">
                                                                        {step.module.exercises?.map((ex, exIdx) => (
                                                                            <div key={exIdx} className="flex flex-col gap-1.5 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                                                                                <div className="flex justify-between items-start bg-white gap-2">
                                                                                    <div className="flex items-start gap-2 min-w-0 flex-1">
                                                                                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0 mt-1" />
                                                                                        <span className="text-xs font-bold text-slate-700 leading-tight break-words">{ex.nameEs || ex.name}</span>
                                                                                    </div>
                                                                                    <div className="flex items-center gap-2 shrink-0">
                                                                                        <span className="text-xs font-black text-slate-900">
                                                                                            {result.reps?.[exIdx] || 0} <span className="text-[8px] opacity-40 uppercase">
                                                                                                {(session?.isCardio || ex.config?.forceCardio || ['E', 'ENERGÍA', 'CARDIO', 'RESISTENCIA', 'C'].includes((ex.quality || '').toUpperCase())) ? (result.energyMetrics?.[exIdx]?.volumeUnit || 'kcal') : 'reps'}
                                                                                            </span>
                                                                                        </span>
                                                                                        {(result.actualWeights?.[exIdx] || result.weights?.[exIdx]) > 0 && (
                                                                                            <span className="bg-slate-900 text-white px-2 py-0.5 rounded-lg text-[9px] font-black font-mono">
                                                                                                {result.actualWeights?.[exIdx] || result.weights?.[exIdx]}
                                                                                                <span className="text-[7px] ml-0.5 opacity-50">
                                                                                                    {(session?.isCardio || ex.config?.forceCardio || ['E', 'ENERGÍA', 'CARDIO', 'RESISTENCIA', 'C'].includes((ex.quality || '').toUpperCase())) ? (result.energyMetrics?.[exIdx]?.intensityUnit || 'W') : 'kg'}
                                                                                                </span>
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex flex-wrap items-center gap-2 ml-3.5">
                                                                                    {(session?.isCardio || ex.config?.forceCardio || ['E', 'ENERGÍA', 'CARDIO', 'RESISTENCIA', 'C'].includes((ex.quality || '').toUpperCase())) && result.heartRates?.[exIdx] && (
                                                                                        <div className="bg-red-50 text-red-600 px-1.5 py-0.5 rounded text-[8px] font-black uppercase flex items-center gap-1">
                                                                                            <Activity size={8} />
                                                                                            {result.heartRates[exIdx]} BPM
                                                                                        </div>
                                                                                    )}
                                                                                    {protocol === 'T' && (
                                                                                        <div className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded text-[8px] font-black uppercase flex items-center gap-1">
                                                                                            <Clock size={8} />
                                                                                            Objetivo: {(step.module.targeting?.[0]?.timeCap || 240) / 60}'
                                                                                        </div>
                                                                                    )}
                                                                                    {protocol === 'R' && result.elapsed > 0 && (
                                                                                        <div className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-[8px] font-black uppercase flex items-center gap-1">
                                                                                            <Clock size={8} />
                                                                                            Logrado: {Math.floor(result.elapsed / 60)}:{(result.elapsed % 60).toString().padStart(2, '0')}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                                {result.exerciseNotes?.[exIdx] && (
                                                                                    <div className="mt-1 flex items-start gap-2 bg-slate-50/50 p-2 rounded-lg border border-slate-100/50">
                                                                                        <MessageSquare size={10} className="text-slate-300 mt-0.5" />
                                                                                        <p className="text-[10px] text-slate-500 italic leading-tight">"{result.exerciseNotes[exIdx]}"</p>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}

                                                                {/* Block Feedback Notes */}
                                                                {result.feedback?.notes && (
                                                                    <div className="bg-amber-50/50 p-3 rounded-2xl border border-amber-100 flex gap-3 mt-1 shadow-sm">
                                                                        <MessageSquare size={14} className="text-amber-500 shrink-0 mt-0.5" />
                                                                        <p className="text-[11px] font-medium text-amber-900/70 italic leading-relaxed">"{result.feedback.notes}"</p>
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
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Feedback Section - Light Theme */}
                <div className="space-y-4 pt-2">
                    <RPESelector
                        value={sessionState.feedback.rpe}
                        isLight={true}
                        onChange={val => setSessionState(prev => ({ ...prev, feedback: { ...prev.feedback, rpe: val } }))}
                        label="Esfuerzo de la Sesión (RPE)"
                    />

                    <div className="flex flex-col gap-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Evidencia del entrenamiento</label>
                        <div className="flex items-center gap-4">
                            <input
                                type="file"
                                id="final-evidence"
                                className="hidden"
                                accept="image/*"
                                onChange={handleImageUpload}
                                disabled={isUploading}
                            />
                            <label
                                htmlFor="final-evidence"
                                className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-[1.5rem] border-2 border-dashed transition-all cursor-pointer ${evidenceUrl ? 'bg-emerald-50 border-emerald-500/20 text-emerald-600' : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'}`}
                            >
                                {isUploading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                                        <span className="text-sm font-bold">Subiendo...</span>
                                    </>
                                ) : (
                                    <>
                                        <Camera size={18} />
                                        <span className="text-sm font-bold">{evidenceUrl ? 'Cambiar Evidencia' : 'Subir Foto / Vídeo'}</span>
                                    </>
                                )}
                            </label>
                        </div>
                        {evidenceUrl && (
                            <div className="relative w-full aspect-video rounded-[1.5rem] overflow-hidden border border-slate-100 shadow-sm">
                                <img src={evidenceUrl} alt="Evidencia final" className="w-full h-full object-cover" />
                                <div className="absolute top-3 right-3 bg-emerald-500 text-white p-1.5 rounded-full shadow-lg">
                                    <Check size={14} strokeWidth={3} />
                                </div>
                            </div>
                        )}
                    </div>

                    <div>
                        <textarea
                            placeholder="Notas generales de la sesión..."
                            className="w-full bg-white rounded-3xl p-4 text-slate-900 text-sm outline-none border border-slate-200 focus:border-emerald-500 transition-all font-medium shadow-sm placeholder:text-slate-300"
                            rows={3}
                            value={sessionState.feedback.comment}
                            onChange={e => setSessionState(prev => ({ ...prev, feedback: { ...prev.feedback, comment: e.target.value } }))}
                        />
                    </div>
                </div>
            </div>

            <div className="mt-4 px-6 pb-20">
                <button
                    onClick={() => onFinish({ metrics, analysis: insights })}
                    disabled={isProcessing}
                    className={`w-full font-black text-sm py-5 rounded-[2rem] shadow-xl transition-all uppercase tracking-[0.2em] flex items-center justify-center gap-2 ${isProcessing ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-emerald-600 text-white shadow-emerald-900/20 hover:bg-emerald-500 active:scale-[0.98]'}`}
                >
                    {isProcessing ? (
                        <>
                            <div className="w-5 h-5 border-2 border-slate-500/30 border-t-slate-400 rounded-full animate-spin" />
                            <span>Guardando...</span>
                        </>
                    ) : (
                        <span>Finalizar Entrenamiento</span>
                    )}
                </button>
            </div>
        </div >
    );
};

export default SummaryBlock;
