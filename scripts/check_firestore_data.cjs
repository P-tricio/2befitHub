const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require('../service-account.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function check() {
    console.log('Checking first 5 documents in discovery_catalog...');
    const snapshot = await db.collection('discovery_catalog').limit(5).get();

    if (snapshot.empty) {
        console.log('Collection is empty.');
        return;
    }

    snapshot.forEach(doc => {
        const data = doc.data();
        console.log('ID:', doc.id);
        console.log('Name (EN):', data.name);
        console.log('Name (ES):', data.name_es);
        console.log('Instr (ES):', (data.instructions_es || []).length);
        console.log('---');
    });
}

check();
