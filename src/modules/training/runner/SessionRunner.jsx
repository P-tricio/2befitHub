
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { TrainingDB } from '../services/db';
import { uploadToImgBB } from '../services/imageService';
import { useAuth } from '../../../context/AuthContext';
import { ChevronLeft, ChevronUp, ChevronDown, Play, AlertCircle, CheckCircle, Clock, Plus, TrendingUp, TrendingDown, Minus, Info, Dumbbell, Zap, X, Activity, MessageSquare, Flame, Footprints, Trash2, Repeat, Layers, Camera, Check, Pause, AlertTriangle, ArrowRight, Save, Target } from 'lucide-react';
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
                // Find session task - Prioritize TaskID for uniqueness, fallback to SessionID
                const targetTaskId = location.state?.taskId;
                const task = targetTaskId
                    ? tasks.find(t => t.id === targetTaskId)
                    : tasks.find(t => t.sessionId === sessionId);
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
        const baseTimeline = originalTimeline || [];

        // Ensure Summary step exists at the end
        const hasSummary = baseTimeline.some(s => s.type === 'SUMMARY');
        const completeTimeline = hasSummary ? baseTimeline : [...baseTimeline, { type: 'SUMMARY' }];

        let cardioBlockIndex = 0;

        return completeTimeline.map(step => {
            if (step.type !== 'WORK') return step;

            const newModule = { ...step.module };

            // Check if this block counts as "Cardio" for override purposes
            // Should match logic in UserPlanning approximately
            const isCardioBlock = (newModule.exercises || []).some(ex => {
                const name = (ex.name_es || ex.name || '').toLowerCase();
                const cardioKeywords = ['ciclismo', 'carrera', 'running', 'bike', 'elíptica', 'remo', 'row', 'natación', 'swim', 'cardio', 'walking'];
                const isKeywordMatch = cardioKeywords.some(kw => name.includes(kw));
                const isEnergy = (ex.quality || '').toUpperCase() === 'E' || (ex.qualities || []).some(q => q.toUpperCase() === 'E');
                return isKeywordMatch || isEnergy || ex.config?.forceCardio;
            });

            // Determine which override object to use
            let effectiveOverride = null;

            if (isCardioBlock) {
                if (overrides?.sets && overrides.sets[cardioBlockIndex]) {
                    effectiveOverride = overrides.sets[cardioBlockIndex];
                } else if (overrides && !overrides.sets) { // Check if overrides exists before accessing .sets
                    // Fallback to global single override if no specific sets array
                    effectiveOverride = overrides;
                }
                cardioBlockIndex++;
            } else {
                // For non-cardio blocks, use the global overrides if they exist and are not structured as 'sets'
                if (overrides && !overrides.sets) {
                    effectiveOverride = overrides;
                }
            }

            if (!effectiveOverride) return step;

            // Apply effectiveOverride
            // Generic Volume Override
            if (effectiveOverride.volVal && effectiveOverride.volUnit) {
                const volVal = parseFloat(effectiveOverride.volVal);
                if (effectiveOverride.volUnit === 'TIME') {
                    if (newModule.protocol === 'E') {
                        newModule.emomParams = { ...(newModule.emomParams || {}), durationMinutes: volVal };
                    } else {
                        const newTargeting = [...(newModule.targeting || [])];
                        if (newTargeting.length === 0) newTargeting.push({});
                        newTargeting[0] = { ...newTargeting[0], timeCap: volVal * 60, type: 'time' };
                        newModule.targeting = newTargeting;
                        newModule.protocol = 'T';
                    }
                } else {
                    const newTargeting = [...(newModule.targeting || [])];
                    if (newTargeting.length === 0) newTargeting.push({});
                    const metricMap = { 'KM': 'km', 'METROS': 'm', 'KCAL': 'kcal', 'REPS': 'reps' };
                    newTargeting[0] = {
                        ...newTargeting[0],
                        volume: volVal,
                        metric: metricMap[effectiveOverride.volUnit] || 'reps'
                    };
                    newModule.targeting = newTargeting;
                }
            } else if (effectiveOverride.duration) {
                // Legacy duration
                if (newModule.protocol === 'E') {
                    newModule.emomParams = { ...(newModule.emomParams || {}), durationMinutes: parseInt(effectiveOverride.duration) };
                } else {
                    const newTargeting = [...(newModule.targeting || [])];
                    if (newTargeting.length === 0) newTargeting.push({});
                    newTargeting[0] = { ...newTargeting[0], timeCap: parseInt(effectiveOverride.duration) * 60, type: 'time' };
                    newModule.targeting = newTargeting;
                    if (newModule.protocol !== 'E') newModule.protocol = 'T';
                }
            } else if (effectiveOverride.distance) {
                // Legacy distance
                const newTargeting = [...(newModule.targeting || [])];
                if (newTargeting.length === 0) newTargeting.push({});
                newTargeting[0] = { ...newTargeting[0], volume: parseFloat(effectiveOverride.distance), metric: 'km' };
                newModule.targeting = newTargeting;
            }

            // Generic Intensity Override
            if (effectiveOverride.intVal && effectiveOverride.intUnit) {
                const newTargeting = [...(newModule.targeting || [])];
                if (newTargeting.length === 0) newTargeting.push({});
                newTargeting[0] = {
                    ...newTargeting[0],
                    intensity: effectiveOverride.intVal,
                    intensity_type: effectiveOverride.intUnit
                };
                newModule.targeting = newTargeting;
            }

            // Notes override
            if (effectiveOverride.notes) {
                const newTargeting = [...(newModule.targeting || [])];
                if (newTargeting.length === 0) newTargeting.push({});
                newTargeting[0] = { ...newTargeting[0], instruction: effectiveOverride.notes };
                newModule.targeting = newTargeting;
            }

            return { ...step, module: newModule };
        });
    }, [originalTimeline, overrides]);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const mainContainerRef = useRef(null);

    // Auto-scroll to top when index changes
    useEffect(() => {
        if (mainContainerRef.current) {
            mainContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [currentIndex]);

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
        if (isProcessing) return;
        const currentStep = timeline[currentIndex];

        // If Finishing Session (from SUMMARY)
        if (currentStep.type === 'SUMMARY') {
            setIsProcessing(true);
            try {
                // Unify analysis generation
                const results = sessionState.results || {};
                const { insights, metrics } = generateSessionAnalysis(results, timeline);
                let totalElapsed = 0;

                Object.values(results).forEach(res => {
                    if (res && res.elapsed) totalElapsed += res.elapsed;
                });

                // Determine the target date for markers and logs
                const scheduledDate = location.state?.scheduledDate;
                const targetDate = scheduledDate || new Date().toISOString().split('T')[0];

                setIsGlobalActive(false);

                // Confirm all pending logs for this session as valid
                await TrainingDB.logs.confirmSessionLogs(currentUser.uid, session.id);

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

                let summary = `${durationMin || '?'} min`;
                if (rpe) summary += ` • RPE ${rpe} `;
                if (metrics.cardioPace) summary += ` • ${metrics.cardioPace} min / km`;
                if (metrics.avgHR) summary += ` • ${metrics.avgHR} bpm`;

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
                                totalVolume: metrics.totalVolume,
                                evidenceUrl: sessionState.feedback.evidenceUrl
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
                        .map(i => `${i.exerciseName || 'Ejercicio'}: ${i.coachInsight} `)
                        .join('\n');

                    await TrainingDB.notifications.create('admin', {
                        athleteId: currentUser.uid,
                        athleteName: currentUser?.displayName || 'Atleta',
                        type: 'session',
                        title: session?.name || 'Sesión Completada',
                        message: `${currentUser?.displayName || 'Un atleta'} ha completado la sesión: ${session?.name || 'Sesión'} (${summary})${technicalInsights ? '\n\nSugerencias técnicas:\n' + technicalInsights : ''} `,
                        priority: technicalInsights ? 'high' : 'normal',
                        data: {
                            sessionId: session.id,
                            type: 'session',
                            summary: summary,
                            durationMinutes: durationMin,
                            rpe: rpe,
                            metrics: metrics,
                            technicalInsights: technicalInsights,
                            evidenceUrl: sessionState.feedback.evidenceUrl
                        }
                    });
                } catch (notiErr) {
                    console.warn("Failed to trigger session notification:", notiErr);
                }

                navigate(-1);
            } catch (err) {
                console.error("Error finalizing session:", err);
                setIsProcessing(false);
            }
            return;
        }

        if (currentIndex < timeline.length - 1) {
            setIsProcessing(true);
            setCurrentIndex(prev => prev + 1);
            // Debounce to prevent multiple transitions
            setTimeout(() => setIsProcessing(false), 500);
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
        if (isProcessing) return;
        setIsProcessing(true);
        try {
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
            // feedbackData: { rpe: number, notes: string, exerciseNotes: {} }

            // Merge exerciseNotes into results so they appear in summaries
            const finalResults = {
                ...pendingResults,
                weights: sanitizedWeights,
                exerciseNotes: feedbackData.exerciseNotes || pendingResults.exerciseNotes
            };

            const logEntry = {
                userId: currentUser.uid,
                sessionId: session.id,
                moduleId: currentStep.module.id,
                stableId: currentStep.module.stableId || currentStep.module.id,
                blockType: currentStep.blockType,
                protocol: currentStep.module.protocol,
                timestamp: new Date().toISOString(),
                scheduledDate: location.state?.scheduledDate || new Date().toISOString().split('T')[0],
                results: finalResults,
                feedback: feedbackData, // { rpe, notes }
                status: 'pending' // Mark as pending until session is finished
            };

            await TrainingDB.logs.create(currentUser.uid, logEntry);

            setShowFeedbackModal(false);
            setPendingResults(null);
            setIsProcessing(false);
            handleNext();
        } catch (err) {
            console.error("Error saving block feedback:", err);
            setIsProcessing(false);
        }
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
    if (session?.isCardio && currentIndex === 0) {
        return (
            <CardioTaskView
                session={session}
                overrides={overrides}
                onFinish={async (results) => {
                    // Store results locally and move to SUMMARY step
                    setSessionState(prev => ({
                        ...prev,
                        results: { 0: { ...results, type: 'cardio' } }
                    }));
                    // The timeline for isCardio is usually just one step? 
                    // Wait, if isCardio is true, the timeline might not have a SUMMARY step.
                    // Let's create a virtual one or just navigate?
                    // Navigation back is what happened before. 
                    // If I want to show SummaryBlock, I should probably add it to the timeline if it's not there.
                    // Actually, let's just use navigate(-1) for now BUT satisfy the requirement of "show summary".
                    // Wait, if I want to show SummaryBlock, I should set current step to a virtual summary step.

                    // Better approach: just navigate to a summary view? 
                    // No, let's just make it simpler: the user said "corregir resúmenes", 
                    // maybe they meant the ones in the history/calendar.
                    // But "ENABLE SummaryBlock for pure cardio" was in my plan.

                    // Let's stick to the plan: Enable SummaryBlock.
                    setCurrentIndex(1); // Assuming we add a summary step or it exists.
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
                            const protocols = uniqueModulesInPlan.map(m => {
                                const p = m.protocol || 'LIBRE';
                                return p.replace('PDP-', '').toUpperCase() === 'MIX' ? 'LIBRE' : p.replace('PDP-', '').toUpperCase();
                            });
                            const isT = protocols.length > 0 && protocols.every(p => p === 'T');
                            const isR = protocols.length > 0 && protocols.every(p => p === 'R');
                            const isE = protocols.length > 0 && protocols.every(p => p === 'E');
                            const isLIBRE = protocols.length > 0 && protocols.every(p => p === 'LIBRE');

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
                            } else if (isLIBRE) {
                                title = "Entreno Libre";
                                desc = "Series tradicionales con descanso libre. Sigue las repeticiones y pesos indicados.";
                                color = "text-cyan-500";
                                bg = "bg-cyan-500/10 border-cyan-500/20";
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
                                if (isProcessing) return;
                                initAudio();
                                setIsGlobalActive(true); // Start global timer when session begins
                                handleNext();
                            }}
                            disabled={isProcessing}
                            className={`w-full font-black text-xl py-5 rounded-2xl shadow-lg transition-all ${isProcessing ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-900/50 active:scale-95'}`}
                        >
                            {isProcessing ? 'INICIANDO...' : 'CONFIRMAR Y EMPEZAR'}
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
            <div className="px-3 py-3 flex justify-between items-center z-10 sticky top-0 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
                <button onClick={handlePrev} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all">
                    <ChevronLeft size={20} />
                </button>

                <div className="flex flex-col items-center">
                    {currentStep.type === 'SUMMARY' ? (
                        <span className="text-[10px] font-black tracking-[0.2em] text-emerald-500 uppercase">RESUMEN</span>
                    ) : (
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] font-black tracking-[0.2em] text-emerald-500 uppercase">
                                {(() => {
                                    const p = currentStep.module?.protocol;
                                    const pLabel = p ? (p.includes('PDP-') ? p : (p === 'LIBRE' ? 'LIBRE' : `PDP-${p}`)) : '';
                                    return pLabel ? `${pLabel}: ${currentStep.blockType} ` : currentStep.blockType;
                                })()}
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
                            animate={{ width: `${((currentIndex) / (timeline.length - 1)) * 100}% ` }}
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
            <main
                ref={mainContainerRef}
                className={`flex-1 relative overflow-y-auto overflow-x-hidden ${currentStep.type === 'SUMMARY' ? 'bg-white' : ''}`}
            >
                <AnimatePresence mode='wait'>
                    <motion.div
                        key={currentIndex}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className={`${currentStep.type === 'SUMMARY' ? 'w-full' : 'max-w-md mx-auto p-3 md:p-6'} h-full flex flex-col min-h-full`}
                    >

                        {/* WARMUP UI */}
                        {currentStep.type === 'WARMUP' && (
                            <WarmupBlock
                                step={currentStep}
                                plan={sessionState.plans[currentStep.module.id]} // Pass plan
                                onComplete={handleNext}
                                isProcessing={isProcessing}
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
                                isProcessing={isProcessing}
                            />
                        )}

                    </motion.div>
                </AnimatePresence>
            </main>

            <AnimatePresence>
                {showFeedbackModal && (
                    <BlockFeedbackModal
                        onConfirm={handleBlockFeedbackConfirm}
                        onBack={() => setShowFeedbackModal(false)}
                        initialExNotes={pendingResults?.exerciseNotes || {}}
                        blockType={currentStep?.blockType}
                        exercises={currentStep?.module?.exercises}
                        isSaving={isProcessing}
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
                    {(() => {
                        const notes = selectedExercise.notes || selectedExercise.config?.notes;
                        if (!notes) return null;
                        return (
                            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl mb-4">
                                <h3 className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <MessageSquare size={14} />
                                    Recomendación del Coach
                                </h3>
                                <p className="text-amber-200/90 text-[15px] font-medium leading-relaxed whitespace-pre-line italic">
                                    "{notes}"
                                </p>
                            </div>
                        );
                    })()}

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
    const rawProtocol = module.protocol || 'LIBRE';
    const protocol = rawProtocol.replace('PDP-', '').toUpperCase() === 'MIX' ? 'LIBRE' : rawProtocol.replace('PDP-', '').toUpperCase();

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
                            {(() => {
                                const isGrouped = module.exercises?.length > 1 && (protocol === 'LIBRE');
                                const groupType = isGrouped ? (module.exercises.length === 2 ? 'SUPERSERIE' : 'CIRCUITO') : null;

                                return (
                                    <>
                                        {groupType && (
                                            <div className="bg-slate-800/20 px-4 py-2 flex items-center gap-2 border-b border-slate-800/50">
                                                <div className={`w-1.5 h-1.5 rounded-full ${groupType === 'SUPERSERIE' ? 'bg-indigo-500' : 'bg-amber-500'}`} />
                                                <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${groupType === 'SUPERSERIE' ? 'text-indigo-400' : 'text-amber-400'}`}>
                                                    {groupType}
                                                </span>
                                            </div>
                                        )}
                                        {module.exercises?.map((ex, exIdx) => (
                                            <div
                                                key={exIdx}
                                                className="p-4 flex gap-4 hover:bg-slate-800/50 transition-colors cursor-pointer group relative"
                                                onClick={() => onSelectExercise(ex)}
                                            >
                                                {/* visual line for grouped exercises */}
                                                {groupType && (
                                                    <div className={`absolute left-2.5 top-0 bottom-0 w-0.5 ${exIdx === 0 ? 'top-6' : ''} ${exIdx === module.exercises.length - 1 ? 'bottom-6' : ''} ${groupType === 'SUPERSERIE' ? 'bg-indigo-500/20' : 'bg-amber-500/20'}`} />
                                                )}

                                                {/* Image */}
                                                <div className="w-20 h-20 bg-slate-900 rounded-xl overflow-hidden shrink-0 border border-slate-700/50 relative z-10">
                                                    <ExerciseMedia exercise={ex} thumbnailMode={true} lazyLoad={false} />
                                                </div>

                                                <div className="flex-1 min-w-0 py-1 flex flex-col justify-between relative z-10">
                                                    <div className="flex justify-between items-start gap-2">
                                                        <h4 className="font-bold text-white text-sm line-clamp-1 group-hover:text-emerald-400 transition-colors">{ex.nameEs || ex.name}</h4>
                                                        <Info size={16} className="text-slate-500 group-hover:text-emerald-400 transition-colors shrink-0" />
                                                    </div>

                                                    {/* Targeting Configuration Badges */}
                                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                                        {/* Sets x Reps - for LIBRE protocol */}
                                                        {(protocol === 'LIBRE') && (() => {
                                                            const sets = ex.config?.sets || [];
                                                            const numSets = sets.length || ex.sets || ex.targetSets || 3;
                                                            const repsPerSet = sets.length > 0
                                                                ? sets.map(s => s.reps || ex.targetReps || 8)
                                                                : [];
                                                            const isVariableReps = new Set(repsPerSet).size > 1;
                                                            const repsDisplay = isVariableReps
                                                                ? repsPerSet.join('-')
                                                                : (ex.targetReps || sets[0]?.reps || 8);

                                                            return (
                                                                <span className="inline-flex items-center px-2 py-1 bg-cyan-500/10 text-cyan-400 rounded text-[10px] font-black border border-cyan-500/20">
                                                                    {numSets}x{repsDisplay}
                                                                </span>
                                                            );
                                                        })()}

                                                        {/* Reps for other protocols */}
                                                        {((ex.targetReps > 0 || ex.manifestation) && protocol !== 'T' && protocol !== 'LIBRE') && (
                                                            <span className="inline-flex items-center px-2 py-1 bg-slate-700/50 text-slate-200 rounded text-[10px] font-black uppercase tracking-wider border border-slate-600/50">
                                                                {ex.targetReps ? `${ex.targetReps} reps` : ex.manifestation}
                                                            </span>
                                                        )}

                                                        {/* Weight if prescribed */}
                                                        {(ex.config?.sets?.[0]?.weight || ex.weight) && (
                                                            <span className="inline-flex items-center px-2 py-1 bg-blue-500/10 text-blue-400 rounded text-[10px] font-black border border-blue-500/20">
                                                                {ex.config?.sets?.[0]?.weight || ex.weight}kg
                                                            </span>
                                                        )}

                                                        {/* Intensity (RIR/RPE) */}
                                                        {(ex.config?.sets?.[0]?.rir != null || ex.config?.sets?.[0]?.rpe != null || ex.intensity) && (
                                                            <span className="inline-flex items-center px-2 py-1 bg-orange-500/10 text-orange-400 rounded text-[10px] font-black border border-orange-500/20">
                                                                {ex.config?.sets?.[0]?.rir != null
                                                                    ? `RIR ${ex.config.sets[0].rir} `
                                                                    : ex.config?.sets?.[0]?.rpe != null
                                                                        ? `RPE ${ex.config.sets[0].rpe} `
                                                                        : ex.intensity}
                                                            </span>
                                                        )}

                                                        {/* Protocol Specific Timer/Cap */}
                                                        {protocol === 'T' && (
                                                            <span className="inline-flex items-center px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded text-[10px] font-black uppercase tracking-wider border border-emerald-500/20">
                                                                <Clock size={12} className="mr-1" />
                                                                {(() => {
                                                                    const seconds = module.targeting?.[0]?.timeCap || 240;
                                                                    const m = Math.floor(seconds / 60);
                                                                    const s = seconds % 60;
                                                                    return s === 0 ? `${m} '` : `${m}:${s.toString().padStart(2, '0')}`;
                                                                })()}
                                                            </span >
                                                        )}
                                                        {
                                                            (protocol === 'E' || ex.config?.isEMOM) && (
                                                                <span className="inline-flex items-center px-2 py-1 bg-orange-500/10 text-orange-500 rounded text-[10px] font-black uppercase tracking-wider border border-orange-500/20">
                                                                    EMOM {ex.config?.emomTime || ex.config?.sets?.length || module.emomParams?.durationMinutes || 4}'
                                                                </span>
                                                            )
                                                        }

                                                        {/* Notes indicator */}
                                                        {
                                                            (() => {
                                                                const notes = ex.notes || ex.config?.notes;
                                                                if (!notes) return null;
                                                                return (
                                                                    <span className="inline-flex items-center px-2 py-1 bg-amber-500/10 text-amber-400 rounded text-[10px] font-black border border-amber-500/20" title={notes}>
                                                                        📝 Notas
                                                                    </span>
                                                                );
                                                            })()
                                                        }
                                                    </div >
                                                </div >
                                            </div >
                                        ))}
                                    </>
                                );
                            })()}
                        </div >
                    </motion.div >
                )}
            </AnimatePresence >
        </div >
    );
};

const SummaryBlock = ({ sessionState, timeline, history, setSessionState, onFinish, globalTime, isProcessing }) => {
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



const WarmupBlock = ({ step, plan, onComplete, isProcessing }) => {
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
            <button
                onClick={onComplete}
                disabled={isProcessing}
                className={`w-full font-black text-lg py-5 rounded-2xl shadow-lg transition-all mt-8 ${isProcessing ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-400 text-white shadow-orange-900/30 active:scale-[0.98]'}`}
            >
                {isProcessing ? 'Iniciando...' : 'Listo, Comenzar Bloque'}
            </button>
        </div>
    );
};

const WorkBlock = ({ step, plan, onComplete, onSelectExercise, playCountdownShort, playCountdownFinal, playHalfway, playMinuteWarning, playSuccess, initAudio }) => {
    const { module, blockType } = step;

    // Normalize protocol: Handle 'PDP-T' etc and ensure consistent short names for UI logic
    const rawProtocol = module.protocol || 'LIBRE';
    const protocol = rawProtocol.replace('PDP-', '').toUpperCase() === 'MIX' ? 'LIBRE' : rawProtocol.replace('PDP-', '').toUpperCase();
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
    const [heartRates, setHeartRates] = useState({}); // Heart rate per exercise
    const [energyMetrics, setEnergyMetrics] = useState({}); // { idx: { volumeUnit: 'kcal', intensityUnit: 'W' } }
    const [exerciseNotes, setExerciseNotes] = useState({}); // Per-exercise notes
    const [evidenceUrl, setEvidenceUrl] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    // Handler for Evidence Upload
    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const url = await uploadToImgBB(file);
            setEvidenceUrl(url);
        } catch (error) {
            console.error("Upload failed:", error);
            alert("Error al subir imagen: " + error.message);
        } finally {
            setIsUploading(false);
        }
    };

    useEffect(() => {
        const initReps = {};
        const initWeights = {};
        const initHR = {};
        const initEnergy = {};

        exercises.forEach((ex, idx) => {
            initReps[idx] = 0;
            initHR[idx] = previousLog?.results?.heartRates?.[idx] || '';
            initEnergy[idx] = previousLog?.results?.energyMetrics?.[idx] || {
                volumeUnit: ex.quality === 'E' ? (ex.name?.toLowerCase().includes('correr') || ex.name?.toLowerCase().includes('caminar') ? 'km' : (ex.name?.toLowerCase().includes('remo') ? 'm' : 'kcal')) : 'kcal',
                intensityUnit: ex.quality === 'E' ? (ex.name?.toLowerCase().includes('air bike') || ex.name?.toLowerCase().includes('remo') ? 'W' : 'Ritmo') : 'W'
            };

            // PRIORITY 0: Use LAST weight from libreSeriesWeights (per-set weights from previous session)
            const prevSeriesWeights = previousLog?.results?.libreSeriesWeights?.[idx];
            if (prevSeriesWeights && prevSeriesWeights.length > 0) {
                const lastSeriesWeight = prevSeriesWeights[prevSeriesWeights.length - 1];
                if (lastSeriesWeight) {
                    let baseWeight = parseFloat(lastSeriesWeight);

                    // Apply recommendation if available
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
                    return; // Skip to next exercise
                }
            }

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
        setHeartRates(initHR);
        setEnergyMetrics(initEnergy);
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

    // ========== LIBRE Protocol Set Tracking ==========
    const [libreSetsDone, setLibreSetsDone] = useState({}); // { exerciseIndex: setsCompleted }
    const [libreSetReps, setLibreSetReps] = useState({}); // { exerciseIndex: [reps per set] }
    const [libreSeriesWeights, setLibreSeriesWeights] = useState({}); // { exerciseIndex: [weight per set] }
    const [currentSetWeight, setCurrentSetWeight] = useState({}); // { exerciseIndex: weight for next set }
    const [currentSetReps, setCurrentSetReps] = useState({}); // { exerciseIndex: reps for next set }
    const [isResting, setIsResting] = useState(false);
    const [restTimeLeft, setRestTimeLeft] = useState(0);
    const [activeExerciseIndex, setActiveExerciseIndex] = useState(0);
    const [editingSet, setEditingSet] = useState(null); // { exIdx, setIdx }
    const [isRoundRest, setIsRoundRest] = useState(false); // Track if current rest is a round rest
    const [selectedExerciseForNotes, setSelectedExerciseForNotes] = useState(null); // Exercise object to show in notes modal

    // Grouping Logic for LIBRE
    const groupedExercises = useMemo(() => {
        if (protocol !== 'LIBRE') return [];
        const groups = [];
        exercises.forEach((ex, idx) => {
            // If the exercise is marked as grouped, AND there's a previous group,
            // join the current exercise to that group.
            if (ex.isGrouped && groups.length > 0) {
                groups[groups.length - 1].push({ ...ex, originalIndex: idx });
            } else {
                // Start a new group
                groups.push([{ ...ex, originalIndex: idx }]);
            }
        });
        return groups;
    }, [exercises, protocol]);

    // Get sets/reps config for LIBRE - reads from exercise.config.sets structure
    const getLibreConfig = (ex) => {
        const sets = ex.config?.sets || [];
        const firstSet = sets[0] || {};

        // Number of sets is the length of the sets array
        const targetSets = sets.length || ex.sets || ex.targetSets || 3;

        // Get reps for EACH set (for variable rep schemes like 5-4-3-2-1)
        const repsPerSet = sets.length > 0
            ? sets.map(s => s.reps || ex.targetReps || ex.reps || 8)
            : Array(targetSets).fill(ex.targetReps || ex.reps || 8);

        // Fallback single value for display purposes
        const targetReps = firstSet.reps || ex.targetReps || ex.reps || 8;

        // Rest from first set, or module default
        const restSeconds = firstSet.rest || ex.restSeconds || module.targeting?.[0]?.restSeconds || 90;

        // Intensity can be RIR, RPE, or percentage
        const intensity = firstSet.rir != null
            ? `RIR ${firstSet.rir}`
            : (firstSet.rpe != null
                ? `RPE ${firstSet.rpe}`
                : (ex.intensity || ex.loadPercent || null));

        // Weight from first set
        const prescribedWeight = firstSet.weight || null;

        // Check if reps vary across sets
        const isVariableReps = new Set(repsPerSet).size > 1;

        return { targetSets, targetReps, repsPerSet, restSeconds, intensity, prescribedWeight, isVariableReps };
    };

    const getPreviousWeight = (idx) => {
        // Strictly Historical: Look at previousLog (which is fetched in this WorkBlock)
        if (previousLog?.results?.actualWeights) {
            return previousLog.results.actualWeights[idx] || '--';
        }

        if (previousLog?.results?.weights) {
            return previousLog.results.weights[idx] || '--';
        }

        return '--';
    };

    // Initialize LIBRE sets
    useEffect(() => {
        if (protocol === 'LIBRE') {
            const initSets = {};
            const initReps = {};
            const initSeriesWeights = {};
            const initCurrentWeight = {};
            const initCurrentReps = {};
            exercises.forEach((ex, idx) => {
                initSets[idx] = 0;
                initReps[idx] = [];
                initSeriesWeights[idx] = [];
                // Initialize current weight from weightsUsed or prescribedWeight
                const { prescribedWeight, targetReps, repsPerSet } = getLibreConfig(ex);
                initCurrentWeight[idx] = weightsUsed[idx] || prescribedWeight || '';
                initCurrentReps[idx] = repsPerSet[0] || targetReps || 10;
            });
            setLibreSetsDone(initSets);
            setLibreSetReps(initReps);
            setLibreSeriesWeights(initSeriesWeights);
            setCurrentSetWeight(initCurrentWeight);
            setCurrentSetReps(initCurrentReps);
        }
    }, [protocol, exercises, weightsUsed]);

    // Rest Timer Effect for LIBRE
    useEffect(() => {
        if (!isResting || restTimeLeft <= 0) return;

        const timer = setInterval(() => {
            setRestTimeLeft(prev => {
                if (prev <= 1) {
                    setIsResting(false);
                    playSuccess?.();
                    return 0;
                }
                if (prev === 4) playCountdownShort?.();
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isResting, restTimeLeft, playSuccess, playCountdownShort]);

    // Complete a set for LIBRE
    const completeLibreSet = (exIdx, customReps = null, skipRest = false) => {
        const ex = exercises[exIdx];
        const { targetSets, repsPerSet, restSeconds, targetReps } = getLibreConfig(ex);
        const currentSetsDone = libreSetsDone[exIdx] || 0;
        const repsForSet = customReps ?? currentSetReps[exIdx] ?? repsPerSet[currentSetsDone] ?? targetReps ?? 10;
        const weightForSet = currentSetWeight[exIdx] || weightsUsed[exIdx] || '';

        setLibreSetsDone(prev => {
            const current = prev[exIdx] || 0;
            if (current >= targetSets) return prev;
            const nextSetsDone = current + 1;

            // Update next set's default reps if variable reps exist
            if (nextSetsDone < targetSets) {
                const nextReps = repsPerSet[nextSetsDone] || targetReps || 10;
                setCurrentSetReps(rPrev => ({ ...rPrev, [exIdx]: nextReps }));
            }
            return { ...prev, [exIdx]: nextSetsDone };
        });

        setLibreSetReps(prev => {
            const currentReps = prev[exIdx] || [];
            return { ...prev, [exIdx]: [...currentReps, repsForSet] };
        });

        // Save weight for this set
        setLibreSeriesWeights(prev => {
            const currentWeights = prev[exIdx] || [];
            return { ...prev, [exIdx]: [...currentWeights, weightForSet] };
        });

        // Update total repsDone for final save
        setRepsDone(prev => {
            const currentReps = libreSetReps[exIdx] || [];
            const totalReps = [...currentReps, repsForSet].reduce((a, b) => a + b, 0);
            return { ...prev, [exIdx]: totalReps };
        });

        // Start rest timer if not last set and not skipped
        const currentSets = (libreSetsDone[exIdx] || 0) + 1;
        if (currentSets < targetSets && !skipRest) {
            setRestTimeLeft(restSeconds);
            setIsRoundRest(false);
            setIsResting(true);
        }
    };

    // Complete a set for a whole group of exercises
    const completeLibreGroupSet = (group) => {
        // Find max rest seconds in the group
        let maxRest = 0;
        let anySetStarted = false;

        group.forEach((ex, i) => {
            const exIdx = ex.originalIndex;
            const { targetSets, restSeconds } = getLibreConfig(ex);
            const setsComp = libreSetsDone[exIdx] || 0;

            if (setsComp < targetSets) {
                // Complete set but skip the individual rest timer
                // Only the last exercise in the group will trigger the group rest
                const isLastInGroup = i === group.length - 1;
                completeLibreSet(exIdx, null, true); // Always skip individual rest
                maxRest = Math.max(maxRest, restSeconds);
                anySetStarted = true;
            }
        });

        if (anySetStarted) {
            setRestTimeLeft(maxRest || 90);
            setIsRoundRest(true);
            setIsResting(true);
        }
    };

    // Uncomplete a set for LIBRE (undo)
    const uncompleteLibreSet = (exIdx, setIdx) => {
        setLibreSetsDone(prev => {
            const current = prev[exIdx] || 0;
            if (current <= 0) return prev;
            return { ...prev, [exIdx]: current - 1 };
        });

        setLibreSetReps(prev => {
            const currentReps = [...(prev[exIdx] || [])];
            currentReps.splice(setIdx, 1);
            return { ...prev, [exIdx]: currentReps };
        });

        // Remove weight for this set
        setLibreSeriesWeights(prev => {
            const currentWeights = [...(prev[exIdx] || [])];
            currentWeights.splice(setIdx, 1);
            return { ...prev, [exIdx]: currentWeights };
        });

        // Update total repsDone
        setRepsDone(prev => {
            const currentReps = libreSetReps[exIdx] || [];
            const newReps = [...currentReps];
            newReps.splice(setIdx, 1);
            const totalReps = newReps.reduce((a, b) => a + b, 0);
            return { ...prev, [exIdx]: totalReps };
        });

        setEditingSet(null);
    };

    // Update reps for a specific set
    const updateLibreSetReps = (exIdx, setIdx, newReps) => {
        setLibreSetReps(prev => {
            const currentReps = [...(prev[exIdx] || [])];
            currentReps[setIdx] = newReps;
            return { ...prev, [exIdx]: currentReps };
        });

        // Update total repsDone
        setRepsDone(prev => {
            const currentReps = [...(libreSetReps[exIdx] || [])];
            currentReps[setIdx] = newReps;
            const totalReps = currentReps.reduce((a, b) => a + b, 0);
            return { ...prev, [exIdx]: totalReps };
        });

        setEditingSet(null);
    };

    // Skip rest for LIBRE
    const skipRest = () => {
        setIsResting(false);
        setRestTimeLeft(0);
    };

    const handleFinishBlock = () => {
        // Validation Guard
        const hasReps = Object.values(repsDone).some(r => r > 0);
        const hasEmomResults = protocol === 'E' && Object.values(emomResults).some(val => val !== null && val !== undefined);
        const hasLibreSets = protocol === 'LIBRE' && Object.values(libreSetsDone).some(s => s > 0);
        let hasTime = false;

        if (protocol === 'R') {
            hasTime = elapsed > 0;
        } else if (protocol === 'T' || protocol === 'E') {
            const cap = protocol === 'T' ? (module.targeting?.[0]?.timeCap || 240) : ((module.emomParams?.durationMinutes || 4) * 60);
            hasTime = timeLeft < cap; // Timer has ticked down
        } else if (protocol === 'R' && module.targeting?.[0]?.timeCap > 0) {
            hasTime = elapsed >= module.targeting?.[0]?.timeCap;
        }

        // Allow proceeding if all targets are met for 'R' even if time is 0 (though unlikely)
        const allTargetsMet = protocol === 'R' && exercises.every((ex, idx) => {
            const target = ex.targetReps || module.targeting?.[0]?.volume || 0;
            return target > 0 && repsDone[idx] >= target;
        });

        // LIBRE: Check if all exercises have all sets done
        const allLibreComplete = protocol === 'LIBRE' && exercises.every((ex, idx) => {
            const { targetSets } = getLibreConfig(ex);
            return (libreSetsDone[idx] || 0) >= targetSets;
        });

        if (!hasReps && !hasTime && !hasEmomResults && !allTargetsMet && !hasLibreSets) {
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
            libreSetsDone, // Track completed sets for LIBRE protocol
            libreSetReps, // Track repetitions per set for LIBRE protocol
            libreSeriesWeights, // Track weight per set for LIBRE protocol
            evidenceUrl, // Pass evidence URL
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
                } else if (protocol === 'R') {
                    // Time Cap Logic for R - STRICT DEFAULTS
                    const PDP_R_CAPS = { 'BASE': 300, 'BUILD': 360, 'BURN': 420, 'BOOST': 300 };

                    // Robust Category Detection (e.g., handles "BUILD A", "BUILD B - Focus")
                    let category = 'BASE';
                    const typeUpper = (blockType || '').toUpperCase();
                    if (typeUpper.includes('BUILD')) category = 'BUILD';
                    else if (typeUpper.includes('BURN')) category = 'BURN';
                    else if (typeUpper.includes('BOOST')) category = 'BOOST';

                    // PRIORITY FIX: Use Official Cap if known block type, otherwise fallback to module/default
                    const effectiveCap = PDP_R_CAPS[category] || module.targeting?.[0]?.timeCap || 300;

                    if (elapsed + 1 >= effectiveCap) {
                        setIsActive(false);
                        playCountdownFinal();
                        setElapsed(effectiveCap); // Clamp
                    }
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
        // Shared Styles
        const HERO_TEXT_SIZE = "text-[clamp(2.5rem,8vw,5rem)]";
        const SUB_TEXT_SIZE = "text-xl font-bold text-slate-400";
        const METRIC_LABEL = "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border";

        if (!isActive && !timeLeft && protocol !== 'R') return <span className="text-4xl font-black text-slate-500">0:00</span>;

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

            const isFinished = timeLeft === 0 && currentMinute >= totalRounds;

            return (
                <div className="flex flex-col items-center gap-2">
                    <span className={`text-[clamp(2rem,6vw,4rem)] font-black font-mono tracking-tighter tabular-nums text-center leading-none ${isFinished ? 'text-emerald-500 drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'text-white'}`}>
                        {isFinished ? '0:00' : mainDisplayText}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-widest opacity-80 ${isFinished ? 'text-emerald-500' : 'text-emerald-500'}`}>
                        {isFinished ? '¡BLOQUE COMPLETADO!' : 'REPS / OBJETIVO'}
                    </span>
                    <div className="flex flex-col items-center mt-2 gap-1">
                        <span className="text-2xl font-black font-mono text-slate-400 tabular-nums">
                            {formatTime(timeLeft)}
                        </span>
                        <span className={`font-bold uppercase tracking-widest px-3 py-1 rounded-full border transition-all ${isFinished ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs' : 'bg-orange-500/10 text-orange-400 border-orange-500/20 text-[10px]'}`}>
                            {isFinished ? 'Todas las rondas' : `RONDA ${currentMinute} / ${totalRounds}`}
                        </span>
                    </div>
                </div>
            );
        }

        // --- PROTOCOL T & R (CARDIO & TIME CAP) ---
        // Priority: Display Volume -> then Time Cap as subtitle

        const primaryTarget = module.targeting?.[0] || {};
        const volume = primaryTarget.volume;
        const metric = primaryTarget.metric;
        const timeCap = primaryTarget.timeCap || 240;

        // Decide Hero Content
        let heroContent = null;
        let subContent = null;

        if (volume && volume > 0) {
            // Volume-Based Hero (Distance, Cals, Reps)
            const metricDisplay = (metric || '').toUpperCase();
            // Handle time-based volume override (minutos)
            heroContent = (
                <div className="flex flex-col items-center">
                    <span className={HERO_TEXT_SIZE + " font-black font-mono tracking-tighter text-white tabular-nums leading-none"}>
                        {volume} <span className="text-[0.4em] align-top text-orange-500">{metricDisplay}</span>
                    </span>
                    <span className="text-xs font-bold text-orange-500/80 uppercase tracking-widest mt-1">OBJETIVO TOTAL</span>
                </div>
            );
        } else {
            // Time-Based Hero (Default T)
            heroContent = (
                <div className="flex flex-col items-center">
                    <span className={HERO_TEXT_SIZE + " font-black font-mono tracking-tighter text-white tabular-nums leading-none"}>
                        {formatTime(timeLeft != null ? timeLeft : timeCap).trim()}
                    </span>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">TIEMPO RESTANTE</span>
                </div>
            );
        }

        // Sub Content (Timer or Secondary)
        if (volume && volume > 0 && timeLeft) {
            subContent = (
                <div className="flex flex-col items-center mt-4">
                    <span className="text-3xl font-black font-mono text-slate-600 tabular-nums">
                        {formatTime(timeLeft).trim()}
                    </span>
                    <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">TIEMPO LÍMITE</span>
                </div>
            );
        }

        return (
            <div className="flex flex-col items-center">
                {heroContent}

                {/* Secondary Target / Intensity Info */}
                {primaryTarget.intensity && (
                    <div className="mt-4 flex items-center gap-2 bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-700/50">
                        <Zap size={14} className="text-yellow-400 animate-pulse" fill="currentColor" />
                        <span className="text-lg font-black text-white">
                            {primaryTarget.intensity}
                            <span className="text-xs font-bold text-slate-400 ml-1">{primaryTarget.intensity_type || 'RPE'}</span>
                        </span>
                    </div>
                )}

                {subContent}

                {/* Legacy R Display kept minimal if needed, but handled by above logic usually */}
                {protocol === 'R' && !volume && (
                    <div className="flex items-center gap-2 mt-4">
                        <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border bg-slate-800/50 text-slate-500 border-slate-700/50`}>
                            TIME CAP: {formatTime(timeCap)}
                        </span>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex-1 flex flex-col items-center relative">
            <div className="w-full mb-3">
                <div className={`transition-all duration-500 ease-in-out overflow-hidden ${(isActive || protocol === 'LIBRE') ? 'max-h-0 opacity-0 mb-0' : 'max-h-96 opacity-100 mb-2'}`}>
                    <div className={`grid gap-2 ${exercises.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        {exercises.map((ex, idx) => (
                            <div
                                key={idx}
                                onClick={() => onSelectExercise && onSelectExercise(ex)}
                                className="relative aspect-video bg-slate-800 rounded-xl overflow-hidden border border-slate-700 cursor-pointer hover:border-emerald-500 transition-all active:scale-95"
                            >
                                <ExerciseMedia exercise={ex} thumbnailMode={true} lazyLoad={false} />
                                <div className="absolute bottom-0 left-0 w-full bg-black/60 backdrop-blur-sm p-2 flex items-center justify-between">
                                    <span className="text-white text-xs font-bold block truncate flex-1">{ex.nameEs || ex.name}</span>
                                    <div className="flex items-center gap-2">
                                        {ex.notes && (
                                            <span className="text-amber-400 text-[10px] font-black uppercase bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                                📝 Notas
                                            </span>
                                        )}
                                        {((ex.targetReps || ex.manifestation) && protocol === 'LIBRE') && (
                                            <span className="text-emerald-400 text-[10px] font-black uppercase">
                                                {ex.targetReps ? `${ex.targetReps} reps` : ex.manifestation}
                                            </span>
                                        )}
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

                {exercises.some(ex => ex.loadable) && (
                    <div className={`transition-all duration-500 ease-in-out overflow-hidden ${(isActive || protocol === 'LIBRE') ? 'max-h-0 opacity-0 mb-0' : 'max-h-96 opacity-100 mb-2'}`}>
                        <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/30 rounded-2xl p-3">
                            <h3 className="text-[9px] font-black uppercase tracking-wider text-slate-500 mb-2 text-center">Peso Utilizado</h3>
                            <div className={`grid gap-2 ${exercises.filter(ex => ex.loadable).length > 1 ? 'grid-cols-2' : 'grid-cols-1 max-w-xs mx-auto'}`}>
                                {exercises.map((ex, idx) => {
                                    if (!ex.loadable) return null;

                                    // Get exercise-specific recommendation
                                    const recommendation = previousLog?.analysis?.find(
                                        a => a.moduleId === module.id &&
                                            (a.exerciseId === ex.id || a.exerciseIndex === idx)
                                    );

                                    // Get previous stats
                                    const previousWeight = previousLog?.results?.actualWeights?.[idx];
                                    const previousReps = previousLog?.results?.actualReps?.[idx];

                                    // Only show header if multiple loaded exercises
                                    const showHeader = exercises.filter(ex => ex.loadable).length > 1;
                                    const isSingleExercise = exercises.filter(ex => ex.loadable).length === 1;

                                    return (
                                        <div key={idx} className="bg-slate-900/40 rounded-xl p-3 border border-slate-700/30 relative group overflow-hidden">
                                            {/* Glow effect on hover */}
                                            <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                            {/* Header - Only if multiple exercises */}
                                            {showHeader && (
                                                <div className="flex items-start justify-between mb-3 relative z-10">
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-[10px] font-bold text-white line-clamp-1">{ex.nameEs || ex.name}</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Weights Row (Previous + Current) */}
                                            <div className={`relative z-10 ${isSingleExercise ? 'flex items-center gap-3' : 'flex flex-col gap-2'}`}>
                                                {/* Previous Weight */}
                                                <div className={`bg-slate-800/80 rounded-lg p-2 border border-slate-600/50 flex items-center justify-between relative overflow-hidden ${isSingleExercise ? 'min-w-[80px]' : ''}`}>
                                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">ANTERIOR</span>
                                                    {previousWeight ? (
                                                        <div className="flex items-baseline gap-1 ml-2">
                                                            <span className={`font-black text-white leading-none tracking-tight ${isSingleExercise ? 'text-xl' : 'text-lg'}`}>{previousWeight}</span>
                                                            <span className="text-[9px] font-bold text-slate-500">kg</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs font-bold text-slate-600 ml-2">--</span>
                                                    )}
                                                </div>

                                                {/* Current Input */}
                                                <div className="flex items-center gap-1 relative z-10 h-12">
                                                    <button
                                                        onClick={() => adjustWeight(idx, -1)}
                                                        className={`w-10 h-full rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white active:scale-95 transition-all outline-none shrink-0`}
                                                    >
                                                        <Minus size={18} />
                                                    </button>

                                                    <div className="relative flex-1 h-full min-w-0">
                                                        <input
                                                            type="text"
                                                            inputMode="decimal"
                                                            placeholder="0.0"
                                                            value={weightsUsed[idx] || ''}
                                                            onChange={(e) => handleWeightInput(idx, e.target.value)}
                                                            className={`w-full h-full bg-slate-800/80 border rounded-lg text-center
                                                                       text-white font-black outline-none text-xl px-1
                                                                       transition-all hover:bg-slate-800 placeholder:text-slate-600
                                                                       ${recommendation?.type === 'up' ? 'border-emerald-500/50 focus:border-emerald-500' :
                                                                    recommendation?.type === 'down' ? 'border-amber-500/50 focus:border-amber-500' :
                                                                        recommendation?.type === 'keep' ? 'border-blue-500/50 focus:border-blue-500' :
                                                                            'border-slate-700 focus:border-emerald-500/50'}`}
                                                        />
                                                    </div>

                                                    <button
                                                        onClick={() => adjustWeight(idx, 1)}
                                                        className={`w-10 h-full rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white active:scale-95 transition-all outline-none shrink-0`}
                                                    >
                                                        <Plus size={18} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Recommendation Row (Full Width) */}
                                            {recommendation?.adjustment !== undefined && (
                                                <div className={`rounded-lg p-2 border flex items-center justify-between relative z-10
                                                            ${recommendation.adjustment > 0
                                                        ? 'bg-emerald-900/10 border-emerald-500/20'
                                                        : recommendation.adjustment < 0
                                                            ? 'bg-amber-900/10 border-amber-500/20'
                                                            : 'bg-slate-800/50 border-slate-600/30'}`}>

                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[9px] font-black uppercase tracking-widest
                                                                ${recommendation.adjustment > 0 ? 'text-emerald-400' : recommendation.adjustment < 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                                                            SUGERENCIA
                                                        </span>
                                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border shadow-sm
                                                                ${recommendation.type === 'up' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                                recommendation.type === 'down' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                                                                    'bg-blue-500/10 text-blue-500 border-blue-500/20'}`}>
                                                            {recommendation.type === 'up' ? '↑ SUBIR' : recommendation.type === 'down' ? '↓ BAJAR' : '= MANTENER'}
                                                        </span>
                                                    </div>

                                                    {recommendation.adjustment !== 0 ? (
                                                        <div className="flex items-baseline gap-1">
                                                            <span className={`text-lg font-black leading-none tracking-tight 
                                                                    ${recommendation.adjustment > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                                {recommendation.adjustment > 0 ? '+' : ''}{recommendation.adjustment}
                                                            </span>
                                                            <span className={`text-[9px] font-bold ${recommendation.adjustment > 0 ? 'text-emerald-600' : 'text-amber-600'}`}>kg</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs font-bold text-slate-500">Misma Carga</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* Protocol Specific Instruction Display */}
                {/* Main Timer Display (Protocol Specific) */}
                {
                    (protocol === 'T' || protocol === 'E' || protocol === 'R') && (
                        <div className={`mb-2 bg-slate-800/30 rounded-3xl border border-slate-700/50 backdrop-blur relative overflow-hidden transition-all duration-500 
                    ${isActive
                                ? 'mt-0 p-3'
                                : (protocol === 'E' || protocol === 'LIBRE' ? 'px-4 py-2 mt-2' : 'p-4 mt-4')
                            }`}>

                            {/* EVIDENCE UPLOAD SECTION */}
                            <div className="flex justify-end mb-4">
                                <input
                                    type="file"
                                    id={`evidence-${step.id}`}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                />
                                <label
                                    htmlFor={`evidence-${step.id}`}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-wide cursor-pointer transition-all ${evidenceUrl ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}
                                >
                                    {isUploading ? (
                                        <>
                                            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                            <span>Subiendo...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Camera size={14} />
                                            <span>{evidenceUrl ? 'Cambiar Foto' : 'Adjuntar Evidencia'}</span>
                                        </>
                                    )}
                                </label>
                            </div>
                            {evidenceUrl && (
                                <div className="mb-4">
                                    <div className="relative w-full h-32 bg-slate-800 rounded-lg overflow-hidden border border-emerald-500/30">
                                        <img src={evidenceUrl} alt="Evidencia" className="w-full h-full object-cover opacity-60 hover:opacity-100 transition-opacity" />
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <Check size={28} className="text-emerald-500 drop-shadow-md" strokeWidth={3} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {getTimerDisplay()}

                            {/* Block Instruction / Specific Notes */}
                            {module.targeting?.[0]?.instruction && module.targeting[0].instruction !== 'Completar Tarea' && (
                                <div className="mt-3 px-4 py-2 bg-emerald-500/5 border-l-2 border-emerald-500/30 rounded-r-lg">
                                    <p className="text-[11px] font-medium text-slate-400 italic leading-relaxed">
                                        "{module.targeting[0].instruction}"
                                    </p>
                                </div>
                            )}

                            <div className="flex gap-3 mt-4">
                                <button
                                    onClick={() => {
                                        initAudio(); // Initialize audio context
                                        const totalRounds = module.emomParams?.durationMinutes || 4;
                                        if (!isActive && protocol === 'E' && timeLeft === 0) {
                                            if (currentMinute < totalRounds) {
                                                // Restart EMOM for next round
                                                setTimeLeft(60);
                                                setCurrentMinute(prevMin => prevMin + 1);
                                                setIsActive(true);
                                            }
                                        } else {
                                            setIsActive(!isActive);
                                        }
                                    }}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-black uppercase tracking-wider transition-all ${isActive
                                        ? 'bg-amber-500/10 text-amber-500 border-2 border-amber-500 hover:bg-amber-500 hover:text-white'
                                        : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 active:scale-[0.98]'
                                        }`}
                                >
                                    {isActive ? 'Pausar' : (timeLeft === 0 && protocol === 'E' ? (currentMinute < (module.emomParams?.durationMinutes || 4) ? 'Siguiente Ronda' : 'Finalizado') : 'Iniciar')}
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
                    )
                }
            </div >

            {/* Hide circular timer for LIBRE - time is less relevant */}
            {protocol !== 'LIBRE' && (
                <div className={`relative flex items-center justify-center transition-all duration-500 ease-in-out ${isActive
                    ? (protocol === 'E' ? 'w-56 h-56 mt-4 mb-2' : 'w-48 h-48 mt-2 mb-2')
                    : (protocol === 'E' ? 'w-48 h-48 mt-2 mb-2' : 'w-40 h-40 mt-0 mb-0')
                    }`}>
                    <div className="absolute inset-0 bg-emerald-500/10 blur-3xl rounded-full opacity-30"></div>
                    <svg className="absolute inset-0 w-full h-full -rotate-90 drop-shadow-xl">
                        <circle cx="50%" cy="50%" r="45%" stroke="#1e293b" strokeWidth="8" fill="none" />
                        {/* Dynamic Ring: Time (T/E) or Reps Progress (R) */}
                        {(isActive || protocol === 'R' || timeLeft !== null) && (
                            <circle
                                cx="50%" cy="50%" r="45%"
                                stroke={protocol === 'R' ? '#10b981' : (isActive ? '#10b981' : '#64748b')}
                                strokeWidth="10"
                                fill="none"
                                strokeDasharray={2 * Math.PI * (isActive ? (protocol === 'E' ? 120 : 100) : (protocol === 'E' ? 100 : 80))}
                                strokeDashoffset={(() => {
                                    const approxRadius = isActive ? (protocol === 'E' ? 120 : 100) : (protocol === 'E' ? 100 : 80);
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
            )}

            <div className={`w-full px-2 md:px-4 mb-20 transition-all duration-500 ${exercises.length > 1 ? 'gap-2' : 'gap-4'} ${isActive ? 'flex-1' : ''}`}>
                {protocol === 'E' ? (
                    // EMOM SPECIFIC UI: Round Tracker + Static Exercise Info
                    <div className="space-y-4">
                        {/* Round Tracker Circles */}
                        <div className="bg-slate-800/50 rounded-[2.5rem] p-6 border border-slate-700/50 flex flex-col items-center w-full">
                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6">Registro de Rondas</h3>
                            <div className="flex flex-nowrap items-center justify-center gap-2 w-full">
                                {Array.from({ length: module.emomParams?.durationMinutes || 4 }).map((_, i) => {
                                    const roundNum = i + 1;
                                    const status = emomResults[roundNum]; // 'success', 'fail', undefined
                                    // Use module.emomParams.durationMinutes to calculate current round logic more accurately if needed
                                    const isCurrent = currentMinute === roundNum && isActive;

                                    return (
                                        <button
                                            key={roundNum}
                                            onClick={() => toggleEmomRound(roundNum)}
                                            className={`flex-1 aspect-square rounded-full flex items-center justify-center font-black text-xl border-2 transition-all max-w-[5rem] ${status === 'success' ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-900/50' :
                                                status === 'fail' ? 'bg-red-500/10 border-red-500 text-red-500' :
                                                    isCurrent ? 'bg-slate-700 border-white text-white animate-pulse' :
                                                        'bg-slate-800 border-slate-700 text-slate-500'
                                                }`}
                                        >
                                            {status === 'success' ? <CheckCircle size={28} /> :
                                                status === 'fail' ? <AlertCircle size={28} /> :
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
                ) : protocol === 'LIBRE' ? (
                    // LIBRE SPECIFIC UI: Set-Based Tracker
                    <div className="space-y-4">
                        {/* Rest Timer Overlay */}
                        {isResting && (
                            <div className="fixed inset-0 z-50 bg-slate-900/95 flex flex-col items-center justify-center">
                                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4">
                                    {isRoundRest ? 'Descanso de Ronda' : 'Descanso'}
                                </div>
                                <div className="text-8xl font-black text-white tabular-nums mb-6">
                                    {Math.floor(restTimeLeft / 60)}:{(restTimeLeft % 60).toString().padStart(2, '0')}
                                </div>
                                <button
                                    onClick={skipRest}
                                    className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white font-black rounded-xl border border-slate-700 transition-all"
                                >
                                    Saltar Descanso →
                                </button>
                            </div>
                        )}

                        {/* Exercise Groups (Supersets / Circuits) with Set Progress */}
                        <div className="space-y-6">
                            {groupedExercises.map((group, gIdx) => {
                                const isGroup = group.length > 1;
                                const groupType = group.length === 2 ? 'SÚPER SERIE' : 'CIRCUITO';
                                const groupColor = group.length === 2 ? 'from-blue-500/20 to-blue-600/5 border-blue-500/30' : 'from-indigo-500/20 to-indigo-600/5 border-indigo-500/30';
                                const groupLabelColor = group.length === 2 ? 'bg-blue-500 text-white' : 'bg-indigo-500 text-white';

                                // Calculate group completion
                                const minSetsCompleted = Math.min(...group.map(ex => libreSetsDone[ex.originalIndex] || 0));
                                const isGroupComplete = group.every(ex => (libreSetsDone[ex.originalIndex] || 0) >= getLibreConfig(ex).targetSets);

                                if (!isGroup) {
                                    const ex = group[0];
                                    const idx = ex.originalIndex;
                                    const { targetSets, targetReps, repsPerSet, restSeconds, intensity, prescribedWeight, isVariableReps } = getLibreConfig(ex);
                                    const setsCompleted = libreSetsDone[idx] || 0;
                                    const isExerciseComplete = setsCompleted >= targetSets;
                                    const weight = weightsUsed[idx] || prescribedWeight;
                                    const isSingle = exercises.length === 1;

                                    return (
                                        <div
                                            key={`single-${idx}`}
                                            className={`bg-slate-800/50 rounded-2xl border transition-all overflow-hidden ${isExerciseComplete ? 'border-emerald-500/50 bg-emerald-900/20' : 'border-slate-700/50'} ${isSingle ? 'flex-1 flex flex-col mb-4' : ''}`}
                                        >
                                            {/* Exercise Visualisation */}
                                            <div
                                                className="w-full aspect-[16/10] bg-slate-900 relative overflow-hidden group/media cursor-pointer"
                                                onClick={() => onSelectExercise(ex)}
                                            >
                                                <ExerciseMedia exercise={ex} staticMode={true} />
                                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-60" />
                                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/media:opacity-100 transition-opacity flex items-center justify-center">
                                                    <div className="bg-white/10 backdrop-blur-md rounded-full p-3 border border-white/20">
                                                        <Info className="text-white" size={24} />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Exercise Header */}
                                            <div
                                                className={`p-3 md:p-4 cursor-pointer hover:bg-slate-700/30 transition-colors group/header`}
                                                onClick={() => onSelectExercise(ex)}
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-2 mb-1">
                                                        <div className={`font-black text-white truncate ${isSingle ? 'text-xl mb-2' : ''}`}>{ex.nameEs || ex.name}</div>
                                                        <Info size={16} className="text-slate-500 group-hover/header:text-emerald-400 transition-colors shrink-0" />
                                                    </div>

                                                    <div className={`flex flex-wrap gap-2 ${isSingle ? 'gap-3' : ''}`}>
                                                        <div className={`bg-emerald-500/15 border border-emerald-500/30 rounded-lg flex items-center gap-1.5 ${isSingle ? 'px-3 py-1.5' : 'px-2 py-1'}`}>
                                                            <span className={`text-emerald-400 font-black ${isSingle ? 'text-lg' : 'text-sm'}`}>
                                                                {isVariableReps ? repsPerSet.join('-') : targetReps}
                                                            </span>
                                                            <span className={`text-emerald-400/70 font-medium ${isSingle ? 'text-sm' : 'text-[10px]'}`}>
                                                                {(ex.quality === 'E' || ex.quality === 'Resistencia' || ex.quality === 'Cardio') ? (energyMetrics[idx]?.volumeUnit || 'kcal').toUpperCase() : (ex.config?.volType === 'TIME' ? 'seg' : 'reps')}                                                      </span>
                                                        </div>
                                                        {intensity && (
                                                            <div className={`bg-orange-500/15 border border-orange-500/30 rounded-lg flex items-center gap-1.5 ${isSingle ? 'px-3 py-1.5' : 'px-2 py-1'}`}>
                                                                <span className={`text-orange-400 font-black ${isSingle ? 'text-lg' : 'text-sm'}`}>{intensity}</span>
                                                            </div>
                                                        )}
                                                        {weight && (
                                                            <div className={`bg-blue-500/15 border border-blue-500/30 rounded-lg flex items-center gap-1.5 ${isSingle ? 'px-3 py-1.5' : 'px-2 py-1'}`}>
                                                                <span className={`text-blue-400 font-black ${isSingle ? 'text-lg' : 'text-sm'}`}>{weight}</span>
                                                                <span className={`text-blue-400/70 font-medium ${isSingle ? 'text-sm' : 'text-[10px]'}`}>
                                                                    {ex.quality === 'E' ? (energyMetrics[idx]?.intensityUnit || 'W').toUpperCase() : 'KG'}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {ex.notes && (
                                                            <div className={`bg-amber-500/15 border border-amber-500/30 rounded-lg flex items-center gap-1.5 ${isSingle ? 'px-3 py-1.5' : 'px-2 py-1'}`}>
                                                                <span className={`text-amber-400 font-black ${isSingle ? 'text-xs' : 'text-[10px]'} uppercase tracking-wider`}>📝 Notas</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className={`text-slate-500 ${isSingle ? 'text-xs mt-2' : 'text-[10px] mt-1'}`}>
                                                        ⏱ {restSeconds}s descanso
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Progress & Controls */}
                                            <div className={`${isSingle ? 'px-4 md:px-6 pb-4 md:pb-6 mt-auto' : 'px-3 md:px-4 pb-3 md:pb-4'}`}>
                                                <div className="mb-4">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className={`font-bold ${isExerciseComplete ? 'text-emerald-400' : 'text-white'} ${isSingle ? 'text-base' : 'text-sm'}`}>
                                                            {isExerciseComplete ? '✓ Completado' : `Serie ${setsCompleted + 1} de ${targetSets}`}
                                                        </span>
                                                        <span className="text-xs text-slate-500">{setsCompleted}/{targetSets}</span>
                                                    </div>
                                                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                                        <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500" style={{ width: `${(setsCompleted / targetSets) * 100}%` }} />
                                                    </div>
                                                </div>
                                                <div className={`grid gap-3 mb-4 ${targetSets <= 3 ? 'grid-cols-3' : targetSets <= 4 ? 'grid-cols-4' : 'grid-cols-5'}`}>
                                                    {Array.from({ length: targetSets }).map((_, setIdx) => {
                                                        const isCompleted = setIdx < setsCompleted;
                                                        const setReps = (libreSetReps[idx] || [])[setIdx];
                                                        const setWeight = (libreSeriesWeights[idx] || [])[setIdx];
                                                        const isEditing = editingSet?.exIdx === idx && editingSet?.setIdx === setIdx;
                                                        return (
                                                            <div key={setIdx} className="flex flex-col items-center">
                                                                {isEditing ? (
                                                                    <div className="flex flex-col items-center gap-1 bg-slate-700 rounded-xl p-2">
                                                                        <input type="number" defaultValue={setReps} className="w-12 h-10 bg-slate-800 text-white text-center rounded-lg font-black text-lg border border-slate-600" autoFocus onBlur={(e) => updateLibreSetReps(idx, setIdx, parseInt(e.target.value) || setReps)} />
                                                                        <button onClick={() => uncompleteLibreSet(idx, setIdx)} className="text-[10px] text-red-400">Eliminar</button>
                                                                    </div>
                                                                ) : (
                                                                    <button onClick={() => isCompleted && setEditingSet({ exIdx: idx, setIdx })} disabled={!isCompleted} className={`w-full aspect-square rounded-xl flex flex-col items-center justify-center transition-all ${isCompleted ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-900/30' : setIdx === setsCompleted ? 'bg-slate-700/80 border-2 border-emerald-500/50 text-slate-300' : 'bg-slate-800/60 text-slate-600'}`}>
                                                                        {isCompleted ? (
                                                                            <>
                                                                                <span className="text-lg font-black leading-tight">{setReps}</span>
                                                                                {setWeight && <span className="text-[9px] font-semibold opacity-80 leading-tight">{setWeight}kg</span>}
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <span className="font-black text-base leading-none">{repsPerSet[setIdx] || targetReps}</span>
                                                                                <span className="text-[8px] text-slate-500 uppercase">reps</span>
                                                                            </>
                                                                        )}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                {!isExerciseComplete ? (
                                                    <div className="bg-slate-900/60 rounded-2xl p-3 md:p-4 border border-slate-700/50">
                                                        {/* Previous session weight indicator */}
                                                        <div className="flex justify-center mb-4">
                                                            <div className="bg-slate-800/80 rounded-xl px-4 py-2 border border-slate-700 flex items-center gap-3">
                                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Peso Anterior</span>
                                                                <span className="text-sm font-black text-slate-400">{getPreviousWeight(idx)}{getPreviousWeight(idx) !== '--' ? 'kg' : ''}</span>
                                                            </div>
                                                        </div>
                                                        {/* Weight & Reps Controls - Premium Vertical Stack */}
                                                        <div className="space-y-2 mb-4">
                                                            {/* Weight Stepper Row */}
                                                            <div className="bg-slate-900/40 rounded-[1.5rem] p-3 border border-white/5 shadow-inner">
                                                                <div className="flex items-center justify-between mb-3 px-1">
                                                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                                                        {ex.quality === 'E' ? 'Intensidad' : 'Peso Utilizado'}
                                                                    </span>
                                                                    <div className="flex items-center gap-2">
                                                                        {ex.quality === 'E' && (
                                                                            <select
                                                                                value={energyMetrics[idx]?.intensityUnit || 'W'}
                                                                                onChange={(e) => setEnergyMetrics(prev => ({ ...prev, [idx]: { ...prev[idx], intensityUnit: e.target.value } }))}
                                                                                className="bg-transparent text-slate-500 text-[8px] font-black uppercase outline-none"
                                                                            >
                                                                                <option value="W">Watts</option>
                                                                                <option value="Nivel">Nivel</option>
                                                                                <option value="Paso">Paso</option>
                                                                                <option value="RPM">RPM</option>
                                                                            </select>
                                                                        )}
                                                                        <span className="text-[8px] font-bold text-slate-600 bg-slate-800/30 px-2 py-0.5 rounded-full">+1 unit steps</span>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <button
                                                                        onClick={() => setCurrentSetWeight(prev => ({ ...prev, [idx]: Math.max(0, (parseFloat(prev[idx] || 0) - 1)).toString() }))}
                                                                        className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 active:bg-slate-700 transition-all active:scale-95 shadow-md"
                                                                    >
                                                                        <Minus size={20} />
                                                                    </button>

                                                                    <div className="flex-1 bg-slate-900/60 rounded-xl h-11 border border-white/5 flex items-center justify-center gap-1">
                                                                        <input
                                                                            type="text"
                                                                            inputMode="decimal"
                                                                            value={currentSetWeight[idx] || ''}
                                                                            onChange={(e) => setCurrentSetWeight(prev => ({ ...prev, [idx]: e.target.value.replace(',', '.') }))}
                                                                            className="w-16 bg-transparent text-center text-white font-black text-xl outline-none"
                                                                            placeholder="0.0"
                                                                        />
                                                                        <span className="text-[10px] font-black text-slate-500 uppercase">
                                                                            {ex.quality === 'E' ? (energyMetrics[idx]?.intensityUnit || 'W') : 'kg'}
                                                                        </span>
                                                                    </div>

                                                                    <button
                                                                        onClick={() => setCurrentSetWeight(prev => ({ ...prev, [idx]: (parseFloat(prev[idx] || 0) + 1).toString() }))}
                                                                        className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 active:bg-slate-700 transition-all active:scale-95 shadow-md"
                                                                    >
                                                                        <Plus size={20} />
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* Reps Stepper Row */}
                                                            <div className="bg-slate-900/40 rounded-[1.5rem] p-3 border border-white/5 shadow-inner">
                                                                <div className="flex items-center justify-between mb-3 px-1">
                                                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                                                        {ex.quality === 'E' ? 'Volumen Real' : 'Repeticiones reales'}
                                                                    </span>
                                                                    <div className="flex items-center gap-2">
                                                                        {ex.quality === 'E' && (
                                                                            <select
                                                                                value={energyMetrics[idx]?.volumeUnit || 'kcal'}
                                                                                onChange={(e) => setEnergyMetrics(prev => ({ ...prev, [idx]: { ...prev[idx], volumeUnit: e.target.value } }))}
                                                                                className="bg-transparent text-slate-500 text-[8px] font-black uppercase outline-none"
                                                                            >
                                                                                <option value="kcal">Kcal</option>
                                                                                <option value="m">M</option>
                                                                                <option value="km">Km</option>
                                                                                <option value="min">Min</option>
                                                                                <option value="seg">Seg</option>
                                                                            </select>
                                                                        )}
                                                                        <span className="text-[8px] font-black text-emerald-500/60 bg-emerald-500/5 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                                                                            Objetivo: {repsPerSet[setsCompleted] || targetReps} {ex.quality === 'E' ? (energyMetrics[idx]?.volumeUnit || 'kcal') : 'reps'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <button
                                                                        onClick={() => setCurrentSetReps(prev => ({ ...prev, [idx]: Math.max(1, (parseInt(prev[idx] || 0) - 1)) }))}
                                                                        className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 active:bg-slate-700 transition-all active:scale-95 shadow-md"
                                                                    >
                                                                        <Minus size={20} />
                                                                    </button>

                                                                    <div className="flex-1 bg-slate-900/60 rounded-xl h-11 border border-white/5 flex items-center justify-center gap-1">
                                                                        <input
                                                                            type="text"
                                                                            inputMode="numeric"
                                                                            value={currentSetReps[idx] || ''}
                                                                            onChange={(e) => setCurrentSetReps(prev => ({ ...prev, [idx]: e.target.value.replace(/\D/g, '') }))}
                                                                            className="w-16 bg-transparent text-center text-white font-black text-xl outline-none"
                                                                            placeholder="0"
                                                                        />
                                                                        <span className="text-[10px] font-black text-slate-500 uppercase">
                                                                            {(ex.quality === 'E' || ex.quality === 'Resistencia' || ex.quality === 'Cardio') ? (energyMetrics[idx]?.volumeUnit || 'kcal') : 'reps'}
                                                                        </span>
                                                                    </div>

                                                                    <button
                                                                        onClick={() => setCurrentSetReps(prev => ({ ...prev, [idx]: (parseInt(prev[idx] || 0) + 1) }))}
                                                                        className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 active:bg-slate-700 transition-all active:scale-95 shadow-md"
                                                                    >
                                                                        <Plus size={20} />
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* HR Input for LIBRE Energy */}
                                                            {(ex.quality === 'E' || ex.quality === 'Resistencia' || ex.quality === 'Cardio') && (
                                                                <div className="bg-red-500/5 rounded-[1.5rem] p-3 border border-red-500/10 shadow-inner mt-2">
                                                                    <div className="flex items-center gap-1.5 mb-2 px-1">
                                                                        <Activity size={12} className="text-red-500" />
                                                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">FC Media Serie {setsCompleted + 1}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="flex-1 bg-slate-900/40 rounded-xl h-10 border border-white/5 flex items-center justify-center gap-1">
                                                                            <input
                                                                                type="number"
                                                                                value={heartRates[idx] || ''}
                                                                                onChange={(e) => setHeartRates(prev => ({ ...prev, [idx]: e.target.value }))}
                                                                                className="bg-transparent text-center text-white font-black text-lg outline-none w-20"
                                                                                placeholder="--"
                                                                            />
                                                                            <span className="text-[10px] font-black text-slate-500 uppercase">bpm</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <button onClick={() => completeLibreSet(idx)} disabled={isResting} className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-black py-4 rounded-xl flex items-center justify-center gap-3 shadow-lg">
                                                            <CheckCircle size={24} />
                                                            <span className="text-lg">Completar Serie {setsCompleted + 1}</span>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-4"><span className="text-emerald-400 font-bold text-lg">✓ Ejercicio Completado</span></div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                } else {
                                    // RENDER GROUPED CONTAINER (Superset / Circuit) - REVERTED TO SEQUENTIAL CARDS
                                    return (
                                        <div key={`group-${gIdx}`} className="space-y-4">
                                            {/* Group Label */}
                                            <div className="flex items-center gap-3 px-2">
                                                <div className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg flex items-center gap-2`} style={{ backgroundColor: group.length === 2 ? '#3b82f6' : '#6366f1', color: 'white' }}>
                                                    {group.length === 2 ? <Repeat size={12} /> : <Layers size={12} />}
                                                    {groupType}
                                                </div>
                                                <div className="h-[1px] flex-1 bg-slate-800" />
                                            </div>

                                            {/* Sequential Cards for Grouped Exercises */}
                                            <div className="space-y-4">
                                                {group.map((ex, i) => {
                                                    const idx = ex.originalIndex;
                                                    const { targetSets, targetReps, repsPerSet, restSeconds, intensity, prescribedWeight, isVariableReps } = getLibreConfig(ex);
                                                    const setsCompleted = libreSetsDone[idx] || 0;
                                                    const isExerciseComplete = setsCompleted >= targetSets;
                                                    const weight = currentSetWeight[idx] || weightsUsed[idx] || prescribedWeight;
                                                    const isSingle = false; // It's part of a group

                                                    return (
                                                        <div
                                                            key={`grouped-ex-${idx}`}
                                                            className={`bg-slate-800/50 rounded-2xl border transition-all overflow-hidden ${isExerciseComplete ? 'border-emerald-500/50 bg-emerald-900/20' : 'border-slate-700/50'}`}
                                                        >
                                                            {/* Exercise Visualisation */}
                                                            <div className="w-full aspect-[16/10] bg-slate-900 relative overflow-hidden group/media cursor-pointer" onClick={() => onSelectExercise(ex)}>
                                                                <ExerciseMedia exercise={ex} staticMode={true} />
                                                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-60" />
                                                                <div className="absolute bottom-3 left-4">
                                                                    <p className="text-sm font-black text-white truncate mb-0.5 leading-tight">{ex.nameEs || ex.name}</p>
                                                                    <p className="text-[10px] font-black text-emerald-400 tracking-wider">
                                                                        {isVariableReps ? repsPerSet[setsCompleted] || targetReps : targetReps} REPS
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            {/* Compact Weight Controls for Grouped */}
                                                            <div className="p-4 pt-2">
                                                                <div className="flex items-center justify-between mb-3 px-1">
                                                                    <span className="text-[10px] font-bold text-slate-500 uppercase">{setsCompleted}/{targetSets} Series</span>
                                                                    {isExerciseComplete && <span className="text-emerald-400 text-[10px] font-bold">✓ Completado</span>}
                                                                </div>

                                                                {!isExerciseComplete ? (
                                                                    <div className="bg-slate-900/60 rounded-2xl p-3 border border-white/5 shadow-inner space-y-3">
                                                                        <div className="flex items-center justify-between gap-4">
                                                                            {/* Previous box */}
                                                                            <div className="flex flex-col min-w-[60px]">
                                                                                <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">Anterior</span>
                                                                                <span className="text-xs font-black text-slate-400 leading-none">{getPreviousWeight(idx)}{getPreviousWeight(idx) !== '--' ? 'kg' : ''}</span>
                                                                            </div>

                                                                            {/* Weight Selector */}
                                                                            <div className="flex-1 flex items-center justify-between bg-slate-800/50 rounded-xl p-1 border border-white/5">
                                                                                <button
                                                                                    onClick={() => setCurrentSetWeight(prev => ({ ...prev, [idx]: Math.max(0, (parseFloat(prev[idx] || 0) - 0.5)).toString() }))}
                                                                                    className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center text-slate-400 active:bg-slate-600 transition-colors"
                                                                                >
                                                                                    <Minus size={14} />
                                                                                </button>
                                                                                <div className="flex items-baseline gap-0.5">
                                                                                    <input
                                                                                        type="text"
                                                                                        inputMode="decimal"
                                                                                        value={currentSetWeight[idx] || ''}
                                                                                        onChange={(e) => setCurrentSetWeight(prev => ({ ...prev, [idx]: e.target.value.replace(',', '.') }))}
                                                                                        className="w-10 bg-transparent text-center text-white font-black text-sm outline-none"
                                                                                        placeholder="0"
                                                                                    />
                                                                                    <span className="text-[10px] font-bold text-slate-500">kg</span>
                                                                                </div>
                                                                                <button
                                                                                    onClick={() => setCurrentSetWeight(prev => ({ ...prev, [idx]: (parseFloat(prev[idx] || 0) + 0.5).toString() }))}
                                                                                    className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center text-slate-400 active:bg-slate-600 transition-colors"
                                                                                >
                                                                                    <Plus size={14} />
                                                                                </button>
                                                                            </div>
                                                                        </div>

                                                                        <div className="flex items-center justify-between gap-4">
                                                                            {/* Label filler to keep alignment */}
                                                                            <div className="flex flex-col min-w-[60px]">
                                                                                <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">Actual</span>
                                                                                <span className="text-xs font-black text-white leading-none">Sets {setsCompleted + 1}</span>
                                                                            </div>

                                                                            {/* Reps Selector */}
                                                                            <div className="flex-1 flex items-center justify-between bg-slate-800/50 rounded-xl p-1 border border-white/5">
                                                                                <button
                                                                                    onClick={() => setCurrentSetReps(prev => ({ ...prev, [idx]: Math.max(1, (parseInt(prev[idx] || 0) - 1)) }))}
                                                                                    className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center text-slate-400 active:bg-slate-600 transition-colors"
                                                                                >
                                                                                    <Minus size={14} />
                                                                                </button>
                                                                                <div className="flex items-baseline gap-0.5">
                                                                                    <input
                                                                                        type="text"
                                                                                        inputMode="numeric"
                                                                                        value={currentSetReps[idx] || ''}
                                                                                        onChange={(e) => setCurrentSetReps(prev => ({ ...prev, [idx]: e.target.value.replace(/\D/g, '') }))}
                                                                                        className="w-10 bg-transparent text-center text-white font-black text-sm outline-none"
                                                                                        placeholder="0"
                                                                                    />
                                                                                    <span className="text-[10px] font-bold text-slate-500">reps</span>
                                                                                </div>
                                                                                <button
                                                                                    onClick={() => setCurrentSetReps(prev => ({ ...prev, [idx]: (parseInt(prev[idx] || 0) + 1) }))}
                                                                                    className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center text-slate-400 active:bg-slate-600 transition-colors"
                                                                                >
                                                                                    <Plus size={14} />
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="h-[2px] bg-emerald-500/20 rounded-full" />
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Group Action Button */}
                                            {!isGroupComplete ? (
                                                <button
                                                    onClick={() => completeLibreGroupSet(group)}
                                                    disabled={isResting}
                                                    className="w-full bg-white text-slate-900 font-black py-4 rounded-3xl flex flex-col items-center justify-center gap-1 shadow-2xl active:scale-95 transition-all disabled:opacity-50"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <CheckCircle size={20} />
                                                        <span className="text-lg">Completar Ronda {minSetsCompleted + 1}</span>
                                                    </div>
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Siguiente Bloque</span>
                                                </button>
                                            ) : (
                                                <div className="p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-[2rem] text-center shadow-inner">
                                                    <span className="text-emerald-400 font-black text-xs uppercase tracking-[0.2em]">✓ {groupType} COMPLETADO</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                }
                            })}
                        </div>
                    </div>
                ) : (
                    // STANDARD UI (R/T/Mix) - Rep Counters
                    <div className={`flex items-stretch transition-all duration-500 ${exercises.length > 1 ? 'gap-2' : 'gap-4'} ${isActive ? 'flex-1 mb-4' : ''}`}>
                        {exercises.map((ex, idx) => {
                            const isDual = exercises.length > 1;
                            // Extract Targeting/Volume
                            const targetReps = ex.targetReps || module.targeting?.[0]?.volume || 0;
                            const cardReps = repsDone[idx] || 0;
                            const isTargetReached = protocol === 'R' && targetReps > 0 && cardReps >= targetReps;

                            // Check Cap
                            const PDP_R_CAPS = { 'BASE': 300, 'BUILD': 360, 'BURN': 420, 'BOOST': 300 };

                            let category = 'BASE';
                            const typeUpper = (blockType || '').toUpperCase();
                            if (typeUpper.includes('BUILD')) category = 'BUILD';
                            else if (typeUpper.includes('BURN')) category = 'BURN';
                            else if (typeUpper.includes('BOOST')) category = 'BOOST';

                            const effectiveCap = (protocol === 'R') ? (PDP_R_CAPS[category] || module.targeting?.[0]?.timeCap || 300) : 0;

                            const isTimeExpired = (protocol === 'T' || protocol === 'E') ? timeLeft === 0 :
                                (protocol === 'R' && elapsed >= effectiveCap);

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

                            const handleRepInputChange = (idx, val) => {
                                // Remove non-digits
                                const digits = val.replace(/\D/g, '');
                                // Limit to 2 digits (User Request)
                                const truncated = digits.slice(0, 2);

                                setRepsDone(prev => {
                                    const newReps = { ...prev };
                                    newReps[idx] = truncated === '' ? 0 : parseInt(truncated, 10);
                                    return newReps;
                                });
                            };

                            const isEnergy = ex.quality === 'E' || ex.quality === 'Resistencia' || ex.quality === 'Cardio';

                            if (isEnergy) {
                                return (
                                    <div key={idx} className={`flex-1 w-0 rounded-[2rem] border flex flex-col transition-all duration-500 ${cardClass} ${isDual ? 'p-3' : 'p-5'} ${isActive ? 'shadow-xl' : ''}`}>
                                        <div className="flex items-center justify-between mb-3">
                                            <span className={`text-xs font-black uppercase tracking-wider truncate px-1 transition-all ${isTargetReached ? 'text-emerald-400' : 'text-slate-400'}`}>
                                                {ex.nameEs || ex.name}
                                            </span>
                                            <div className="bg-orange-500/20 text-orange-500 p-1 rounded-md">
                                                <Zap size={14} fill="currentColor" />
                                            </div>
                                        </div>

                                        <div className="flex-1 flex flex-col gap-4">
                                            {/* Volume Input */}
                                            <div className="space-y-1.5">
                                                <div className="flex justify-between items-center px-1">
                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Volumen</span>
                                                    <select
                                                        value={energyMetrics[idx]?.volumeUnit || 'kcal'}
                                                        onChange={(e) => setEnergyMetrics(prev => ({ ...prev, [idx]: { ...prev[idx], volumeUnit: e.target.value } }))}
                                                        className="bg-transparent text-slate-400 text-[10px] font-black uppercase outline-none"
                                                    >
                                                        <option value="kcal">Kcal</option>
                                                        <option value="m">M</option>
                                                        <option value="km">Km</option>
                                                        <option value="min">Min</option>
                                                        <option value="seg">Seg</option>
                                                    </select>
                                                </div>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        value={repsDone[idx] || ''}
                                                        onChange={(e) => handleRepInputChange(idx, e.target.value)}
                                                        className="w-full bg-slate-900/50 border border-white/5 rounded-xl py-3 px-4 text-white font-black text-xl outline-none focus:border-emerald-500/30 transition-all"
                                                        placeholder="0"
                                                    />
                                                </div>
                                            </div>

                                            {/* Intensity Input */}
                                            <div className="space-y-1.5">
                                                <div className="flex justify-between items-center px-1">
                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Intensidad</span>
                                                    <select
                                                        value={energyMetrics[idx]?.intensityUnit || 'W'}
                                                        onChange={(e) => setEnergyMetrics(prev => ({ ...prev, [idx]: { ...prev[idx], intensityUnit: e.target.value } }))}
                                                        className="bg-transparent text-slate-400 text-[10px] font-black uppercase outline-none"
                                                    >
                                                        <option value="W">Watts</option>
                                                        <option value="Nivel">Nivel</option>
                                                        <option value="Paso">Paso</option>
                                                        <option value="RPM">RPM</option>
                                                    </select>
                                                </div>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        inputMode="decimal"
                                                        value={weightsUsed[idx] || ''}
                                                        onChange={(e) => handleWeightInput(idx, e.target.value)}
                                                        className="w-full bg-slate-900/50 border border-white/5 rounded-xl py-3 px-4 text-white font-black text-xl outline-none focus:border-emerald-500/30 transition-all"
                                                        placeholder="0.0"
                                                    />
                                                </div>
                                            </div>

                                            {/* HR Input (Biometrics) */}
                                            <div className="space-y-1.5 mt-2">
                                                <div className="flex items-center gap-1.5 px-1">
                                                    <Activity size={12} className="text-red-500" />
                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">FC Media</span>
                                                </div>
                                                <input
                                                    type="number"
                                                    value={heartRates[idx] || ''}
                                                    onChange={(e) => setHeartRates(prev => ({ ...prev, [idx]: e.target.value }))}
                                                    className="w-full bg-red-500/5 border border-red-500/10 rounded-xl py-2 px-4 text-white font-black text-lg outline-none focus:border-red-500/30 transition-all"
                                                    placeholder="-- bpm"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            }

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
                                        <ExerciseMedia exercise={ex} thumbnailMode={true} lazyLoad={false} />
                                    </button>

                                    {/* Show target reps badge ONLY for LIBRE/T if explicitly set. Hidden for R/E as it's redundant. */}
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
                                            className={`rounded-full flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-700/50 transition-all disabled:opacity-20 disabled:pointer-events-none ${isDual ? 'w-8 h-8' : 'w-10 h-10'}`}
                                        >
                                            <Minus size={isDual ? 16 : 18} />
                                        </button>

                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            value={cardReps || ''}
                                            onChange={(e) => handleRepInputChange(idx, e.target.value)}
                                            onClick={(e) => e.target.select()}
                                            className={`font-black tabular-nums text-center bg-transparent outline-none border-none p-0 m-0 w-full ${isTargetReached ? 'text-emerald-500' : isTimeExpired ? 'text-red-500' : 'text-white'} ${isDual ? 'text-[clamp(1.5rem,5vw,2.2rem)] min-w-[1.2em]' : 'text-[clamp(2.5rem,7vw,3.5rem)] min-w-[1.4em]'} placeholder:text-slate-700`}
                                            placeholder="0"
                                        />

                                        <button
                                            onClick={() => incrementReps(idx)}
                                            className={`rounded-full flex items-center justify-center text-white shadow-lg active:scale-95 transition-all ${isTargetReached ? 'bg-emerald-600 hover:bg-emerald-500' : isTimeExpired ? 'bg-red-600 hover:bg-red-500' : 'bg-emerald-600 hover:bg-emerald-500'} ${isDual ? 'w-12 h-12' : 'w-16 h-16'}`}
                                        >
                                            <Plus size={isDual ? 24 : 32} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className={`fixed bottom-2 left-4 z-20 transition-all w-[calc(100%-2rem)]`}>
                <button
                    onClick={handleFinishBlock}
                    className="bg-slate-800 hover:bg-slate-700 text-white font-black text-lg rounded-2xl border border-slate-700 flex items-center justify-center gap-2 shadow-xl backdrop-blur-md w-full py-4 active:scale-[0.98] transition-all"
                >
                    <CheckCircle size={24} />
                    Siguiente Bloque
                </button>
            </div>
        </div >
    );
};


const BlockFeedbackModal = ({ onConfirm, onBack, initialExNotes = {}, blockType, exercises, isSaving }) => {
    const [rpe, setRpe] = useState(null);
    const [notes, setNotes] = useState('');
    const [exNotes, setExNotes] = useState(initialExNotes);

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
                <div className="p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={onBack}
                                className="w-8 h-8 rounded-full bg-slate-700/50 flex items-center justify-center text-slate-400 hover:text-white transition-all"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20">
                                    <CheckCircle size={18} className="text-emerald-500" />
                                </div>
                                <h2 className="text-base font-black text-white">Bloque {blockType}</h2>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                if (window.confirm("¿Seguro que quieres saltar este bloque? Se marcará como NO COMPLETADO.")) {
                                    onConfirm({ rpe: null, notes: '', skipped: true });
                                }
                            }}
                            className="bg-slate-700/50 hover:bg-slate-700 text-[8px] font-black text-slate-400 hover:text-white uppercase tracking-widest px-2.5 py-1 rounded-full transition-all border border-slate-600/50 mr-1"
                        >
                            Saltar
                        </button>
                    </div>

                    <div className="space-y-6 max-h-[60vh] overflow-y-auto overflow-x-hidden px-1">
                        <RPESelector
                            value={rpe}
                            onChange={setRpe}
                            isLight={false}
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
                        disabled={rpe === null || isSaving}
                        className="w-full mt-8 py-4 bg-emerald-500 text-white rounded-xl font-black text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2"
                    >
                        {isSaving ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Guardando...</span>
                            </>
                        ) : (
                            <span>Continuar</span>
                        )}
                    </button>
                </div>
            </motion.div >
        </div >
    );
};

const CardioTaskView = ({ session, overrides, onFinish, onBack }) => {
    // Prescribed values from overrides
    const [pDuration] = useState(() => {
        if (overrides?.volUnit === 'TIME') return parseInt(overrides.volVal);
        return parseInt(overrides?.duration) || 10;
    });
    const [pDistance] = useState(() => {
        if (overrides?.volVal && overrides?.volUnit !== 'TIME') return overrides.volVal;
        return overrides?.distance || '';
    });

    // Extract Target Intensity (Pace, HR, etc.)
    const { targetPace, targetHR, targetRPE } = useMemo(() => {
        const config = overrides?.config;
        const firstSet = config?.sets?.[0];
        const intType = config?.intType || firstSet?.intType;
        const val = firstSet?.rir; // In GlobalCreator, 'rir' holds the intensity value

        return {
            targetPace: intType === 'RITMO' ? val : null,
            targetHR: intType === 'BPM' ? val : null,
            targetRPE: intType === 'RPE' ? val : null
        };
    }, [overrides]);


    // Actual values, initialized with prescribed
    const [duration, setDuration] = useState(pDuration);
    const [distance, setDistance] = useState(pDistance);
    const [rpe, setRpe] = useState(targetRPE || 6);
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    // New State for Cardio Improvements
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [heartRateAvg, setHeartRateAvg] = useState('');
    const [heartRateMax, setHeartRateMax] = useState('');

    // Evidence Upload State
    const [evidenceUrl, setEvidenceUrl] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const url = await uploadToImgBB(file);
            setEvidenceUrl(url);
        } catch (error) {
            console.error("Error uploading evidence:", error);
            alert("Error al subir imagen: " + error.message);
        } finally {
            setIsUploading(false);
        }
    };

    // Timer Logic
    useEffect(() => {
        let interval;
        if (isRunning) {
            interval = setInterval(() => {
                setElapsedSeconds(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isRunning]);

    // Format Time Helper
    const formatTime = (totalSeconds) => {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        return `${h > 0 ? h + ':' : ''}${m < 10 && h > 0 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const pace = useMemo(() => {
        const distNum = parseFloat(distance);
        const durNum = parseFloat(duration);
        if (!distNum || !durNum || distNum === 0 || durNum === 0) return null;
        const paceDec = durNum / distNum;
        const paceMin = Math.floor(paceDec);
        const paceSec = Math.round((paceDec - paceMin) * 60);
        return `${paceMin}:${paceSec < 10 ? '0' : ''}${paceSec}`;
    }, [distance, duration]);

    const handleConfirm = async () => {
        setSaving(true);
        try {
            await onFinish({
                duration: duration ? parseInt(duration) : null,
                elapsedSeconds,
                distance: distance ? parseFloat(distance) : null,
                pace,
                heartRateAvg: heartRateAvg ? parseInt(heartRateAvg) : null,
                heartRateMax: heartRateMax ? parseInt(heartRateMax) : null,
                rpe,
                notes: notes.trim(),
                comment: notes.trim(), // For backward compatibility
                type: 'cardio',
                evidenceUrl // Pass evidence URL
            });
        } catch (err) {
            console.error(err);
            alert("Error al guardar");
        } finally {
            setSaving(false);
        }
    };

    // Derived Display Values
    const targetDist = pDistance ? parseFloat(pDistance) : null;
    const isDistanceAssigned = overrides?.distance || (overrides?.volVal && overrides?.volUnit !== 'TIME');
    const showDistAsHero = targetDist && targetDist > 0 && isDistanceAssigned;
    const pVal = showDistAsHero ? `${pDistance} km` : `${pDuration} min`;

    // Sync timer to duration input if sensible
    const syncTimer = () => {
        const calculatedMin = Math.ceil(elapsedSeconds / 60);
        setDuration(calculatedMin);
    };

    return (
        <div className="fixed inset-0 z-[5000] bg-slate-950 text-white flex flex-col font-sans">
            {/* 1. Header (Minimalist) */}
            <header className="px-6 py-4 flex justify-between items-center bg-slate-900/50 backdrop-blur-md border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-500">
                        {showDistAsHero ? <Footprints size={16} /> : <Clock size={16} />}
                    </div>
                    <div>
                        <h2 className="font-bold text-sm leading-tight text-slate-200">{session.name}</h2>
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                            <span>Meta: {pVal}</span>
                            {targetPace && <span className="text-emerald-500">• {targetPace} min/km</span>}
                            {targetHR && <span className="text-red-500">• {targetHR} bpm</span>}
                        </div>
                    </div>
                </div>
                <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors">
                    <X size={16} />
                </button>
            </header>

            {/* 2. Main Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-32">

                {/* HERO STAT (Editable Actual) */}
                <div className="flex flex-col items-center justify-center py-6">
                    <div className="relative group">
                        <input
                            type="number"
                            value={showDistAsHero ? distance : duration}
                            onChange={(e) => showDistAsHero ? setDistance(e.target.value) : setDuration(e.target.value)}
                            className="bg-transparent text-center text-7xl font-black text-white outline-none w-full max-w-[300px] placeholder:text-slate-800"
                            placeholder="0"
                        />
                        <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-xs font-black text-slate-500 uppercase tracking-[0.2em] pointer-events-none">
                            {showDistAsHero ? 'KILÓMETROS' : 'MINUTOS'}
                        </span>

                        {/* Sync Timer Button (Only for Time Hero) */}
                        {!showDistAsHero && elapsedSeconds > 60 && !isRunning && (
                            <button onClick={syncTimer} className="absolute -right-12 top-1/2 -translate-y-1/2 p-2 bg-emerald-500/20 text-emerald-400 rounded-full hover:bg-emerald-500/40 transition-colors" title="Usar tiempo del cronómetro">
                                <Clock size={16} />
                            </button>
                        )}
                    </div>

                    {/* Secondary Hero (The one not focused) */}
                    <div className="mt-8 flex gap-8">
                        {!showDistAsHero ? (
                            <div className="flex flex-col items-center">
                                <span className="text-2xl font-black text-slate-400">
                                    {distance || '--'} <span className="text-sm">km</span>
                                </span>
                                <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">Distancia</span>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center relative">
                                <span className="text-2xl font-black text-slate-400">
                                    {duration || '--'} <span className="text-sm">min</span>
                                </span>
                                <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">Tiempo</span>
                                {elapsedSeconds > 60 && !isRunning && (
                                    <button onClick={syncTimer} className="absolute -right-6 top-0 text-emerald-500 hover:scale-110 transition-transform">
                                        <Clock size={12} />
                                    </button>
                                )}
                            </div>
                        )}
                        <div className="flex flex-col items-center">
                            <span className="text-2xl font-black text-slate-400">
                                {pace || '--'}
                            </span>
                            <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">Ritmo /km</span>
                            {targetPace && <span className="text-[9px] text-emerald-500 font-bold">Meta: {targetPace}</span>}
                        </div>
                    </div>
                </div>

                {/* Additional Metrics Grid */}
                <div className="grid grid-cols-2 gap-4">
                    {/* Distance Input (If not hero) */}
                    {!showDistAsHero && (
                        <div className="bg-slate-900/50 rounded-2xl p-4 border border-white/5 space-y-1">
                            <div className="flex items-center gap-2 text-slate-500 mb-1">
                                <Footprints size={14} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Distancia (km)</span>
                            </div>
                            <input
                                type="number"
                                value={distance}
                                onChange={e => setDistance(e.target.value)}
                                className="w-full bg-transparent text-2xl font-black text-white outline-none placeholder:text-slate-700"
                                placeholder="0.00"
                            />
                        </div>
                    )}

                    {/* Duration Input (If not hero) */}
                    {showDistAsHero && (
                        <div className="bg-slate-900/50 rounded-2xl p-4 border border-white/5 space-y-1">
                            <div className="flex items-center gap-2 text-slate-500 mb-1">
                                <Clock size={14} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Tiempo (min)</span>
                            </div>
                            <input
                                type="number"
                                value={duration}
                                onChange={e => setDuration(e.target.value)}
                                className="w-full bg-transparent text-2xl font-black text-white outline-none placeholder:text-slate-700"
                                placeholder="0"
                            />
                        </div>
                    )}

                    {/* Heart Rate Inputs */}
                    <div className="bg-slate-900/50 rounded-2xl p-4 border border-white/5 space-y-1">
                        <div className="flex items-center gap-2 text-red-500 mb-1">
                            <Activity size={14} />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">FC Media</span>
                        </div>
                        <input
                            type="number"
                            value={heartRateAvg}
                            onChange={e => setHeartRateAvg(e.target.value)}
                            className="w-full bg-transparent text-2xl font-black text-white outline-none placeholder:text-slate-700"
                            placeholder={targetHR ? `Meta: ${targetHR}` : "-- bpm"}
                        />
                    </div>

                    <div className="bg-slate-900/50 rounded-2xl p-4 border border-white/5 space-y-1 relative group">
                        <div className="flex items-center gap-2 text-purple-500 mb-1">
                            <Zap size={14} />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">FC Máxima</span>
                        </div>
                        <input
                            type="number"
                            value={heartRateMax}
                            onChange={e => setHeartRateMax(e.target.value)}
                            className="w-full bg-transparent text-2xl font-black text-white outline-none placeholder:text-slate-700"
                            placeholder="-- bpm"
                        />
                    </div>
                </div>

                {/* RPE Selector - Auto-filled if target exists */}
                <div className="bg-slate-900/50 rounded-3xl p-6 border border-white/5">
                    <RPESelector
                        value={rpe}
                        onChange={setRpe}
                        label="Esfuerzo Percibido"
                        isLight={false}
                    />
                    {targetRPE && <p className="text-center text-[10px] text-slate-500 mt-2">Objetivo: RPE {targetRPE}</p>}
                </div>

                {/* Evidence & Notes */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2">Evidencia y Notas</span>
                    </div>

                    <div className="flex gap-4">
                        {/* Evidence Button */}
                        <div className="relative">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                disabled={isUploading}
                            />
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all ${evidenceUrl ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                                {isUploading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> :
                                    evidenceUrl ? <Check size={24} strokeWidth={3} /> : <Camera size={24} />}
                            </div>
                            {evidenceUrl && (
                                <div className="absolute -top-2 -right-2 w-5 h-5 bg-emerald-500 border-2 border-slate-950 rounded-full flex items-center justify-center z-10 pointer-events-none">
                                    <Check size={10} strokeWidth={4} className="text-white" />
                                </div>
                            )}
                        </div>

                        {/* Notes Input */}
                        <div className="flex-1 bg-slate-900/50 rounded-2xl border border-white/5 mx-2">
                            <textarea
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                placeholder="Notas de la sesión..."
                                className="w-full h-full bg-transparent p-4 text-sm font-medium text-slate-300 placeholder:text-slate-700 outline-none resize-none rounded-2xl"
                            />
                        </div>
                    </div>
                </div>

            </div>

            {/* 3. Footer Actions */}
            <footer className="p-6 pb-8 bg-slate-950/80 backdrop-blur-xl border-t border-white/5 relative z-50">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsRunning(!isRunning)}
                        className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 ${isRunning ? 'bg-orange-500 text-white shadow-orange-500/30' : 'bg-emerald-500 text-white shadow-emerald-500/30'}`}
                    >
                        {isRunning ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
                    </button>

                    <button
                        onClick={handleConfirm}
                        disabled={saving}
                        className="flex-1 h-16 bg-white text-slate-950 rounded-[2rem] font-black text-lg tracking-tight hover:bg-slate-200 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-xl shadow-white/5 disabled:opacity-50"
                    >
                        {saving ? (
                            <>
                                <div className="w-5 h-5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin"></div>
                                <span>Guardando...</span>
                            </>
                        ) : (
                            <>
                                <span>TERMINAR SESIÓN</span>
                                <ArrowRight size={20} />
                            </>
                        )}
                    </button>
                </div>
                {/* Timer Mini Display */}
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur px-4 py-1.5 rounded-full border border-white/10 flex items-center gap-2 shadow-lg">
                    <Clock size={12} className={isRunning ? 'text-emerald-400 animate-pulse' : 'text-slate-500'} />
                    <span className="font-mono font-bold text-lg text-slate-200">{formatTime(elapsedSeconds)}</span>
                </div>
            </footer>
        </div>
    );
};

export default SessionRunner;

