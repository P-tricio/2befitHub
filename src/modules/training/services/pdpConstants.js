/**
 * Centralized constants and logic for PDP (Progressive Density Program) Protocols
 * Used by GlobalCreator for templates and by analysisUtils for session insights.
 */

export const PDP_PROTOCOLS = {
    T: 'PDP-T',
    R: 'PDP-R',
    E: 'PDP-E'
};

export const PDP_T_RANGES = {
    BOOST: { floor: 20, ceiling: 40, time: 240 },
    BASE: { floor: 20, ceiling: 40, time: 240 },
    BUILD: { floor: 30, ceiling: 50, time: 300 },
    BURN: { floor: 50, ceiling: 70, time: 360 }
};

export const PDP_R_THRESHOLDS = {
    BOOST: { cap: 300, efficiency: 180, reps: 30 }, // Fallback to BASE
    BASE: { cap: 300, efficiency: 180, reps: 30 },
    BUILD: { cap: 360, efficiency: 216, reps: 40 },
    BURN: { cap: 420, efficiency: 252, reps: 60 }
};

export const PDP_E_CONFIG = {
    BOOST: { emomMin: 4, reps: 6 },
    BASE: { emomMin: 4, reps: 6 },
    BUILD: { emomMin: 5, reps: 8 },
    BURN: { emomMin: 6, reps: 10 }
};

export const PDP_DESCRIPTIONS = {
    'PDP-T': 'Progressive Density Program bajo Time Cap. Formato: máxima densidad en tiempo fijo.\n\n• BOOST (4min): Superserie activación.\n• BASE (4min): Fuerza ejercicio solo.\n• BUILD A/B (5min): Capacidad solo.\n• BURN A/B (6min): Acondicionamiento superseries.',
    'PDP-R': 'Progressive Density Program basado en Reps. Formato: completar reps target en menor tiempo.\n\n• BOOST (30 reps): Superserie activación (15+15).\n• BASE (30 reps): Fuerza ejercicio solo.\n• BUILD A/B (40 reps): Capacidad solo.\n• BURN A/B (60 reps): Acondicionamiento superseries.',
    'PDP-E': 'Progressive Density Program en formato EMOM (Every Minute On the Minute).\n\n• BOOST (4min): Superserie (6 reps/min).\n• BASE (4min): Fuerza (6 reps/min).\n• BUILD A/B (5min): Capacidad (8 reps/min).\n• BURN A/B (6min): Acondicionamiento (10+10 reps/min).'
};
