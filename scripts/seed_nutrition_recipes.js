import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { curatedRecipes } from '../src/data/nutritionData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccount = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../service-account.json'), 'utf8')
);

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();
const COLLECTION = 'nutri_recipes';

async function seedRecipes() {
    console.log(`🚀 Starting seeding of ${curatedRecipes.length} recipes...`);

    const batch = db.batch();
    let count = 0;

    for (const recipe of curatedRecipes) {
        const data = {
            ...recipe,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        const ref = db.collection(COLLECTION).doc(recipe.id);
        batch.set(ref, data, { merge: true });
        count++;
    }

    await batch.commit();
    console.log(`✅ Successfully seeded ${count} recipes!`);
}

seedRecipes()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('❌ Error seeding recipes:', err);
        process.exit(1);
    });
