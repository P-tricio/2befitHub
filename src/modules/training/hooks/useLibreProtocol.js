import { useState, useEffect, useRef } from 'react';
import { useSessionTimer } from './useSessionTimer';
import { getLibreConfig } from '../runner/utils/blockUtils';

export const useLibreProtocol = ({
    module,
    exercises,
    weightsUsed,
    repsDone,
    playSuccess,
    initAudio
}) => {
    // State
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

    // Rest Timer
    const restTimer = useSessionTimer(0);
    const [restDuration, setRestDuration] = useState(0);

    // Sync rest timer display
    useEffect(() => {
        if (!isResting) {
            restTimer.pause();
            return;
        }

        if (restTimer.isRunning) {
            const remaining = Math.max(0, restDuration - restTimer.elapsed);
            setRestTimeLeft(remaining);

            if (remaining <= 0) {
                setIsResting(false);
                restTimer.pause();
                if (initAudio) initAudio();
                if (playSuccess) playSuccess();
            }
        }
    }, [restTimer.elapsed, restTimer.isRunning, isResting, restDuration, playSuccess, initAudio]);

    // Start Rest Helper
    const startRest = (duration) => {
        setRestDuration(duration);
        setRestTimeLeft(duration);
        restTimer.reset(0);
        restTimer.start();
        setIsResting(true);
    };

    const handleSkipRest = () => {
        setIsResting(false);
        restTimer.pause();
        setRestTimeLeft(0);
    };

    // Initialize State
    useEffect(() => {
        if (!exercises.length) return;

        const initSets = {};
        const initSetReps = {};
        const initSeriesWeights = {};
        const initCurrentWeight = {};
        const initCurrentReps = {};

        exercises.forEach((ex, idx) => {
            initSets[idx] = 0;
            initSetReps[idx] = [];
            initSeriesWeights[idx] = [];
            // Initialize current weight from weightsUsed or prescribedWeight
            const { prescribedWeight, targetReps, repsPerSet } = getLibreConfig(ex, module);
            initCurrentWeight[idx] = weightsUsed[idx] || prescribedWeight || '';
            initCurrentReps[idx] = repsPerSet[0] || targetReps || 10;
        });

        setLibreSetsDone(initSets);
        setLibreSetReps(initSetReps);
        setLibreSeriesWeights(initSeriesWeights);
        setCurrentSetWeight(initCurrentWeight);
        setCurrentSetReps(initCurrentReps);
    }, [exercises, module, weightsUsed]);


    // Actions
    const completeLibreSet = (exIdx, customReps = null, skipRest = false) => {
        const ex = exercises[exIdx];
        const { targetSets, repsPerSet, restSeconds, targetReps } = getLibreConfig(ex, module);
        const currentSetsDone = libreSetsDone[exIdx] || 0;
        const rawReps = customReps ?? currentSetReps[exIdx] ?? repsPerSet[currentSetsDone] ?? targetReps ?? 10;
        const repsForSet = parseInt(rawReps, 10) || 0;
        const weightForSet = currentSetWeight[exIdx] || weightsUsed[exIdx] || '0';

        // Update Series Data
        setLibreSetReps(prev => {
            const existing = prev[exIdx] || [];
            return { ...prev, [exIdx]: [...existing, repsForSet] };
        });

        setLibreSeriesWeights(prev => {
            const existing = prev[exIdx] || [];
            return { ...prev, [exIdx]: [...existing, weightForSet] };
        });

        const nextSetNum = currentSetsDone + 1;
        setLibreSetsDone(prev => ({ ...prev, [exIdx]: nextSetNum }));

        // Update "Next Set" Defaults
        if (nextSetNum < targetSets) {
            const nextReps = repsPerSet[nextSetNum] || targetReps || 10;
            setCurrentSetReps(prev => ({ ...prev, [exIdx]: nextReps }));
            // Keep weight same as previous set by default
        }

        // Logic for Rest and Navigation
        // Check if group/circuit logic applies (simplified here, assumes calling component handles group logic if needed)
        // But for Standard Sets:
        if (restSeconds > 0 && !skipRest && nextSetNum < targetSets) {
            startRest(restSeconds);
            setIsRoundRest(false);
        } else {
            setIsResting(false);
        }
    };

    // Complete Round (for Circuits/Supersets)
    const completeRound = (group, restOverride = null) => {
        // Mark one set complete for EACH exercise in the group
        group.forEach(ex => {
            const exIdx = ex.originalIndex;
            const { targetSets } = getLibreConfig(ex, module);
            const currentSetsDone = libreSetsDone[exIdx] || 0;

            if (currentSetsDone < targetSets) {
                // Commit default values since we are bulk completing
                const repsForSet = currentSetReps[exIdx] || 10; // Fallback
                const weightForSet = currentSetWeight[exIdx] || '0';

                setLibreSetReps(prev => ({ ...prev, [exIdx]: [...(prev[exIdx] || []), repsForSet] }));
                setLibreSeriesWeights(prev => ({ ...prev, [exIdx]: [...(prev[exIdx] || []), weightForSet] }));
                setLibreSetsDone(prev => ({ ...prev, [exIdx]: currentSetsDone + 1 }));
            }
        });

        // Trigger Round Rest
        const effectiveRest = restOverride !== null ? restOverride : 60; // Default round rest?
        if (effectiveRest > 0) {
            startRest(effectiveRest);
            setIsRoundRest(true);
        }
    };

    const handleEditSet = (exIdx, setIdx) => {
        setEditingSet({ exIdx, setIdx });
    };

    const cancelEditSet = () => {
        setEditingSet(null);
    };

    const updateSetResult = (exIdx, setIdx, field, value) => {
        if (field === 'reps') {
            setLibreSetReps(prev => {
                const newArr = [...(prev[exIdx] || [])];
                newArr[setIdx] = value;
                return { ...prev, [exIdx]: newArr };
            });
        } else if (field === 'weight') {
            setLibreSeriesWeights(prev => {
                const newArr = [...(prev[exIdx] || [])];
                newArr[setIdx] = value;
                return { ...prev, [exIdx]: newArr };
            });
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

        setEditingSet(null);
    };

    // Update reps for a specific set
    const updateLibreSetReps = (exIdx, setIdx, newReps) => {
        setLibreSetReps(prev => {
            const currentReps = [...(prev[exIdx] || [])];
            currentReps[setIdx] = newReps;
            return { ...prev, [exIdx]: currentReps };
        });

        setEditingSet(null);
    };


    return {
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
        completeRound,
        handleSkipRest,
        handleEditSet,
        cancelEditSet,
        handleEditSet,
        cancelEditSet,
        updateSetResult,
        uncompleteLibreSet,
        updateLibreSetReps
    };
};
