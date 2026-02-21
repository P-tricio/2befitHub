
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { TrainingDB } from '../services/db';
import WarmupBlock from './components/WarmupBlock';
import SummaryBlock from './components/SummaryBlock';
import { uploadToImgBB } from '../services/imageService';
import { useAuth } from '../../../context/AuthContext';
import { ChevronLeft, ChevronUp, ChevronDown, Play, AlertCircle, CheckCircle, Clock, Plus, TrendingUp, TrendingDown, Minus, Info, Dumbbell, Zap, X, Activity, MessageSquare, Flame, Footprints, Trash2, Repeat, Layers, Camera, Check, Pause, AlertTriangle, ArrowRight, ArrowLeft, Save, Target, Hash, History } from 'lucide-react';
import { useSessionData } from './hooks/useSessionData.js';
import { useSessionTimer } from '../hooks/useSessionTimer';
import { useKeepAwake } from '../../../hooks/useKeepAwake';
import { useAudioFeedback } from '../../../hooks/useAudioFeedback';
import ExerciseMedia from '../components/ExerciseMedia';
import RPESelector from '../components/RPESelector';
import { generateSessionAnalysis } from './utils/analysisUtils';
import WorkBlock from './components/WorkBlock';

// Utility to remove undefined fields from objects for Firestore
const sanitizeForFirestore = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    const sanitized = Array.isArray(obj) ? [] : {};
    Object.keys(obj).forEach(key => {
        const val = obj[key];
        if (val === undefined) return;
        if (val !== null && typeof val === 'object') {
            sanitized[key] = sanitizeForFirestore(val);
        } else {
            sanitized[key] = val;
        }
    });
    return sanitized;
};

const SessionRunner = () => {
    // Keep screen awake during session
    useKeepAwake();

    // Audio System
    const { playCountdownShort, playCountdownFinal, playHalfway, playMinuteWarning, playSuccess, playFailure, initAudio } = useAudioFeedback();

    const {
        elapsed: globalTime,
        start: startGlobalTimer,
        pause: pauseGlobalTimer,
        setTime: setGlobalTime,
        isRunning: isGlobalActive
    } = useSessionTimer(0);

    const { sessionId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { currentUser } = useAuth();

    // Isolation: We use the scheduled date to separate state between different days
    const scheduledDate = location.state?.scheduledDate || new Date().toISOString().split('T')[0];

    // Data State - now using the new hook
    const { session, modules, timeline: originalTimeline, protocol, history, loading, error } = useSessionData(sessionId, currentUser?.uid);

    // Runner State
    const [overrides, setOverrides] = useState(null);

    // Fetch Overrides
    useEffect(() => {
        const fetchOverrides = async () => {
            if (!currentUser?.uid || !sessionId) return;
            try {
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
                const name = String(ex.name_es || ex.name || '').toLowerCase();
                const cardioKeywords = ['ciclismo', 'carrera', 'running', 'bike', 'elíptica', 'remo', 'row', 'natación', 'swim', 'cardio', 'walking'];
                const isKeywordMatch = cardioKeywords.some(kw => name.includes(kw));
                const isEnergy = String(ex.quality || '').toUpperCase() === 'E' || (ex.qualities || []).some(q => String(q || '').toUpperCase() === 'E');
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
                        // volVal is in minutes from admin override
                        newTargeting[0] = {
                            ...newTargeting[0],
                            timeCap: volVal * 60,
                            volume: volVal,
                            metric: 'min', // Explicitly set to min to distinguish from seconds (seg)
                            type: 'time'
                        };
                        newModule.targeting = newTargeting;
                        newModule.protocol = 'T';
                    }
                } else {
                    const newTargeting = [...(newModule.targeting || [])];
                    if (newTargeting.length === 0) newTargeting.push({});
                    const metricMap = { 'KM': 'km', 'METROS': 'm', 'KCAL': 'kcal', 'REPS': 'reps', 'TIME': 'min' };
                    newTargeting[0] = {
                        ...newTargeting[0],
                        volume: volVal,
                        metric: metricMap[effectiveOverride.volUnit] || 'reps'
                    };
                    newModule.targeting = newTargeting;
                }
            } else if (effectiveOverride.duration) {
                // Legacy duration
                const durationVal = parseInt(effectiveOverride.duration);
                if (newModule.protocol === 'E') {
                    newModule.emomParams = { ...(newModule.emomParams || {}), durationMinutes: durationVal };
                } else {
                    const newTargeting = [...(newModule.targeting || [])];
                    if (newTargeting.length === 0) newTargeting.push({});
                    newTargeting[0] = {
                        ...newTargeting[0],
                        timeCap: durationVal * 60,
                        volume: durationVal,
                        metric: 'min',
                        type: 'time'
                    };
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
    const processingRef = useRef(false);
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

    const [isRestored, setIsRestored] = useState(false);


    // --- PERSISTENCE: Save/Load Session State ---
    useEffect(() => {
        if (!sessionId || !currentUser) return;
        const key = `runner_v3_${currentUser.uid}_${sessionId}_${scheduledDate}`;

        // Initial Load
        const saved = localStorage.getItem(key);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Valid for 12 hours
                if (Date.now() - parsed.timestamp < 12 * 60 * 60 * 1000) {
                    // Verify basic structure
                    if (parsed.sessionState && parsed.currentIndex !== undefined) {
                        console.log("Restoring session from local storage:", key);
                        setSessionState(parsed.sessionState);
                        setCurrentIndex(parsed.currentIndex);
                        if (parsed.globalTime) setGlobalTime(parsed.globalTime);
                    }
                }
            } catch (e) { console.warn("Failed to restore session", e); }
        }
        setIsRestored(true);
    }, [sessionId, currentUser]); // Run once on mount

    useEffect(() => {
        if (!isRestored || !sessionId || !currentUser) return;
        const key = `runner_v3_${currentUser.uid}_${sessionId}_${scheduledDate}`;
        // Debounce save slightly or just save on every change (low cost for localstorage)
        const payload = {
            currentIndex,
            sessionState,
            globalTime,
            timestamp: Date.now()
        };
        localStorage.setItem(key, JSON.stringify(payload));
    }, [isRestored, currentIndex, sessionState, globalTime, sessionId, currentUser]);
    // ---------------------------------------------


    // Global Timer handled by useSessionTimer hook
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

    const finalizeSession = async (overriddenResults = null, overriddenFeedback = null) => {
        if (isProcessing) return;
        setIsProcessing(true);
        console.log('[finalizeSession] Starting finalization for session:', session?.id);

        try {
            // Unify analysis generation
            const results = overriddenResults || sessionState.results || {};
            const { insights, metrics } = generateSessionAnalysis(results, timeline);

            const feedback = overriddenFeedback || sessionState.feedback || {};

            let totalElapsed = 0;
            Object.values(results).forEach(res => {
                if (res && res.elapsed) totalElapsed += res.elapsed;
            });

            // Determine the target date for markers and logs
            const scheduledDate = location.state?.scheduledDate;
            const taskId = location.state?.taskId;
            const targetDate = scheduledDate || new Date().toISOString().split('T')[0];

            console.log('[finalizeSession] Target date for schedule update:', targetDate, 'Task ID:', taskId);

            pauseGlobalTimer();

            // 1. Confirm pending logs
            try {
                await TrainingDB.logs.confirmSessionLogs(currentUser.uid, session.id);
                console.log('[finalizeSession] Confirmed session logs');
            } catch (e) {
                console.warn('[finalizeSession] Low priority error confirming logs:', e);
            }

            // 2. Save feedback AND analysis (Crucial)
            try {
                await TrainingDB.logs.create(currentUser.uid, {
                    sessionId: session.id,
                    timestamp: new Date().toISOString(),
                    scheduledDate: targetDate,
                    type: 'SESSION_FEEDBACK',
                    ...feedback,
                    analysis: insights,
                    metrics: metrics
                });
                console.log('[finalizeSession] Created feedback log');
            } catch (e) {
                console.error('[finalizeSession] Failed to create feedback log:', e);
                throw new Error("No se pudo guardar el feedback de la sesión.");
            }

            // 3. Mark session as completed in user's schedule (Crucial)
            // For cardio: use duration from results. For regular: use globalTime.
            let durationMin = Math.round(globalTime / 60);

            // Check if we have cardio-specific duration in results
            // Results may come as { 1: { durationMinutes, ... } } for cardio sessions
            const firstResult = results?.[1] || Object.values(results || {})[0];

            if (firstResult?.durationMinutes) {
                durationMin = parseInt(firstResult.durationMinutes);
            } else if (firstResult?.duration) {
                durationMin = parseInt(firstResult.duration);
            } else if (firstResult?.elapsedSeconds && firstResult.elapsedSeconds > 30) {
                durationMin = Math.ceil(firstResult.elapsedSeconds / 60);
            } else if (metrics?.durationMinutes) {
                durationMin = parseInt(metrics.durationMinutes);
            }

            const rpe = feedback.rpe;

            let summary = `${durationMin || '?'} min`;
            if (rpe) summary += ` • RPE ${rpe} `;
            if (metrics.cardioPace) summary += ` • ${metrics.cardioPace} min / km`;
            if (metrics.avgHR) summary += ` • ${metrics.avgHR} bpm`;

            let scheduleUpdateSuccess = false;
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
                            ...results, // Spread detailed block results first
                            durationMinutes: durationMin,
                            rpe: rpe || null,
                            notes: feedback.comment || feedback.notes || null,
                            analysis: insights || [],
                            metrics: metrics || {},
                            totalVolume: metrics.totalVolume || 0,
                            evidenceUrl: feedback.evidenceUrl || null,
                            scheduledDate: targetDate // Use existing targetDate variable
                        }
                    },
                    taskId
                );
                console.log('[finalizeSession] Schedule update requested successfully');
                scheduleUpdateSuccess = true;
            } catch (err) {
                console.error('[finalizeSession] Could not update task in schedule:', err);
                // We don't throw here to avoid blocking the user if the log was saved (Data Recovery handles this)
                // But we should alert them? Maybe not if "Recovered" logic works.
            }

            // 4. Trigger Notification for Admin (Non-blocking)
            // We run this asynchronously without awaiting to speed up UX, or await if we want to be sure.
            // Given the priority, let's await but catch securely.
            try {
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
                        rpe: rpe || null,
                        metrics: metrics || {},
                        technicalInsights: technicalInsights || null,
                        evidenceUrl: feedback.evidenceUrl || null
                    }
                });
            } catch (notiErr) {
                console.warn("Failed to trigger session notification:", notiErr);
            }

            console.log('[finalizeSession] Finalization complete. Navigating back.');
            navigate(-1);
        } catch (err) {
            console.error("Error finalizing session:", err);
            alert("Hubo un problema al guardar la sesión: " + (err.message || "Error desconocido"));
            setIsProcessing(false);
        }
    };

    const handleNext = async (summaryData = null) => {
        if (isProcessing) return;
        const currentStep = timeline[currentIndex];

        // If Finishing Session (from SUMMARY)
        if (currentStep.type === 'SUMMARY') {
            await finalizeSession();
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

        if (currentStep.type === 'WORK' && !currentStep.isWarmup) {
            // Store results and open feedback modal
            setPendingResults(results);
            setShowFeedbackModal(true);
        } else {
            // Warmup/Summary don't need block RPE
            handleNext();
        }
    };

    const handleBlockFeedbackConfirm = async (feedbackData) => {
        if (processingRef.current) return;
        processingRef.current = true;
        setIsProcessing(true);
        console.log('[handleBlockFeedbackConfirm] Starting block save...', { sessionId: session?.id, block: currentStep?.blockType });
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

            await TrainingDB.logs.create(currentUser.uid, sanitizeForFirestore(logEntry));

            // 🆕 Log exercise-level history for cross-session tracking
            try {
                const moduleExercises = currentStep.module.exercises || [];
                for (let idx = 0; idx < moduleExercises.length; idx++) {
                    const ex = moduleExercises[idx];
                    const exId = ex.id || ex.exerciseId;

                    // Skip if no exercise ID or not loadable
                    if (!exId) continue;
                    const isLoadable = ex.loadable || ex.isLoadable || ex.config?.isLoadable;
                    if (!isLoadable && ex.quality !== 'F') continue; // Only track loadable/strength exercises

                    // Get weight data from results
                    const weight = finalResults.actualWeights?.[idx] || finalResults.weights?.[idx] || sanitizedWeights[idx];
                    const reps = finalResults.actualReps?.[idx] || finalResults.reps?.[idx];
                    const setWeights = finalResults.seriesWeights?.[idx] || [];
                    const setReps = finalResults.seriesReps?.[idx] || [];

                    // Only log if there's actual weight data (top-level OR series weights)
                    const hasTopWeight = weight && parseFloat(weight) > 0;
                    const hasSeriesWeights = setWeights.length > 0 && setWeights.some(w => parseFloat(w) > 0);

                    if (hasTopWeight || hasSeriesWeights) {
                        const sets = setWeights.length > 0
                            ? setWeights.map((w, i) => ({ weight: parseFloat(w) || 0, reps: parseInt(setReps[i]) || 0 }))
                            : [{ weight: parseFloat(weight), reps: parseInt(reps) || 0 }];

                        const maxWeight = Math.max(...sets.map(s => s.weight || 0).filter(w => w > 0));

                        await TrainingDB.exerciseHistory.log(currentUser.uid, exId, sanitizeForFirestore({
                            date: new Date(),
                            sessionId: session.id,
                            moduleId: currentStep.module.id,
                            exerciseName: ex.nameEs || ex.name || 'Ejercicio',
                            sets: sets,
                            maxWeight: maxWeight,
                            // 🆕 Context fields for smart lookup (Sanitized to avoid undefined crashes)
                            protocol: currentStep.module.protocol || null,
                            blockType: currentStep.blockType || null,
                            manifestation: currentStep.module.manifestation || null
                        }));
                    }
                }
            } catch (historyErr) {
                console.warn('[handleBlockFeedbackConfirm] Exercise history logging failed:', historyErr);
                // Non-blocking error - session log is already saved
            }

            setShowFeedbackModal(false);
            setPendingResults(null);
            setIsProcessing(false);
            processingRef.current = false;
            handleNext();
        } catch (err) {
            console.error("Error saving block feedback:", err);
            setIsProcessing(false);
            processingRef.current = false;
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        } else {
            navigate(-1); // Exit if at start
        }
    };

    const activeModules = useMemo(() => {
        return timeline
            .filter(step => step.type === 'WORK')
            .map(step => step.module);
    }, [timeline]);

    if (loading) return <div className="fixed inset-0 z-[5000] bg-slate-900 flex items-center justify-center text-slate-400">Cargando motor de entrenamiento...</div>;
    if (error) return <div className="fixed inset-0 z-[5000] bg-slate-900 flex items-center justify-center text-red-500 font-bold">{error}</div>;

    // CARDIO SPECIAL VIEW
    if (session?.isCardio && currentIndex === 0) {
        return (
            <CardioTaskView
                session={session}
                modules={activeModules}
                overrides={overrides}
                onFinish={async (results) => {
                    // For pure cardio sessions, we bypass the summary and use specialized results mapping
                    // feedback format expected by finalizeSession: { rpe, comment, evidenceUrl }
                    const cardioFeedback = {
                        rpe: results.rpe,
                        comment: results.comment || results.notes,
                        notes: results.notes || results.comment,
                        evidenceUrl: results.evidenceUrl
                    };

                    // results format for analysis: { index: { ...results } }
                    // We map it to index 1 (the first work block in specialized parseSession logic)
                    const cardioResults = {
                        1: { ...results, type: 'cardio' }
                    };

                    await finalizeSession(cardioResults, cardioFeedback);
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
                                startGlobalTimer(); // Start global timer when session begins
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
                                    startGlobalTimer(); // Start global timer on first interaction
                                }}
                            />
                        )}

                        {/* SUMMARY UI */}
                        {currentStep.type === 'SUMMARY' && (
                            <SummaryBlock
                                session={session}
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
    <div className="fixed inset-0 z-[6000] flex items-end justify-center sm:items-center sm:p-4">
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />
        <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-slate-900 w-full sm:max-w-sm rounded-t-[2rem] sm:rounded-3xl overflow-hidden relative z-10 shadow-2xl border-t border-slate-700 sm:border h-[95vh] flex flex-col"
        >
            {/* Header Bar */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-700 shrink-0">
                <span className="text-white font-black text-sm truncate pr-4">
                    {selectedExercise.nameEs || selectedExercise.name}
                </span>
                <button
                    onClick={onClose}
                    className="p-1.5 rounded-full bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                >
                    <X size={20} />
                </button>
            </div>

            <div className="h-[35vh] w-full bg-black relative shrink-0">
                <ExerciseMedia exercise={selectedExercise} autoPlay={true} showControls={false} className="w-full h-full object-contain" />

                {/* Protocol Badge (Removed as it's now in header) */}
            </div>

            <div className="p-6 overflow-y-auto">
                <div className="mb-4">
                    {/* Load/Config Badge */}
                    <div className="inline-flex flex-wrap gap-2">
                        <span className="px-2 py-1.5 bg-slate-700/50 text-slate-300 text-[10px] font-black uppercase rounded-lg border border-slate-600/50">
                            {selectedExercise.quality === 'F' ? 'FUERZA' : selectedExercise.quality === 'E' ? 'ENERGÍA' : selectedExercise.quality === 'M' ? 'MOVILIDAD' : 'GENERAL'}
                        </span>
                        {(protocol === 'T' || protocol === 'PDP-T') ? (
                            <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
                                <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Objetivo:</span>
                                <span className="text-sm font-black text-white">Máximas reps</span>
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
                                // Sync grouping logic with WorkBlock (Runner)
                                const groups = [];
                                const exercises = module.exercises || [];

                                if (protocol !== 'LIBRE' || module.isWarmup) {
                                    // For other protocols (R, T, E, etc) and Warmup, 
                                    // all exercises in the module are performed in the same block/screen
                                    if (exercises.length > 0) {
                                        groups.push(exercises.map((ex, idx) => ({ ...ex, originalIndex: idx })));
                                    }
                                } else {
                                    exercises.forEach((ex, idx) => {
                                        // join the current exercise to that group if marked as grouped
                                        if (ex.isGrouped && groups.length > 0) {
                                            groups[groups.length - 1].push({ ...ex, originalIndex: idx });
                                        } else {
                                            // Start a new group
                                            groups.push([{ ...ex, originalIndex: idx }]);
                                        }
                                    });
                                }

                                return groups.map((group, groupIdx) => {
                                    const isGroup = group.length > 1;
                                    const groupType = isGroup ? (group.length === 2 ? 'SUPERSERIE' : 'CIRCUITO') : null;

                                    return (
                                        <div key={groupIdx} className={isGroup ? "bg-indigo-500/5 border-b border-indigo-500/10 last:border-0" : ""}>
                                            {groupType && (
                                                <div className="bg-slate-800/20 px-4 py-2 flex items-center gap-2 border-b border-slate-800/50">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${groupType === 'SUPERSERIE' ? 'bg-indigo-500' : 'bg-amber-500'}`} />
                                                    <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${groupType === 'SUPERSERIE' ? 'text-indigo-400' : 'text-amber-400'}`}>
                                                        {groupType}
                                                    </span>
                                                </div>
                                            )}
                                            {group.map((ex, exIdx) => (
                                                <div
                                                    key={ex.originalIndex}
                                                    className="p-4 flex gap-4 hover:bg-slate-800/50 transition-colors cursor-pointer group relative"
                                                    onClick={() => onSelectExercise(ex)}
                                                >
                                                    {/* visual line for grouped exercises */}
                                                    {isGroup && (
                                                        <div className={`absolute left-2.5 top-0 bottom-0 w-0.5 ${exIdx === 0 ? 'top-6' : ''} ${exIdx === group.length - 1 ? 'bottom-6' : ''} ${groupType === 'SUPERSERIE' ? 'bg-indigo-500/20' : 'bg-amber-500/20'}`} />
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

                                                                // Detect Volume Type
                                                                const volType = ex.config?.volType || 'REPS';
                                                                const volUnit =
                                                                    volType === 'TIME' ? 'seg' :
                                                                        volType === 'METROS' ? 'm' :
                                                                            volType === 'KM' ? 'km' :
                                                                                volType === 'KCAL' ? 'kcal' :
                                                                                    'reps';

                                                                const repsPerSet = sets.length > 0
                                                                    ? sets.map(s => {
                                                                        if (ex.config?.volType && s.reps) return s.reps;
                                                                        return s.reps || s.time || s.distance || ex.targetReps || 8;
                                                                    })
                                                                    : [];

                                                                const isVariableReps = new Set(repsPerSet).size > 1;
                                                                const repsDisplay = isVariableReps
                                                                    ? repsPerSet.join('-')
                                                                    : (repsPerSet[0] || ex.targetReps || 8);

                                                                return (
                                                                    <span className="inline-flex items-center px-2 py-1 bg-cyan-500/10 text-cyan-400 rounded text-[10px] font-black border border-cyan-500/20">
                                                                        {numSets}x{repsDisplay} <span className="text-[8px] uppercase opacity-70 ml-0.5">{volUnit}</span>
                                                                    </span>
                                                                );
                                                            })()}

                                                            {/* Reps/Time/Dist for other protocols */}
                                                            {((ex.targetReps > 0 || ex.targetTime > 0 || ex.manifestation) && protocol !== 'T' && protocol !== 'LIBRE') && (
                                                                <span className="inline-flex items-center px-2 py-1 bg-slate-700/50 text-slate-200 rounded text-[10px] font-black uppercase tracking-wider border border-slate-600/50">
                                                                    {ex.targetTime ? `${ex.targetTime} seg` : ex.targetReps ? `${ex.targetReps} reps` : ex.manifestation}
                                                                </span>
                                                            )}

                                                            {/* Weight if prescribed */}
                                                            {(ex.config?.sets?.[0]?.weight || ex.weight) && (
                                                                <span className="inline-flex items-center px-2 py-1 bg-blue-500/10 text-blue-400 rounded text-[10px] font-black border border-blue-500/20">
                                                                    {ex.config?.sets?.[0]?.weight || ex.weight}{(ex.quality === 'E' || ex.quality === 'Cardio') ? 'W' : 'kg'}
                                                                </span>
                                                            )}

                                                            {/* Intensity (Universal) */}
                                                            {(() => {
                                                                const val = ex.config?.sets?.[0]?.rir || ex.config?.sets?.[0]?.weight || ex.intensity;
                                                                const intType = ex.config?.intType || 'RIR';
                                                                if (!val && !ex.weight) return null;

                                                                let display = '';
                                                                if (val) {
                                                                    if (intType === 'RIR') display = `RIR ${val}`;
                                                                    else if (intType === 'PESO') display = `${val}kg`;
                                                                    else if (intType === '%') display = `${val}%`;
                                                                    else if (intType === 'RPE') display = `RPE ${val}`;
                                                                    else if (intType === 'WATTS') display = `${val}W`;
                                                                    else if (intType === 'BPM') display = `${val} bpm`;
                                                                    else if (intType === 'RITMO') display = `${val}`;
                                                                    else if (intType === 'NIVEL') display = `Nvl ${val}`;
                                                                    else display = val;
                                                                } else if (ex.weight) {
                                                                    display = `${ex.weight}kg`; // Legacy fallback
                                                                }

                                                                return (
                                                                    <span className="inline-flex items-center px-2 py-1 bg-orange-500/10 text-orange-400 rounded text-[10px] font-black border border-orange-500/20">
                                                                        {display}
                                                                    </span>
                                                                );
                                                            })()}

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
                                                                </span>
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
                                                                            ðŸ“ Notas
                                                                        </span>
                                                                    );
                                                                })()
                                                            }
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    </motion.div >
                )}
            </AnimatePresence >
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
        <div className="fixed inset-0 z-[6000] flex items-end justify-center sm:items-center sm:p-4">
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/90 backdrop-blur-md"
            />
            <motion.div
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-slate-800 w-full sm:max-w-sm rounded-t-[2rem] sm:rounded-[2rem] border-t border-slate-700 sm:border shadow-2xl relative z-10 overflow-hidden flex flex-col h-[85vh]"
            >
                <div className="flex flex-col h-full p-4 sm:p-6 pb-8 sm:pb-6 overflow-hidden">
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

                    <div className="space-y-6 flex-1 overflow-y-auto overflow-x-hidden px-1 -mx-1">
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

const CardioTaskView = ({ session, modules, overrides, onFinish, onBack }) => {
    // Prescribed values from overrides
    const [pDuration] = useState(() => {
        if (overrides?.sets?.length > 0) {
            return overrides.sets.reduce((acc, s) => {
                if (s.volUnit === 'TIME' || !s.volUnit) return acc + (parseInt(s.volVal) || 0);
                return acc;
            }, 0);
        }
        if (overrides?.volUnit === 'TIME' || !overrides?.volUnit) return parseInt(overrides?.volVal) || 0;
        return parseInt(overrides?.duration) || 10;
    });
    const [pDistance] = useState(() => {
        if (overrides?.sets?.length > 0) {
            return overrides.sets.reduce((acc, s) => {
                if (s.volUnit !== 'TIME' && s.volUnit) return acc + (parseFloat(s.volVal) || 0);
                return acc;
            }, 0);
        }
        if (overrides?.volVal && overrides?.volUnit !== 'TIME') return overrides.volVal;
        return overrides?.distance || '';
    });

    // Extract Target Intensity (Pace, HR, etc.)
    const { targetPace, targetHR, targetRPE, hrRange } = useMemo(() => {
        const firstSet = overrides?.sets?.[0] || overrides || {};
        return {
            targetPace: firstSet.intUnit === 'RITMO' ? firstSet.intVal : null,
            targetHR: firstSet.intUnit === 'BPM' ? firstSet.intVal : null,
            targetRPE: firstSet.intUnit === 'RPE' ? firstSet.intVal : null,
            hrRange: firstSet.hrMin || firstSet.hrMax ? { min: firstSet.hrMin, max: firstSet.hrMax } : null
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
            // Priority: Manual Edit > Timer (if > 30s) > Prescribed
            let finalDuration = duration;
            if (!duration || isNaN(duration) || duration === 0) {
                if (elapsedSeconds > 30) {
                    finalDuration = Math.ceil(elapsedSeconds / 60);
                } else {
                    finalDuration = pDuration;
                }
            }

            await onFinish({
                duration: finalDuration ? parseInt(finalDuration) : null,
                durationMinutes: finalDuration ? parseInt(finalDuration) : null,
                elapsedSeconds,
                distance: distance ? parseFloat(distance) : null,
                pace,
                heartRateAvg: heartRateAvg ? parseInt(heartRateAvg) : null,
                heartRateMax: heartRateMax ? parseInt(heartRateMax) : null,
                rpe,
                // seriesReps: protocol === 'LIBRE' ? libreSetReps : undefined, // Only for LIBRE
                // seriesWeights: protocol === 'LIBRE' ? libreSeriesWeights : undefined, // Only for LIBRE
                notes: notes.trim(),
                comment: notes.trim(), // For backward compatibility
                type: 'cardio',
                evidenceUrl
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
            <div className="flex-1 overflow-y-auto pb-32">

                {/* 2. HERO DASHBOARD - Your Progress Area */}
                <div className="bg-gradient-to-b from-slate-900 to-slate-950 px-6 pt-10 pb-10 border-b border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-orange-500/5 blur-[80px] rounded-full" />

                    <div className="relative z-10 flex flex-col items-center">
                        {/* Status Badge */}
                        <div className="mb-6 flex items-center gap-2 bg-slate-900 border border-white/5 px-4 py-1.5 rounded-full">
                            <Activity size={12} className="text-orange-500" />
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tu Progreso</span>
                        </div>

                        <div className="w-full max-w-sm">
                            <div className="flex flex-col items-center">
                                {/* Actual vs Goal Comparison */}
                                <div className="flex items-baseline justify-center gap-4 mb-2">
                                    <input
                                        type="number"
                                        value={showDistAsHero ? distance : duration}
                                        onChange={(e) => showDistAsHero ? setDistance(e.target.value) : setDuration(e.target.value)}
                                        className="bg-transparent text-center text-7xl font-black text-white outline-none w-24 placeholder:text-slate-800 tabular-nums leading-none transition-all focus:scale-110"
                                        placeholder="0"
                                    />
                                    <span className="text-4xl font-black text-slate-700">/</span>
                                    <span className="text-5xl font-black text-orange-500/80 tabular-nums">
                                        {showDistAsHero ? (pDistance || "0") : (pDuration || "0")}
                                    </span>
                                </div>

                                <div className="flex items-center gap-3">
                                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] pl-[0.3em]">
                                        {showDistAsHero ? 'KILÓMETROS' : 'MINUTOS'} ACTUALES
                                    </span>
                                    <button
                                        onClick={() => showDistAsHero ? setDistance(pDistance) : setDuration(pDuration)}
                                        className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:bg-orange-500 hover:text-white transition-all shadow-lg"
                                        title="Igualar a la meta"
                                    >
                                        <History size={12} />
                                    </button>
                                </div>

                                {/* Modern Progress Bar */}
                                <div className="mt-8 w-full h-1.5 bg-slate-800 rounded-full overflow-hidden border border-white/5">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-orange-600 to-orange-400"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(((showDistAsHero ? parseFloat(distance) || 0 : parseInt(duration) || 0) / (showDistAsHero ? parseFloat(pDistance) || 1 : parseInt(pDuration) || 1)) * 100, 100)}%` }}
                                        transition={{ duration: 1, ease: "easeOut" }}
                                    />
                                </div>
                            </div>

                            {/* Sync Action */}
                            {!showDistAsHero && elapsedSeconds > 60 && !isRunning && (
                                <div className="mt-4 flex justify-center">
                                    <button
                                        onClick={syncTimer}
                                        className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all group"
                                    >
                                        <Clock size={14} className="group-hover:rotate-12 transition-transform" />
                                        <span className="text-[10px] font-black uppercase tracking-wider">Usar tiempo del crono</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* High-Impact Primary Stats Row - SIMPLIFIED */}
                        <div className="mt-8 w-full max-w-sm">
                            {/* Show secondary metric only if different from hero */}
                            {showDistAsHero ? (
                                <div className="bg-slate-900/60 rounded-3xl p-4 border border-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Clock size={16} className="text-emerald-500" />
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wide">Duración</span>
                                    </div>
                                    <input
                                        type="number"
                                        value={duration}
                                        onChange={(e) => setDuration(e.target.value)}
                                        className="bg-transparent text-2xl font-black text-white outline-none w-16 text-right placeholder:text-slate-800 tabular-nums"
                                        placeholder="0"
                                    />
                                    <span className="text-sm font-bold text-slate-500">min</span>
                                </div>
                            ) : (
                                <div className="bg-slate-900/60 rounded-3xl p-4 border border-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Footprints size={16} className="text-emerald-500" />
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wide">Distancia</span>
                                    </div>
                                    <input
                                        type="number"
                                        value={distance}
                                        onChange={(e) => setDistance(e.target.value)}
                                        className="bg-transparent text-2xl font-black text-white outline-none w-16 text-right placeholder:text-slate-800 tabular-nums"
                                        placeholder="0"
                                        step="0.1"
                                    />
                                    <span className="text-sm font-bold text-slate-500">km</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* PRESCRIPCIÓN DETALLADA - Moved to top for visibility */}
                    {overrides?.sets?.length > 0 && (
                        <div className="px-6 py-4 space-y-3 bg-slate-900/20 border-b border-white/5">
                            <div className="flex items-center gap-2">
                                <Target size={14} className="text-orange-500" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Objetivos de la Sesión</span>
                            </div>

                            <div className="space-y-3">
                                {overrides.sets.map((set, idx) => {
                                    const zoneColors = {
                                        '1': 'border-blue-500/30 bg-blue-500/5',
                                        '2': 'border-emerald-500/30 bg-emerald-500/5',
                                        '3': 'border-yellow-500/30 bg-yellow-500/5',
                                        '4': 'border-orange-500/30 bg-orange-500/5',
                                        '5': 'border-red-500/30 bg-red-500/5',
                                    };
                                    const zColor = zoneColors[set.zone] || 'border-white/10 bg-slate-800/30';

                                    return (
                                        <div key={idx} className={`rounded-2xl border p-4 ${zColor}`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-7 h-7 rounded-full bg-slate-950/50 flex items-center justify-center text-xs font-black border border-white/10">
                                                        {idx + 1}
                                                    </div>
                                                    <div>
                                                        <span className="text-lg font-black text-white">{set.volVal} <span className="text-sm opacity-60">{set.volUnit === 'TIME' ? 'min' : set.volUnit}</span></span>
                                                        {set.zone && (
                                                            <div className="flex items-center gap-1 mt-0.5">
                                                                <Flame size={10} className="text-orange-400" />
                                                                <span className="text-[9px] font-bold text-orange-400 uppercase">Zona {set.zone}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    {(set.hrMin || set.hrMax) && (
                                                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20">
                                                            <Activity size={12} className="text-red-400" />
                                                            <span className="text-sm font-black text-red-400">{set.hrMin || '--'}-{set.hrMax || '--'}</span>
                                                            <span className="text-[8px] text-red-400/60">bpm</span>
                                                        </div>
                                                    )}
                                                    {set.intVal && (
                                                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                                            <Zap size={12} className="text-emerald-400" />
                                                            <span className="text-sm font-black text-emerald-400">@ {set.intVal}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {set.recovery && (
                                                <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-500">
                                                    <Clock size={10} />
                                                    <span>Descanso: {set.recovery} min</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Exercise Visualization */}
                    {modules.length > 0 && modules[0]?.exercises?.length > 0 && (
                        <div className="px-6 py-4 bg-slate-900/30 border-b border-white/5">
                            <div className="flex items-center gap-4">
                                <div className="w-20 h-20 rounded-2xl bg-slate-800 flex items-center justify-center border border-white/10 overflow-hidden shadow-lg">
                                    <ExerciseMedia exercise={modules[0].exercises[0]} thumbnailMode={true} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-base font-black text-slate-200 truncate">
                                        {modules[0].exercises[0].nameEs || modules[0].exercises[0].name || modules[0].exercises[0].name_es || 'Ejercicio Cardio'}
                                    </h3>
                                    {modules[0].exercises[0].notes && (
                                        <p className="text-[10px] text-slate-500 italic truncate mt-1">{modules[0].exercises[0].notes}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 space-y-6">
                    {/* RPE Selector */}
                    <div className="bg-slate-900/40 rounded-[2rem] p-6 border border-white/5">
                        <RPESelector
                            value={rpe}
                            onChange={setRpe}
                            label="¿Cómo te sentiste?"
                            isLight={false}
                        />
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
        </div >
    );
};

export default SessionRunner;

