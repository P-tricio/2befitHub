const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require('../service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function findGenericIngredients() {
    console.log('Searching for generic ingredients...');
    const snapshot = await db.collection('nutri_ingredients').get();

    snapshot.forEach(doc => {
        const data = doc.data();
        if (data.name.toLowerCase().includes('proteína') ||
            data.name.toLowerCase().includes('carbohidrato') ||
            data.name.toLowerCase().includes('grasa')) {
            console.log(`FOUND: ${doc.id} - ${data.name}`);
        }
    });
}

findGenericIngredients().catch(console.error);
