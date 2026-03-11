import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serviceAccount = JSON.parse(readFileSync(path.resolve(__dirname, '../service-account.json'), 'utf8'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const SESSIONS_COLLECTION = 'training_sessions';

// ─────────────────────────────────────────────
// Helper: Create an empty exercise slot
// ─────────────────────────────────────────────
const emptySlot = (pattern, quality = 'Fuerza') => ({
    id: crypto.randomUUID(),
    name: `⬚ ${pattern}`,
    type: 'EXERCISE',
    pattern,
    quality,
    config: { volType: 'REPS', intType: 'RIR', sets: [] },
    isGrouped: false,
    mediaUrl: '', imageStart: '', imageEnd: ''
});

// ─────────────────────────────────────────────
// Helper: Pre-fill sets config
// ─────────────────────────────────────────────
const setsConfig = (numSets, reps, rir, rest) => ({
    volType: 'REPS',
    intType: 'RIR',
    sets: Array(numSets).fill(null).map(() => ({
        reps: String(reps),
        rir: String(rir),
        rest: String(rest)
    }))
});

const setsConfigTime = (numSets, seconds, rir, rest) => ({
    volType: 'TIME',
    intType: 'RIR',
    sets: Array(numSets).fill(null).map(() => ({
        reps: String(seconds),
        rir: String(rir),
        rest: String(rest)
    }))
});

// ─────────────────────────────────────────────
// SESSION TEMPLATES
// ─────────────────────────────────────────────

const fullbodyDayA = {
    name: "FB-A · Prioridad Squat",
    description: "Fullbody Day A — Prioridad Squat. Sesión plantilla sin ejercicios definidos. Rellenar con ejercicios que encajen en cada patrón.",
    type: "LIBRE",
    group: "Fullbody Templates",
    blocks: [
        {
            id: crypto.randomUUID(),
            name: "🔥 WARM-UP — Movilidad Tren Inferior",
            description: "Calentamiento: movilidad cadera/tobillo + activación glúteo. 2 ejercicios en superserie.",
            exercises: [
                {
                    ...emptySlot('Global', 'Movilidad'),
                    name: "⬚ Movilidad Cadera / Tobillo",
                    config: setsConfig(2, 10, '—', 0),
                    isGrouped: false
                },
                {
                    ...emptySlot('Global', 'Control'),
                    name: "⬚ Activación Glúteo",
                    config: setsConfig(2, 12, '—', 30),
                    isGrouped: true
                }
            ]
        },
        {
            id: crypto.randomUUID(),
            name: "A1 · SQUAT — Fuerza Principal",
            description: "Ejercicio compuesto de Squat bilateral. Prioridad del día.",
            exercises: [{
                ...emptySlot('Squat', 'Fuerza'),
                name: "⬚ Squat Bilateral",
                config: setsConfig(4, 8, '2', 120)
            }]
        },
        {
            id: crypto.randomUUID(),
            name: "A2 · PUSH HORIZONTAL — Fuerza",
            description: "Press horizontal: press banca, floor press, push-ups lastre...",
            exercises: [{
                ...emptySlot('Push', 'Fuerza'),
                name: "⬚ Push Horizontal",
                config: setsConfig(3, 10, '2', 90)
            }]
        },
        {
            id: crypto.randomUUID(),
            name: "A3 · PULL VERTICAL — Fuerza",
            description: "Tracción vertical: dominadas, pulldown, pull-up asistida...",
            exercises: [{
                ...emptySlot('Pull', 'Fuerza'),
                name: "⬚ Pull Vertical",
                config: setsConfig(3, 10, '2', 90)
            }]
        },
        {
            id: crypto.randomUUID(),
            name: "A4 · HINGE — Capacidad Accesoria",
            description: "Bisagra de cadera accesoria: RDL, hip thrust, good morning...",
            exercises: [{
                ...emptySlot('Hinge', 'Fuerza'),
                name: "⬚ Hinge Accesorio",
                config: setsConfig(3, 12, '2-3', 60)
            }]
        },
        {
            id: crypto.randomUUID(),
            name: "A5 · CORE — Estabilidad / Anti-extensión",
            description: "Core anti-extensión: plank, ab rollout, dead bug, pallof press...",
            exercises: [{
                ...emptySlot('Global', 'Control'),
                name: "⬚ Core Anti-Extensión",
                config: setsConfig(3, 12, '2', 45)
            }]
        }
    ],
    createdAt: admin.firestore.FieldValue.serverTimestamp()
};

const fullbodyDayB = {
    name: "FB-B · Prioridad Push/Pull",
    description: "Fullbody Day B — Prioridad Push/Pull. Sesión plantilla sin ejercicios definidos. Rellenar con ejercicios que encajen en cada patrón.",
    type: "LIBRE",
    group: "Fullbody Templates",
    blocks: [
        {
            id: crypto.randomUUID(),
            name: "🔥 WARM-UP — Movilidad Tren Superior",
            description: "Calentamiento: movilidad torácica/hombro + activación escapular. 2 ejercicios en superserie.",
            exercises: [
                {
                    ...emptySlot('Global', 'Movilidad'),
                    name: "⬚ Movilidad Torácica / Hombro",
                    config: setsConfig(2, 10, '—', 0),
                    isGrouped: false
                },
                {
                    ...emptySlot('Global', 'Control'),
                    name: "⬚ Activación Escapular",
                    config: setsConfig(2, 12, '—', 30),
                    isGrouped: true
                }
            ]
        },
        {
            id: crypto.randomUUID(),
            name: "B1 · PUSH VERTICAL — Fuerza Principal",
            description: "Press vertical: press militar, dumbbell press, landmine press...",
            exercises: [{
                ...emptySlot('Push', 'Fuerza'),
                name: "⬚ Push Vertical",
                config: setsConfig(4, 8, '2', 120)
            }]
        },
        {
            id: crypto.randomUUID(),
            name: "B2 · PULL HORIZONTAL — Fuerza Principal",
            description: "Tracción horizontal: remo con barra, remo mancuerna, remo invertido...",
            exercises: [{
                ...emptySlot('Pull', 'Fuerza'),
                name: "⬚ Pull Horizontal",
                config: setsConfig(4, 8, '2', 120)
            }]
        },
        {
            id: crypto.randomUUID(),
            name: "B3 · SQUAT UNILATERAL — Capacidad",
            description: "Squat unilateral: búlgara, step-up, pistol squat, zancada...",
            exercises: [{
                ...emptySlot('Lunge', 'Fuerza'),
                name: "⬚ Squat Unilateral",
                config: setsConfig(3, '10/lado', '2', 60)
            }]
        },
        {
            id: crypto.randomUUID(),
            name: "B4 · HINGE — Fuerza",
            description: "Bisagra de cadera principal: peso muerto, trap bar deadlift, sumo DL...",
            exercises: [{
                ...emptySlot('Hinge', 'Fuerza'),
                name: "⬚ Hinge Fuerza",
                config: setsConfig(3, 10, '2', 90)
            }]
        },
        {
            id: crypto.randomUUID(),
            name: "B5 · CORE — Anti-rotación",
            description: "Core anti-rotación: pallof press, cable chop, landmine rotation...",
            exercises: [{
                ...emptySlot('Global', 'Control'),
                name: "⬚ Core Anti-Rotación",
                config: setsConfig(3, '10/lado', '2', 45)
            }]
        }
    ],
    createdAt: admin.firestore.FieldValue.serverTimestamp()
};

const fullbodyDayC = {
    name: "FB-C · Prioridad Hinge",
    description: "Fullbody Day C — Prioridad Hinge. Sesión plantilla sin ejercicios definidos. Rellenar con ejercicios que encajen en cada patrón.",
    type: "LIBRE",
    group: "Fullbody Templates",
    blocks: [
        {
            id: crypto.randomUUID(),
            name: "🔥 WARM-UP — Movilidad Global + Activación",
            description: "Calentamiento: flujo de movilidad global + activación posterior. 2 ejercicios en superserie.",
            exercises: [
                {
                    ...emptySlot('Global', 'Movilidad'),
                    name: "⬚ Flujo Movilidad Global",
                    config: setsConfigTime(2, 60, '—', 0),
                    isGrouped: false
                },
                {
                    ...emptySlot('Global', 'Control'),
                    name: "⬚ Activación Cadena Posterior",
                    config: setsConfig(2, 12, '—', 30),
                    isGrouped: true
                }
            ]
        },
        {
            id: crypto.randomUUID(),
            name: "C1 · HINGE — Fuerza Principal",
            description: "Bisagra de cadera prioritaria: peso muerto convencional, RDL pesado, hip thrust...",
            exercises: [{
                ...emptySlot('Hinge', 'Fuerza'),
                name: "⬚ Hinge Bilateral",
                config: setsConfig(4, 8, '2', 120)
            }]
        },
        {
            id: crypto.randomUUID(),
            name: "C2 · PUSH HORIZONTAL — Capacidad",
            description: "Push accesorio con más volumen: dumbbell press, dips, flyes...",
            exercises: [{
                ...emptySlot('Push', 'Fuerza'),
                name: "⬚ Push Capacidad",
                config: setsConfig(3, 12, '2-3', 60)
            }]
        },
        {
            id: crypto.randomUUID(),
            name: "C3 · PULL VERTICAL — Capacidad",
            description: "Pull accesorio con más volumen: pulldown variante, face pull, pull-up asistida...",
            exercises: [{
                ...emptySlot('Pull', 'Fuerza'),
                name: "⬚ Pull Capacidad",
                config: setsConfig(3, 12, '2-3', 60)
            }]
        },
        {
            id: crypto.randomUUID(),
            name: "C4 · SQUAT — Capacidad",
            description: "Squat accesorio: goblet squat, leg press, hack squat...",
            exercises: [{
                ...emptySlot('Squat', 'Fuerza'),
                name: "⬚ Squat Capacidad",
                config: setsConfig(3, 12, '2-3', 60)
            }]
        },
        {
            id: crypto.randomUUID(),
            name: "C5 · CORE / CARRY — Funcional",
            description: "Core funcional o carry: farmer walk, suitcase carry, loaded carry, planks con movimiento...",
            exercises: [{
                ...emptySlot('Carry', 'Control'),
                name: "⬚ Core / Carry Funcional",
                config: setsConfigTime(3, 30, '2', 45)
            }]
        }
    ],
    createdAt: admin.firestore.FieldValue.serverTimestamp()
};

// ─────────────────────────────────────────────
// EXECUTE
// ─────────────────────────────────────────────

async function createTemplates() {
    console.log('🏋️ Creating Fullbody Template Sessions...\n');

    const templates = [
        { data: fullbodyDayA, label: 'FB-A · Prioridad Squat' },
        { data: fullbodyDayB, label: 'FB-B · Prioridad Push/Pull' },
        { data: fullbodyDayC, label: 'FB-C · Prioridad Hinge' }
    ];

    for (const { data, label } of templates) {
        try {
            const docRef = await db.collection(SESSIONS_COLLECTION).add(data);
            console.log(`  ✅ ${label} → ID: ${docRef.id}`);
        } catch (e) {
            console.error(`  ❌ Error creating ${label}:`, e.message);
        }
    }

    console.log('\n✨ Done! Las 3 sesiones template aparecerán en tu librería bajo el grupo "Fullbody Templates".');
    process.exit(0);
}

createTemplates();
