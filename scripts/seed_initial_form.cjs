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
    name: "Formulario Inicial",
    description: "Cuestionario completo para diseñar tu plan de entrenamiento y nutrición.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    fields: [
        {
            id: 'q1',
            type: 'text',
            label: '¿Qué quieres conseguir? ¿Cuál es tu objetivo de aquí a 1, 6 y 12 meses?',
            required: true,
            options: ''
        },
        {
            id: 'q2',
            type: 'text',
            label: '¿Por qué es importante para ti? ¿Qué motivos te han llevado a querer empezar?',
            required: true,
            options: ''
        },
        {
            id: 'q3',
            type: 'scale',
            label: '¿Del 0 al 10 en qué medida estar dispuesto en invertir esfuerzo y cambiar tus hábitos?',
            required: true,
            options: 'Nada dispuesto, Muy dispuesto'
        },
        {
            id: 'q4',
            type: 'text',
            label: '¿Cuáles piensas que pueden ser los motivos por los cuales no has tenido continuidad anteriormente?',
            required: true,
            options: ''
        },
        {
            id: 'q5',
            type: 'text',
            label: '¿Tienes algún tipo de experiencia entrenando o realizando algún tipo de deporte? ¿Qué solías hacer?',
            required: true,
            options: ''
        },
        {
            id: 'q6',
            type: 'text',
            label: '¿Dónde tienes opción de entrenar? ¿Dispones de material? ¿Qué crees que faltaría?',
            required: true,
            options: ''
        },
        {
            id: 'q7',
            type: 'text',
            label: '¿Cuántos días a la semana puedes ir a entrenar? ¿Cuánto tiempo dispones para cada sesión?',
            required: true,
            options: ''
        },
        {
            id: 'q8',
            type: 'text',
            label: '¿Tienes alguna lesión, dolor, estás medicándote?',
            required: true,
            options: ''
        },
        {
            id: 'q9',
            type: 'text',
            label: '¿Has realizado alguna dieta antes? ¿Cuál era? ¿Qué solías comer? ¿Qué estrategia utilizabas?',
            required: true,
            options: ''
        },
        {
            id: 'q10',
            type: 'text',
            label: '¿Tienes alguna alergia o intolerancia?',
            required: true,
            options: ''
        },
        {
            id: 'q11',
            type: 'text',
            label: '¿Qué alimentos te gusta comer? ¿Cuáles no?',
            required: true,
            options: ''
        },
        {
            id: 'q12',
            type: 'text',
            label: 'Descríbeme como suele ser tu alimentación un día cualquiera (cantidades y tipo).',
            required: true,
            options: ''
        },
        {
            id: 'q13',
            type: 'text',
            label: '¿Qué cantidad de comidas te resulta más cómodo hacer al día? ¿Inconvenientes en comer más/menos?',
            required: true,
            options: ''
        },
        {
            id: 'q14',
            type: 'text',
            label: '¿Piensas que tu dieta es inadecuada? ¿Qué podrías mejorar?',
            required: true,
            options: ''
        },
        {
            id: 'q15',
            type: 'text',
            label: '¿Has consumido suplementos alguna vez o los estás consumiendo actualmente? ¿Cuáles?',
            required: true,
            options: ''
        },
        {
            id: 'q16',
            type: 'text',
            label: '¿A qué te dedicas profesionalmente? Describe tu actividad física/postural laboral.',
            required: true,
            options: ''
        },
        {
            id: 'q17',
            type: 'scale',
            label: '¿Del 0 al 10 qué nivel de actividad física dirías que tienes?',
            required: true,
            options: 'Sedentario, Muy activo'
        },
        {
            id: 'q18',
            type: 'scale',
            label: '¿Del 0 al 10 cuál es tu percepción de estrés en el trabajo?',
            required: true,
            options: 'Sin estrés, Mucho estrés'
        },
        {
            id: 'q19',
            type: 'text',
            label: '¿Practicas algún otro tipo de actividad física?',
            required: false,
            options: ''
        },
        {
            id: 'q20',
            type: 'scale',
            label: '¿Del 0 al 10 cómo dirías que es tu calidad de sueño/descanso?',
            required: true,
            options: 'Pésima, Excelente'
        },
        {
            id: 'q21',
            type: 'text',
            label: 'Horas medias de sueño:',
            required: true,
            options: ''
        },
        {
            id: 'q22',
            type: 'text',
            label: '¿Hay alguna otra cosa que crees que deba tener en cuenta sobre tu caso concreto?',
            required: false,
            options: ''
        },
        {
            id: 'q23',
            type: 'boolean',
            label: '¿Acepta y entiende usted los términos? La información tiene propósito informativo y no reemplaza asesoramiento médico. 2BEFIT no asume responsabilidad por lesiones.',
            required: true,
            options: ''
        }
    ]
};

async function seed() {
    console.log('🚀 Creating Form:', form.name);
    try {
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
