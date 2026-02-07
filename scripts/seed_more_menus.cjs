const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require('../service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

const menus = [
    {
        name: "Menú-1800kcal-HP-Mediterráneo-(112P/181C/58F)",
        meals: [
            {
                name: "Desayuno",
                items: [
                    { type: "recipe", refId: "rec_pan_tomate_jamon", name: "Tostada de Jamón, Tomate y AOVE", quantity: 1, unit: "ración" },
                    { type: "food", refId: "ing_coffee", name: "Café solo", quantity: 150, unit: "ml" }
                ]
            },
            {
                name: "Almuerzo",
                items: [
                    { type: "recipe", refId: "rec_salteado_ternera_brocoli", name: "Salteado de Ternera, Brócoli y Anacardos", quantity: 1, unit: "ración" },
                    { type: "food", refId: "ing_white_rice", name: "Arroz Blanco", quantity: 150, unit: "g" },
                    { type: "food", refId: "ing_orange", name: "Naranja", quantity: 150, unit: "g" }
                ]
            },
            {
                name: "Merienda",
                items: [
                    { type: "recipe", refId: "rec_bowl_griego", name: "Bowl de Yogur Griego y Chía", quantity: 1, unit: "ración" },
                    { type: "food", refId: "ing_banana", name: "Plátano", quantity: 100, unit: "g" }
                ]
            },
            {
                name: "Cena",
                items: [
                    { type: "recipe", refId: "rec_ensalada_quinoa_pavo", name: "Ensalada de Quinoa y Pavo", quantity: 1, unit: "ración" },
                    { type: "food", refId: "ing_aove", name: "AOVE", quantity: 10, unit: "ml" }
                ]
            }
        ]
    },
    {
        name: "Menú-1850kcal-HP-Atún-Salmón-(125P/190C/61F)",
        meals: [
            {
                name: "Desayuno",
                items: [
                    { type: "recipe", refId: "rec_porridge_avena", name: "Gachas de Avena y Arándanos", quantity: 1, unit: "ración" },
                    { type: "food", refId: "ing_whey_protein", name: "Proteína Whey", quantity: 30, unit: "g" }
                ]
            },
            {
                name: "Almuerzo",
                items: [
                    { type: "recipe", refId: "rec_poke_bowl_salmon", name: "Poke Bowl de Salmón y Aguacate", quantity: 1, unit: "ración" },
                    { type: "food", refId: "ing_brown_rice", name: "Arroz Integral", quantity: 100, unit: "g" },
                    { type: "food", refId: "ing_apple", name: "Manzana", quantity: 150, unit: "g" }
                ]
            },
            {
                name: "Merienda",
                items: [
                    { type: "recipe", refId: "rec_ensalada_lentejas_atun", name: "Ensalada de Lentejas y Atún", quantity: 1, unit: "ración" },
                    { type: "food", refId: "ing_walnuts", name: "Nueces", quantity: 15, unit: "g" }
                ]
            },
            {
                name: "Cena",
                items: [
                    { type: "recipe", refId: "rec_tortilla_patata_fit", name: "Tortilla de Patatas \"Fit\"", quantity: 1, unit: "ración" },
                    { type: "food", refId: "ing_fresh_cheese", name: "Queso Fresco Burgos", quantity: 100, unit: "g" }
                ]
            }
        ]
    }
];

async function seed() {
    console.log('Seeding new menus...');
    for (const menu of menus) {
        const res = await db.collection('nutrition_days').add({
            ...menu,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`Created Menu: ${menu.name} with ID: ${res.id}`);
    }
}

seed().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
