import {
    PDP_T_RANGES,
    PDP_R_THRESHOLDS,
    PDP_E_CONFIG,
    PDP_DESCRIPTIONS
} from './pdpConstants';

/**
 * Service for handling PDP protocol transformations and template generation.
 */

export const OFFICIAL_BLOCK_VALUES = {
    BOOST: { time: PDP_T_RANGES.BOOST.time, reps: PDP_R_THRESHOLDS.BOOST.reps, emomMin: PDP_E_CONFIG.BOOST.emomMin },
    BASE: { time: PDP_T_RANGES.BASE.time, reps: PDP_R_THRESHOLDS.BASE.reps, emomMin: PDP_E_CONFIG.BASE.emomMin },
    BUILD: { time: PDP_T_RANGES.BUILD.time, reps: PDP_R_THRESHOLDS.BUILD.reps, emomMin: PDP_E_CONFIG.BUILD.emomMin },
    BURN: { time: PDP_T_RANGES.BURN.time, reps: PDP_R_THRESHOLDS.BURN.reps, emomMin: PDP_E_CONFIG.BURN.emomMin }
};

export const determineBlockType = (name = '', idx = 0) => {
    const upperName = name.toUpperCase();
    if (upperName.includes('BOOST')) return 'BOOST';
    if (upperName.includes('BASE')) return 'BASE';
    if (upperName.includes('BUILD')) return 'BUILD';
    if (upperName.includes('BURN')) return 'BURN';

    // Fallback by index if name doesn't match
    const defaultTypes = ['BOOST', 'BASE', 'BUILD', 'BUILD', 'BURN', 'BURN'];
    return defaultTypes[idx] || 'BASE';
};

export const createPlaceholderExercise = (blockType, exIdx, protocolType) => {
    const values = OFFICIAL_BLOCK_VALUES[blockType] || OFFICIAL_BLOCK_VALUES.BASE;
    const baseConfig = {
        volType: protocolType === 'PDP-T' ? 'TIME' : 'REPS',
        intType: 'RIR',
        sets: []
    };

    if (protocolType === 'PDP-T') {
        let timePerExercise = values.time;
        if (blockType === 'BOOST') timePerExercise = Math.floor(values.time / 2);
        baseConfig.sets = [{ reps: String(timePerExercise), rir: '2-3', rest: '0' }];
        if (blockType === 'BURN') baseConfig.sharedTime = true;
    } else if (protocolType === 'PDP-R') {
        let repsPerExercise = values.reps;
        if (blockType === 'BOOST') repsPerExercise = Math.floor(values.reps / 2);
        baseConfig.sets = [{ reps: String(repsPerExercise), rir: '2-3', rest: '0' }];
    } else if (protocolType === 'PDP-E') {
        const numSets = values.emomMin;
        let repsPerRound = 6;
        if (blockType === 'BUILD') repsPerRound = 8;
        if (blockType === 'BURN') repsPerRound = 10;
        baseConfig.sets = Array(numSets).fill(null).map(() => ({ reps: String(repsPerRound), rir: '2-3', rest: '0' }));
        baseConfig.isEMOM = true;
    }

    return {
        id: crypto.randomUUID(),
        name: `Ejercicio ${exIdx + 1}`,
        type: 'EXERCISE',
        pattern: 'Global',
        quality: 'Fuerza',
        config: baseConfig,
        isGrouped: (blockType === 'BOOST' || blockType === 'BURN') && exIdx % 2 === 1,
        mediaUrl: '', imageStart: '', imageEnd: ''
    };
};

/**
 * Transforms an entire session from one protocol to another while preserving exercise identity.
 */
export const transformSessionProtocol = (sessionData, targetProtocol) => {
    const blocks = sessionData.blocks || [];

    // We follow the standard PDP structure of 6 blocks
    const blockTypes = ['BOOST', 'BASE', 'BUILD', 'BUILD', 'BURN', 'BURN'];
    const template = [
        { name: 'BOOST - Activación' },
        { name: 'BASE - Fuerza' },
        { name: 'BUILD A - Capacidad' },
        { name: 'BUILD B - Capacidad' },
        { name: 'BURN A - Acondicionamiento' },
        { name: 'BURN B - Acondicionamiento' }
    ];

    // Flatten existing exercises to redistribute them
    let availableExercises = blocks.flatMap(b => b.exercises || []);
    let exIterator = 0;

    const newBlocks = template.map((blockDef, blockIdx) => {
        const blockType = blockTypes[blockIdx];

        let numExercises;
        if (blockType === 'BOOST') numExercises = 2;
        else if (blockType === 'BASE') numExercises = 1;
        else if (blockType === 'BUILD') numExercises = 1;
        else if (blockType === 'BURN') numExercises = 2;

        return {
            id: crypto.randomUUID(),
            name: blockDef.name,
            protocol: targetProtocol,
            description: '', // Can be populated if needed
            exercises: Array(numExercises).fill(null).map((_, i) => {
                const placeholder = createPlaceholderExercise(blockType, i, targetProtocol);

                if (exIterator < availableExercises.length) {
                    const existing = availableExercises[exIterator];
                    exIterator++;
                    return {
                        ...existing,
                        id: crypto.randomUUID(),
                        config: placeholder.config,
                        isGrouped: placeholder.isGrouped,
                        name: existing.name || placeholder.name
                    };
                }
                return placeholder;
            }),
            params: {
                // Approximate params from constants
                timeCap: targetProtocol === 'PDP-T' ? (PDP_T_RANGES[blockType]?.time || 240) : null,
                targetReps: targetProtocol === 'PDP-R' ? (PDP_R_THRESHOLDS[blockType]?.reps || 30) : null,
                emomMinutes: targetProtocol === 'PDP-E' ? (PDP_E_CONFIG[blockType]?.emomMin || 4) : null
            }
        };
    });

    const { id, ...cleanSessionData } = sessionData;
    return {
        ...cleanSessionData,
        type: targetProtocol,
        description: PDP_DESCRIPTIONS[targetProtocol] || sessionData.description,
        blocks: newBlocks
    };
};

const normalizeLevel = (level) => {
    const map = {
        'beginner': 'Principiante',
        'intermediate': 'Intermedio',
        'expert': 'Avanzado',
        'advanced': 'Avanzado',
        'elite': 'Elite'
    };
    return map[String(level).toLowerCase()] || level || 'Intermedio';
};

const normalizeQuality = (ex) => {
    if (ex.quality) return ex.quality;
    if (Array.isArray(ex.qualities) && ex.qualities.length > 0) {
        // Map ID to Label if needed
        const qMap = { 'F': 'Fuerza', 'E': 'Energía', 'M': 'Movilidad', 'C': 'Control' };
        const q = ex.qualities[0];
        return qMap[q] || q;
    }
    return 'Fuerza';
};

/**
 * Suggests exercise variants based on the same pattern and quality.
 * Uses a scoring system for logical progression:
 * - Pattern match: Required
 * - Level proximity: High priority
 * - Muscle/Tag overlap: Medium priority
 * - Equipment affinity: Medium priority
 */
export const getEvolutionVariants = (currentExercise, allExercises) => {
    if (!currentExercise || !allExercises) return [];

    const { pattern, id, tags: currentTags = [] } = currentExercise;
    const currentLevel = normalizeLevel(currentExercise.level);
    const quality = normalizeQuality(currentExercise);
    const normalizeEquip = (equip) => {
        if (!equip) return '';
        if (Array.isArray(equip)) return equip.join(' ').toLowerCase();
        return String(equip).toLowerCase();
    };

    const currentEquip = normalizeEquip(currentExercise.equipment);

    const levelOrder = ['Principiante', 'Intermedio', 'Avanzado', 'Elite'];
    const currentLevelIdx = levelOrder.indexOf(currentLevel) !== -1 ? levelOrder.indexOf(currentLevel) : 1;

    return allExercises
        .filter(ex => ex.id !== id && ex.pattern === pattern)
        .map(ex => {
            let score = 0;
            const exLevel = normalizeLevel(ex.level);
            const exQuality = normalizeQuality(ex);
            const exEquip = normalizeEquip(ex.equipment);

            // 1. Quality match
            if (exQuality === quality) score += 5;

            // 2. Level Progression Logic
            const exLevelIdx = levelOrder.indexOf(exLevel) !== -1 ? levelOrder.indexOf(exLevel) : 1;
            if (exLevelIdx === currentLevelIdx + 1) score += 10; // Ideal Progression
            else if (exLevelIdx === currentLevelIdx) score += 7;  // Logical Variant
            else if (exLevelIdx === currentLevelIdx - 1) score += 4; // Regression
            else score -= 5; // Too far away

            // 3. Equipment Affinity
            if (exEquip === currentEquip) score += 5;
            const isBodyweight = (e) => e.includes('body') || e.includes('corporal');
            const isFreeWeight = (e) => e.includes('mancuerna') || e.includes('barra');
            if (isBodyweight(exEquip) && isBodyweight(currentEquip)) score += 3;
            if (isFreeWeight(exEquip) && isFreeWeight(currentEquip)) score += 3;

            // 4. Tag/Muscle Overlap
            const exTags = ex.tags || [];
            const overlap = currentTags.filter(t => exTags.includes(t)).length;
            score += overlap * 2;

            // 5. "Mios" Priority (Curated Exercises)
            // If the exercise is from the coach's curated group, give it a big boost
            if (ex.group === 'Mios' || (ex.tags || []).includes('Mios')) {
                score += 15;
            }

            return { ...ex, evolutionScore: score, normalizedLevel: exLevel, normalizedQuality: exQuality };
        })
        .filter(ex => ex.evolutionScore > 5)
        .sort((a, b) => b.evolutionScore - a.evolutionScore);
};
