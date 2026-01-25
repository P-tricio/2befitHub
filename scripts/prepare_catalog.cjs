const fs = require('fs');
const path = require('path');

const INPUT_FILE = path.join(__dirname, '../src/data/1324exercisedb_catalog_2026-01-25.json');
const OUTPUT_FILE = path.join(__dirname, '../src/data/offline_catalog.json');

// Basic Translations Map
const BODY_PARTS = {
    'waist': 'Cintura / Core',
    'upper legs': 'Piernas (Sup.)',
    'back': 'Espalda',
    'lower legs': 'Piernas (Inf.)',
    'chest': 'Pecho',
    'upper arms': 'Brazos',
    'cardio': 'Cardio',
    'shoulders': 'Hombros',
    'lower arms': 'Antebrazos',
    'neck': 'Cuello'
};

const EQUIPMENT = {
    'body weight': 'Peso Corporal',
    'cable': 'Polea',
    'leverage machine': 'Máquina de Palanca',
    'assisted': 'Asistido',
    'medicine ball': 'Balón Medicinal',
    'stability ball': 'Balón Suizo',
    'band': 'Banda Elástica',
    'barbell': 'Barra',
    'dumbbell': 'Mancuernas',
    'kettlebell': 'Pesa Rusa',
    'smith machine': 'Máquina Smith'
};

const TARGETS = {
    'abs': 'Abdominales',
    'lats': 'Dorsales',
    'pectorals': 'Pectorales',
    'glutes': 'Glúteos',
    'hamstrings': 'Isquios',
    'quads': 'Cuádriceps',
    'triceps': 'Tríceps',
    'biceps': 'Bíceps',
    'calves': 'Gemelos',
    'delts': 'Deltoides'
};

// API Config for Image Construction
const API_HOST = 'exercisedb.p.rapidapi.com';

try {
    if (!fs.existsSync(INPUT_FILE)) {
        console.error('❌ Input file not found:', INPUT_FILE);
        process.exit(1);
    }

    const rawData = fs.readFileSync(INPUT_FILE, 'utf8');
    const inputContent = JSON.parse(rawData);
    const exercises = inputContent.exercises || [];

    console.log(`Processing ${exercises.length} exercises...`);

    const processed = exercises.map(ex => {
        // 1. Construct Proxy URL for Images
        // This ensures compatibility with the app's secure fetcher
        const proxyUrl = `https://${API_HOST}/image?exerciseId=${ex.id}&resolution=360`;

        // 2. Basic Translation of Tags
        const bodyPartEs = BODY_PARTS[ex.bodyPart] || ex.bodyPart;
        const equipmentEs = EQUIPMENT[ex.equipment] || ex.equipment;
        const targetEs = TARGETS[ex.target] || ex.target;

        // 3. Enrich Object
        return {
            ...ex,
            source: 'exercisedb_offline',
            mediaUrl: ex.gifUrl || proxyUrl, // Fallback to proxy if missing

            // Apply basic translations
            bodyPart_es: bodyPartEs,
            equipment_es: equipmentEs,
            target_es: targetEs,

            // Search helper
            searchable: `${ex.name} ${bodyPartEs} ${equipmentEs} ${targetEs}`.toLowerCase()
        };
    });

    // Create final object
    const finalOutput = {
        metadata: {
            ...inputContent.metadata,
            processedDate: new Date().toISOString(),
            note: "Processed with proxy URLs and basic tag translations."
        },
        exercises: processed
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(finalOutput, null, 2));
    console.log(`✅ Successfully saved ${processed.length} exercises to ${OUTPUT_FILE}`);
    console.log(`ℹ️  Note: Full descriptions must be translated via LLM using the provided prompt.`);

} catch (error) {
    console.error('Error processing catalog:', error);
}
