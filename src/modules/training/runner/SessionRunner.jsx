import React, { useEffect, useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { TrainingDB } from '../services/db';
import { useAuth } from '../../../context/AuthContext';
import { ChevronLeft, ChevronUp, ChevronDown, Play, AlertCircle, CheckCircle, Clock, Plus, TrendingUp, TrendingDown, Minus, Info, Dumbbell, Zap, X, Activity, MessageSquare, Flame, Footprints } from 'lucide-react';
import { useSessionData } from './hooks/useSessionData.js';
import { useKeepAwake } from '../../../hooks/useKeepAwake';
import { useAudioFeedback } from '../../../hooks/useAudioFeedback';
import ExerciseMedia from '../components/ExerciseMedia';
import RPESelector from '../components/RPESelector';
import { generateSessionAnalysis } from './utils/analysisUtils';

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
    const { session, modules, timeline: originalTimeline, protocol, history, loading, error } = useSessionData(sessionId, currentUser?.uid);

    // Runner State
    const [overrides, setOverrides] = useState(null);

    // Fetch Overrides
    useEffect(() => {
        const fetchOverrides = async () => {
            if (!currentUser?.uid || !sessionId) return;
            try {
                const scheduledDate = location.state?.scheduledDate || new Date().toISOString().split('T')[0];
                const userDoc = await TrainingDB.users.getById(currentUser.uid);
                const tasks = userDoc?.schedule?.[scheduledDate] || [];
                // Find session task
                const task = tasks.find(t => t.sessionId === sessionId);
                if (task?.config?.overrides) {
                    console.log("Applying Session Overrides:", task.config.overrides);
                    setOverrides(task.config.overrides);
                }
            } catch (e) {
                console.error("Error fetching overrides:", e);
            }
        };
        fetchOverrides();
    }, [currentUser?.uid, sessionId, location.state]);

    // Compute Timeline with Overrides
    const timeline = useMemo(() => {
        if (!overrides || !originalTimeline) return originalTimeline;

        return originalTimeline.map(step => {
            if (step.type !== 'WORK') return step;

            const newModule = { ...step.module };

            if (overrides.duration) {
                if (newModule.protocol === 'E') {
                    newModule.emomParams = { ...(newModule.emomParams || {}), durationMinutes: parseInt(overrides.duration) };
                } else {
                    const newTargeting = [...(newModule.targeting || [])];
                    if (newTargeting.length === 0) newTargeting.push({});
                    newTargeting[0] = { ...newTargeting[0], timeCap: parseInt(overrides.duration) * 60, type: 'time' };
                    newModule.targeting = newTargeting;
                    // If manual duration override on non-EMOM, force Time protocol for timer
                    if (newModule.protocol !== 'E') newModule.protocol = 'T';
                }
            }

            // Distance override
            if (overrides.distance) {
                const newTargeting = [...(newModule.targeting || [])];
                if (newTargeting.length === 0) newTargeting.push({});
                // Use volume for distance if it's the primary metric
                newTargeting[0] = { ...newTargeting[0], volume: parseFloat(overrides.distance), metric: 'km' };
                newModule.targeting = newTargeting;
            }

            // Notes override
            if (overrides.notes) {
                const newTargeting = [...(newModule.targeting || [])];
                if (newTargeting.length === 0) newTargeting.push({});
                newTargeting[0] = { ...newTargeting[0], instruction: overrides.notes };
                newModule.targeting = newTargeting;
            }

            return { ...step, module: newModule };
        });
    }, [originalTimeline, overrides]);

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
            // Unify analysis generation
            const { insights, metrics } = generateSessionAnalysis(sessionState.results, timeline);
            let totalElapsed = 0;

            Object.values(sessionState.results).forEach(res => {
                if (res.elapsed) totalElapsed += res.elapsed;
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
                analysis: insights,
                metrics: metrics
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
                            analysis: insights,
                            metrics: metrics,
                            totalVolume: metrics.totalVolume
                        }
                    }
                );
            } catch (err) {
                console.warn('Could not update task in schedule:', err);
            }

            // Trigger Notification for Admin
            try {
                // Collect technical coach insights for the notification
                const technicalInsights = insights
                    .filter(i => i.type === 'up' || i.type === 'down' || i.type === 'stagnation')
                    .map(i => `${i.exerciseName || 'Ejercicio'}: ${i.coachInsight}`)
                    .join('\n');

                await TrainingDB.notifications.create('admin', {
                    athleteId: currentUser.uid,
                    athleteName: currentUser?.displayName || 'Atleta',
                    type: 'session',
                    title: session.name || 'Sesión Completada',
                    message: `${currentUser?.displayName || 'Un atleta'} ha completado la sesión: ${session.name} (${summary})${technicalInsights ? '\n\nSugerencias técnicas:\n' + technicalInsights : ''}`,
                    priority: technicalInsights ? 'high' : 'normal',
                    data: {
                        sessionId: session.id,
                        type: 'session',
                        summary: summary,
                        durationMinutes: durationMin,
                        rpe: rpe,
                        metrics: metrics,
                        technicalInsights: technicalInsights
                    }
                });
            } catch (notiErr) {
                console.warn("Failed to trigger session notification:", notiErr);
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
            stableId: currentStep.module.stableId || currentStep.module.id,
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

    // CARDIO SPECIAL VIEW
    if (session?.isCardio) {
        return (
            <CardioTaskView
                session={session}
                overrides={overrides}
                onFinish={async (results) => {
                    const scheduledDate = location.state?.scheduledDate || new Date().toISOString().split('T')[0];
                    const durationMin = results.duration;
                    const rpe = results.rpe;
                    const summary = `${durationMin} min • RPE ${rpe}${results.distance ? ` • ${results.distance}km` : ''}`;

                    // Update Schedule
                    await TrainingDB.users.updateSessionTaskInSchedule(
                        currentUser.uid,
                        scheduledDate,
                        session.id,
                        {
                            status: 'completed',
                            completedAt: new Date().toISOString(),
                            summary: summary,
                            results: {
                                ...results,
                                durationMinutes: durationMin,
                                totalVolume: 0 // Cardio doesn't have tonnage volume
                            }
                        }
                    );

                    // Trigger Notification
                    await TrainingDB.notifications.create('admin', {
                        athleteId: currentUser.uid,
                        athleteName: currentUser?.displayName || 'Atleta',
                        type: 'session',
                        title: session.name || 'Cardio Completado',
                        message: `${currentUser?.displayName || 'Un atleta'} ha completado cardio: ${session.name} (${summary})`,
                        data: {
                            sessionId: session.id,
                            type: 'cardio',
                            summary,
                            results
                        }
                    });

                    navigate(-1);
                }}
                onBack={() => navigate(-1)}
            />
        );
    }

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
                                history={history}
                                setSessionState={setSessionState}
                                onFinish={handleNext}
                                globalTime={globalTime}
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
                        exercises={currentStep?.module?.exercises}
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

const SummaryBlock = ({ sessionState, timeline, history, setSessionState, onFinish, globalTime }) => {
    const { insights, metrics } = generateSessionAnalysis(sessionState.results, timeline, history);
    const [expandedAdjustments, setExpandedAdjustments] = useState(true);
    const [expandedWork, setExpandedWork] = useState(true);
    const totalMinutes = Math.floor(globalTime / 60);

    return (
        <div className="flex-1 flex flex-col pt-4 pb-32 max-w-lg mx-auto w-full bg-slate-50/50 min-h-full">
            {/* Celebration Header - Premium Light */}
            <div className="text-center mb-6 px-4 pt-4">
                <motion.div
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto text-white shadow-lg shadow-emerald-500/20 mb-3"
                >
                    <CheckCircle size={32} strokeWidth={3} />
                </motion.div>
                <h2 className="text-2xl font-black text-slate-900 mb-0.5 tracking-tight">¡Sesión Fuckin' Lista!</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Rendimiento guardado con éxito</p>
            </div>

            {/* Premium Metrics Grid - Light Theme */}
            <div className="grid grid-cols-3 gap-3 px-4 mb-6">
                <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 text-center">
                    <Clock size={16} className="text-emerald-500 mx-auto mb-1.5" />
                    <p className="text-xl font-black text-slate-900 leading-none mb-1">{totalMinutes || '--'}</p>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Minutos</p>
                </div>
                <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 text-center">
                    <Dumbbell size={16} className="text-blue-500 mx-auto mb-1.5" />
                    <p className="text-xl font-black text-slate-900 leading-none mb-1">
                        {metrics.totalVolume >= 1000 ? `${(metrics.totalVolume / 1000).toFixed(1)}k` : metrics.totalVolume}
                    </p>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">KG Totales</p>
                </div>
                <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 text-center">
                    <Zap size={16} className="text-amber-500 mx-auto mb-1.5" />
                    <p className="text-xl font-black text-slate-900 leading-none mb-1">{metrics.efficiency}%</p>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Eficacia</p>
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

                                        const protocol = step.module.protocol;

                                        return (
                                            <div key={idx} className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100">
                                                <div className="flex justify-between items-center mb-3">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{step.blockType || step.module.name}</span>
                                                    <div className="flex items-center gap-2 text-slate-900 font-black text-xs">
                                                        <Clock size={12} className="text-slate-300" />
                                                        <span>
                                                            {protocol === 'R'
                                                                ? (result.elapsed > 0
                                                                    ? `${Math.floor(result.elapsed / 60)}:${(result.elapsed % 60).toString().padStart(2, '0')}`
                                                                    : 'Completado')
                                                                : protocol === 'T'
                                                                    ? `${Math.floor((step.module.targeting?.[0]?.timeCap || 0) / 60)} min`
                                                                    : `${step.module.emomParams?.durationMinutes || '--'} min`}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
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
                                                                            {ex.targetReps || step.module.targeting?.[0]?.volume} reps • {result.actualWeights?.[exIdx] || result.weights?.[exIdx] || 0}kg
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="grid gap-1.5">
                                                            {step.module.exercises?.map((ex, exIdx) => (
                                                                <div key={exIdx} className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm">
                                                                    <div className="flex items-center gap-2 min-w-0">
                                                                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0" />
                                                                        <span className="text-xs font-bold text-slate-700 truncate">{ex.nameEs || ex.name}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-xs font-black text-slate-900">{result.reps?.[exIdx] || 0} <span className="text-[8px] opacity-40 uppercase">reps</span></span>
                                                                        {(result.actualWeights?.[exIdx] || result.weights?.[exIdx]) > 0 && (
                                                                            <span className="bg-slate-900 text-white px-2 py-0.5 rounded-lg text-[9px] font-black font-mono">
                                                                                {result.actualWeights?.[exIdx] || result.weights?.[exIdx]}kg
                                                                            </span>
                                                                        )}
                                                                    </div>
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

            <div className="mt-8 px-4">
                <button
                    onClick={() => onFinish({ metrics, analysis: insights })}
                    className="w-full bg-slate-900 text-white font-black text-sm py-5 rounded-[2rem] shadow-xl hover:bg-slate-800 transition-all active:scale-[0.98] uppercase tracking-[0.2em]"
                >
                    Finalizar Entrenamiento
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
                // Pass stableId to broad logic across sessions
                const lastLog = await TrainingDB.logs.getLastLog(currentUser.uid, module.id, module.stableId);
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
    const [exerciseNotes, setExerciseNotes] = useState({}); // Per-exercise notes

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
        setExerciseNotes({}); // Initialize empty
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
        // Fix for EMOM Volume: If EMOM Success, grant reps = Target.
        const finalReps = { ...repsDone };
        if (protocol === 'E' && exercises.length > 0) {
            // Calculate effective volume for EMOM based on success status
            const roundsSuccess = Object.values(emomResults).filter(s => s === 'success').length;
            if (roundsSuccess > 0) {
                exercises.forEach((ex, idx) => {
                    const targetPerRound = ex.targetReps || module.targeting?.[0]?.volume || 0;
                    if (targetPerRound > 0) {
                        finalReps[idx] = roundsSuccess * targetPerRound;
                    }
                });
            }
        }

        onComplete({
            reps: finalReps,
            weights: plan, // Keep planned weights
            actualWeights: weightsUsed, // New field for executed weights
            exerciseNotes, // Pass the per-exercise notes
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

                                            {/* Per-Exercise Note Input */}
                                            <div className="mt-3 relative z-10">
                                                <div className="flex items-center gap-2 mb-1.5 px-1">
                                                    <Info size={10} className="text-slate-500" />
                                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Anotaciones del ejercicio</span>
                                                </div>
                                                <input
                                                    type="text"
                                                    placeholder="Ej: Molestia leve, fácil..."
                                                    value={exerciseNotes[idx] || ''}
                                                    onChange={(e) => setExerciseNotes(prev => ({ ...prev, [idx]: e.target.value }))}
                                                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-2 px-3 text-xs text-slate-300 outline-none focus:border-emerald-500/50 transition-all placeholder:text-slate-600"
                                                />
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


const BlockFeedbackModal = ({ onConfirm, blockType, exercises }) => {
    const [rpe, setRpe] = useState(null);
    const [notes, setNotes] = useState('');
    const [exNotes, setExNotes] = useState({});

    const handleConfirm = (isSkip = false) => {
        if (!isSkip && rpe === null) return;
        onConfirm({
            rpe,
            notes: notes.trim(),
            exerciseNotes: exNotes,
            skipped: isSkip
        });
    };

    const handleExNoteChange = (idx, val) => {
        setExNotes(prev => ({ ...prev, [idx]: val }));
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
                            onClick={() => {
                                if (window.confirm("¿Seguro que quieres saltar este bloque? Se marcará como NO COMPLETADO.")) {
                                    onConfirm({ rpe: null, notes: '', skipped: true });
                                }
                            }}
                            className="text-[10px] font-bold text-slate-500 hover:text-white uppercase tracking-widest px-2 py-1"
                        >
                            Saltar
                        </button>
                    </div>

                    <div className="space-y-6 max-h-[60vh] overflow-y-auto px-1">
                        <RPESelector
                            value={rpe}
                            onChange={setRpe}
                            label="Esfuerzo del Bloque (RPE)"
                        />

                        {exercises && exercises.length > 0 && (
                            <div className="space-y-4 pt-4 border-t border-slate-700/50">
                                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-left px-1">Notas por Ejercicio</h3>
                                {exercises.map((ex, idx) => (
                                    <div key={idx} className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                                            <span className="text-xs font-bold text-slate-300 truncate">{ex.nameEs || ex.name}</span>
                                        </div>
                                        <textarea
                                            value={exNotes[idx] || ''}
                                            onChange={(e) => handleExNoteChange(idx, e.target.value)}
                                            placeholder="Añade una nota para este ejercicio..."
                                            className="w-full bg-slate-900/50 border border-slate-700 rounded-xl p-3 text-white text-xs outline-none focus:border-emerald-500/50 transition-all"
                                            rows={2}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="pt-4 border-t border-slate-700/50">
                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-left px-1 mb-2">Comentario del Bloque</h3>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Opcional: Molestias, sensaciones generales..."
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl p-3 text-white text-xs outline-none focus:border-emerald-500/50 transition-all font-medium"
                                rows={2}
                            />
                        </div>
                    </div>

                    <button
                        onClick={() => handleConfirm(false)}
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

const CardioTaskView = ({ session, overrides, onFinish, onBack }) => {
    const [duration, setDuration] = useState(parseInt(overrides?.duration) || 10);
    const [distance, setDistance] = useState(overrides?.distance || '');
    const [rpe, setRpe] = useState(6);
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    const handleConfirm = async () => {
        setSaving(true);
        try {
            await onFinish({
                duration,
                distance: distance ? parseFloat(distance) : null,
                rpe,
                notes: notes.trim(),
                comment: notes.trim(), // For backward compatibility
                type: 'cardio'
            });
        } catch (err) {
            console.error(err);
            alert("Error al guardar");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[5000] bg-slate-50 flex flex-col overflow-hidden">
            {/* Immersive Header */}
            <div className="px-6 pt-12 pb-6 bg-white border-b border-slate-100 flex justify-between items-center shadow-sm">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="bg-orange-500 p-1.5 rounded-lg text-white">
                            <Flame size={18} fill="currentColor" />
                        </div>
                        <span className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em]">Sesión Cardiovascular</span>
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">{session.name}</h1>
                </div>
                <button
                    onClick={onBack}
                    className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all"
                >
                    <X size={20} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-32">
                {/* Session Description / Instructions */}
                {session.description && (
                    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
                        <div className="flex items-center gap-2 mb-3">
                            <Info size={16} className="text-slate-400" />
                            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Instrucciones de la sesión</h2>
                        </div>
                        <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line font-medium">
                            {session.description}
                        </p>
                    </div>
                )}

                {/* Assigned Targets HUD */}
                {(overrides?.duration || overrides?.distance || overrides?.notes) && (
                    <div className="bg-slate-900 rounded-[2.5rem] p-6 text-white shadow-xl shadow-slate-900/20">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Zap size={14} className="text-emerald-400" />
                            Objetivos Asignados
                        </h3>
                        <div className="flex gap-4 mb-4">
                            {overrides.duration && (
                                <div className="flex-1 bg-white/5 rounded-2xl p-4 border border-white/5 backdrop-blur-md">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Tiempo</p>
                                    <p className="text-xl font-black text-emerald-400">{overrides.duration} <span className="text-xs">min</span></p>
                                </div>
                            )}
                            {overrides.distance && (
                                <div className="flex-1 bg-white/5 rounded-2xl p-4 border border-white/5 backdrop-blur-md">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Distancia</p>
                                    <p className="text-xl font-black text-blue-400">{overrides.distance} <span className="text-xs">km</span></p>
                                </div>
                            )}
                        </div>
                        {overrides.notes && (
                            <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Notas Especiales</p>
                                <p className="text-xs text-slate-300 italic">"{overrides.notes}"</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Tracking Form */}
                <div className="space-y-10 py-4">
                    {/* Duration Slider */}
                    <div>
                        <div className="flex justify-between items-end mb-4 px-1">
                            <div className="flex items-center gap-2">
                                <Clock size={16} className="text-slate-400" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Duración Real</span>
                            </div>
                            <span className="text-4xl font-black text-slate-900">{duration} <span className="text-base text-slate-400 font-bold">min</span></span>
                        </div>
                        <input
                            type="range" min="5" max="180" step="5"
                            value={duration}
                            onChange={e => setDuration(parseInt(e.target.value))}
                            className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                        />
                    </div>

                    {/* Distance Input */}
                    <div>
                        <div className="flex items-center gap-2 mb-4 px-1">
                            <Footprints size={16} className="text-slate-400" />
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Distancia (Opcional)</label>
                        </div>
                        <div className="relative">
                            <input
                                type="number" step="0.1" placeholder="00.0"
                                value={distance}
                                onChange={e => setDistance(e.target.value)}
                                className="w-full text-6xl font-black text-slate-900 bg-transparent border-b-4 border-slate-100 focus:border-slate-900 outline-none pb-4 placeholder:text-slate-100 tracking-tighter"
                            />
                            <span className="absolute right-0 bottom-6 text-2xl font-black text-slate-300">km</span>
                        </div>
                    </div>

                    {/* RPE Selector */}
                    <RPESelector
                        value={rpe}
                        onChange={setRpe}
                        label="Esfuerzo Percibido (RPE)"
                    />

                    {/* Notes */}
                    <div className="pt-4">
                        <div className="flex items-center gap-2 mb-4 px-1">
                            <MessageSquare size={16} className="text-slate-400" />
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Comentarios Sensaciones</label>
                        </div>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="¿Cómo te has sentido? ¿Alguna molestia?"
                            className="w-full p-6 bg-white rounded-3xl text-sm font-bold text-slate-700 outline-none h-32 border border-slate-100 shadow-sm focus:border-emerald-500/30 transition-all resize-none"
                        />
                    </div>
                </div>
            </div>

            {/* Bottom Action */}
            <div className="p-8 pt-4 bg-white border-t border-slate-100 shrink-0 shadow-2xl">
                <button
                    onClick={handleConfirm}
                    disabled={saving}
                    className="w-full py-5 bg-slate-900 hover:bg-slate-800 text-white rounded-[2rem] font-black text-lg active:scale-[0.98] transition-all disabled:opacity-50 shadow-xl shadow-slate-900/20 flex items-center justify-center gap-3"
                >
                    {saving ? (
                        <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <>
                            <CheckCircle size={20} strokeWidth={3} />
                            CONFIRMAR Y FINALIZAR
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default SessionRunner;
