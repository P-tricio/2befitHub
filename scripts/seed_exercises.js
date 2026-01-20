import { initializeApp } from "firebase/app";
import { getFirestore, collection, writeBatch, doc, getDoc } from "firebase/firestore";
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load environment variables
const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env');
console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Environment loaded:', {
    apiKey: process.env.VITE_FIREBASE_API_KEY ? 'Present' : 'Missing',
    projectId: process.env.VITE_FIREBASE_PROJECT_ID ? 'Present' : 'Missing'
});

// Firebase configuration
const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
    measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
let db;
try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log('Firebase initialized successfully.');
} catch (e) {
    console.error('Firebase initialization failed:', e);
    process.exit(1);
}

const CATALOG_PATH = path.join(__dirname, '../exercisedb_catalog_2026-01-17.json');

async function seedExercises() {
    console.log('Starting database seeding...');

    try {
        console.log('Reading content from:', CATALOG_PATH);
        if (!fs.existsSync(CATALOG_PATH)) {
            throw new Error(`File not found: ${CATALOG_PATH}`);
        }

        const rawData = fs.readFileSync(CATALOG_PATH, 'utf8');
        console.log('Catalog file read. Parsing JSON...');
        const catalog = JSON.parse(rawData);

        let exercises = [];
        if (Array.isArray(catalog)) {
            exercises = catalog;
        } else if (Array.isArray(catalog.exercises)) {
            exercises = catalog.exercises;
        } else if (Array.isArray(catalog.data)) {
            exercises = catalog.data;
        } else {
            throw new Error('Could not find exercises array in catalog file.');
        }

        console.log(`Loaded ${exercises.length} exercises from catalog.`);

        // Batch processing
        const BATCH_SIZE = 100; // Lower batch size for safety/debugging
        let batchCount = 0;
        let totalProcessed = 0;

        for (let i = 0; i < exercises.length; i += BATCH_SIZE) {
            const chunk = exercises.slice(i, i + BATCH_SIZE);
            console.log(`Preparing batch ${batchCount + 1} (${chunk.length} items)...`);
            const batch = writeBatch(db);

            chunk.forEach(exercise => {
                if (!exercise.id) {
                    console.warn('Skipping exercise with no ID:', exercise.name);
                    return;
                }
                const ref = doc(db, "exercises", exercise.id);
                // Sanitize undefined values (Firestore doesn't like undefined)
                const sanitized = JSON.parse(JSON.stringify(exercise));
                batch.set(ref, sanitized, { merge: true });
            });

            console.log(`Committing batch ${batchCount + 1}...`);
            await batch.commit();

            totalProcessed += chunk.length;
            batchCount++;
            console.log(`Batch ${batchCount} committed. Total processed: ${totalProcessed}`);
        }

        console.log('Seeding complete! All exercises have been uploaded to Firestore.');
        process.exit(0);

    } catch (error) {
        console.error('Error seeding database:', error);
        if (error.code) console.error('Error code:', error.code);
        process.exit(1);
    }
}

seedExercises();
