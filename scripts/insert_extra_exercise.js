import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

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

const exercise = {
    name: "PLATE GROUND TO OVERHEAD (DISCO DEL SUELO A LA CABEZA)",
    group: "Míos",
    bodyPart: "upper legs",
    target: "glutes",
    pattern: "Global",
    quality: "F",
    level: "Principiante",
    equipment: "Otros",
    description: "Coloca el disco en el suelo entre tus pies. Realiza un tirón explosivo extendiendo cadera y rodillas para subir el disco directamente sobre la cabeza en un movimiento fluido.",
    instructions_es: [
        "Coloca el disco en el suelo entre tus pies (anchura de hombros o algo mayor).",
        "Baja haciendo una sentadilla/bisagra con la espalda recta y agarra el disco por los lados.",
        "Realiza un tirón explosivo extendiendo cadera y rodillas para subir el disco pegado al cuerpo.",
        "Aprovecha esa inercia para llevarlo directamente hasta bloquear los brazos sobre la cabeza en un solo movimiento fluido.",
        "Toca el suelo con el canto del disco en cada repetición."
    ],
    loadable: true,
    createdAt: serverTimestamp(),
    source: "user_list",
    usageCount: 0,
    isFavorite: false,
    tags: ["Explosivo", "Full Body"],
    mediaUrl: "",
    imageStart: "",
    imageEnd: "",
    youtubeUrl: ""
};

async function insertExercise() {
    try {
        const docRef = await addDoc(collection(db, 'exercises'), exercise);
        console.log(`✅ Ejercicio insertado con ID: ${docRef.id}`);
    } catch (e) {
        console.error("❌ Error insertando:", e);
    }
    process.exit(0);
}

insertExercise();
