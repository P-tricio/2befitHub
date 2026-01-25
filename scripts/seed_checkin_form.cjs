const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const SERVICE_ACCOUNT_PATH = path.join(__dirname, '../service-account.json');

if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    console.error('❌ Service Account missing');
    process.exit(1);
}

const serviceAccount = require(SERVICE_ACCOUNT_PATH);

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

const form = {
    name: "Revisión Semanal",
    description: "Cuestionario de seguimiento para evaluar progreso, descanso y sensaciones.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    fields: [
        {
            id: 'q1',
            type: 'scale',
            label: '¡Revisión! ¿Cómo de contento estás del 0 al 10?',
            required: true,
            options: 'Nada contento, Muy contento'
        },
        {
            id: 'q2',
            type: 'text',
            label: 'Horas de sueño (media semanal) y diarias:',
            required: true,
            options: ''
        },
        {
            id: 'q3',
            type: 'text',
            label: 'Niveles de actividad. Cantidad de pasos (media semanal) y diarias.',
            required: true,
            options: ''
        },
        {
            id: 'q4',
            type: 'scale',
            label: 'Estado de ánimo del 0 al 10',
            required: true,
            options: 'Muy irritable, Genial'
        },
        {
            id: 'q5',
            type: 'scale',
            label: 'Calidad del sueño',
            required: true,
            options: 'Cansado, Descansado'
        },
        {
            id: 'q6',
            type: 'scale',
            label: 'Apetito / Saciedad',
            required: true,
            options: 'Hambre, Saciado'
        },
        {
            id: 'q7',
            type: 'scale',
            label: 'Motivación por el entreno',
            required: true,
            options: 'Sin ganas, Motivado'
        },
        {
            id: 'q8',
            type: 'scale',
            label: 'Motivación por la dieta',
            required: true,
            options: 'Difícil, Sencillo'
        },
        {
            id: 'q9',
            type: 'scale',
            label: 'Progreso de rendimiento (fuerza, resistencia...)',
            required: true,
            options: 'Estancado, Mejorando'
        },
        {
            id: 'q10',
            type: 'scale',
            label: 'Percepción estética / composición corporal',
            required: true,
            options: 'Sin cambios, Grandes cambios'
        },
        {
            id: 'q11',
            type: 'text',
            label: 'Otras actividades físicas (tipo, frecuencia...)',
            required: false,
            options: ''
        }
    ]
};

async function seed() {
    console.log('🚀 Creating Form:', form.name);
    try {
        // Delete previous "Revisión Semanal" forms to avoid duplicates
        const snapshot = await db.collection('training_forms').where('name', '==', form.name).get();
        if (!snapshot.empty) {
            console.log(`   Deleting ${snapshot.size} existing '${form.name}' forms...`);
            const batch = db.batch();
            snapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        }

        await db.collection('training_forms').add(form);
        console.log('✅ Form created successfully!');
    } catch (error) {
        console.error('❌ Error creating form:', error);
    }
}

seed();
