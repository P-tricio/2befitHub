/**
 * Generates insights and recommendations based on session results.
 * Now implements technical PDP logic: floor/ceiling for T, efficiency for R, success for E.
 * Separates generic athlete feedback from technical coach insights.
 */
export const generateSessionAnalysis = (results, timeline, history = {}) => {
    const insights = [];
    let totalVolume = 0;
    let completedExercises = 0;

    const PDP_T_RANGES = {
        BASE: { floor: 20, ceiling: 40 },
        BUILD: { floor: 30, ceiling: 50 },
        BURN: { floor: 50, ceiling: 70 },
        BOOST: { floor: 20, ceiling: 40 } // Fallback same as BASE
    };

    const PDP_R_THRESHOLDS = {
        BASE: { cap: 300, efficiency: 180 }, // 5:00 and 3:00
        BUILD: { cap: 360, efficiency: 216 }, // 6:00 and 3:36
        BURN: { cap: 420, efficiency: 252 }  // 7:00 and 4:12
    };

    Object.entries(results).forEach(([stepIndex, res]) => {
        const step = timeline[stepIndex];
        if (!step || step.type !== 'WORK') return;

        const blockType = step.blockType; // BASE, BUILD, BURN, BOOST
        const protocol = step.module.protocol;
        const exercises = step.module.exercises || [];
        const moduleId = step.module.id;
        const previousLog = history[moduleId];

        // 1. Handle Skipped Blocks
        if (res.skipped) {
            insights.push({
                type: 'skipped',
                moduleId: moduleId,
                blockType: blockType,
                athleteMsg: `Bloque ${blockType || step.module.name} saltado`,
                coachInsight: `Bloque saltado por el atleta.`,
                is_skipped: true
            });
            return;
        }

        // --- Logic for PDP-T (Time-based "Techo y Suelo") ---
        if (protocol === 'T') {
            exercises.forEach((ex, idx) => {
                const repsDone = res.reps?.[idx] || 0;
                const ranges = PDP_T_RANGES[blockType];

                if (repsDone > 0) {
                    const weightUsed = parseFloat(res.actualWeights?.[idx] || res.weights?.[idx] || 0);
                    totalVolume += repsDone * weightUsed;
                    completedExercises++;

                    if (!ex.loadable || weightUsed === 0) {
                        if (ranges) {
                            if (repsDone > ranges.ceiling) {
                                insights.push({
                                    type: 'up',
                                    moduleId: moduleId,
                                    exerciseId: ex.id,
                                    exerciseIndex: idx,
                                    exerciseName: ex.nameEs || ex.name,
                                    athleteMsg: `¡Dominio total! Estás volando en ${ex.nameEs || ex.name}.`,
                                    coachInsight: `¡Techo superado! (> ${ranges.ceiling} reps). Sube nivel o variante más compleja.`,
                                    adjustment: 0
                                });
                            } else if (repsDone < ranges.floor) {
                                insights.push({
                                    type: 'down',
                                    moduleId: moduleId,
                                    exerciseId: ex.id,
                                    exerciseIndex: idx,
                                    exerciseName: ex.nameEs || ex.name,
                                    athleteMsg: `Este ejercicio ha sido muy exigente. El coach ajustará la dificultad.`,
                                    coachInsight: `Bajo el suelo (< ${ranges.floor} reps). Considera una regresión más sencilla.`,
                                    adjustment: 0
                                });
                            }
                        }
                        return;
                    }

                    // A. Check Stagnation (±1 rep compared to previous session)
                    if (previousLog?.results?.reps?.[idx] !== undefined) {
                        const prevReps = previousLog.results.reps[idx];
                        if (Math.abs(repsDone - prevReps) <= 1) {
                            insights.push({
                                type: 'down',
                                moduleId: moduleId,
                                exerciseId: ex.id,
                                exerciseIndex: idx,
                                exerciseName: ex.nameEs || ex.name,
                                athleteMsg: `Buen esfuerzo mantenido. Baja carga -5% para reiniciar progresión.`,
                                coachInsight: `Estancamiento (mismo volumen). Forzar bajada carga -5% para reiniciar progresión.`,
                                adjustment: -0.05,
                                isPercent: true
                            });
                            return; // Priority rule
                        }
                    }

                    // B. Techo y Suelo
                    if (ranges) {
                        if (repsDone > ranges.ceiling) {
                            insights.push({
                                type: 'up',
                                moduleId: moduleId,
                                exerciseId: ex.id,
                                exerciseIndex: idx,
                                exerciseName: ex.nameEs || ex.name,
                                athleteMsg: `¡Increíble intensidad! Sube carga +5% para el próximo día.`,
                                coachInsight: `¡Techo superado! (> ${ranges.ceiling} reps). Sube carga +5% en ${ex.nameEs || ex.name}`,
                                adjustment: 0.05,
                                isPercent: true
                            });
                        } else if (repsDone < ranges.floor) {
                            insights.push({
                                type: 'down',
                                moduleId: moduleId,
                                exerciseId: ex.id,
                                exerciseIndex: idx,
                                exerciseName: ex.nameEs || ex.name,
                                athleteMsg: `Sesión exigente. Baja carga -5% para mejorar la calidad técnica.`,
                                coachInsight: `Bajo el suelo (< ${ranges.floor} reps). Reduce carga -5% en ${ex.nameEs || ex.name}`,
                                adjustment: -0.05,
                                isPercent: true
                            });
                        } else {
                            insights.push({
                                type: 'keep',
                                moduleId: moduleId,
                                exerciseId: ex.id,
                                exerciseIndex: idx,
                                exerciseName: ex.nameEs || ex.name,
                                athleteMsg: `Peso ideal y ritmo mantenido en ${ex.nameEs || ex.name}.`,
                                coachInsight: `Mantenimiento en zona óptima (${repsDone} reps).`,
                                adjustment: 0
                            });
                        }
                    }
                }
            });
        }

        // --- Logic for PDP-R (Rep-based "Umbral del 60%") ---
        else if (protocol === 'R') {
            const thresholds = PDP_R_THRESHOLDS[blockType];
            const elapsed = res.elapsed || 0;
            const anyReps = Object.values(res.reps || {}).some(r => r > 0);

            if (anyReps && thresholds) {
                const isEfficiencyMet = elapsed < thresholds.efficiency;
                const isFailed = elapsed >= thresholds.cap;

                exercises.forEach((ex, idx) => {
                    const weightUsed = parseFloat(res.actualWeights?.[idx] || res.weights?.[idx] || 0);
                    const repsDone = res.reps?.[idx] || 0;
                    totalVolume += repsDone * weightUsed;
                    if (repsDone > 0) completedExercises++;

                    if (!ex.loadable || weightUsed === 0) {
                        if (isEfficiencyMet) {
                            insights.push({
                                type: 'up',
                                moduleId: moduleId,
                                exerciseId: ex.id,
                                exerciseIndex: idx,
                                exerciseName: ex.nameEs || ex.name,
                                athleteMsg: `¡Velocidad increíble con tu peso corporal!`,
                                coachInsight: `Dominio temporal (<${Math.floor(thresholds.efficiency / 60)} min). Sube nivel de variante manual.`,
                                adjustment: 0
                            });
                        } else if (isFailed) {
                            insights.push({
                                type: 'down',
                                moduleId: moduleId,
                                exerciseId: ex.id,
                                exerciseIndex: idx,
                                exerciseName: ex.nameEs || ex.name,
                                athleteMsg: `Este reto ha llevado más tiempo del previsto. El coach ajustará la dificultad.`,
                                coachInsight: `Fuera de Time Cap corporal. Considera una variante regresiva.`,
                                adjustment: 0
                            });
                        }
                        return;
                    }

                    if (isEfficiencyMet) {
                        insights.push({
                            type: 'up',
                            moduleId: moduleId,
                            exerciseId: ex.id,
                            exerciseIndex: idx,
                            exerciseName: ex.nameEs || ex.name,
                            athleteMsg: `¡Dominio absoluto del tiempo! Sube peso +5% el próximo día.`,
                            coachInsight: `¡Dominio absoluto! (<${Math.floor(thresholds.efficiency / 60)} min). Sube +5% en ${ex.nameEs || ex.name}`,
                            adjustment: 0.05,
                            isPercent: true
                        });
                    } else if (isFailed) {
                        insights.push({
                            type: 'down',
                            moduleId: moduleId,
                            exerciseId: ex.id,
                            exerciseIndex: idx,
                            exerciseName: ex.nameEs || ex.name,
                            athleteMsg: `Tiempo fuera de rango. Baja peso -5% para ganar velocidad.`,
                            coachInsight: `Fuera de Time Cap. Baja -5% en ${ex.nameEs || ex.name} para ganar velocidad.`,
                            adjustment: -0.05,
                            isPercent: true
                        });
                    } else {
                        insights.push({
                            type: 'keep',
                            moduleId: moduleId,
                            exerciseId: ex.id,
                            exerciseIndex: idx,
                            exerciseName: ex.nameEs || ex.name,
                            athleteMsg: `Buen trabajo técnico y de tiempo en ${ex.nameEs || ex.name}.`,
                            coachInsight: `Mantenimiento: tiempo de ejecución correcto.`,
                            adjustment: 0
                        });
                    }
                });
            }
        }

        // --- Logic for PDP-E (EMOM Success/Fail) ---
        else if (protocol === 'E') {
            const emomRes = res.emomResults || {};
            const rounds = Object.values(emomRes);
            const failed = rounds.filter(v => v === 'fail' || v === null).length;
            const success = rounds.filter(v => v === 'success').length;
            const totalPlannedRounds = step.module.emomParams?.durationMinutes || 4;

            exercises.forEach((ex, idx) => {
                const weightUsed = parseFloat(res.actualWeights?.[idx] || res.weights?.[idx] || 0);
                const targetRepsPerRound = ex.targetReps || step.module.targeting?.[0]?.volume || 6;
                const totalReps = success * targetRepsPerRound;
                totalVolume += totalReps * weightUsed;
                if (success > 0) completedExercises++;

                if (!ex.loadable || weightUsed === 0) {
                    if (failed > 0) {
                        insights.push({
                            type: 'down',
                            moduleId: moduleId,
                            exerciseId: ex.id,
                            exerciseName: ex.nameEs || ex.name,
                            athleteMsg: `EMOM retador. Seguiremos trabajando en la consistencia.`,
                            coachInsight: `Fallo en rondas EMOM corporal. Sugerir regresión o bajar reps.`,
                            adjustment: 0
                        });
                    } else if (success >= totalPlannedRounds) {
                        insights.push({
                            type: 'up',
                            moduleId: moduleId,
                            exerciseId: ex.id,
                            exerciseName: ex.nameEs || ex.name,
                            athleteMsg: `¡EMOM perfecto! El coach revisará tu nivel.`,
                            coachInsight: `EMOM corporal completado con éxito. Sube nivel o dificultad variant.`,
                            adjustment: 0
                        });
                    }
                    return;
                }

                if (failed > 0) {
                    insights.push({
                        type: 'down',
                        moduleId: moduleId,
                        exerciseId: ex.id,
                        exerciseIndex: idx,
                        exerciseName: ex.nameEs || ex.name,
                        athleteMsg: `EMOM retador. Baja peso -5% para asegurar todas las rondas.`,
                        coachInsight: `Fallo detectado en rondas EMOM. Baja carga -5% en ${ex.nameEs || ex.name}`,
                        adjustment: -0.05,
                        isPercent: true
                    });
                } else if (success >= totalPlannedRounds) {
                    insights.push({
                        type: 'up',
                        moduleId: moduleId,
                        exerciseId: ex.id,
                        exerciseIndex: idx,
                        exerciseName: ex.nameEs || ex.name,
                        athleteMsg: `¡Sesión impecable! Sube peso +5% el próximo día.`,
                        coachInsight: `EMOM completado con éxito. Sube carga +5% en ${ex.nameEs || ex.name}`,
                        adjustment: 0.05,
                        isPercent: true
                    });
                }
            });
        }

        // --- Fallback for LIBRE or legacy ---
        else {
            exercises.forEach((ex, idx) => {
                const repsDone = res.reps?.[idx] || 0;
                const weightUsed = parseFloat(res.actualWeights?.[idx] || res.weights?.[idx] || 0);
                if (repsDone > 0) {
                    totalVolume += repsDone * weightUsed;
                    completedExercises++;
                }
            });
        }
    });

    const successCount = insights.filter(i => i.type === 'up' || i.type === 'keep').length;
    let efficiency = 0;

    if (insights.length > 0) {
        efficiency = Math.round((successCount / insights.length) * 100);
    } else if (completedExercises > 0) {
        efficiency = 100; // Default to 100% if work was done but no specific notes generated
    }

    return {
        insights,
        metrics: {
            totalVolume: Math.round(totalVolume),
            completedExercises,
            efficiency
        }
    };
};

