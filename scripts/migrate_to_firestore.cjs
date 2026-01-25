const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// --- CONFIGURATION ---
// You must provide the path to your Service Account Key JSON
// Download it from: Firebase Console -> Project Settings -> Service Accounts -> Generate New Private Key
const SERVICE_ACCOUNT_PATH = path.join(__dirname, '../service-account.json');

// This file contains the ENRICHED (translated) data for 873 items
const ENRICHED_FILE = path.join(__dirname, '../src/data/exercisedb_catalog.json');

const COLLECTION_NAME = 'discovery_catalog';

// --- MAIN ---
async function migrate() {
    // 1. Initialize Firebase Admin
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
    const batchSize = 400; // Safe batch size
    let totalUpdated = 0;

    console.log('🚀 Starting Translation Patch...');

    // 2. Load Enriched Data
    if (!fs.existsSync(ENRICHED_FILE)) {
        console.error('❌ Enriched file missing:', ENRICHED_FILE);
        process.exit(1);
    }

    console.log('📦 Loading Enriched Catalog...');
    const rawData = fs.readFileSync(ENRICHED_FILE, 'utf8');
    const enrichedData = JSON.parse(rawData);
    const exercises = enrichedData.exercises || [];
    console.log(`   Found ${exercises.length} items to update.`);

    // 3. Prepare Updates
    const updates = [];

    for (const ex of exercises) {
        // Construct the Firestore ID used in previous migration
        // Logic was: id: `yuh_${ex.id.replace(/\s+/g, '_')}`
        const sanitizedId = ex.id.replace(/\s+/g, '_');
        const docId = `yuh_${sanitizedId}`;

        updates.push({
            id: docId,
            data: {
                name_es: ex.name_es,
                instructions_es: ex.instructions_es,
                description: ex.description || '', // If file has it
                // Also update metadata if enriched file has better tags
                level: ex.level || 'Intermedio',
                qualities: ex.qualities || [],
                subQualities: ex.subQualities || [],
                equipment_es: ex.equipment_es || '',
                // Ensure mediaUrl is set correctly (map backup types if needed)
                mediaUrl: ex.mediaUrl || ex.gifUrl || ''
            }
        });
    }

    // 4. Batch Update
    const chunks = [];
    for (let i = 0; i < updates.length; i += batchSize) {
        chunks.push(updates.slice(i, i + batchSize));
    }

    console.log(`📤 Updating ${chunks.length} batches...`);

    for (let i = 0; i < chunks.length; i++) {
        const batch = db.batch();
        const chunk = chunks[i];

        chunk.forEach(item => {
            const ref = db.collection(COLLECTION_NAME).doc(item.id);
            // using { merge: true } explicitely or update() 
            // set with merge is safer if doc happens to be missing (though it shouldn't be)
            batch.set(ref, item.data, { merge: true });
        });

        await batch.commit();
        totalUpdated += chunk.length;
        console.log(`   Batch ${i + 1}/${chunks.length} complete. Total: ${totalUpdated}`);
    }

    console.log('🎉 TRANSLATION UPDATE COMPLETE!');
}

migrate().catch(console.error);
