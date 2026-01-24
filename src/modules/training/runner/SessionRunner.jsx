import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { TrainingDB } from '../services/db';
import { useAuth } from '../../../context/AuthContext';
import { ChevronLeft, Play, AlertCircle, CheckCircle, Clock, Plus, TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import { useSessionData } from './hooks/useSessionData.js';
import { useKeepAwake } from '../../../hooks/useKeepAwake';
import { useAudioFeedback } from '../../../hooks/useAudioFeedback';
import ExerciseMedia from '../components/ExerciseMedia';
import RPESelector from '../components/RPESelector';

const SessionRunner = () => {
    // Keep screen awake during session
    useKeepAwake();

    // Audio System
    const { playCountdownShort, playCountdownFinal, playHalfway, playMinuteWarning, playSuccess, playFailure, initAudio } = useAudioFeedback();

    const [globalTime, setGlobalTime] = useState(0);
    const [isGlobalActive, setIsGlobalActive] = useState(false);

    const { sessionId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { currentUser } = useAuth();

    // Data State - now using the new hook
    const { session, modules, timeline, protocol, loading, error } = useSessionData(sessionId);

    // Runner State
    const [currentIndex, setCurrentIndex] = useState(0);

    // Current Step Data
    const currentStep = timeline[currentIndex] || null;

    // NOTE: loadData function removed - now handled by useSessionData hook


    const [sessionState, setSessionState] = useState({
        plans: {}, // { moduleId: { exerciseIndex: weight } }
        results: {}, // { timelineIndex: { reps: {}, weights: {} } }
        feedback: { rpe: null, comment: '' },
        selectedExercise: null, // For Modal
        globalTime: 0,
    });

    useEffect(() => {
        let interval;
        if (isGlobalActive) {
            interval = setInterval(() => {
                setGlobalTime(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isGlobalActive]);
    const [descriptionOpen, setDescriptionOpen] = useState(true);

    const updatePlan = (moduleId, exIdx, weight) => {
        setSessionState(prev => ({
            ...prev,
            plans: {
                ...prev.plans,
                [moduleId]: { ...(prev.plans[moduleId] || {}), [exIdx]: weight }
            }
        }));
    };

    const handleNext = async () => {
        const currentStep = timeline[currentIndex];

        // If Finishing Session (from SUMMARY)
        if (currentStep.type === 'SUMMARY') {
            // Generate analysis insights
            const insights = [];
            let totalElapsed = 0; // Track total session time

            Object.entries(sessionState.results).forEach(([stepIndex, res]) => {
                const step = timeline[stepIndex];
                if (!step || step.type !== 'WORK') return;

                // Accumulate elapsed time from each block
                if (res.elapsed) {
                    totalElapsed += res.elapsed;
                }

                const exercises = step.module.exercises || [];
                if (exercises.length === 0) return;

                const targets = step.module.targeting || [];

                // Analyze EACH exercise individually
                exercises.forEach((ex, idx) => {
                    const repsDone = res.reps?.[idx] || 0;
                    const weightUsed = res.actualWeights?.[idx] || res.weights?.[idx] || 0;
                    const targetReps = ex.targetReps || targets[0]?.volume || 10;

                    // Only analyze exercises with load (loadable exercises)
                    if (!ex.loadable || !weightUsed) return;

                    // Determine adjustment type based on performance
                    let type = 'keep';
                    let adjustment = 0;
                    let msg = '';

                    if (step.module.protocol === 'R' || step.blockType === 'BASE' || step.blockType === 'BUILD') {
                        const diff = repsDone - targetReps;

                        if (diff > 2) {
                            type = 'up';
                            adjustment = 2.5;
                            msg = `Subir peso en ${ex.nameEs || ex.name}`;
                        } else if (diff < -2) {
                            type = 'down';
                            adjustment = -2.5;
                            msg = `Bajar peso en ${ex.nameEs || ex.name}`;
                        } else {
                            type = 'keep';
                            adjustment = 0;
                            msg = `Mantener peso en ${ex.nameEs || ex.name}`;
                        }

                        insights.push({
                            type,
                            moduleId: step.module.id,
                            exerciseId: ex.id,
                            exerciseIndex: idx,
                            exerciseName: ex.nameEs || ex.name,
                            blockType: step.blockType,
                            previousWeight: parseFloat(weightUsed),
                            targetReps,
                            actualReps: repsDone,
                            adjustment,
                            msg
                        });
                    }
                });
            });

            // Determine the target date for markers and logs
            const scheduledDate = location.state?.scheduledDate;
            const targetDate = scheduledDate || new Date().toISOString().split('T')[0];

            setIsGlobalActive(false);

            // Save feedback AND analysis
            await TrainingDB.logs.create(currentUser.uid, {
                sessionId: session.id,
                timestamp: new Date().toISOString(),
                scheduledDate: targetDate,
                type: 'SESSION_FEEDBACK',
                ...sessionState.feedback,
                analysis: insights
            });

            // Mark session as completed in user's schedule
            const durationMin = Math.round(globalTime / 60);
            const rpe = sessionState.feedback.rpe;
            const summary = rpe
                ? `${durationMin || '?'} min • RPE ${rpe}`
                : `${durationMin || '?'} min`;

            // Find task with this sessionId in today's schedule and update it
            try {
                await TrainingDB.users.updateSessionTaskInSchedule(
                    currentUser.uid,
                    targetDate,
                    session.id, // sessionId to find the task
                    {
                        status: 'completed',
                        completedAt: new Date().toISOString(),
                        summary: summary,
                        results: {
                            durationMinutes: durationMin,
                            rpe: rpe,
                            notes: sessionState.feedback.comment,
                            analysis: insights
                        }
                    }
                );
            } catch (err) {
                console.warn('Could not update task in schedule:', err);
            }

            navigate(-1);
            return;
        }

        if (currentIndex < timeline.length - 1) {
            setCurrentIndex(prev => prev + 1);
        }
    };

    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [pendingResults, setPendingResults] = useState(null);

    // Initial log save logic moved to after feedback
    const handleStepComplete = async (results) => {
        const currentStep = timeline[currentIndex];

        if (currentStep.type === 'WORK') {
            // Store results and open feedback modal
            setPendingResults(results);
            setShowFeedbackModal(true);
        } else {
            // Warmup/Summary don't need block RPE
            handleNext();
        }
    };

    const handleBlockFeedbackConfirm = async (feedbackData) => {
        const currentStep = timeline[currentIndex];

        // Sanitize weights
        const sanitizedWeights = {};
        if (pendingResults.weights) {
            Object.keys(pendingResults.weights).forEach(k => {
                sanitizedWeights[k] = pendingResults.weights[k] === undefined ? null : pendingResults.weights[k];
            });
        }

        // Save LOCALLY for Summary Analysis
        setSessionState(prev => ({
            ...prev,
            results: {
                ...prev.results,
                [currentIndex]: { ...pendingResults, weights: sanitizedWeights }
            }
        }));

        // Sync to Firestore including Feedback
        // feedbackData: { rpe: number, notes: string }
        const logEntry = {
            userId: currentUser.uid,
            sessionId: session.id,
            moduleId: currentStep.module.id,
            blockType: currentStep.blockType,
            protocol: currentStep.module.protocol,
            timestamp: new Date().toISOString(),
            scheduledDate: location.state?.scheduledDate || new Date().toISOString().split('T')[0],
            results: { ...pendingResults, weights: sanitizedWeights },
            feedback: feedbackData // { rpe, notes }
        };

        await TrainingDB.logs.create(currentUser.uid, logEntry);

        setShowFeedbackModal(false);
        setPendingResults(null);
        handleNext();
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        } else {
            navigate(-1); // Exit if at start
        }
    };

    if (loading) return <div className="fixed inset-0 z-[5000] bg-slate-900 flex items-center justify-center text-slate-400">Cargando motor de entrenamiento...</div>;
    if (error) return <div className="fixed inset-0 z-[5000] bg-slate-900 flex items-center justify-center text-red-500 font-bold">{error}</div>;

    // Render Steps
    if (currentStep?.type === 'PLANNING') {
        const uniqueModulesInPlan = currentStep.modules || [];
        return (
            <div className="fixed inset-0 z-[5000] bg-slate-900 text-white flex flex-col overflow-hidden">
                {/* Immersive Header */}
                <div className="px-4 py-3 bg-slate-900/90 backdrop-blur-md flex items-center justify-between border-b border-slate-800 shrink-0 z-20">
                    <button onClick={handlePrev} className="w-10 h-10 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-all">
                        <ChevronLeft size={24} />
                    </button>
                    <div className="flex flex-col items-center">
                        <h1 className="text-white font-bold text-lg leading-tight">{session.name}</h1>
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Planificación</span>
                    </div>
                    <div className="w-10" /> {/* Spacer */}
                </div>

                <div className="flex-1 overflow-y-auto p-4 pb-32 space-y-4">
                    {/* Global Info Cards */}
                    <div className="space-y-4 mb-4">
                        {/* Protocol Header (FIRST) */}
                        {(() => {
                            const protocols = uniqueModulesInPlan.map(m => m.protocol).filter(Boolean);
                            const isT = protocols.every(p => p === 'T');
                            const isR = protocols.every(p => p === 'R');
                            const isE = protocols.every(p => p === 'E');

                            let title = "Sesión Híbrida";
                            let desc = "Objetivo: Sesión mixta, atiende a las instrucciones de cada bloque.";
                            let color = "text-blue-500";
                            let bg = "bg-blue-500/10 border-blue-500/20";

                            if (isT) {
                                title = "Protocolo PDP-T (Tiempo)";
                                desc = "Objetivo: Máximas repeticiones con técnica perfecta en el tiempo asignado.";
                                color = "text-emerald-500";
                                bg = "bg-emerald-500/10 border-emerald-500/20";
                            } else if (isR) {
                                title = "Protocolo PDP-R (Reps)";
                                desc = "Objetivo: Máximas repeticiones con técnica perfecta en el menor tiempo posible.";
                                color = "text-purple-500";
                                bg = "bg-purple-500/10 border-purple-500/20";
                            } else if (isE) {
                                title = "Protocolo PDP-E (EMOM)";
                                desc = "Objetivo: Completar las repeticiones asignadas dentro de cada minuto.";
                                color = "text-orange-500";
                                bg = "bg-orange-500/10 border-orange-500/20";
                            }

                            return (
                                <div className={`${bg} border rounded-2xl p-5`}>
                                    <h2 className={`font-black text-sm uppercase tracking-wider mb-2 ${color}`}>{title}</h2>
                                    <p className="text-slate-300 text-xs leading-relaxed">{desc}</p>
                                </div>
                            );
                        })()}

                        {/* Main Timer Display */}
                        {/* Session Description (SECOND) - Collapsible */}
                        {session.description && (
                            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
                                <button
                                    onClick={() => setDescriptionOpen(!descriptionOpen)}
                                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-800 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <AlertCircle size={16} className="text-slate-400" />
                                        <h2 className="font-black text-xs uppercase tracking-wider text-slate-400">Notas de Sesión</h2>
                                    </div>
                                    <ChevronLeft size={16} className={`text-slate-400 transition-transform duration-300 ${descriptionOpen ? 'rotate-90' : '-rotate-90'}`} />
                                </button>
                                <AnimatePresence>
                                    {descriptionOpen && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line px-4 pb-4">{session.description}</p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>

                    {/* Collapsible Module List */}
                    <div className="space-y-3">
                        {uniqueModulesInPlan.map((mod, mIdx) => (
                            <CollapsiblePlanningBlock
                                key={mIdx}
                                module={mod}
                                onSelectExercise={(ex) => setSessionState(prev => ({ ...prev, selectedExercise: { ...ex, protocol: mod.protocol } }))}
                            />
                        ))}
                    </div>

                    <div className="fixed bottom-0 left-0 w-full p-4 bg-gradient-to-t from-slate-900 via-slate-900 to-transparent z-20">
                        <button
                            onClick={() => {
                                initAudio();
                                handleNext();
                            }}
                            className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-black text-xl py-5 rounded-2xl shadow-lg shadow-emerald-900/50 active:scale-95 transition-all"
                        >
                            CONFIRMAR Y EMPEZAR
                        </button>
                    </div>

                    {/* Exercise Detail Modal (Reused) */}
                    <AnimatePresence>
                        {sessionState.selectedExercise && (
                            <ExerciseDetailModal
                                selectedExercise={sessionState.selectedExercise}
                                onClose={() => setSessionState(prev => ({ ...prev, selectedExercise: null }))}
                                protocol={sessionState.selectedExercise.protocol}
                            />
                        )}
                    </AnimatePresence>
                </div>
            </div>
        );
    }

    // Active Session View (WORK + SUMMARY)
    return (
        <div className="fixed inset-0 z-[5000] bg-slate-900 text-white flex flex-col overflow-hidden">
            {/* Header (Safe Guarded for Summary) */}
            <div className="px-4 py-3 flex justify-between items-center z-10 sticky top-0 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
                <button onClick={handlePrev} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all">
                    <ChevronLeft size={20} />
                </button>

                <div className="flex flex-col items-center">
                    {currentStep.type === 'SUMMARY' ? (
                        <span className="text-[10px] font-black tracking-[0.2em] text-emerald-500 uppercase">RESUMEN</span>
                    ) : (
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] font-black tracking-[0.2em] text-emerald-500 uppercase">
                                {currentStep.blockType}
                            </span>
                            {currentStep.module?.partLabel && (
                                <span className="text-[8px] bg-slate-800 px-2 py-0.5 rounded text-xs font-bold text-slate-300 mt-0.5">
                                    {currentStep.module.partLabel}
                                </span>
                            )}
                        </div>
                    )}

                    <div className="h-1 w-full bg-slate-800 rounded-full mt-2 overflow-hidden w-24">
                        <motion.div
                            className="h-full bg-emerald-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${((currentIndex) / (timeline.length - 1)) * 100}%` }}
                        />
                    </div>
                </div>

                <div className="flex flex-col items-center">
                    <div className="flex items-center gap-2">
                        <Clock size={12} className="text-emerald-500" />
                        <span className="text-xs font-black tabular-nums text-white">
                            {Math.floor(globalTime / 60)}:{(globalTime % 60).toString().padStart(2, '0')}
                        </span>
                    </div>
                </div>

                <div className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800/50 text-xs font-bold text-slate-500">
                    {currentIndex}/{timeline.length - 1}
                </div>
            </div>

            {/* Main Content Info */}
            <main className="flex-1 relative overflow-y-auto overflow-x-hidden">
                <AnimatePresence mode='wait'>
                    <motion.div
                        key={currentIndex}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="max-w-md mx-auto h-full flex flex-col p-6 min-h-full"
                    >

                        {/* WARMUP UI */}
                        {currentStep.type === 'WARMUP' && (
                            <WarmupBlock
                                step={currentStep}
                                plan={sessionState.plans[currentStep.module.id]} // Pass plan
                                onComplete={handleNext}
                            />
                        )}

                        {/* WORK UI */}
                        {currentStep.type === 'WORK' && (
                            <WorkBlock
                                step={currentStep}
                                plan={sessionState.plans[currentStep.module.id]}
                                onComplete={handleStepComplete}
                                onSelectExercise={(ex) => setSessionState(prev => ({ ...prev, selectedExercise: { ...ex, protocol: currentStep.module.protocol } }))}
                                playCountdownShort={playCountdownShort}
                                playCountdownFinal={playCountdownFinal}
                                playHalfway={playHalfway}
                                playMinuteWarning={playMinuteWarning}
                                playSuccess={playSuccess}
                                initAudio={() => {
                                    initAudio();
                                    setIsGlobalActive(true); // Start global timer on first interaction
                                }}
                            />
                        )}

                        {/* SUMMARY UI */}
                        {currentStep.type === 'SUMMARY' && (
                            <SummaryBlock
                                sessionState={sessionState}
                                timeline={timeline}
                                setSessionState={setSessionState}
                                onFinish={handleNext}
                            />
                        )}

                    </motion.div>
                </AnimatePresence>
            </main>

            <AnimatePresence>
                {showFeedbackModal && (
                    <BlockFeedbackModal
                        onConfirm={handleBlockFeedbackConfirm}
                        blockType={currentStep?.blockType}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {sessionState.selectedExercise && (
                    <ExerciseDetailModal
                        selectedExercise={sessionState.selectedExercise}
                        onClose={() => setSessionState(prev => ({ ...prev, selectedExercise: null }))}
                        protocol={sessionState.selectedExercise.protocol}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

// --- Sub-components & Logic ---

const ExerciseDetailModal = ({ selectedExercise, onClose, protocol }) => (
    <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4">
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />
        <motion.div
            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
            className="bg-slate-800 w-full max-w-sm rounded-3xl overflow-hidden relative z-10 shadow-2xl border border-slate-700 max-h-[90vh] flex flex-col"
        >
            <div className="aspect-video bg-black relative shrink-0">
                <ExerciseMedia exercise={selectedExercise} autoPlay={true} />
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 bg-black/50 p-2 rounded-full text-white hover:bg-black/70"
                >
                    <ChevronLeft size={20} className="rotate-[-90deg]" />
                </button>
                {/* Protocol Badge Override on Image */}
                <div className="absolute bottom-4 left-4 flex gap-2">
                    <span className="px-2 py-1 bg-black/60 backdrop-blur text-white text-[10px] font-black uppercase rounded-md border border-white/10">
                        {selectedExercise.quality === 'F' ? 'FUERZA' : selectedExercise.quality === 'E' ? 'ENERGÍA' : selectedExercise.quality === 'M' ? 'MOVILIDAD' : 'GENERAL'}
                    </span>
                </div>
            </div>

            <div className="p-6 overflow-y-auto">
                <div className="mb-4">
                    <h2 className="text-2xl font-black text-white leading-tight mb-2">{selectedExercise.nameEs || selectedExercise.name}</h2>

                    {/* Load/Config Badge */}
                    <div className="inline-flex flex-wrap gap-2">
                        {protocol === 'T' ? (
                            <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
                                <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Objetivo:</span>
                                <span className="text-sm font-black text-white">Máximas Repeticiones</span>
                            </div>
                        ) : (selectedExercise.targetReps > 0 || selectedExercise.manifestation) && (
                            <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
                                <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Objetivo:</span>
                                <span className="text-sm font-black text-white">
                                    {selectedExercise.targetReps ? `${selectedExercise.targetReps} reps` : selectedExercise.manifestation}
                                </span>
                            </div>
                        )}
                        {selectedExercise.pattern && (
                            <span className="px-2 py-1.5 bg-slate-700 text-slate-300 text-[10px] font-bold uppercase rounded-lg border border-slate-600">
                                {selectedExercise.pattern}
                            </span>
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Instrucciones</h3>
                        <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                            {selectedExercise.descriptionEs || selectedExercise.description || 'Sin descripción disponible.'}
                        </p>
                    </div>
                </div>

                <div className="mt-8">
                    <button
                        onClick={onClose}
                        className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-4 rounded-xl transition-all"
                    >
                        Cerrar Detalles
                    </button>
                </div>
            </div>
        </motion.div>
    </div>
);

const CollapsiblePlanningBlock = ({ module, onSelectExercise }) => {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div className="bg-slate-800/30 rounded-3xl border border-slate-800 overflow-hidden">
            {/* Block Header (Clickable) */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-5 py-4 bg-slate-800/50 border-b border-slate-800 flex items-center justify-between hover:bg-slate-800 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <span className={`text-xs font-black uppercase tracking-wider ${module.blockType === 'BOOST' ? 'text-orange-500' :
                        module.blockType === 'BASE' ? 'text-emerald-500' :
                            module.blockType === 'BUILD' ? 'text-blue-500' :
                                module.blockType === 'BURN' ? 'text-red-500' : 'text-slate-400'
                        }`}>
                        {module.blockType}
                    </span>
                    {module.partLabel && (
                        <span className="text-[10px] font-black bg-slate-700 text-slate-300 px-2 py-0.5 rounded uppercase">
                            {module.partLabel}
                        </span>
                    )}
                </div>
                {/* Preview of exercise names if closed */}
                {!isOpen && (
                    <div className="flex-1 mx-4 text-right">
                        <span className="text-[10px] text-slate-500 truncate block">
                            {module.exerciseNames?.join(' + ')}
                        </span>
                    </div>
                )}
                <ChevronLeft size={16} className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-90' : '-rotate-90'}`} />
            </button>

            {/* Exercises List (Collapsible) */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="divide-y divide-slate-800/50">
                            {module.exercises?.map((ex, exIdx) => (
                                <div
                                    key={exIdx}
                                    className="p-4 flex gap-4 hover:bg-slate-800/50 transition-colors cursor-pointer group relative"
                                    onClick={() => onSelectExercise(ex)}
                                >
                                    {/* Image */}
                                    <div className="w-20 h-20 bg-slate-900 rounded-xl overflow-hidden shrink-0 border border-slate-700/50">
                                        <ExerciseMedia exercise={ex} thumbnailMode={true} />
                                    </div>

                                    <div className="flex-1 min-w-0 py-1 flex flex-col justify-between">
                                        <div className="flex justify-between items-start gap-2">
                                            <h4 className="font-bold text-white text-sm line-clamp-1 group-hover:text-emerald-400 transition-colors">{ex.nameEs || ex.name}</h4>
                                            <Info size={16} className="text-slate-500 group-hover:text-emerald-400 transition-colors shrink-0" />
                                        </div>

                                        {/* Targeting Configuration Badge */}
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {/* Manifestation / Reps Target - Hidden for Protocol T */}
                                            {((ex.targetReps > 0 || ex.manifestation) && module.protocol !== 'T') && (
                                                <span className="inline-flex items-center px-2 py-1 bg-slate-700/50 text-slate-200 rounded text-[10px] font-black uppercase tracking-wider border border-slate-600/50">
                                                    {ex.targetReps ? `${ex.targetReps} reps` : ex.manifestation}
                                                </span>
                                            )}

                                            {/* Protocol Specific Timer/Cap */}
                                            {module.protocol === 'T' && (
                                                <span className="inline-flex items-center px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded text-[10px] font-black uppercase tracking-wider border border-emerald-500/20">
                                                    <Clock size={12} className="mr-1" />
                                                    {(() => {
                                                        const seconds = module.targeting?.[0]?.timeCap || 240;
                                                        const m = Math.floor(seconds / 60);
                                                        const s = seconds % 60;
                                                        return s === 0 ? `${m}'` : `${m}:${s.toString().padStart(2, '0')}`;
                                                    })()}
                                                </span>
                                            )}
                                            {(module.protocol === 'E' || ex.config?.isEMOM) && (
                                                <span className="inline-flex items-center px-2 py-1 bg-orange-500/10 text-orange-500 rounded text-[10px] font-black uppercase tracking-wider border border-orange-500/20">
                                                    EMOM {ex.config?.emomTime || ex.config?.sets?.length || module.emomParams?.durationMinutes || 4}'
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const SummaryBlock = ({ sessionState, timeline, setSessionState, onFinish }) => {

    const generateAnalysis = () => {
        const insights = [];

        // Iterate over executed steps in Results
        Object.entries(sessionState.results).forEach(([stepIndex, res]) => {
            const step = timeline[stepIndex];
            if (!step || step.type !== 'WORK') return;

            const exercises = step.module.exercises || [];
            if (exercises.length === 0) return;

            // Analyze first exercise as proxy for block intent
            const target = step.module.targeting?.[0] || {};
            const repsDone = res.reps ? res.reps[0] : 0;
            const targetReps = target.volume || 10; // Default fallback

            // Simple heuristic for "R" protocol or Strength blocks
            if (step.module.protocol === 'R' || step.blockType === 'BASE' || step.blockType === 'BUILD') {
                if (repsDone > targetReps + 2) {
                    insights.push({ type: 'up', msg: `Subir peso en ${step.blockType} (${step.module.partLabel || 'Global'})` });
                } else if (repsDone < targetReps - 2) {
                    insights.push({ type: 'down', msg: `Bajar peso en ${step.blockType} (${step.module.partLabel || 'Global'})` });
                } else {
                    insights.push({ type: 'keep', msg: `Peso correcto en ${step.blockType}` });
                }
            }
        });

        return insights;
    };

    const insights = generateAnalysis();

    return (
        <div className="flex-1 flex flex-col pt-8 pb-32">
            <div className="text-center mb-10">
                <motion.div
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mx-auto text-slate-900 shadow-xl shadow-emerald-900/50 mb-6"
                >
                    <CheckCircle size={48} className="text-white" />
                </motion.div>
                <h2 className="text-3xl font-black text-white mb-2">¡Sesión Completada!</h2>
                <p className="text-slate-400">Gran trabajo hoy.</p>
            </div>

            {/* Analysis Cards */}
            <div className="space-y-3 mb-10">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest px-1">Análisis de Cargas</h3>
                {insights.length > 0 ? insights.map((insight, idx) => (
                    <div key={idx} className="bg-slate-800 p-4 rounded-xl flex items-center gap-4 border border-slate-700">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${insight.type === 'up' ? 'bg-emerald-500/20 text-emerald-500' :
                            insight.type === 'down' ? 'bg-amber-500/20 text-amber-500' :
                                'bg-blue-500/20 text-blue-500'
                            }`}>
                            {insight.type === 'up' && <TrendingUp size={20} />}
                            {insight.type === 'down' && <TrendingDown size={20} />}
                            {insight.type === 'keep' && <Minus size={20} />}
                        </div>
                        <p className="text-sm font-medium text-slate-200">{insight.msg}</p>
                    </div>
                )) : (
                    <div className="bg-slate-800/50 p-4 rounded-xl text-center text-slate-500 text-sm italic">
                        Sin datos suficientes para análisis.
                    </div>
                )}
            </div>

            <div className="space-y-6">
                <RPESelector
                    value={sessionState.feedback.rpe}
                    onChange={val => setSessionState(prev => ({ ...prev, feedback: { ...prev.feedback, rpe: val } }))}
                    label="Esfuerzo de la Sesión (RPE)"
                />

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Notas de sesión</label>
                    <textarea
                        placeholder="¿Alguna molestia? ¿Notas personales?"
                        className="w-full bg-slate-800 rounded-xl p-4 text-white text-sm outline-none border border-slate-700 focus:border-emerald-500 transition-colors"
                        rows={3}
                        value={sessionState.feedback.comment}
                        onChange={e => setSessionState(prev => ({ ...prev, feedback: { ...prev.feedback, comment: e.target.value } }))}
                    />
                </div>
            </div>

            <div className="mt-8">
                <button onClick={onFinish} className="w-full bg-white text-slate-900 font-black text-lg py-5 rounded-2xl shadow-xl hover:bg-emerald-50 transition-all active:scale-[0.98]">
                    Guardar Resultados
                </button>
            </div>
        </div>
    );
};



const WarmupBlock = ({ step, plan, onComplete }) => {
    const { module } = step;
    const [weights, setWeights] = useState(['', '', '']);

    // Auto-calculate Weights from Plan
    useEffect(() => {
        if (plan) {
            // Use first exercise as reference
            const referenceWeight = parseFloat(plan[0]);
            if (!isNaN(referenceWeight) && referenceWeight > 0) {
                setWeights([
                    Math.round(referenceWeight * 0.4).toString(),
                    Math.round(referenceWeight * 0.6).toString(),
                    Math.round(referenceWeight * 0.8).toString()
                ]);
            }
        }
    }, [plan]);

    const handleWeightChange = (idx, val) => {
        const newW = [...weights];
        newW[idx] = val;
        setWeights(newW);
    };
    return (
        <div className="flex-1 flex flex-col">
            <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/10 text-orange-400 rounded-full border border-orange-500/20 mb-4">
                    <AlertCircle size={16} />
                    <span className="text-xs font-black uppercase tracking-wider">Activación</span>
                </div>
                <h2 className="text-3xl font-black text-white mb-2 leading-tight">Series de Aproximación</h2>
                <p className="text-slate-400 text-sm max-w-[280px] mx-auto leading-relaxed">
                    Prepara el movimiento para <strong>{module.exerciseNames?.join(' + ') || 'el bloque'}</strong>.
                </p>
                {/* Visual indicator of calculation */}
                {plan?.[0] ?
                    <p className="text-[10px] uppercase text-emerald-500 font-bold mt-2">
                        Calculado para RM: {plan[0]}kg
                    </p>
                    :
                    <p className="text-[10px] uppercase text-slate-600 font-bold mt-2">
                        Introduce peso en planificación para autocalcular
                    </p>
                }
            </div>
            <div className="space-y-4 flex-1">
                {[
                    { reps: '12', pct: '40%' },
                    { reps: '6', pct: '60%' },
                    { reps: '3', pct: '80%' }
                ].map((set, idx) => (
                    <div key={idx} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-4 rounded-2xl flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 font-black text-lg border border-orange-500/20">
                            {idx + 1}
                        </div>
                        <div className="flex-1">
                            <div className="text-white font-bold text-lg">{set.reps} reps</div>
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Intensidad {set.pct}</div>
                        </div>
                        <div className="w-28 relative">
                            <input
                                type="number"
                                placeholder="0"
                                value={weights[idx]}
                                onChange={(e) => handleWeightChange(idx, e.target.value)}
                                className="w-full bg-slate-900 border-2 border-slate-700 rounded-xl py-3 px-2 text-right text-white font-mono font-bold text-lg outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all placeholder:text-slate-700"
                            />
                            <span className="absolute right-10 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-600 pointer-events-none">kg</span>
                        </div>
                    </div>
                ))}
            </div>
            <button onClick={onComplete} className="w-full bg-orange-500 hover:bg-orange-400 text-white font-black text-lg py-5 rounded-2xl shadow-lg shadow-orange-900/30 active:scale-[0.98] transition-all mt-8">
                Listo, Comenzar Bloque
            </button>
        </div>
    );
};

const WorkBlock = ({ step, plan, onComplete, onSelectExercise, playCountdownShort, playCountdownFinal, playHalfway, playMinuteWarning, playSuccess, initAudio }) => {
    const { module, blockType } = step;
    const protocol = module.protocol; // T, R, E
    const exercises = module.exercises || []; // full objects
    const { currentUser } = useAuth();

    // Timer State
    const [timeLeft, setTimeLeft] = useState(null);
    const [elapsed, setElapsed] = useState(0);
    const [isActive, setIsActive] = useState(false); // Start PAUSED
    const [currentMinute, setCurrentMinute] = useState(1); // For EMOM

    // Historical Performance State
    const [previousLog, setPreviousLog] = useState(null);
    const [loadingHistory, setLoadingHistory] = useState(true);

    // Fetch previous performance when component mounts
    useEffect(() => {
        const fetchHistory = async () => {
            if (!currentUser || !module.id) return;

            try {
                const lastLog = await TrainingDB.logs.getLastLog(currentUser.uid, module.id);
                setPreviousLog(lastLog);
            } catch (error) {
                console.error('Error fetching history:', error);
            } finally {
                setLoadingHistory(false);
            }
        };

        fetchHistory();
    }, [currentUser, module.id]);

    // Results Logging
    const [repsDone, setRepsDone] = useState({});
    const [weightsUsed, setWeightsUsed] = useState({}); // New state for actual weight used

    useEffect(() => {
        const initReps = {};
        const initWeights = {};
        exercises.forEach((ex, idx) => {
            initReps[idx] = 0;

            // PRIORITY 1: Use actual weight from previous session + recommendation
            if (previousLog?.results?.actualWeights?.[idx]) {
                let baseWeight = parseFloat(previousLog.results.actualWeights[idx]);

                // Find exercise-specific recommendation
                if (previousLog?.analysis) {
                    const recommendation = previousLog.analysis.find(
                        a => a.moduleId === module.id &&
                            (a.exerciseId === ex.id || a.exerciseIndex === idx)
                    );

                    if (recommendation?.adjustment) {
                        baseWeight += recommendation.adjustment;
                    }
                }

                initWeights[idx] = baseWeight.toFixed(1);
            }
            // PRIORITY 2: Use plan (if no history exists)
            else if (plan?.[module.offset + idx]) {
                initWeights[idx] = plan[module.offset + idx];
            }
            // PRIORITY 3: Empty
            else {
                initWeights[idx] = '';
            }
        });
        setRepsDone(initReps);
        setWeightsUsed(initWeights);
    }, [module, plan, previousLog, exercises]);

    // Reps Increment Handler
    const incrementReps = (idx) => {
        setRepsDone(prev => {
            const newReps = { ...prev };
            newReps[idx] = (newReps[idx] || 0) + 1;
            return newReps;
        });
    };

    const handleWeightInput = (idx, val) => {
        // Normalize comma to dot for internal processing
        const normalized = val.replace(',', '.');
        setWeightsUsed(prev => ({ ...prev, [idx]: normalized }));
    };

    const adjustWeight = (idx, delta) => {
        setWeightsUsed(prev => {
            const current = parseFloat(prev[idx] || 0);
            if (isNaN(current)) return { ...prev, [idx]: delta > 0 ? delta.toString() : '0' };
            const newValue = Math.max(0, current + delta);
            return { ...prev, [idx]: newValue.toString() };
        });
    };

    // Auto-Stop Timer for PDP-R when all targets are reached
    useEffect(() => {
        if (protocol === 'R' && isActive) {
            const allTargetsReached = exercises.every((ex, idx) => {
                const target = ex.targetReps || module.targeting?.[0]?.volume || 0;
                return target > 0 && (repsDone[idx] || 0) >= target;
            });

            if (allTargetsReached) {
                setIsActive(false);
                playSuccess(); // Success beep from hook
            }
        }
    }, [repsDone, protocol, isActive, exercises, module]);

    // EMOM Round Results State
    const [emomResults, setEmomResults] = useState({});

    // Toggle EMOM Result for a round
    const toggleEmomRound = (roundNum) => {
        setEmomResults(prev => {
            const current = prev[roundNum]; // null/undefined, 'success', 'fail'
            let next;
            if (!current) next = 'success';
            else if (current === 'success') next = 'fail';
            else next = null;
            return { ...prev, [roundNum]: next };
        });
    };

    const handleFinishBlock = () => {
        // Validation Guard
        const hasReps = Object.values(repsDone).some(r => r > 0);
        const hasEmomResults = protocol === 'E' && Object.values(emomResults).some(val => val !== null && val !== undefined);
        let hasTime = false;

        if (protocol === 'R') {
            hasTime = elapsed > 0;
        } else if (protocol === 'T' || protocol === 'E') {
            const cap = protocol === 'T' ? (module.targeting?.[0]?.timeCap || 240) : ((module.emomParams?.durationMinutes || 4) * 60);
            hasTime = timeLeft < cap; // Timer has ticked down
        }

        // Allow proceeding if all targets are met for 'R' even if time is 0 (though unlikely)
        const allTargetsMet = protocol === 'R' && exercises.every((ex, idx) => {
            const target = ex.targetReps || module.targeting?.[0]?.volume || 0;
            return target > 0 && repsDone[idx] >= target;
        });

        if (!hasReps && !hasTime && !hasEmomResults && !allTargetsMet) {
            if (!window.confirm("No has iniciado el tiempo ni anotado resultados. ¿Seguro que quieres avanzar?")) {
                return;
            }
        }

        // Pass actual weights used alongside reps
        onComplete({
            reps: repsDone,
            weights: plan, // Keep planned weights
            actualWeights: weightsUsed, // New field for executed weights
            emomResults,
            elapsed: (protocol === 'R' || protocol === 'T') ? elapsed : 0
        });
    };



    // Initialize Timer
    useEffect(() => {
        if (protocol === 'T') {
            const cap = module.targeting?.[0]?.timeCap || 240;
            setTimeLeft(cap);
        } else if (protocol === 'E') {
            const minutes = module.emomParams?.durationMinutes || 4;
            setTimeLeft(60); // Start with 60s for first round
            setCurrentMinute(1); // Reset round counter
        }
        setIsActive(false);
    }, [module]);

    // Timer Loop
    useEffect(() => {
        let interval = null;
        if (isActive) {
            interval = setInterval(() => {
                setElapsed(e => e + 1);

                if (protocol === 'T') {
                    setTimeLeft(prev => {
                        const total = module.targeting?.[0]?.timeCap || 240;
                        if (prev === Math.floor(total / 2) + 1) playHalfway();
                        if (prev === 61) playMinuteWarning();

                        // Countdown Logic: Beep at 3, 2, 1
                        if (prev === 4) playCountdownShort();
                        if (prev === 3) playCountdownShort();
                        if (prev === 2) playCountdownShort();

                        if (prev <= 1) {
                            setIsActive(false);
                            playCountdownFinal(); // Time fail/complete beep
                            return 0;
                        }
                        return prev - 1;
                    });
                } else if (protocol === 'E') {
                    // Logic for EMOM: One minute cycles
                    setTimeLeft(prev => {
                        if (prev === 31) playHalfway(); // Halfway through the minute

                        // prev is seconds remaining in CURRENT MINUTE (60 to 0)
                        if (prev === 4) playCountdownShort();
                        if (prev === 3) playCountdownShort();
                        if (prev === 2) playCountdownShort();

                        if (prev <= 1) {
                            // End of a minute
                            const totalDurationMin = (module.emomParams?.durationMinutes || 4);
                            if (currentMinute >= totalDurationMin) {
                                setIsActive(false);
                                playCountdownFinal(); // Finished all rounds
                                return 0;
                            } else {
                                // Next round
                                setCurrentMinute(m => m + 1);
                                playSuccess(); // New round beep
                                return 60; // Reset to 60s
                            }
                        }
                        return prev - 1;
                    });
                }
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isActive, protocol, currentMinute, module, playCountdownShort, playCountdownFinal, playHalfway, playMinuteWarning, playSuccess]);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')} `;
    };

    // EMOM Display Helper
    const getTimerDisplay = () => {
        if (!isActive && !timeLeft && protocol !== 'R') return '0:00';

        if (protocol === 'LIBRE') {
            return (
                <div className="flex flex-col items-center">
                    <span className="text-4xl font-black text-white tracking-widest leading-none mb-1">
                        LIBRE
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 opacity-80">
                        SENSACIONES Y CARGA
                    </span>
                    <span className="text-xs font-bold text-blue-500 uppercase tracking-widest mt-1 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
                        Enfoque en Calidad
                    </span>
                </div>
            );
        }

        if (protocol === 'E') {
            const totalRounds = module.emomParams?.durationMinutes || 4;

            // Generate Target Reps Text
            const targetList = exercises.map(ex => {
                if (ex.targetReps) return `${ex.targetReps}`;
                if (ex.manifestation) return ex.manifestation;
                return null;
            }).filter(Boolean);

            let mainDisplayText = "Completar Tarea";

            if (targetList.length > 0) {
                mainDisplayText = targetList.join(' + ');
            } else if (module.targeting?.[0]?.instruction) {
                mainDisplayText = module.targeting[0].instruction;
            }

            return (
                <div className="flex flex-col items-center">
                    <span className="text-5xl font-black font-mono tracking-tighter text-white tabular-nums text-center leading-none mb-1">
                        {mainDisplayText}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1 opacity-80">
                        REPS / OBJETIVO
                    </span>
                    <span className="text-xs font-bold text-orange-500 uppercase tracking-widest mt-1 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
                        Ronda {currentMinute} de {totalRounds}
                    </span>
                </div>
            );
        }

        if (protocol === 'R') {
            // Generate Target Reps for R
            const targetList = exercises.map(ex => {
                if (ex.targetReps) return `${ex.targetReps}`;
                if (ex.manifestation) return ex.manifestation;
                return null;
            }).filter(Boolean);

            let mainDisplayText = "Completar";
            if (targetList.length > 0) mainDisplayText = targetList.join(' + ');

            return (
                <div className="flex flex-col items-center">
                    <span className="text-[clamp(3rem,10vw,4rem)] font-black font-mono tracking-tighter text-white tabular-nums text-center leading-none mb-1">
                        {mainDisplayText}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1 opacity-80">
                        OBJETIVO
                    </span>
                </div>
            );
        }

        // Default for Protocol 'T' (Time Priority)
        const timeCap = module.targeting?.[0]?.timeCap || 240;
        return (
            <div className="flex flex-col items-center">
                <span className="text-[clamp(3rem,10vw,4rem)] font-black font-mono tracking-tighter text-white tabular-nums">
                    {formatTime(timeCap)}
                </span>
                <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest mt-1 opacity-80">
                    TIME CAP
                </span>
            </div>
        );
    };

    return (
        <div className="flex-1 flex flex-col items-center relative">
            <div className="w-full mb-6">
                <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isActive ? 'max-h-0 opacity-0 mb-0' : 'max-h-96 opacity-100 mb-2'}`}>
                    <div className={`grid gap-2 ${exercises.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        {exercises.map((ex, idx) => (
                            <div
                                key={idx}
                                onClick={() => onSelectExercise && onSelectExercise(ex)}
                                className="relative aspect-video bg-slate-800 rounded-xl overflow-hidden border border-slate-700 cursor-pointer hover:border-emerald-500 transition-all active:scale-95"
                            >
                                <ExerciseMedia exercise={ex} thumbnailMode={true} />
                                <div className="absolute bottom-0 left-0 w-full bg-black/60 backdrop-blur-sm p-2 flex items-center justify-between">
                                    <span className="text-white text-xs font-bold block truncate max-w-[60%]">{ex.nameEs || ex.name}</span>
                                    <div className="flex items-center gap-2">
                                        {((ex.targetReps || ex.manifestation) && protocol !== 'T') && (
                                            <span className="text-emerald-400 text-[10px] font-black uppercase">
                                                {ex.targetReps ? `${ex.targetReps} reps` : ex.manifestation}
                                            </span>
                                        )}
                                        {/* Historical Performance Badge */}
                                        {previousLog?.results && !loadingHistory && (() => {
                                            const prevReps = previousLog.results.reps?.[idx];
                                            const prevWeight = previousLog.results.actualWeights?.[idx] || previousLog.results.weights?.[idx];

                                            if (prevReps || prevWeight) {
                                                return (
                                                    <span className="text-blue-400 text-[9px] font-black uppercase bg-blue-500/10 px-1 rounded border border-blue-500/20">
                                                        Anterior: {prevWeight && `${parseFloat(prevWeight || 0)}kg`}{prevWeight && prevReps && ' • '}{prevReps && `${prevReps}r`}
                                                    </span>
                                                );
                                            }
                                        })()}
                                    </div>
                                </div>
                                {/* Hint Icon */}
                                <div className="absolute top-2 right-2 opacity-50">
                                    <Plus size={12} className="text-white bg-black/50 rounded-full p-0.5" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Weight Input Section - Above INICIAR */}
                {exercises.some(ex => ex.loadable) && (
                    <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isActive ? 'max-h-0 opacity-0 mb-0' : 'max-h-96 opacity-100 mb-3'}`}>
                        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-4">
                            <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3 text-center">Peso Utilizado</h3>
                            <div className={`grid gap-3 ${exercises.filter(ex => ex.loadable).length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                {exercises.map((ex, idx) => {
                                    if (!ex.loadable) return null;

                                    // Get exercise-specific recommendation
                                    const recommendation = previousLog?.analysis?.find(
                                        a => a.moduleId === module.id &&
                                            (a.exerciseId === ex.id || a.exerciseIndex === idx)
                                    );

                                    // Get previous weight
                                    const previousWeight = previousLog?.results?.actualWeights?.[idx];

                                    return (
                                        <div key={idx} className="bg-slate-900/40 rounded-2xl p-4 border border-slate-700/50 relative group overflow-hidden">
                                            {/* Glow effect on hover */}
                                            <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                            {/* Header */}
                                            <div className="flex items-start justify-between mb-3 relative z-10">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter mb-0.5">Ejercicio</span>
                                                    <span className="text-xs font-bold text-white line-clamp-1">{ex.nameEs || ex.name}</span>
                                                </div>

                                                {recommendation && (
                                                    <div className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border shadow-sm
                                                        ${recommendation.type === 'up' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                            recommendation.type === 'down' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                                                                'bg-blue-500/10 text-blue-500 border-blue-500/20'}`}>
                                                        {recommendation.type === 'up' ? 'Sube Peso' :
                                                            recommendation.type === 'down' ? 'Baja Peso' :
                                                                'Mantén'}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Previous Stats */}
                                            {previousWeight && (
                                                <div className="flex items-center gap-3 mb-4 bg-slate-800/40 rounded-lg p-2 border border-slate-700/30 relative z-10">
                                                    <div className="flex flex-col">
                                                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Anterior</span>
                                                        <span className="text-xs font-black text-slate-400 tabular-nums">{previousWeight}<span className="text-[9px] ml-0.5">kg</span></span>
                                                    </div>
                                                    {recommendation?.adjustment && recommendation.adjustment !== 0 && (
                                                        <>
                                                            <div className="h-4 w-px bg-slate-700"></div>
                                                            <div className="flex flex-col">
                                                                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Recomendación</span>
                                                                <span className={`text-xs font-black tabular-nums ${recommendation.adjustment > 0 ? 'text-emerald-500' : 'text-amber-500'}`}>
                                                                    {recommendation.adjustment > 0 ? '+' : ''}{recommendation.adjustment}kg
                                                                </span>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            )}

                                            {/* Input Wrapper with Controls */}
                                            <div className="flex items-center gap-2 relative z-10">
                                                <button
                                                    onClick={() => adjustWeight(idx, -1)}
                                                    className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 active:scale-95 transition-all outline-none"
                                                >
                                                    <Minus size={16} />
                                                </button>

                                                <div className="relative flex-1 group/input">
                                                    <input
                                                        type="text"
                                                        inputMode="decimal"
                                                        placeholder="0.0"
                                                        value={weightsUsed[idx] || ''}
                                                        onChange={(e) => handleWeightInput(idx, e.target.value)}
                                                        className={`w-full bg-slate-800/80 border-2 rounded-xl py-2 pl-3 pr-8 
                                                                   text-white font-black text-lg outline-none 
                                                                   transition-all hover:bg-slate-800 placeholder:text-slate-600
                                                                   ${recommendation?.type === 'up' ? 'border-emerald-500/50 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10' :
                                                                recommendation?.type === 'down' ? 'border-amber-500/50 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10' :
                                                                    recommendation?.type === 'keep' ? 'border-blue-500/50 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10' :
                                                                        'border-slate-700 focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5'}`}
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-500 uppercase tracking-widest pointer-events-none">kg</span>
                                                </div>

                                                <button
                                                    onClick={() => adjustWeight(idx, 1)}
                                                    className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 active:scale-95 transition-all outline-none"
                                                >
                                                    <Plus size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* Protocol Specific Instruction Display */}
                {/* Main Timer Display (Protocol Specific) */}
                {/* Main Timer Display (Protocol Specific) */}
                {(protocol === 'T' || protocol === 'E' || protocol === 'R' || protocol === 'LIBRE') && (
                    <div className={`mb-2 bg-slate-800/30 rounded-3xl border border-slate-700/50 backdrop-blur relative overflow-hidden ${protocol === 'E' || protocol === 'LIBRE' ? 'px-4 py-2 mt-2' : 'p-4 mt-4'}`}>
                        {getTimerDisplay()}

                        <div className="flex gap-3 mt-2">
                            <button
                                onClick={() => {
                                    initAudio(); // Initialize audio context
                                    if (!isActive && protocol === 'E' && timeLeft === 0) {
                                        // Restart EMOM
                                        setTimeLeft(60);
                                        setCurrentMinute(prevMin => prevMin + 1);
                                        setIsActive(true);
                                    } else {
                                        setIsActive(!isActive);
                                    }
                                }}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-black uppercase tracking-wider transition-all ${isActive
                                    ? 'bg-amber-500/10 text-amber-500 border-2 border-amber-500 hover:bg-amber-500 hover:text-white'
                                    : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 active:scale-[0.98]'
                                    }`}
                            >
                                {isActive ? 'Pausar' : (timeLeft === 0 && protocol === 'E' ? 'Siguiente Ronda' : 'Iniciar')}
                            </button>
                            {protocol !== 'LIBRE' && (
                                <button
                                    onClick={() => {
                                        if (protocol === 'E') {
                                            setTimeLeft(60);
                                            setCurrentMinute(1);
                                        } else if (protocol === 'R') {
                                            setElapsed(0);
                                        } else {
                                            const cap = module.targeting?.[0]?.timeCap || 240;
                                            setTimeLeft(cap);
                                        }
                                        setIsActive(false);
                                    }}
                                    className="px-4 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700 font-bold transition-all"
                                >
                                    ↺
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className={`relative flex items-center justify-center transition-all duration-500 ease-in-out ${isActive
                ? (protocol === 'E' ? 'w-48 h-48 mt-2 mb-2' : 'w-56 h-56 mt-3 mb-3')
                : (protocol === 'E' ? 'w-36 h-36 mt-1 mb-1' : 'w-44 h-44 mt-1 mb-1')
                }`}>
                <div className="absolute inset-0 bg-emerald-500/10 blur-3xl rounded-full opacity-30"></div>
                <svg className="absolute inset-0 w-full h-full -rotate-90 drop-shadow-xl">
                    <circle cx="50%" cy="50%" r="45%" stroke="#1e293b" strokeWidth="8" fill="none" />
                    {/* Dynamic Ring: Time (T/E) or Reps Progress (R) */}
                    {(isActive || protocol === 'R' || timeLeft !== null) && (
                        <circle
                            cx="50%" cy="50%" r="45%"
                            stroke={protocol === 'R' ? '#10b981' : (isActive ? '#10b981' : '#64748b')}
                            strokeWidth="8"
                            fill="none"
                            strokeDasharray={2 * Math.PI * (isActive ? (protocol === 'E' ? 85 : 100) : (protocol === 'E' ? 65 : 80))}
                            strokeDashoffset={(() => {
                                const approxRadius = isActive ? (protocol === 'E' ? 85 : 100) : (protocol === 'E' ? 65 : 80);
                                const circumference = 2 * Math.PI * approxRadius;

                                if (protocol === 'R') {
                                    const totalTarget = exercises.reduce((acc, ex) => acc + (ex.targetReps || module.targeting?.[0]?.volume || 0), 0);
                                    let totalDone = 0;
                                    exercises.forEach((_, idx) => {
                                        totalDone += (repsDone[idx] || 0);
                                    });

                                    const progress = totalTarget > 0 ? Math.min(totalDone / totalTarget, 1) : 0;
                                    return circumference * (1 - progress);
                                }

                                const totalTime = (protocol === 'T' ? module.targeting?.[0]?.timeCap : module.emomParams?.durationMinutes * 60) || 240;
                                const timeRatio = (timeLeft || 0) / totalTime;
                                return circumference * (1 - timeRatio);
                            })()}
                            strokeLinecap="round"
                            className="transition-all duration-1000 ease-linear"
                        />
                    )}
                </svg>
                <button onClick={() => setIsActive(!isActive)} className="z-20 text-center group">
                    <div className={`text-[clamp(2rem,12vw,4rem)] font-black tabular-nums tracking-tighter transition-all duration-500 ${isActive ? 'text-white' : 'text-slate-500'} group-hover:text-emerald-400`}>
                        {protocol === 'R' || protocol === 'LIBRE' || protocol === 'mix' ? formatTime(elapsed) : formatTime(timeLeft || 0)}
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mt-1 flex items-center justify-center gap-1">
                        {isActive ? <span className="text-emerald-500 animate-pulse">● EN CURSO</span> : <span className="flex items-center gap-1"><Play size={10} /> INICIAR</span>}
                    </div>
                </button>
            </div>

            <div className={`w-full px-4 mb-32 transition-all duration-500 ease-in-out flex flex-col ${isActive ? 'flex-1' : ''}`}>
                {protocol === 'E' ? (
                    // EMOM SPECIFIC UI: Round Tracker + Static Exercise Info
                    <div className="space-y-4">
                        {/* Round Tracker Circles */}
                        <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 flex flex-col items-center">
                            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Registro de Rondas</h3>
                            <div className="flex flex-wrap justify-center gap-2">
                                {Array.from({ length: module.emomParams?.durationMinutes || 4 }).map((_, i) => {
                                    const roundNum = i + 1;
                                    const status = emomResults[roundNum]; // 'success', 'fail', undefined
                                    const isCurrent = currentMinute === roundNum;

                                    return (
                                        <button
                                            key={roundNum}
                                            onClick={() => toggleEmomRound(roundNum)}
                                            className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs border-2 transition-all ${status === 'success' ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-900/50' :
                                                status === 'fail' ? 'bg-red-500/10 border-red-500 text-red-500' :
                                                    isCurrent ? 'bg-slate-700 border-white text-white animate-pulse' :
                                                        'bg-slate-800 border-slate-700 text-slate-500'
                                                }`}
                                        >
                                            {status === 'success' ? <CheckCircle size={16} /> :
                                                status === 'fail' ? <AlertCircle size={16} /> :
                                                    roundNum}
                                        </button>
                                    );
                                })}
                            </div>
                            <p className="text-[10px] text-slate-500 mt-4 text-center italic">
                                Toca un círculo para marcar: <span className="text-emerald-500 font-bold">Completado</span> / <span className="text-red-500 font-bold">Fallo</span>
                            </p>
                        </div>

                        {/* Exercises Reference (Static) - REMOVED for compactness as requested */}
                    </div>
                ) : (
                    // STANDARD UI (R/T/Mix) - Rep Counters
                    <div className={`flex items-stretch transition-all duration-500 ${exercises.length > 1 ? 'gap-2' : 'gap-4'} ${isActive ? 'flex-1 mb-4' : ''}`}>
                        {exercises.map((ex, idx) => {
                            // Color Feedback Logic
                            const targetReps = ex.targetReps || module.targeting?.[0]?.volume || 0;
                            const cardReps = repsDone[idx] || 0;
                            const isTargetReached = protocol === 'R' && targetReps > 0 && cardReps >= targetReps;
                            const isTimeExpired = (protocol === 'T' || protocol === 'E') && timeLeft === 0;

                            let cardClass = "bg-slate-800 border-slate-700";
                            if (isTargetReached) cardClass = "bg-emerald-500/10 border-emerald-500 shadow-lg shadow-emerald-500/20";
                            else if (isTimeExpired) cardClass = "bg-red-500/10 border-red-500 shadow-lg shadow-red-500/20";

                            // Reps Decrement Handler
                            const decrementReps = (idx) => {
                                setRepsDone(prev => {
                                    const newReps = { ...prev };
                                    const current = newReps[idx] || 0;
                                    if (current > 0) {
                                        newReps[idx] = current - 1;
                                    }
                                    return newReps;
                                });
                            };

                            const isDual = exercises.length > 1;
                            return (
                                <div key={idx} className={`flex-1 w-0 rounded-[2rem] border flex flex-col items-center justify-between transition-all duration-500 ${cardClass} ${isDual ? 'p-2' : 'p-4'} ${isActive ? 'py-5 shadow-xl' : ''}`}>
                                    <span className={`text-xs font-bold text-center mb-1 truncate w-full px-1 transition-all ${isTargetReached ? 'text-emerald-400' : 'text-slate-400'} ${isActive ? 'text-sm' : ''}`}>
                                        {ex.nameEs || ex.name}
                                    </span>

                                    {/* Thumbnail Image */}
                                    <button
                                        onClick={() => onSelectExercise(ex)}
                                        className={`shrink-0 bg-slate-900 rounded-xl overflow-hidden border border-slate-700/50 mb-1.5 transition-all hover:border-emerald-500/50 ${isActive
                                            ? (isDual ? 'w-18 h-18' : 'w-24 h-24')
                                            : (isDual ? 'w-14 h-14' : 'w-16 h-16')
                                            }`}
                                    >
                                        <ExerciseMedia exercise={ex} thumbnailMode={true} />
                                    </button>

                                    {protocol === 'LIBRE' && (ex.targetReps || ex.manifestation) && (
                                        <div className="mb-2 bg-blue-500/10 px-2 py-0.5 rounded text-[10px] font-black text-blue-400 border border-blue-500/10">
                                            OBJ: {ex.targetReps ? `${ex.targetReps} reps` : ex.manifestation}
                                        </div>
                                    )}
                                    <div className={`flex items-center ${isDual ? 'gap-1' : 'gap-2'}`}>
                                        {/* Subtract Button - Low Visual Weight */}
                                        <button
                                            onClick={() => decrementReps(idx)}
                                            disabled={!cardReps || cardReps <= 0}
                                            className={`rounded-full flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-700/50 transition-all disabled:opacity-20 disabled:pointer-events-none ${isDual ? 'w-7 h-7' : 'w-8 h-8'}`}
                                        >
                                            <Minus size={isDual ? 14 : 16} />
                                        </button>

                                        <span className={`font-black tabular-nums text-center ${isTargetReached ? 'text-emerald-500' : isTimeExpired ? 'text-red-500' : 'text-white'} ${isDual ? 'text-[clamp(1.2rem,4vw,1.8rem)] min-w-[1.1em]' : 'text-[clamp(1.8rem,5vw,2.5rem)] min-w-[1.3em]'}`}>
                                            {cardReps}
                                        </span>

                                        <button
                                            onClick={() => incrementReps(idx)}
                                            className={`rounded-full flex items-center justify-center text-white shadow-lg active:scale-95 transition-all ${isTargetReached ? 'bg-emerald-600 hover:bg-emerald-500' : isTimeExpired ? 'bg-red-600 hover:bg-red-500' : 'bg-emerald-600 hover:bg-emerald-500'} ${isDual ? 'w-9 h-9' : 'w-11 h-11'}`}
                                        >
                                            <Plus size={isDual ? 18 : 22} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className={`fixed bottom-4 left-4 z-20 transition-all w-[calc(100%-2rem)]`}>
                <button
                    onClick={handleFinishBlock}
                    className={`bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl border border-slate-700 flex items-center justify-center gap-2 shadow-xl backdrop-blur-md w-full ${protocol === 'E' ? 'py-4 text-sm' : 'py-4 px-6'}`}
                >
                    <CheckCircle size={20} />
                    Siguiente Bloque
                </button>
            </div>
        </div >
    );
};


const BlockFeedbackModal = ({ onConfirm, blockType }) => {
    const [rpe, setRpe] = useState(null);
    const [notes, setNotes] = useState('');

    const handleConfirm = () => {
        if (rpe === null) return;
        onConfirm({ rpe, notes });
    };

    return (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/90 backdrop-blur-md"
            />
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-slate-800 w-full max-w-sm rounded-[2rem] border border-slate-700 shadow-2xl relative z-10 overflow-hidden"
            >
                <div className="p-6 text-center">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20">
                                <CheckCircle size={18} className="text-emerald-500" />
                            </div>
                            <h2 className="text-lg font-black text-white">Bloque {blockType}</h2>
                        </div>
                        <button
                            onClick={() => onConfirm({ rpe: null, notes: '' })}
                            className="text-[10px] font-bold text-slate-500 hover:text-white uppercase tracking-widest px-2 py-1"
                        >
                            Saltar
                        </button>
                    </div>

                    <div className="space-y-6">
                        <RPESelector
                            value={rpe}
                            onChange={setRpe}
                            label="Esfuerzo del Bloque (RPE)"
                        />
                    </div>

                    <button
                        onClick={handleConfirm}
                        disabled={rpe === null}
                        className="w-full mt-8 py-4 bg-emerald-500 text-white rounded-xl font-black text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-900/20"
                    >
                        Continuar
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default SessionRunner;
