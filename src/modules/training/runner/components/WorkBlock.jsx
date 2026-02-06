import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Clock, Play, CheckCircle, AlertCircle, Plus, Minus, Zap, Info,
    Repeat, Layers, Activity, ChevronLeft
} from 'lucide-react';
import { TrainingDB } from '../../services/db';
import { useAuth } from '../../../../context/AuthContext';
import { useSessionTimer } from '../../hooks/useSessionTimer';
import { useWorkBlockHistory } from '../../hooks/useWorkBlockHistory';
import { useLibreProtocol } from '../../hooks/useLibreProtocol';
import { getLibreConfig } from '../utils/blockUtils';
import ExerciseMedia from '../../components/ExerciseMedia';

const WorkBlock = ({ step, plan, onComplete, onSelectExercise, playCountdownShort, playCountdownFinal, playHalfway, playMinuteWarning, playSuccess, initAudio }) => {
    const { module, blockType } = step;

    // Normalize protocol: Handle 'PDP-T' etc and ensure consistent short names for UI logic
    const rawProtocol = module.protocol || 'LIBRE';
    const protocol = rawProtocol.replace('PDP-', '').toUpperCase() === 'MIX' ? 'LIBRE' : rawProtocol.replace('PDP-', '').toUpperCase();
    const exercises = module.exercises || []; // full objects
    const { currentUser } = useAuth();

    // Timer State
    const [timeLeft, setTimeLeft] = useState(null);
    const {
        elapsed,
        start: startTimer,
        pause: pauseTimer,
        reset: resetTimer,
        setTime: setElapsed,
        isRunning: isActive
    } = useSessionTimer(0);
    const [currentMinute, setCurrentMinute] = useState(1); // For EMOM
    const lastSoundMinuteRef = useRef(0); // Guard for EMOM sound loops


    // Manual Work Timer State (Ephemeral) - Moved from SessionRunner
    const [workTimer, setWorkTimer] = useState({ active: false, timeLeft: 0, duration: 0, exIdx: null });

    // Work Timer Effect
    useEffect(() => {
        let interval;
        if (workTimer.active && workTimer.timeLeft > 0) {
            interval = setInterval(() => {
                setWorkTimer(prev => {
                    if (prev.timeLeft <= 1) {
                        playSuccess?.(); // Play success beep when done
                        return { ...prev, active: false, timeLeft: 0 };
                    }
                    return { ...prev, timeLeft: prev.timeLeft - 1 };
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [workTimer.active, workTimer.timeLeft]);

    const toggleWorkTimer = (exIdx, duration) => {
        if (workTimer.active && workTimer.exIdx === exIdx) {
            setWorkTimer({ active: false, timeLeft: 0, duration: 0, exIdx: null });
        } else {
            setWorkTimer({ active: true, timeLeft: duration, duration: duration, exIdx });
        }
    };

    // History & State Hook
    const {
        previousLog,
        loadingHistory,
        globalExerciseWeights,
        repsDone, setRepsDone,
        weightsUsed, setWeightsUsed,
        heartRates, setHeartRates,
        energyMetrics, setEnergyMetrics,
        exerciseNotes, setExerciseNotes
    } = useWorkBlockHistory({ currentUser, module, plan, exercises });

    // Results Logging Helpers
    const [isNavExpanded, setIsNavExpanded] = useState(false); // Guided navigation state

    // Reps Increment Handler
    const incrementReps = (idx) => {
        setRepsDone(prev => {
            const current = parseInt(prev[idx] || 0, 10);
            return { ...prev, [idx]: current + 1 };
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
                pauseTimer();
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



    // ========== LIBRE Protocol Logic Hook ==========
    const {
        libreSetsDone, setLibreSetsDone,
        libreSetReps, setLibreSetReps,
        libreSeriesWeights, setLibreSeriesWeights,
        currentSetWeight, setCurrentSetWeight,
        currentSetReps, setCurrentSetReps,
        isResting,
        restTimeLeft,
        activeExerciseIndex, setActiveExerciseIndex,
        editingSet, setEditingSet,
        selectedExerciseForNotes, setSelectedExerciseForNotes,
        isRoundRest,
        completeLibreSet,
        completeRound: completeLibreGroupSet, // Alias
        handleSkipRest: skipRest, // Alias
        handleEditSet,
        cancelEditSet,
        updateSetResult,
        uncompleteLibreSet,
        updateLibreSetReps
    } = useLibreProtocol({
        module,
        exercises,
        weightsUsed,
        playSuccess,
        initAudio
    });

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


    // Guided Navigation Logic: Auto-expand when block is "theoretically" complete
    // MOVED HERE to ensure getLibreConfig and state are defined
    const isBlockComplete = useMemo(() => {
        if (protocol === 'R') {
            return exercises.every((ex, idx) => {
                const target = ex.targetReps || module.targeting?.[0]?.volume || 0;
                return target > 0 && (repsDone[idx] || 0) >= target;
            });
        }
        if (protocol === 'T' || protocol === 'E') {
            return timeLeft === 0;
        }
        if (protocol === 'LIBRE') {
            return exercises.every((ex, idx) => {
                const { targetSets } = getLibreConfig(ex, module);
                return (libreSetsDone[idx] || 0) >= targetSets;
            });
        }
        return false;
    }, [protocol, exercises, module, repsDone, timeLeft, libreSetsDone]);

    // Auto-expand nav when block complete
    useEffect(() => {
        if (isBlockComplete) {
            setIsNavExpanded(true);
        }
    }, [isBlockComplete]);

    const getPreviousWeight = (idx) => {
        const currentEx = exercises[idx];
        const exId = currentEx?.id || currentEx?.exerciseId;

        // 🆕 Priority 1: Check global exercise history (cross-session with context)
        if (exId && globalExerciseWeights[exId]) {
            return globalExerciseWeights[exId]; // { weight, match, contextLabel, context }
        }

        // Priority 2: Check module-specific previousLog (legacy fallback)
        if (!previousLog) return null;

        // Robust matching: Try to find by ID or exact Name match in previous exercises
        let prevIdx = -1;
        if (previousLog.exercises) {
            prevIdx = previousLog.exercises.findIndex(pe =>
                (pe.id && currentEx.id && pe.id === currentEx.id) ||
                (pe.name && currentEx.name && pe.name === currentEx.name)
            );
        }

        // If found, return that specific weight
        if (prevIdx !== -1) {
            const weight = previousLog.results?.actualWeights?.[prevIdx] || previousLog.results?.weights?.[prevIdx];
            if (weight) return { weight: parseFloat(weight), match: 'legacy', contextLabel: 'Módulo' };
        }

        // Fallback to index ONLY if Protocol indicates rigid structure (not LIBRE) AND no metadata
        if (prevIdx === -1 && protocol !== 'LIBRE') {
            const weight = previousLog.results?.actualWeights?.[idx] || previousLog.results?.weights?.[idx];
            if (weight) return { weight: parseFloat(weight), match: 'legacy', contextLabel: 'Módulo' };
        }

        return null;
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
            const { targetSets } = getLibreConfig(ex, module);
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
            libreSetReps, // Original keys for SummaryBlock
            libreSeriesWeights, // Original keys for SummaryBlock
            seriesReps: libreSetReps, // Legacy compatibility
            seriesWeights: libreSeriesWeights, // Legacy compatibility
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
        resetTimer(0);
    }, [module]);

    // Protocol Timer Logic - Driven by 'elapsed' changes
    useEffect(() => {
        if (!isActive) return;

        // Protocol Specific Logic
        if (protocol === 'T') {
            const total = module.targeting?.[0]?.timeCap || 240;
            const newTimeLeft = Math.max(0, total - elapsed);

            // Audio Safeguards
            try {
                if (newTimeLeft === Math.floor(total / 2) + 1) playHalfway?.();
                if (newTimeLeft === 61) playMinuteWarning?.();
                if (newTimeLeft <= 4 && newTimeLeft > 0) playCountdownShort?.();
            } catch (e) { console.warn("Audio error:", e); }

            if (newTimeLeft <= 0) {
                pauseTimer();
                try { playCountdownFinal?.(); } catch (e) { }
                setTimeLeft(0);
            } else {
                setTimeLeft(newTimeLeft);
            }

        } else if (protocol === 'E') {
            // EMOM Logic
            const totalDurationMin = (module.emomParams?.durationMinutes || 4);
            const currentMin = Math.floor(elapsed / 60) + 1;
            const secInMin = elapsed % 60;
            const newTimeLeft = 60 - secInMin; // 60 down to 1

            if (currentMin > totalDurationMin) {
                pauseTimer();
                if (lastSoundMinuteRef.current !== currentMin) {
                    try { playCountdownFinal?.(); } catch (e) { }
                    lastSoundMinuteRef.current = currentMin;
                }
            } else {
                if (currentMin > lastSoundMinuteRef.current) {
                    setCurrentMinute(currentMin);
                    try {
                        playSuccess?.();
                        console.log(`[EMOM] Playing sound for Minute ${currentMin}`);
                    } catch (e) { }
                    lastSoundMinuteRef.current = currentMin;
                }

                // Emom Beeps
                try {
                    if (newTimeLeft === 31) playHalfway?.();
                    if (newTimeLeft <= 4 && newTimeLeft > 1) playCountdownShort?.();
                } catch (e) { console.warn("Audio error:", e); }

                // Handling minute boundary visualization
                if (newTimeLeft === 60 || newTimeLeft === 0) setTimeLeft(60);
                else setTimeLeft(newTimeLeft);
            }
        } else if (protocol === 'R') {
            const PDP_R_CAPS = { 'BASE': 300, 'BUILD': 360, 'BURN': 420, 'BOOST': 300 };
            let category = 'BASE';
            const typeUpper = (blockType || '').toUpperCase();
            if (typeUpper.includes('BUILD')) category = 'BUILD';
            else if (typeUpper.includes('BURN')) category = 'BURN';
            else if (typeUpper.includes('BOOST')) category = 'BOOST';

            const effectiveCap = PDP_R_CAPS[category] || module.targeting?.[0]?.timeCap || 300;

            if (elapsed >= effectiveCap) {
                pauseTimer();
                try { playCountdownFinal?.(); } catch (e) { }
            }
        }
    }, [elapsed, isActive, protocol, module, blockType]);


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

        // Custom Logic for PDP-R (Target Reps Priority)
        let displayVolume = volume;
        let splitRepsString = null;

        if (protocol === 'R') {
            const hasExplicitVolume = displayVolume && displayVolume > 0;

            // If no global volume, OR if we have multiple exercises, we favor derived calc
            if (!hasExplicitVolume || exercises.length > 1) {
                const targets = exercises.map(ex => ex.targetReps || 0);
                const sumReps = targets.reduce((acc, val) => acc + val, 0);

                if (sumReps > 0) {
                    // If no explicit volume, adopt the sum
                    if (!hasExplicitVolume) displayVolume = sumReps;

                    // If multiple exercises, create split string
                    if (exercises.length > 1) {
                        splitRepsString = targets.join('+');
                    }
                }
            }
        }

        // Decide Hero Content
        let heroContent = null;
        let subContent = null;

        if (displayVolume && displayVolume > 0) {
            // Volume-Based Hero (Distance, Cals, Reps)

            // Safe metric display
            let metricDisplay = (metric || '').toUpperCase();
            if (!metricDisplay && protocol === 'R') metricDisplay = 'REPS'; // Default for R

            heroContent = (
                <div className="flex flex-col items-center">
                    <span className={HERO_TEXT_SIZE + " font-black font-mono tracking-tighter text-white tabular-nums leading-none"}>
                        {splitRepsString || displayVolume} <span className="text-[0.4em] align-top text-orange-500">{metricDisplay}</span>
                    </span>
                    <span className="text-xs font-bold text-orange-500/80 uppercase tracking-widest mt-1">OBJETIVO TOTAL</span>
                </div>
            );

            // Subtitle: Show Time Cap / Timer for R or others with volume
            if (timeLeft != null) {
                subContent = (
                    <div className="flex flex-col items-center mt-4">
                        <span className="text-3xl font-black font-mono text-slate-600 tabular-nums">
                            {formatTime(timeLeft).trim()}
                        </span>
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">
                                TIME CAP: {formatTime(timeCap).trim()}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                • RESTANTE
                            </span>
                        </div>
                    </div>
                );
            } else if (protocol === 'R') {
                subContent = (
                    <div className="flex items-center gap-2 mt-4">
                        <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border bg-slate-800/50 text-slate-500 border-slate-700/50`}>
                            TIME CAP: {formatTime(timeCap).trim()}
                        </span>
                    </div>
                );
            }

        } else {
            // Time-Based Hero (Default T or R without volume)
            heroContent = (
                <div className="flex flex-col items-center">
                    <span className={HERO_TEXT_SIZE + " font-black font-mono tracking-tighter text-white tabular-nums leading-none"}>
                        {formatTime(timeLeft != null ? timeLeft : timeCap).trim()}
                    </span>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">TIEMPO RESTANTE</span>
                </div>
            );

            if (protocol === 'R') {
                subContent = (
                    <div className="flex items-center gap-2 mt-4">
                        <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border bg-slate-800/50 text-slate-500 border-slate-700/50`}>
                            TIME CAP: {formatTime(timeCap).trim()}
                        </span>
                    </div>
                );
            }
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

                {exercises.some(ex => ex.loadable || ex.quality === 'E' || ex.quality === 'Resistencia' || ex.quality === 'Cardio') && (
                    <div className={`transition-all duration-500 ease-in-out overflow-hidden ${(isActive || protocol === 'LIBRE') ? 'max-h-0 opacity-0 mb-0' : 'max-h-96 opacity-100 mb-2'}`}>
                        <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/30 rounded-2xl p-3">
                            <h3 className="text-[9px] font-black uppercase tracking-wider text-slate-500 mb-2 text-center">
                                {exercises.some(ex => ex.quality === 'E' || ex.quality === 'Cardio') ? 'Carga / Intensidad' : 'Peso Utilizado'}
                            </h3>
                            <div className={`grid gap-2 ${exercises.filter(ex => ex.loadable).length > 1 ? 'grid-cols-2' : 'grid-cols-1 max-w-xs mx-auto'}`}>
                                {exercises.map((ex, idx) => {
                                    if (!ex.loadable && ex.quality !== 'E' && ex.quality !== 'Resistencia' && ex.quality !== 'Cardio') return null;

                                    // Get exercise-specific recommendation
                                    const recommendation = previousLog?.analysis?.find(
                                        a => a.moduleId === module.id &&
                                            (a.exerciseId === ex.id || a.exerciseIndex === idx)
                                    );

                                    // Get previous stats using context-aware lookup
                                    const prevData = getPreviousWeight(idx);
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
                                                <div className={`rounded-lg p-2 border flex flex-col items-center justify-center relative overflow-hidden ${isSingleExercise ? 'min-w-[70px]' : ''} ${prevData?.match === 'any' ? 'bg-yellow-900/30 border-yellow-700/50' : 'bg-slate-800/80 border-slate-600/50'}`}>
                                                    <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">
                                                        Anterior {prevData?.contextLabel && `(${prevData.contextLabel})`}
                                                    </span>
                                                    {prevData ? (
                                                        <div className="flex flex-col items-center">
                                                            <div className="flex items-baseline gap-0.5">
                                                                <span className={`font-black leading-none tracking-tight ${isSingleExercise ? 'text-lg' : 'text-base'} ${prevData.match === 'any' ? 'text-yellow-300' : 'text-white'}`}>{prevData.weight}</span>
                                                                <span className="text-[8px] font-bold text-slate-500">
                                                                    {(ex.quality === 'E' || ex.quality === 'Cardio') ? (energyMetrics[idx]?.intensityUnit || 'W') : 'kg'}
                                                                </span>
                                                            </div>
                                                            {prevData.match === 'any' && (
                                                                <span className="text-[6px] text-yellow-500 mt-0.5">⚠️ Otro contexto</span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm font-bold text-slate-600">--</span>
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


                            {getTimerDisplay()}

                            {/* Block Instruction */}
                            {module.targeting?.[0]?.instruction && module.targeting[0].instruction !== 'Completar Tarea' && (
                                <div className="mt-3 px-4 py-2 bg-emerald-500/5 border-l-2 border-emerald-500/30 rounded-r-lg">
                                    <p className="text-[11px] font-medium text-slate-400 italic leading-relaxed">
                                        "{module.targeting[0].instruction}"
                                    </p>
                                </div>
                            )}

                            {/* Exercise Specific Notes */}
                            {exercises.filter(ex => ex.notes).map((ex, exIdx) => (
                                <div key={exIdx} className="mt-2 px-4 py-2 bg-amber-500/5 border-l-2 border-amber-500/30 rounded-r-lg">
                                    <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-0.5">
                                        {ex.nameEs || ex.name}
                                    </p>
                                    <p className="text-[11px] font-medium text-slate-400 italic leading-relaxed">
                                        "{ex.notes}"
                                    </p>
                                </div>
                            ))}

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
                                                startTimer();
                                            }
                                        } else {
                                            isActive ? pauseTimer() : startTimer();
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
                                            pauseTimer();
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
                    <button onClick={() => isActive ? pauseTimer() : startTimer()} className="z-20 text-center group">
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
                                const isGroupComplete = group.every(ex => (libreSetsDone[ex.originalIndex] || 0) >= getLibreConfig(ex, module).targetSets);

                                if (!isGroup) {
                                    const ex = group[0];
                                    const idx = ex.originalIndex;
                                    const { targetSets, targetReps, repsPerSet, restSeconds, intensity, prescribedWeight, isVariableReps, volUnit, intUnitLabel, isLoadable } = getLibreConfig(ex, module);
                                    const volType = ex.config?.volType || 'REPS';
                                    const setsCompleted = libreSetsDone[idx] || 0;
                                    const isExerciseComplete = setsCompleted >= targetSets;
                                    const weight = currentSetWeight[idx] || weightsUsed[idx] || (ex.config?.sets?.[0]?.weight) || 0;
                                    const isSingle = exercises.length === 1;

                                    return (
                                        <div key={`group-${gIdx}`} className="space-y-4">
                                            {/* Media & Info Card */}
                                            <div className="bg-slate-800/50 rounded-3xl border border-slate-700/50 overflow-hidden">
                                                <div className="relative aspect-video bg-black/40">
                                                    <ExerciseMedia exercise={ex} />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 to-transparent pointer-events-none" />

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
                                                                    {(() => {
                                                                        const isTime = ex.config?.volType === 'TIME' || ex.targetTime > 0;
                                                                        const isDist = ex.config?.volType === 'DISTANCE' || ex.targetDistance > 0;
                                                                        const isCardio = ex.quality === 'E' || ex.quality === 'Resistencia' || ex.quality === 'Cardio';

                                                                        if (isCardio) return (energyMetrics[idx]?.volumeUnit || 'kcal').toUpperCase();
                                                                        if (isTime) return 'SEG';
                                                                        if (isDist) return 'M';
                                                                        return 'REPS';
                                                                    })()}
                                                                </span>
                                                            </div>
                                                            {!!intensity && (
                                                                <div className={`bg-orange-500/15 border border-orange-500/30 rounded-lg flex items-center gap-1.5 ${isSingle ? 'px-3 py-1.5' : 'px-2 py-1'}`}>
                                                                    <span className={`text-orange-400 font-black ${isSingle ? 'text-lg' : 'text-sm'}`}>{intensity}</span>
                                                                </div>
                                                            )}
                                                            {!!weight && (
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
                                                                                <span className="text-[8px] text-slate-500 uppercase">{volUnit}</span>
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
                                                        {isLoadable && (() => {
                                                            const prevData = getPreviousWeight(idx);
                                                            if (!prevData) return null;
                                                            return (
                                                                <div className="flex justify-center mb-4">
                                                                    <div className={`rounded-xl px-4 py-2 border flex flex-col items-center ${prevData.match === 'any' ? 'bg-yellow-900/30 border-yellow-700/50' : 'bg-slate-800/80 border-slate-700'}`}>
                                                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                                            Anterior {prevData.contextLabel && `(${prevData.contextLabel})`}
                                                                        </span>
                                                                        <span className="text-sm font-black text-slate-400">{prevData.weight} kg</span>
                                                                        {prevData.match === 'any' && (
                                                                            <span className="text-[8px] text-yellow-500 mt-1">⚠️ Otro contexto</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()}
                                                        {/* Weight & Reps Controls - Premium Vertical Stack */}
                                                        <div className="space-y-2 mb-4">
                                                            {/* Weight Control */}
                                                            {isLoadable ? (
                                                                <div className="bg-slate-800/50 rounded-2xl p-4 border border-white/5 flex items-center justify-between">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">PESO</span>
                                                                        <div className="flex items-center gap-2">
                                                                            <input
                                                                                type="text"
                                                                                inputMode="decimal"
                                                                                value={currentSetWeight[idx] || ''}
                                                                                onChange={(e) => setCurrentSetWeight(prev => ({ ...prev, [idx]: e.target.value.replace(',', '.') }))}
                                                                                onClick={(e) => e.target.select()}
                                                                                className="w-24 bg-transparent text-left text-white font-black text-3xl outline-none"
                                                                                placeholder="0"
                                                                            />
                                                                            <span className="text-xs font-bold text-slate-500 uppercase">{intUnitLabel}</span>
                                                                            {(() => {
                                                                                const prevData = getPreviousWeight(ex.originalIndex);
                                                                                if (!prevData) return null;
                                                                                return (
                                                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${prevData.match === 'any' ? 'bg-yellow-900/50 border-yellow-700 text-yellow-300' : 'bg-slate-700 border-slate-600 text-slate-300'}`}>
                                                                                        Ant: {prevData.weight}
                                                                                    </span>
                                                                                );
                                                                            })()}
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-1 bg-slate-900/50 rounded-xl p-1 border border-white/5">
                                                                        <button
                                                                            onClick={() => setCurrentSetWeight(prev => ({ ...prev, [idx]: Math.max(0, (parseFloat(prev[idx] || 0) - 1)).toString() }))}
                                                                            className="w-10 h-10 rounded-lg bg-slate-700/50 flex items-center justify-center text-slate-400 active:bg-slate-600 transition-colors"
                                                                        >
                                                                            <Minus size={18} />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => setCurrentSetWeight(prev => ({ ...prev, [idx]: (parseFloat(prev[idx] || 0) + 1).toString() }))}
                                                                            className="w-10 h-10 rounded-lg bg-slate-700/50 flex items-center justify-center text-slate-400 active:bg-slate-600 transition-colors"
                                                                        >
                                                                            <Plus size={18} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : <div />}
                                                            {/* Reps Stepper Row */}
                                                            <div className="bg-slate-900/40 rounded-[1.5rem] p-3 border border-white/5 shadow-inner">
                                                                <div className="flex items-center justify-between mb-3 px-1">
                                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                                        {(() => {
                                                                            const volType = ex.config?.volType || 'REPS';
                                                                            const volUnit =
                                                                                volType === 'TIME' ? 'seg' :
                                                                                    volType === 'METROS' ? 'm' :
                                                                                        volType === 'KM' ? 'km' :
                                                                                            volType === 'KCAL' ? 'kcal' :
                                                                                                'reps';

                                                                            return (
                                                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                                                    {volType === 'TIME' ? 'Tiempo Real' :
                                                                                        volType === 'METROS' || volType === 'KM' ? 'Distancia Real' :
                                                                                            volType === 'KCAL' ? 'Volumen Real' :
                                                                                                'Repeticiones reales'}
                                                                                </span>
                                                                            );
                                                                        })()}
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
                                                                        <span className="text-[8px] font-black text-emerald-500/60 bg-emerald-500/5 px-2 py-0.5 rounded-full uppercase tracking-tighter flex items-center gap-1">
                                                                            Objetivo: {repsPerSet[setsCompleted] || targetReps} {volUnit}
                                                                        </span>

                                                                        {/* Manual Work Timer Button (Only for Time-based exercises) */}
                                                                        {(volType === 'TIME' || ex.targetTime > 0) && (
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    const timeTarget = parseInt(repsPerSet[setsCompleted] || targetReps) || 30;
                                                                                    toggleWorkTimer(idx, timeTarget);
                                                                                }}
                                                                                className={`rounded-xl flex items-center justify-center gap-2 font-black transition-all border shadow-lg h-9 min-w-[90px] ${workTimer.active && workTimer.exIdx === idx
                                                                                    ? 'bg-red-500 text-white border-red-600 animate-pulse scale-110'
                                                                                    : 'bg-slate-700 text-slate-200 border-slate-600 hover:bg-slate-600'
                                                                                    }`}
                                                                            >
                                                                                {workTimer.active && workTimer.exIdx === idx ? (
                                                                                    <>
                                                                                        <span className="text-sm">⏱</span>
                                                                                        <span className="tabular-nums text-xs">{workTimer.timeLeft}s</span>
                                                                                    </>
                                                                                ) : (
                                                                                    <>
                                                                                        <Play size={10} fill="currentColor" />
                                                                                        <span className="text-xs">Cronómetro</span>
                                                                                    </>
                                                                                )}
                                                                            </button>
                                                                        )}
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
                                                                            {(() => {
                                                                                const isTime = ex.config?.volType === 'TIME' || ex.targetTime > 0;
                                                                                const isDist = ex.config?.volType === 'DISTANCE' || ex.targetDistance > 0;
                                                                                const isCardio = ex.quality === 'E' || ex.quality === 'Resistencia' || ex.quality === 'Cardio';

                                                                                if (isCardio) return (energyMetrics[idx]?.volumeUnit || 'kcal');
                                                                                if (isTime) return 'seg';
                                                                                if (isDist) return 'm';
                                                                                return 'reps';
                                                                            })()}
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
                                                    const { targetSets, targetReps, repsPerSet, restSeconds, intensity, isVariableReps, volUnit, intUnitLabel, isLoadable } = getLibreConfig(ex, module);
                                                    const volType = ex.config?.volType || 'REPS'; // Fix: Define volType locally
                                                    const setsCompleted = libreSetsDone[idx] || 0;
                                                    const isExerciseComplete = setsCompleted >= targetSets;
                                                    const weight = currentSetWeight[idx] || weightsUsed[idx] || (ex.config?.sets?.[0]?.weight) || 0;
                                                    const isSingle = false; // It's part of a group

                                                    return (
                                                        <div
                                                            key={`grouped-ex-${idx}`}
                                                            className={`bg-slate-800/50 rounded-2xl border transition-all overflow-hidden ${isExerciseComplete ? 'border-emerald-500/50 bg-emerald-900/20' : 'border-slate-700/50'}`}
                                                        >
                                                            {/* Exercise Visualisation */}
                                                            <div className="w-full aspect-[16/10] bg-slate-900 relative overflow-hidden group/media cursor-pointer" onClick={() => onSelectExercise(ex)}>
                                                                <ExerciseMedia exercise={ex} staticMode={true} thumbnailMode={true} lazyLoad={false} />
                                                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-60" />
                                                                <div className="absolute bottom-3 left-4">
                                                                    <p className="text-sm font-black text-white truncate mb-0.5 leading-tight">{ex.nameEs || ex.name}</p>
                                                                    <p className="text-[10px] font-black text-emerald-400 tracking-wider">
                                                                        {isVariableReps ? repsPerSet[setsCompleted] || targetReps : targetReps} {volUnit.toUpperCase()}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            {/* Compact Weight Controls for Grouped */}
                                                            <div className="p-4 pt-3">
                                                                <div className="flex items-center justify-between mb-4 px-1">
                                                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{setsCompleted}/{targetSets} Series</span>
                                                                    <div className="flex items-center gap-2">
                                                                        {/* Per-exercise Timer Button for time-based exercises */}
                                                                        {(volType === 'TIME' || ex.targetTime > 0) && (
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    const timeTarget = parseInt(repsPerSet[setsCompleted] || targetReps) || 30;
                                                                                    toggleWorkTimer(idx, timeTarget);
                                                                                }}
                                                                                className={`rounded-xl flex items-center justify-center gap-2 font-black transition-all border shadow-lg h-9 min-w-[80px] ${workTimer.active && workTimer.exIdx === idx
                                                                                    ? 'bg-red-500 text-white border-red-600 animate-pulse scale-110'
                                                                                    : 'bg-slate-700 text-slate-200 border-slate-600 hover:bg-slate-600'
                                                                                    }`}
                                                                            >
                                                                                {workTimer.active && workTimer.exIdx === idx ? (
                                                                                    <>
                                                                                        <span className="text-sm">⏱</span>
                                                                                        <span className="tabular-nums text-xs">{workTimer.timeLeft}s</span>
                                                                                    </>
                                                                                ) : (
                                                                                    <>
                                                                                        <Play size={10} fill="currentColor" />
                                                                                        <span className="text-xs">{repsPerSet[setsCompleted] || targetReps}s</span>
                                                                                    </>
                                                                                )}
                                                                            </button>
                                                                        )}
                                                                        {isExerciseComplete && <span className="text-emerald-400 text-[10px] font-bold">✓ Completado</span>}
                                                                    </div>
                                                                </div>

                                                                {!isExerciseComplete ? (
                                                                    <div className="bg-slate-900/60 rounded-2xl p-3 border border-white/5 shadow-inner space-y-3">

                                                                        {/* Weight Control - Conditional per exercise type */}
                                                                        {isLoadable ? (
                                                                            <div className="flex items-center justify-between gap-4">
                                                                                {/* Previous box */}
                                                                                {(() => {
                                                                                    const prevData = getPreviousWeight(idx);
                                                                                    return (
                                                                                        <div className="flex flex-col min-w-[60px]">
                                                                                            <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">
                                                                                                Anterior {prevData?.contextLabel && `(${prevData.contextLabel})`}
                                                                                            </span>
                                                                                            <span className={`text-xs font-black leading-none ${prevData?.match === 'any' ? 'text-yellow-400' : 'text-slate-400'}`}>
                                                                                                {prevData ? `${prevData.weight} ${intUnitLabel}` : '--'}
                                                                                            </span>
                                                                                            {prevData?.match === 'any' && (
                                                                                                <span className="text-[7px] text-yellow-500">⚠️ Otro</span>
                                                                                            )}
                                                                                        </div>
                                                                                    );
                                                                                })()}

                                                                                {/* Weight Selector */}
                                                                                <div className="flex-1 flex items-center justify-between bg-slate-800/50 rounded-xl p-1 border border-white/5">
                                                                                    <button
                                                                                        onClick={() => setCurrentSetWeight(prev => ({ ...prev, [idx]: Math.max(0, (parseFloat(prev[idx] || 0) - 1)).toString() }))}
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
                                                                                        <span className="text-[10px] font-bold text-slate-500">
                                                                                            {intUnitLabel}
                                                                                        </span>
                                                                                    </div>
                                                                                    <button
                                                                                        onClick={() => setCurrentSetWeight(prev => ({ ...prev, [idx]: (parseFloat(prev[idx] || 0) + 1).toString() }))}
                                                                                        className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center text-slate-400 active:bg-slate-600 transition-colors"
                                                                                    >
                                                                                        <Plus size={14} />
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        ) : null}

                                                                        <div className="flex items-center justify-between gap-4">
                                                                            {/* Label filler to keep alignment */}
                                                                            <div className="flex flex-col min-w-[60px]">
                                                                                <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">Actual</span>
                                                                                <span className="text-xs font-black text-white leading-none">Serie {setsCompleted + 1}</span>
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
                                                                                    <span className="text-[10px] font-bold text-slate-500">
                                                                                        {volUnit}
                                                                                    </span>
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
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Registrar Serie</span>
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

            <div className="fixed bottom-3 left-4 right-4 z-[100] pointer-events-none flex justify-start">
                <motion.button
                    layout
                    initial={false}
                    animate={{
                        width: isNavExpanded ? '100%' : '56px',
                        backgroundColor: isNavExpanded ? '#1e293b' : '#334155'
                    }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    onClick={() => {
                        if (!isNavExpanded) {
                            setIsNavExpanded(true);
                        } else {
                            handleFinishBlock();
                        }
                    }}
                    className="pointer-events-auto h-14 rounded-2xl border border-white/10 flex items-center justify-center gap-3 shadow-2xl backdrop-blur-md overflow-hidden relative group"
                >
                    <motion.div
                        layout
                        className={`flex items-center justify-center shrink-0 ${isNavExpanded ? 'ml-0' : 'w-full'}`}
                    >
                        <CheckCircle size={24} className={isNavExpanded ? 'text-emerald-400' : 'text-slate-400'} />
                    </motion.div>

                    <AnimatePresence>
                        {isNavExpanded && (
                            <motion.span
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="text-white font-black text-lg uppercase tracking-wider whitespace-nowrap pr-2"
                            >
                                Finalizar Bloque
                            </motion.span>
                        )}
                    </AnimatePresence>

                    {/* Visual hint for minimized state */}
                    {!isNavExpanded && (
                        <div className="absolute inset-0 bg-white/5 opacity-0 group-active:opacity-100 transition-opacity" />
                    )}
                </motion.button>
            </div>
        </div >
    );
};

export default WorkBlock;
