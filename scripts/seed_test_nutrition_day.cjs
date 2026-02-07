const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const SERVICE_ACCOUNT_PATH = path.join(__dirname, '../service-account.json');

async function seedTestDay() {
    if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
        console.error('❌ Service Account File missing!');
        process.exit(1);
    }

    const serviceAccount = require(SERVICE_ACCOUNT_PATH);

    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }

    const db = admin.firestore();
    const COLLECTION_NAME = 'nutrition_days';

    const testDay = {
        name: '2000kcal-HC-(151P/265C/45G)',
        meals: [
            {
                name: 'Desayuno',
                items: [
                    { type: 'recipe', refId: 'rec_porridge_avena', name: 'Gachas de Avena y Arándanos', quantity: 1, unit: 'ración' },
                    { type: 'food', refId: 'ing_egg_whites', name: 'Claras de Huevo', quantity: 150, unit: 'g' },
                    { type: 'food', refId: 'ing_banana', name: 'Plátano', quantity: 100, unit: 'g' }
                ]
            },
            {
                name: 'Almuerzo',
                items: [
                    { type: 'recipe', refId: 'rec_pasta_integral_atun', name: 'Pasta Integral con Atún y Tomate', quantity: 1, unit: 'ración' },
                    { type: 'food', refId: 'ing_chicken_breast', name: 'Pechuga de Pollo', quantity: 100, unit: 'g' }
                ]
            },
            {
                name: 'Merienda',
                items: [
                    { type: 'food', refId: 'ing_apple', name: 'Manzana', quantity: 150, unit: 'g' },
                    { type: 'food', refId: 'ing_almonds', name: 'Almendras', quantity: 20, unit: 'g' },
                    { type: 'food', refId: 'ing_turkey_breast', name: 'Pechuga de Pavo', quantity: 100, unit: 'g' }
                ]
            },
            {
                name: 'Cena',
                items: [
                    { type: 'recipe', refId: 'rec_merluza_vapor', name: 'Merluza al Vapor con Verduras', quantity: 1, unit: 'ración' },
                    { type: 'food', refId: 'ing_white_rice', name: 'Arroz Blanco (seco)', quantity: 60, unit: 'g' },
                    { type: 'food', refId: 'ing_spinach', name: 'Espinacas Frescas', quantity: 100, unit: 'g' }
                ]
            }
        ],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        type: 'test_day'
    };

    try {
        const docRef = await db.collection(COLLECTION_NAME).add(testDay);
        console.log(`✅ Test Day created with ID: ${docRef.id}`);
        console.log(`Name: ${testDay.name}`);
    } catch (error) {
        console.error('❌ Error seeding test day:', error);
    }
}

seedTestDay().catch(console.error);
