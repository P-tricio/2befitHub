/**
 * Session Parser Utility
 * Handles parsing of both legacy and new session data structures
 */

import { normalizeExercises, getExerciseNames } from './exerciseMapper.js';
import { TrainingDB } from '../../services/db.js';

const BLOCK_ORDER = ['WARMUP', 'BASE', 'BUILD', 'BOOST', 'BURN'];

/**
 * Determines session protocol based on session type
 * @param {string} sessionType - Session type (PDP-T, PDP-R, PDP-E, MIX)
 * @returns {string} Protocol identifier
 */
export const getGlobalProtocol = (sessionType) => {
    if (sessionType === 'PDP-T') return 'T';
    if (sessionType === 'PDP-R') return 'R';
    if (sessionType === 'PDP-E') return 'E';
    return 'mix';
};

/**
 * Parses new array-based session structure
 * @param {Object} sessionData - Session with blocks array
 * @param {string} globalProtocol - Global session protocol
 * @returns {Object} { modules, timeline }
 */
export const parseNewStructure = async (sessionData, globalProtocol) => {
    // Safety check for malformed session data
    if (!sessionData || !Array.isArray(sessionData.blocks)) {
        console.warn('parseNewStructure: Invalid session data - missing blocks array', sessionData);
        return { modules: [], timeline: [] };
    }

    // Fetch latest exercise library to enrich session data (ensure Spanish names/gifs)
    const libraryExercises = await TrainingDB.exercises.getAll();
    const libraryMap = new Map(libraryExercises.map(e => [e.id, e]));

    // Generic robust normalization for name matching
    const normalizeName = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '').replace(/s$/, '');

    // Create Name Map for fallback lookup (ID is often randomized in sessions)
    const libraryNameMap = new Map();
    libraryExercises.forEach(e => {
        if (e.name) libraryNameMap.set(normalizeName(e.name), e);
        if (e.nameEs) libraryNameMap.set(normalizeName(e.nameEs), e);
        if (e.name_es) libraryNameMap.set(normalizeName(e.name_es), e);
    });

    const allModules = [];
    const timeline = [];

    sessionData.blocks.forEach(block => {
        const blockName = block.name || '';
        const isBurn = blockName.toUpperCase().includes('BURN');

        // Normalize and ENRICH exercises
        const enrichedExercises = block.exercises.map(ex => {
            // 1. Try ID match (rarely works for session items)
            let libEx = libraryMap.get(ex.id);

            // 2. Try Name match (fallback)
            if (!libEx && ex.name) {
                libEx = libraryNameMap.get(normalizeName(ex.name));
            }

            if (libEx) {
                return {
                    ...ex,
                    // Prioritize Library Data for display fields
                    nameEs: libEx.nameEs || libEx.name_es || libEx.name, // Force fresh name with snake_case support
                    descriptionEs: libEx.descriptionEs || libEx.description_es || libEx.description || libEx.instructions_es?.join('\n') || '', // Fresh description

                    // Robust Media Lookup - Try ALL likely fields
                    gifUrl: libEx.gifUrl || libEx.gif_url || libEx.mediaUrl || libEx.videoUrl,
                    mediaUrl: libEx.gifUrl || libEx.gif_url || libEx.mediaUrl || libEx.videoUrl || libEx.image || libEx.imageStart,
                    imageStart: libEx.imageStart,
                    imageEnd: libEx.imageEnd,

                    // Exercise properties for functionality
                    loadable: libEx.loadable, // Required for weight input visibility
                    quality: libEx.quality,
                    pattern: libEx.pattern,

                    // Keep session-specific config
                    config: ex.config,
                    notes: ex.notes || ex.config?.notes || libEx.notes || libEx.notes_es || libEx.notesEs,
                    targetReps: ex.targetReps,
                    manifestation: ex.manifestation
                };
            }
            return ex;
        });

        // Normalize all exercises in block
        const normalizedExercises = normalizeExercises(enrichedExercises);

        // Logic to derive EMOM params if missing (fallback for sessions created in UI)
        let finalEmomParams = block.emomParams;
        if (!finalEmomParams && block.params?.emomMinutes) {
            finalEmomParams = {
                durationMinutes: block.params.emomMinutes,
                density: 'normal'
            };
        } else if (!finalEmomParams && normalizedExercises.length > 0) {
            const firstExConfig = normalizedExercises[0].config;
            if (firstExConfig?.isEMOM) {
                finalEmomParams = {
                    durationMinutes: firstExConfig.sets?.length || 4,
                    density: 'normal'
                };
            }
        }

        // Assign protocol based on global type or block override
        const protocol = globalProtocol === 'mix'
            ? (block.protocol || 'LIBRE')
            : globalProtocol;

        // Enhanced Targeting Extraction
        let primaryTargeting = {
            timeCap: block.params?.timeCap || 0,
            volume: block.params?.rounds || 0,
            instruction: block.description || ''
        };

        // If no explicit block params, try to infer from first exercise config (common for single-exercise cardio blocks)
        if (normalizedExercises.length > 0) {
            const ex0 = normalizedExercises[0];
            const cfg = ex0.config;

            // If it has sets, use the first set as primary target reference
            if (cfg?.sets?.[0]) {
                const s0 = cfg.sets[0];

                // If targeting is empty, fill it
                if (!primaryTargeting.timeCap && !primaryTargeting.volume) {
                    if (s0.volType === 'TIME') {
                        primaryTargeting.timeCap = s0.volume;
                        primaryTargeting.type = 'time';
                        primaryTargeting.metric = 'time'; // Explicit metric
                    } else if (['KM', 'METROS', 'KCAL', 'REPS'].includes(s0.volType)) {
                        primaryTargeting.volume = s0.volume;
                        primaryTargeting.metric = s0.volType.toLowerCase();
                    }
                }

                // Map Intensity if present
                if (s0.intensity) {
                    primaryTargeting.intensity = s0.intensity;
                    primaryTargeting.intensity_type = s0.intType || 'RPE';
                }
            }
            // Fallback for flat instructions
            if (!primaryTargeting.instruction && ex0.notes) {
                primaryTargeting.instruction = ex0.notes;
            }
        }

        const builtModule = {
            id: block.id,
            name: blockName,
            protocol: protocol,
            targeting: [primaryTargeting],
            exercises: normalizedExercises,
            exerciseNames: getExerciseNames(normalizedExercises),
            blockType: blockName,
            emomParams: finalEmomParams
        };

        allModules.push(builtModule);

        // BURN splitting logic
        let parts = [];
        if (isBurn && normalizedExercises.length > 2) {
            const chunkSize = 2;
            for (let i = 0; i < normalizedExercises.length; i += chunkSize) {
                const chunkEx = normalizedExercises.slice(i, i + chunkSize);
                parts.push({
                    ...builtModule,
                    exercises: chunkEx,
                    exerciseNames: getExerciseNames(chunkEx),
                    partLabel: `Parte ${Math.floor(i / chunkSize) + 1}`,
                    offset: i
                });
            }
        } else {
            parts = [{ ...builtModule, offset: 0 }];
        }

        // Add to timeline
        parts.forEach(partModule => {
            timeline.push({
                type: 'WORK',
                blockType: blockName,
                module: partModule
            });
        });
    });

    return { modules: allModules, timeline };
};

/**
 * Parses legacy object-based session structure
 * @param {Object} sessionData - Session with blocks object
 * @returns {Promise<Object>} { modules, timeline }
 */
export const parseLegacyStructure = async (sessionData) => {
    const [modulesData, exercisesData] = await Promise.all([
        TrainingDB.modules.getAll(),
        TrainingDB.exercises.getAll()
    ]);

    const findModule = (id) => modulesData.find(m => m.id === id);
    const findExercise = (id) => exercisesData.find(e => e.id === id);

    const allModules = [];
    const timeline = [];

    BLOCK_ORDER.forEach(blockType => {
        const blockItems = sessionData.blocks?.[blockType] || [];

        blockItems.forEach(item => {
            const isLegacy = typeof item === 'string';
            const id = isLegacy ? item : item.moduleId;
            const overrides = isLegacy ? {} : item.overrides;
            const originalModule = findModule(id);

            if (originalModule) {
                // Resolve and normalize exercises
                const rawExercises = (originalModule.exerciseIds || [])
                    .map(eid => findExercise(eid))
                    .filter(Boolean);

                const normalizedExercises = normalizeExercises(rawExercises);

                const hydratedModule = {
                    ...originalModule,
                    ...overrides,
                    exerciseNames: getExerciseNames(normalizedExercises),
                    exercises: normalizedExercises,
                    blockType
                };

                allModules.push(hydratedModule);

                timeline.push({
                    type: 'WORK',
                    blockType: blockType,
                    module: hydratedModule
                });
            }
        });
    });

    return { modules: allModules, timeline };
};

/**
 * Main session parsing function
 * @param {Object} sessionData - Raw session data
 * @returns {Promise<Object>} { modules, timeline, protocol }
 */
export const parseSession = async (sessionData) => {
    // Safety check for undefined session data
    if (!sessionData) {
        console.warn('parseSession: Received undefined sessionData');
        return { modules: [], timeline: [{ type: 'SUMMARY', data: {} }], protocol: 'mix' };
    }

    const globalProtocol = getGlobalProtocol(sessionData.type || 'MIX');

    let result;
    if (Array.isArray(sessionData.blocks)) {
        result = await parseNewStructure(sessionData, globalProtocol);
    } else {
        result = await parseLegacyStructure(sessionData);
    }

    // Add PLANNING and SUMMARY steps
    const { modules, timeline } = result;

    if (timeline.length === 0) {
        timeline.push({ type: 'SUMMARY', data: sessionData });
    } else {
        timeline.unshift({ type: 'PLANNING', data: sessionData, modules });
        timeline.push({ type: 'SUMMARY', data: sessionData });
    }

    return {
        modules,
        timeline,
        protocol: globalProtocol
    };
};
