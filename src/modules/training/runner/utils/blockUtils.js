export const getLibreConfig = (ex, module) => {
    const sets = ex.config?.sets || [];
    const firstSet = sets[0] || {};
    const config = ex.config || {};

    // Number of sets is the length of the sets array
    const targetSets = sets.length || ex.sets || ex.targetSets || 3;

    // Detect Volume Type
    const vType = config.volType || 'REPS';
    let volUnit = 'reps';
    let isTime = false;
    let isDist = false;
    let isLoadable = false;

    if (vType === 'TIME' || ex.targetTime > 0 || (sets[0]?.time > 0)) {
        volUnit = 'seg';
        isTime = true;
    } else if (vType === 'METROS' || vType === 'DISTANCE' || ex.targetDistance > 0) {
        volUnit = 'm';
        isDist = true;
    } else if (vType === 'KM') {
        volUnit = 'km';
        isDist = true;
    } else if (vType === 'KCAL') {
        volUnit = 'kcal';
    }

    // Get reps for EACH set (for variable rep schemes like 5-4-3-2-1)
    const repsPerSet = sets.length > 0
        ? sets.map(s => {
            // If using new config style, 'reps' field holds the scalar value (seconds, meters, etc)
            if (config.volType && s.reps) return s.reps;

            // Fallbacks for legacy/mixed data
            if (isTime) return s.time || (s.metric === 'time' ? s.value : null) || ex.targetTime || 0;
            if (isDist) return s.distance || ex.targetDistance || 0;
            return s.reps || ex.targetReps || ex.reps || 8;
        })
        : Array(targetSets).fill(
            isTime ? (ex.targetTime || 0) :
                isDist ? (ex.targetDistance || 0) :
                    (ex.targetReps || ex.reps || 8)
        );

    // Fallback single value for display purposes
    const targetReps = repsPerSet[0] || 8;

    // Rest from first set, or module default
    const restSeconds = firstSet.rest || ex.restSeconds || module?.targeting?.[0]?.restSeconds || 90;

    // Intensity Logic - expanded map
    let intensity = null;

    // isLoadable: Does the exercise require a WEIGHT input?
    // Criteria: 1) Exercise is marked as loadable AND 2) NOT a cardio exercise (quality = 'E')
    const isCardio = ex.quality === 'E' || ex.quality === 'Resistencia' || ex.quality === 'Cardio';
    isLoadable = Boolean((ex.loadable || ex.isLoadable || config.isLoadable) && !isCardio);

    // Determine intensity type for DISPLAY purposes (the badge/target, not the input)
    const iType = config.intType || (isLoadable ? 'PESO' : 'RIR');
    // Admin stores intensity value in 'rir' field often, or 'weight'
    const iVal = firstSet.rir || firstSet.weight || firstSet.intensity || ex.intensity;

    // Set unit label based on context:
    // - For LOADABLE exercises: always 'kg' (user inputs weight in kg)
    // - For NON-LOADABLE/CARDIO: use the intensity type for display purposes only
    let intUnitLabel = 'kg'; // Default
    if (isLoadable) {
        intUnitLabel = 'kg'; // Weight exercises always use kg for input
    } else {
        // Non-loadable exercises: show the intensity type unit (for display only, not input)
        if (iType === 'WATTS') { intUnitLabel = 'W'; }
        else if (iType === 'BPM') { intUnitLabel = 'bpm'; }
        else if (iType === 'RITMO') { intUnitLabel = '/km'; }
        else if (iType === 'NIVEL') { intUnitLabel = 'nvl'; }
        else if (iType === '%') { intUnitLabel = '%'; }
        else if (iType === 'RPE') { intUnitLabel = 'RPE'; }
        else if (iType === 'RIR') { intUnitLabel = 'RIR'; }
        else { intUnitLabel = 'kg'; } // Fallback
    }

    // Format display string
    if (iVal) {
        if (iType === 'RIR') intensity = `RIR ${iVal}`;
        else if (iType === 'PESO') intensity = `${iVal}kg`;
        else if (iType === '%') intensity = `${iVal}%`;
        else if (iType === 'RPE') intensity = `RPE ${iVal}`;
        else if (iType === 'WATTS') intensity = `${iVal}W`;
        else if (iType === 'BPM') intensity = `${iVal} bpm`;
        else if (iType === 'RITMO') intensity = `${iVal}`;
        else if (iType === 'NIVEL') intensity = `Nvl ${iVal}`;
        else intensity = iVal;
    } else if (ex.loadPercent) {
        intensity = `${ex.loadPercent}%`;
    }

    // Check if reps vary across sets
    const isVariableReps = new Set(repsPerSet).size > 1;

    return { targetSets, targetReps, repsPerSet, restSeconds, intensity, isVariableReps, isTime, isDist, volUnit, intUnitLabel, isLoadable };
};
