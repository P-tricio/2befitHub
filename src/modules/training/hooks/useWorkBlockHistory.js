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
                const w = parseFloat(plan[module.offset + idx]);
                initWeights[idx] = plan[module.offset + idx];
            }
            // PRIORITY 3: Empty
            else {
                // FALLBACK: Don't pick up RPE/RIR intensities as weight
                const { isLoadable } = getLibreConfig(ex, module);
                // If not loadable, force empty string to avoid showing "28.0" or similar phantom values
                if (!isLoadable) {
                    initWeights[idx] = '';
                } else {
                    initWeights[idx] = '';
                }
            }
        });
        setRepsDone(initReps);
        setWeightsUsed(initWeights);
        setHeartRates(initHR);
        setEnergyMetrics(initEnergy);
        setExerciseNotes({});
    }, [module, plan, previousLog, exercises]);

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
