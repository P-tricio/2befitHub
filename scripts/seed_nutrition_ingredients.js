import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { curateIngredients } from '../src/data/nutritionData.js';

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
const COLLECTION = 'nutri_ingredients';

async function seedIngredients() {
    console.log(`🚀 Starting seeding of ${curateIngredients.length} ingredients...`);

    const batch = db.batch();
    let count = 0;

    for (const ing of curateIngredients) {
        // Map macros to the flat structure if needed, or keep it as is
        // The current DB seems to expect { protein, carbs, fats, calories, unit, category }
        // Let's normalize it to match what NutritionDB.js expects.

        const data = {
            name: ing.name,
            category: ing.category,
            unit: ing.unit,
            protein: ing.macros.protein,
            carbs: ing.macros.carbs,
            fats: ing.macros.fat,
            calories: ing.macros.kcal,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        if (ing.portionWeight) {
            data.portionWeight = ing.portionWeight;
        }

        const ref = db.collection(COLLECTION).doc(ing.id);
        batch.set(ref, data, { merge: true });
        count++;
    }

    await batch.commit();
    console.log(`✅ Successfully seeded ${count} ingredients!`);
}

seedIngredients()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('❌ Error seeding ingredients:', err);
        process.exit(1);
    });
