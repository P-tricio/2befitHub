/**
 * Exercise Mapper Utility
 * Normalizes exercise data from various sources to ensure consistent structure
 * and proper field preservation (Spanish names, descriptions, media URLs)
 */

/**
 * Normalizes a single exercise object
 * @param {Object} ex - Raw exercise data
 * @returns {Object} Normalized exercise with guaranteed Spanish fields and media
 */
export const normalizeExercise = (ex) => {
    if (!ex) return null;
    const configSummary = getConfigSummary(ex.config);

    return {
        ...ex,
        // Spanish fields (preserve or fallback)
        nameEs: ex.nameEs || ex.name_es || ex.name,
        descriptionEs: ex.descriptionEs || ex.description_es || ex.description || ex.instructions_es?.join('\n') || '',

        // Media URL (prioritize animated formats)
        mediaUrl: ex.gifUrl || ex.mediaUrl || ex.videoUrl || ex.image || ex.imageStart ||
            (ex.youtubeUrl ? `https://img.youtube.com/vi/${ex.youtubeUrl.split('v=')[1]?.split('&')[0]}/0.jpg` : '') || '',

        // Training config (GlobalCreator 'sets' array support)
        manifestation: configSummary.text || ex.manifestation || '',
        targetReps: configSummary.reps || parseInt(ex.config?.reps || ex.targetReps || 0),

        // Equipment check for bodyweight detection
        isBodyweight: isBodyweightExercise(ex.equipment),

        // Preserve original quality/protocol
        quality: ex.quality || 'F',
        pattern: ex.pattern || ex.config?.pattern || ''
    };
};

/**
 * Checks if equipment indicates bodyweight exercise
 * @param {string} equipment - Equipment name/type
 * @returns {boolean}
 */
const isBodyweightExercise = (equipment = '') => {
    const eq = equipment.toLowerCase();
    return eq.includes('corporal') ||
        eq.includes('bodyweight') ||
        eq.includes('ninguno') ||
        eq.includes('body weight') ||
        eq.includes('sin equipo');
};

/**
 * Maps an array of exercises
 * @param {Array} exercises - Array of raw exercise objects
 * @returns {Array} Array of normalized exercises
 */
export const normalizeExercises = (exercises = []) => {
    return exercises
        .map(normalizeExercise)
        .filter(Boolean); // Remove nulls
};

/**
 * Extracts display names from exercise array (uses Spanish)
 * @param {Array} exercises - Array of normalized exercises
 * @returns {Array<string>} Array of exercise names in Spanish
 */
export const getExerciseNames = (exercises = []) => {
    return exercises.map(ex => ex?.nameEs || ex?.name_es || ex?.name || 'Desconocido');
};

/**
 * Generates a summary string from the new GlobalCreator config object
 * @param {Object} config 
 * @returns {Object} { text, reps }
 */
const getConfigSummary = (config) => {
    if (!config || !config.sets || !Array.isArray(config.sets) || config.sets.length === 0) {
        return { text: '', reps: 0 };
    }

    const sets = config.sets;
    const volType = config.volType || 'REPS'; // REPS, TIME, DIST
    const intType = config.intType || 'RIR'; // RIR, RPE, %RM

    // 1. Check for Volume Uniformity
    const firstRep = sets[0]?.reps;
    const uniformReps = sets.every(s => s.reps === firstRep);

    // 2. Derive Text
    let text = `${sets.length} x `;
    if (uniformReps && firstRep) {
        text += `${firstRep}${volType === 'TIME' ? 's' : ''}`;
    } else {
        text += `(VAR)`;
    }

    // 3. Add Intensity if uniform
    const firstInt = sets[0]?.rir;
    const uniformInt = sets.every(s => s.rir === firstInt);
    if (firstInt && uniformInt) {
        text += ` @ ${firstInt} ${intType}`;
    }

    return {
        text,
        reps: parseInt(firstRep || 0)
    };
};
