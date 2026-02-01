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

    const normalizeBlockType = (name = '') => {
        const u = name.toUpperCase();
        if (u.includes('BOOST')) return 'BOOST';
        if (u.includes('BASE')) return 'BASE';
        if (u.includes('BUILD')) return 'BUILD';
        if (u.includes('BURN')) return 'BURN';
        return 'BASE';
    };

    let totalHR = 0;
    let hrCount = 0;
    let maxHR = 0;
    let cardioPace = null;
    let isPureCardio = false;

    Object.entries(results).forEach(([stepIndex, res]) => {
        const step = timeline[stepIndex];
        if (!step || step.type !== 'WORK' || !step.module) return;

        const blockType = normalizeBlockType(step.blockType || step.module.name || '');
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

        // 2. Handle Global Cardio Sessions
        if (res.type === 'cardio') {
            isPureCardio = true;
            const hrAvg = res.heartRateAvg;
            const hrMax = res.heartRateMax;
            const pace = res.pace;
            cardioPace = pace;

            if (hrAvg) {
                totalHR += hrAvg;
                hrCount++;
            }
            if (hrMax > maxHR) maxHR = hrMax;

            if (hrAvg) {
                if (hrAvg > 170) {
                    insights.push({
                        type: 'down',
                        athleteMsg: "Intensidad de cardio muy elevada. Cuidado con el sobreesfuerzo.",
                        coachInsight: "FC Media > 170 bpm. Intensidad alta (Z4/Z5). Verificar fatiga."
                    });
                } else if (hrAvg > 140) {
                    insights.push({
                        type: 'up',
                        athleteMsg: "¡Excelente motor! Trabajo cardiovascular muy eficiente.",
                        coachInsight: "FC Media en rango aeróbico óptimo (140-170 bpm)."
                    });
                } else {
                    insights.push({
                        type: 'keep',
                        athleteMsg: "Buen trabajo de base aeróbica.",
                        coachInsight: "FC Media < 140 bpm. Trabajo de resistencia base o recuperación."
                    });
                }
            }

            if (pace) {
                insights.push({
                    type: 'keep',
                    athleteMsg: `Ritmo medio registrado: ${pace} min/km.`,
                    coachInsight: `Referencia de rendimiento: ${pace} min/km.`
                });
            }
            return;
        }

        // Accumulate HR for hybrid/energy exercises
        if (res.heartRates) {
            Object.values(res.heartRates).forEach(hr => {
                const val = parseInt(hr);
                if (val > 0) {
                    totalHR += val;
                    hrCount++;
                    if (val > maxHR) maxHR = val;
                }
            });
        }
        // --- Logic for PDP-T (Time-based "Techo y Suelo") ---
        if (protocol === 'T') {
            exercises.forEach((ex, idx) => {
                if (!ex) return;
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
                    if (!ex) return;
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
                if (!ex) return;
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
                } else if (success > 0) {
                    insights.push({
                        type: 'keep',
                        moduleId: moduleId,
                        exerciseId: ex.id,
                        exerciseIndex: idx,
                        exerciseName: ex.nameEs || ex.name,
                        athleteMsg: `EMOM mantenido con buena consistencia.`,
                        coachInsight: `Mantenimiento EMOM: ${success}/${totalPlannedRounds} rondas exitosas.`,
                        adjustment: 0
                    });
                }

                // Add energy/biometric insights for EMOM if present
                const hr = res.heartRates?.[idx];
                if (hr && parseInt(hr) > 165) {
                    insights.push({
                        type: 'down',
                        exerciseName: ex.nameEs || ex.name,
                        athleteMsg: "Pulso muy alto en este EMOM. El coach revisará los descansos.",
                        coachInsight: `FC Media detectada: ${hr} bpm. Posible falta de recuperación entre rondas.`
                    });
                }
            });
        }

        // --- Fallback for LIBRE or specialized ENERGY ---
        else {
            exercises.forEach((ex, idx) => {
                const repsDone = res.reps?.[idx] || 0;
                const weightUsed = parseFloat(res.actualWeights?.[idx] || res.weights?.[idx] || 0);
                const energy = res.energyMetrics?.[idx];
                const hr = res.heartRates?.[idx];

                if (repsDone > 0 || (energy && (res.reps?.[idx] > 0))) {
                    completedExercises++;

                    if (ex.quality === 'E') {
                        // Energy specific insights
                        insights.push({
                            type: 'keep',
                            moduleId: moduleId,
                            exerciseId: ex.id,
                            exerciseName: ex.nameEs || ex.name,
                            athleteMsg: `¡Buen trabajo de energía en ${ex.nameEs || ex.name}!`,
                            coachInsight: `Rendimiento Energía: ${repsDone} ${energy?.volumeUnit || 'kcal'} a ${weightUsed} ${energy?.intensityUnit || 'W'}.`
                        });

                        if (hr && parseInt(hr) > 160) {
                            insights.push({
                                type: 'down',
                                exerciseName: ex.nameEs || ex.name,
                                athleteMsg: "Esfuerzo cardiovascular alto detectado.",
                                coachInsight: `FC Media en bloque de energía: ${hr} bpm.`
                            });
                        }
                    } else if (repsDone > 0) {
                        totalVolume += repsDone * weightUsed;
                    }
                }
            });
        }
    });

    const successCount = insights.filter(i => i.type === 'up' || i.type === 'keep').length;
    const failureCount = insights.filter(i => i.type === 'down').length;
    let efficiency = 0;

    if (insights.length > 0) {
        // If we have insights, calculate based on them
        efficiency = Math.round((successCount / (successCount + failureCount)) * 100);
    } else if (completedExercises > 0) {
        // If no adjustments but work was done, it's 100% efficient maintenance
        efficiency = 100;
    }

    return {
        insights,
        metrics: {
            totalVolume: Math.round(totalVolume),
            completedExercises,
            efficiency: isNaN(efficiency) ? 0 : efficiency,
            avgHR: hrCount > 0 ? Math.round(totalHR / hrCount) : null,
            maxHR: maxHR > 0 ? maxHR : null,
            cardioPace,
            isPureCardio
        }
    };
};

