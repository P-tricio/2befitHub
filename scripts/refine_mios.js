import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, updateDoc, doc, addDoc, serverTimestamp } from "firebase/firestore";
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

function toSentenceCase(str) {
    if (!str) return '';
    const s = str.trim().toLowerCase();
    return s.charAt(0).toUpperCase() + s.slice(1);
}

async function refineMios() {
    console.log('--- Refining "Míos" Group and Formatting ---');

    // 1. Ensure "Míos" group exists in training_groups
    const groupsRef = collection(db, 'training_groups');
    const miosGroupQuery = query(groupsRef, where('name', '==', 'Míos'));
    const miosSnapshot = await getDocs(miosGroupQuery);

    if (miosSnapshot.empty) {
        console.log('Creating "Míos" group document...');
        await addDoc(groupsRef, {
            name: 'Míos',
            type: 'EXERCISE',
            createdAt: serverTimestamp()
        });
        console.log('Group "Míos" created successfully.');
    } else {
        const groupDoc = miosSnapshot.docs[0];
        if (groupDoc.data().type !== 'EXERCISE') {
            console.log('Updating "Míos" group type to "EXERCISE"...');
            await updateDoc(doc(db, 'training_groups', groupDoc.id), { type: 'EXERCISE' });
        } else {
            console.log('Group "Míos" already exists with correct type.');
        }
    }

    // 2. Format exercise names
    const exercisesRef = collection(db, 'exercises');
    const exerciseQuery = query(exercisesRef, where('group', '==', 'Míos'));
    const snapshot = await getDocs(exerciseQuery);

    if (snapshot.empty) {
        console.log('No exercises found in group "Míos".');
        return;
    }

    console.log(`Processing ${snapshot.size} exercises...`);

    let count = 0;
    for (const d of snapshot.docs) {
        const data = d.data();
        const newName = toSentenceCase(data.name);
        const updates = { name: newName };

        // Also fix name_es if it exists and is all-caps
        if (data.name_es && data.name_es === data.name_es.toUpperCase()) {
            updates.name_es = toSentenceCase(data.name_es);
        }

        // Only update if changes are needed
        if (data.name !== newName || (data.name_es && data.name_es !== updates.name_es)) {
            await updateDoc(doc(db, 'exercises', d.id), updates);
            console.log(`Updated: "${data.name}" -> "${newName}"`);
            count++;
        }
    }

    console.log(`--- Refinement Complete. Updated ${count} exercises. ---`);
    process.exit(0);
}

refineMios().catch(err => {
    console.error(err);
    process.exit(1);
});
