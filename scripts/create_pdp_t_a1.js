import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
    measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const SESSIONS_COLLECTION = 'training_sessions';

const sessionData = {
    title: "PDP-T - H (A1)",
    description: "Plan de Desarrollo Personalizado - Tiempo. Enfoque hipertrofia A1. Incluye Boost block inicial.",
    type: "PDP-T",
    blocks: [
        {
            id: crypto.randomUUID(),
            name: "BOOST ACTIVACIÓN",
            description: "Preparación específica y movilidad activa",
            protocol: "PDP-T",
            params: { timeCap: 300 },
            exercises: [
                {
                    id: "One-Arm_Kettlebell_Swings",
                    name: "Kettlebell Swings",
                    type: "EXERCISE",
                    pattern: "Hinge",
                    config: {
                        volType: "TIME",
                        intType: "RIR",
                        sets: [{ reps: "150", rir: "2-3", rest: "0" }]
                    },
                    isGrouped: false,
                    mediaUrl: "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/One-Arm_Kettlebell_Swings/0.jpg"
                },
                {
                    id: "Kettlebell_Windmill",
                    name: "Kettlebell Windmills",
                    type: "EXERCISE",
                    pattern: "Global",
                    config: {
                        volType: "TIME",
                        intType: "RIR",
                        sets: [{ reps: "150", rir: "2-3", rest: "0" }]
                    },
                    isGrouped: true,
                    mediaUrl: "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Kettlebell_Windmill/0.jpg"
                }
            ]
        },
        {
            id: crypto.randomUUID(),
            name: "BASE FUERZA",
            description: "Bloque principal de fuerza",
            protocol: "PDP-T",
            params: { timeCap: 420 },
            exercises: [
                {
                    id: "Decline_Dumbbell_Bench_Press",
                    name: "Dumbbell Bench Press",
                    type: "EXERCISE",
                    pattern: "Push",
                    config: {
                        volType: "TIME",
                        intType: "RIR",
                        sets: [{ reps: "420", rir: "1-2", rest: "0" }]
                    },
                    isGrouped: false,
                    mediaUrl: "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Decline_Dumbbell_Bench_Press/0.jpg"
                }
            ]
        },
        {
            id: crypto.randomUUID(),
            name: "BUILD A CAPACIDAD",
            description: "Desarrollo de capacidad y volumen",
            protocol: "PDP-T",
            params: { timeCap: 480 },
            exercises: [
                {
                    id: "Goblet_Squat",
                    name: "Goblet Squat",
                    type: "EXERCISE",
                    pattern: "Squat",
                    config: {
                        volType: "TIME",
                        intType: "RIR",
                        sets: [{ reps: "480", rir: "2-3", rest: "0" }]
                    },
                    isGrouped: false,
                    mediaUrl: "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Goblet_Squat/0.jpg"
                }
            ]
        },
        {
            id: crypto.randomUUID(),
            name: "BUILD B CAPACIDAD",
            description: "Desarrollo de capacidad y volumen",
            protocol: "PDP-T",
            params: { timeCap: 480 },
            exercises: [
                {
                    id: "Wide-Grip_Lat_Pulldown",
                    name: "Lat Pulldown (Underhand)",
                    type: "EXERCISE",
                    pattern: "Pull",
                    config: {
                        volType: "TIME",
                        intType: "RIR",
                        sets: [{ reps: "480", rir: "2-3", rest: "0" }]
                    },
                    isGrouped: false,
                    mediaUrl: "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Wide-Grip_Lat_Pulldown/0.jpg"
                }
            ]
        },
        {
            id: crypto.randomUUID(),
            name: "BURN A ACONDICIONAMIENTO",
            description: "Bloque de alta densidad",
            protocol: "PDP-T",
            params: { timeCap: 360 },
            exercises: [
                {
                    id: "Seated_Dumbbell_Inner_Biceps_Curl",
                    name: "Dumbbell Bicep Curl",
                    type: "EXERCISE",
                    pattern: "Pull",
                    config: {
                        volType: "TIME",
                        intType: "RIR",
                        sets: [{ reps: "180", rir: "1-2", rest: "0" }],
                        sharedTime: true
                    },
                    isGrouped: false,
                    mediaUrl: "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Dumbbell_Inner_Biceps_Curl/0.jpg"
                },
                {
                    id: "Cable_Lying_Triceps_Extension",
                    name: "Triceps Extension",
                    type: "EXERCISE",
                    pattern: "Push",
                    config: {
                        volType: "TIME",
                        intType: "RIR",
                        sets: [{ reps: "180", rir: "1-2", rest: "0" }],
                        sharedTime: true
                    },
                    isGrouped: true,
                    mediaUrl: "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Lying_Triceps_Extension/0.jpg"
                }
            ]
        },
        {
            id: crypto.randomUUID(),
            name: "BURN B ACONDICIONAMIENTO",
            description: "Bloque de alta densidad",
            protocol: "PDP-T",
            params: { timeCap: 360 },
            exercises: [
                {
                    id: "Side_Lateral_Raise",
                    name: "Lateral Raise",
                    type: "EXERCISE",
                    pattern: "Push",
                    config: {
                        volType: "TIME",
                        intType: "RIR",
                        sets: [{ reps: "180", rir: "1-2", rest: "0" }],
                        sharedTime: true
                    },
                    isGrouped: false,
                    mediaUrl: "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Side_Lateral_Raise/0.jpg"
                },
                {
                    id: "Hanging_Leg_Raise",
                    name: "Hanging Leg Raise",
                    type: "EXERCISE",
                    pattern: "Core",
                    config: {
                        volType: "TIME",
                        intType: "RIR",
                        sets: [{ reps: "180", rir: "1-2", rest: "0" }],
                        sharedTime: true
                    },
                    isGrouped: true,
                    mediaUrl: "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Hanging_Leg_Raise/0.jpg"
                }
            ]
        }
    ],
    createdAt: serverTimestamp()
};

async function createSession() {
    console.log('Creating PDP-T - H (A1) session...');
    try {
        const docRef = await addDoc(collection(db, SESSIONS_COLLECTION), sessionData);
        console.log(`Session created with ID: ${docRef.id}`);
        process.exit(0);
    } catch (e) {
        console.error('Error creating session:', e);
        process.exit(1);
    }
}

createSession();
