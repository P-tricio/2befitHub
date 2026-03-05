import { useState, useEffect } from 'react';
import { TrainingDB } from '../services/db';
import { getLibreConfig } from '../runner/utils/blockUtils';

export const useWorkBlockHistory = ({ currentUser, module, plan, exercises }) => {
    const [previousLog, setPreviousLog] = useState(null);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [globalExerciseWeights, setGlobalExerciseWeights] = useState({});

    // 1. Fetch History
    useEffect(() => {
        const fetchHistory = async () => {
            if (!currentUser || !module.id) return;

            try {
                // Pass stableId to broad logic across sessions
                const lastLog = await TrainingDB.logs.getLastLog(currentUser.uid, module.id, module.stableId);
                setPreviousLog(lastLog);

                // Fetch global exercise history with context awareness
                const currentContext = {
                    protocol: module.protocol,
                    blockType: module.blockType || module.manifestation?.split('-')[0]
                };

                const globalWeights = {};
                for (const ex of exercises) {
                    const exId = ex.id || ex.exerciseId;
                    if (exId) {
                        try {
                            const weightData = await TrainingDB.exerciseHistory.getLastWeightByContext(
                                currentUser.uid,
                                exId,
                                currentContext
                            );
                            if (weightData) {
                                globalWeights[exId] = weightData;
                            }
                        } catch (e) {
                            // Ignore individual fetch errors
                        }
                    }
                }
                setGlobalExerciseWeights(globalWeights);
            } catch (error) {
                console.error('Error fetching history:', error);
            } finally {
                setLoadingHistory(false);
            }
        };

        fetchHistory();
    }, [currentUser, module.id, module.protocol, module.blockType, exercises]);


    // 2. Initialize Session State (Reps, Weights, etc.)
    const [repsDone, setRepsDone] = useState({});
    const [weightsUsed, setWeightsUsed] = useState({});
    const [heartRates, setHeartRates] = useState({});
    const [energyMetrics, setEnergyMetrics] = useState({});
    const [exerciseNotes, setExerciseNotes] = useState({});

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

            // === EXERCISE-MATCHED WEIGHT INITIALIZATION ===
            // Resolve the correct index in previousLog by matching exercise ID/name,
            // NOT by blind positional index (fixes cross-exercise weight bleed).
            const exId = ex.id || ex.exerciseId;
            let matchedPrevIdx = -1;

            if (previousLog?.exercises) {
                matchedPrevIdx = previousLog.exercises.findIndex(pe =>
                    (pe.id && exId && pe.id === exId) ||
                    (pe.name && ex.name && pe.name === ex.name)
                );
            }

            // Use matched index if found, otherwise only use positional index if the exercise at that position matches
            const prevIdx = matchedPrevIdx !== -1
                ? matchedPrevIdx
                : (previousLog?.exercises?.[idx] &&
                    ((previousLog.exercises[idx].id && exId && previousLog.exercises[idx].id === exId) ||
                        (previousLog.exercises[idx].name && ex.name && previousLog.exercises[idx].name === ex.name))
                    ? idx
                    : -1);

            // PRIORITY 0: Use LAST weight from libreSeriesWeights (per-set weights from previous session)
            if (prevIdx !== -1) {
                const prevSeriesWeights = previousLog?.results?.libreSeriesWeights?.[prevIdx];
                if (prevSeriesWeights && prevSeriesWeights.length > 0) {
                    const lastSeriesWeight = prevSeriesWeights[prevSeriesWeights.length - 1];
                    if (lastSeriesWeight) {
                        let baseWeight = parseFloat(lastSeriesWeight);

                        // Apply recommendation if available
                        if (previousLog?.analysis) {
                            const recommendation = previousLog.analysis.find(
                                a => a.moduleId === module.id &&
                                    (a.exerciseId === exId || a.exerciseIndex === prevIdx)
                            );
                            if (recommendation?.adjustment) {
                                baseWeight += recommendation.adjustment;
                            }
                        }

                        initWeights[idx] = baseWeight.toFixed(1);
                        return; // Skip to next exercise
                    }
                }
            }

            // PRIORITY 1: Use actual weight from previous session + recommendation
            if (prevIdx !== -1 && previousLog?.results?.actualWeights?.[prevIdx]) {
                let baseWeight = parseFloat(previousLog.results.actualWeights[prevIdx]);

                // Find exercise-specific recommendation
                if (previousLog?.analysis) {
                    const recommendation = previousLog.analysis.find(
                        a => a.moduleId === module.id &&
                            (a.exerciseId === exId || a.exerciseIndex === prevIdx)
                    );

                    if (recommendation?.adjustment) {
                        baseWeight += recommendation.adjustment;
                    }
                }

                initWeights[idx] = baseWeight.toFixed(1);
            }
            // PRIORITY 2: Use global exercise history (cross-session, per exercise ID)
            else if (exId && globalExerciseWeights[exId]) {
                initWeights[idx] = globalExerciseWeights[exId].weight.toString();
            }
            // PRIORITY 3: Use plan (if no history exists)
            else if (plan?.[module.offset + idx]) {
                initWeights[idx] = plan[module.offset + idx];
            }
            // PRIORITY 4: Empty
            else {
                initWeights[idx] = '';
            }
        });
        setRepsDone(initReps);
        setWeightsUsed(initWeights);
        setHeartRates(initHR);
        setEnergyMetrics(initEnergy);
        setExerciseNotes({});
    }, [module, plan, previousLog, exercises, globalExerciseWeights]);

    return {
        previousLog,
        loadingHistory,
        globalExerciseWeights,
        repsDone, setRepsDone,
        weightsUsed, setWeightsUsed,
        heartRates, setHeartRates,
        energyMetrics, setEnergyMetrics,
        exerciseNotes, setExerciseNotes
    };
};
