/**
 * Seed Script: Mediterranean Nutrition Days
 * Creates ~10 new ingredients + 10 complete nutrition days
 * Run: node scripts/seed_mediterranean_days.cjs
 */
const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require('../service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

// =============================================
// PHASE 1: New Mediterranean Ingredients
// =============================================
const newIngredients = [
    { id: 'ing_jamon_serrano', name: 'Jamón Serrano', category: 'Embutidos Magros', protein: 30, carbs: 0.5, fats: 13, calories: 240, unit: '100g' },
    { id: 'ing_sardines_fresh', name: 'Sardinas Frescas (a la plancha)', category: 'Pescados', protein: 21, carbs: 0, fats: 11, calories: 185, unit: '100g' },
    { id: 'ing_manchego_semi', name: 'Queso Manchego Semicurado', category: 'Lácteos', protein: 26, carbs: 1, fats: 30, calories: 380, unit: '100g' },
    { id: 'ing_canned_chickpeas', name: 'Garbanzos Cocidos (bote, escurridos)', category: 'Legumbres', protein: 7, carbs: 17, fats: 3, calories: 130, unit: '100g' },
    { id: 'ing_canned_lentils', name: 'Lentejas Cocidas (bote, escurridas)', category: 'Legumbres', protein: 7, carbs: 14, fats: 0.5, calories: 93, unit: '100g' },
    { id: 'ing_dates', name: 'Dátiles Medjool', category: 'Frutas', protein: 2.5, carbs: 75, fats: 0.4, calories: 282, unit: '100g' },
    { id: 'ing_pineapple', name: 'Piña Natural', category: 'Frutas', protein: 0.5, carbs: 13, fats: 0.1, calories: 50, unit: '100g' },
    { id: 'ing_gazpacho', name: 'Gazpacho Casero', category: 'Vegetales', protein: 1, carbs: 4, fats: 3, calories: 44, unit: '100ml' },
    { id: 'ing_pan_rustico', name: 'Pan Rústico / Chapata', category: 'Panes', protein: 8, carbs: 50, fats: 1.5, calories: 260, unit: '100g' },
    { id: 'ing_mango', name: 'Mango', category: 'Frutas', protein: 0.8, carbs: 15, fats: 0.4, calories: 60, unit: '100g' },
];

// =============================================
// PHASE 2: 10 Complete Mediterranean Days
// =============================================
const menus = [
    // ─────────────────────────────────────────
    // DÍA 1 – ~1500kcal – DÉFICIT (Pescado)
    // ─────────────────────────────────────────
    {
        name: "Menú-1500kcal-Déficit-(Est.125P/140C/48G)",
        meals: [
            {
                name: "Desayuno",
                items: [
                    { type: "recipe", refId: "rec_pan_tomate_jamon", name: "Tostada de Jamón, Tomate y AOVE", quantity: 1, unit: "ración" },
                    { type: "food", refId: "ing_yogurt_skim", name: "Yogur Desnatado 0%", quantity: 1, unit: "unidad" },
                    { type: "food", refId: "ing_coffee", name: "Café solo", quantity: 150, unit: "ml" }
                ]
            },
            {
                name: "Almuerzo",
                items: [
                    { type: "recipe", refId: "rec_bacalao_pisto", name: "Bacalao al Horno con Pisto", quantity: 1, unit: "ración" },
                    { type: "food", refId: "ing_white_rice", name: "Arroz Blanco", quantity: 50, unit: "g" }
                ]
            },
            {
                name: "Merienda",
                items: [
                    { type: "food", refId: "ing_cottage_cheese", name: "Queso Cottage", quantity: 150, unit: "g" },
                    { type: "food", refId: "ing_strawberries", name: "Fresas", quantity: 150, unit: "g" },
                    { type: "food", refId: "ing_almonds", name: "Almendras", quantity: 10, unit: "g" }
                ]
            },
            {
                name: "Cena",
                items: [
                    { type: "recipe", refId: "rec_merluza_vapor", name: "Merluza al Vapor con Verduras", quantity: 1, unit: "ración" },
                    { type: "food", refId: "ing_potato", name: "Patata cocida", quantity: 200, unit: "g" }
                ]
            }
        ]
    },

    // ─────────────────────────────────────────
    // DÍA 2 – ~1700kcal – LOW-CARB (Huevos)
    // ─────────────────────────────────────────
    {
        name: "Menú-1700kcal-LC-(Est.145P/105C/75G)",
        meals: [
            {
                name: "Desayuno",
                items: [
                    { type: "food", refId: "ing_egg", name: "Huevo L", quantity: 2, unit: "unidad" },
                    { type: "food", refId: "ing_spinach", name: "Espinacas Frescas", quantity: 100, unit: "g" },
                    { type: "food", refId: "ing_jamon_serrano", name: "Jamón Serrano", quantity: 30, unit: "g" },
                    { type: "food", refId: "ing_aove", name: "AOVE", quantity: 5, unit: "ml" },
                    { type: "food", refId: "ing_whole_wheat_bread", name: "Pan Integral", quantity: 1, unit: "unidad" },
                    { type: "food", refId: "ing_coffee", name: "Café solo", quantity: 150, unit: "ml" }
                ]
            },
            {
                name: "Almuerzo",
                items: [
                    { type: "recipe", refId: "rec_salteado_ternera_brocoli", name: "Salteado de Ternera, Brócoli y Anacardos", quantity: 1, unit: "ración" },
                    { type: "food", refId: "ing_potato", name: "Patata cocida", quantity: 150, unit: "g" }
                ]
            },
            {
                name: "Merienda",
                items: [
                    { type: "food", refId: "ing_yogurt_greek", name: "Yogur Griego Natural", quantity: 1, unit: "unidad" },
                    { type: "food", refId: "ing_walnuts", name: "Nueces", quantity: 15, unit: "g" },
                    { type: "food", refId: "ing_blueberries", name: "Arándanos", quantity: 50, unit: "g" }
                ]
            },
            {
                name: "Cena",
                items: [
                    { type: "recipe", refId: "rec_tortilla_claras_jamon", name: "Tortilla de Claras, Huevo y Jamón", quantity: 1, unit: "ración" },
                    { type: "food", refId: "ing_tomato", name: "Tomate", quantity: 100, unit: "g" },
                    { type: "food", refId: "ing_cucumber", name: "Pepino", quantity: 100, unit: "g" },
                    { type: "food", refId: "ing_aove", name: "AOVE", quantity: 5, unit: "ml" }
                ]
            }
        ]
    },

    // ─────────────────────────────────────────
    // DÍA 3 – ~1800kcal – EQUILIBRADO
    // ─────────────────────────────────────────
    {
        name: "Menú-1800kcal-EQ-(Est.125P/195C/50G)",
        meals: [
            {
                name: "Desayuno",
                items: [
                    { type: "recipe", refId: "rec_porridge_avena", name: "Gachas de Avena y Arándanos", quantity: 1, unit: "ración" },
                    { type: "food", refId: "ing_egg_whites", name: "Claras de Huevo", quantity: 100, unit: "g" },
                    { type: "food", refId: "ing_coffee", name: "Café solo", quantity: 150, unit: "ml" }
                ]
            },
            {
                name: "Almuerzo",
                items: [
                    { type: "recipe", refId: "rec_pollo_arroz_brocoli", name: "Pollo al Curry con Arroz y Brócoli", quantity: 1, unit: "ración" },
                    { type: "food", refId: "ing_orange", name: "Naranja", quantity: 1, unit: "unidad" }
                ]
            },
            {
                name: "Merienda",
                items: [
                    { type: "food", refId: "ing_apple", name: "Manzana", quantity: 1, unit: "unidad" },
                    { type: "food", refId: "ing_almonds", name: "Almendras", quantity: 20, unit: "g" },
                    { type: "food", refId: "ing_fresh_cheese", name: "Queso Fresco Burgos", quantity: 50, unit: "g" }
                ]
            },
            {
                name: "Cena",
                items: [
                    { type: "recipe", refId: "rec_merluza_calabaza", name: "Merluza con Puré de Calabaza", quantity: 1, unit: "ración" },
                    { type: "food", refId: "ing_spinach", name: "Espinacas Frescas", quantity: 100, unit: "g" },
                    { type: "food", refId: "ing_aove", name: "AOVE", quantity: 5, unit: "ml" }
                ]
            }
        ]
    },

    // ─────────────────────────────────────────
    // DÍA 4 – ~2000kcal – HIGH-PROTEIN
    // ─────────────────────────────────────────
    {
        name: "Menú-2000kcal-HP-(Est.165P/190C/50G)",
        meals: [
            {
                name: "Desayuno",
                items: [
                    { type: "recipe", refId: "rec_tortitas_avena_platano", name: "Tortitas de Avena y Plátano", quantity: 1, unit: "ración" },
                    { type: "food", refId: "ing_whey_protein", name: "Proteína Whey", quantity: 30, unit: "g" },
                    { type: "food", refId: "ing_coffee", name: "Café solo", quantity: 150, unit: "ml" }
                ]
            },
            {
                name: "Almuerzo",
                items: [
                    { type: "recipe", refId: "rec_pasta_integral_atun", name: "Pasta Integral con Atún y Tomate", quantity: 1, unit: "ración" },
                    { type: "food", refId: "ing_chicken_breast", name: "Pechuga de Pollo", quantity: 100, unit: "g" }
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
                    { type: "food", refId: "ing_aove", name: "AOVE", quantity: 5, unit: "ml" }
                ]
            }
        ]
    },

    // ─────────────────────────────────────────
    // DÍA 5 – ~2200kcal – HIGH-CARB (Entreno)
    // ─────────────────────────────────────────
    {
        name: "Menú-2200kcal-HC-(Est.150P/270C/52G)",
        meals: [
            {
                name: "Desayuno",
                items: [
                    { type: "recipe", refId: "rec_porridge_avena", name: "Gachas de Avena y Arándanos", quantity: 1, unit: "ración" },
                    { type: "food", refId: "ing_banana", name: "Plátano", quantity: 100, unit: "g" },
                    { type: "food", refId: "ing_whey_protein", name: "Proteína Whey", quantity: 30, unit: "g" },
                    { type: "food", refId: "ing_coffee", name: "Café solo", quantity: 150, unit: "ml" }
                ]
            },
            {
                name: "Almuerzo",
                items: [
                    { type: "recipe", refId: "rec_pasta_pollo_champis", name: "Pasta Integral con Pollo y Champiñones", quantity: 1, unit: "ración" },
                    { type: "food", refId: "ing_whole_wheat_bread", name: "Pan Integral", quantity: 1, unit: "unidad" },
                    { type: "food", refId: "ing_orange", name: "Naranja", quantity: 1, unit: "unidad" }
                ]
            },
            {
                name: "Merienda",
                items: [
                    { type: "recipe", refId: "rec_snack_batido_pro", name: "Batido de Proteína y Plátano", quantity: 1, unit: "ración" },
                    { type: "food", refId: "ing_almonds", name: "Almendras", quantity: 15, unit: "g" },
                    { type: "food", refId: "ing_dates", name: "Dátiles Medjool", quantity: 25, unit: "g" }
                ]
            },
            {
                name: "Cena",
                items: [
                    { type: "recipe", refId: "rec_salmon_boniato", name: "Salmón al Horno con Boniato", quantity: 1, unit: "ración" },
                    { type: "food", refId: "ing_lambs_lettuce", name: "Canónigos", quantity: 50, unit: "g" },
                    { type: "food", refId: "ing_tomato", name: "Tomate", quantity: 100, unit: "g" }
                ]
            }
        ]
    },

    // ─────────────────────────────────────────
    // DÍA 6 – ~2400kcal – FUERZA / VOLUMEN
    // ─────────────────────────────────────────
    {
        name: "Menú-2400kcal-FUERZA-(Est.175P/275C/62G)",
        meals: [
            {
                name: "Desayuno",
                items: [
                    { type: "recipe", refId: "rec_tortitas_avena_platano", name: "Tortitas de Avena y Plátano", quantity: 1, unit: "ración" },
                    { type: "food", refId: "ing_egg_whites", name: "Claras de Huevo", quantity: 150, unit: "g" },
                    { type: "food", refId: "ing_blueberries", name: "Arándanos", quantity: 80, unit: "g" },
                    { type: "food", refId: "ing_honey", name: "Miel", quantity: 10, unit: "g" },
                    { type: "food", refId: "ing_coffee", name: "Café solo", quantity: 150, unit: "ml" }
                ]
            },
            {
                name: "Almuerzo",
                items: [
                    { type: "recipe", refId: "rec_pollo_arroz_brocoli", name: "Pollo al Curry con Arroz y Brócoli", quantity: 1, unit: "ración" },
                    { type: "food", refId: "ing_whole_wheat_bread", name: "Pan Integral", quantity: 1, unit: "unidad" },
                    { type: "food", refId: "ing_aove", name: "AOVE", quantity: 5, unit: "ml" },
                    { type: "food", refId: "ing_apple", name: "Manzana", quantity: 1, unit: "unidad" }
                ]
            },
            {
                name: "Merienda",
                items: [
                    { type: "recipe", refId: "rec_ensalada_garbanzos_langostinos", name: "Ensalada de Garbanzos y Langostinos", quantity: 1, unit: "ración" },
                    { type: "food", refId: "ing_brown_rice", name: "Arroz Integral", quantity: 40, unit: "g" }
                ]
            },
            {
                name: "Cena",
                items: [
                    { type: "food", refId: "ing_beef_lean", name: "Ternera Magra (plancha)", quantity: 180, unit: "g" },
                    { type: "food", refId: "ing_sweet_potato", name: "Boniato", quantity: 200, unit: "g" },
                    { type: "food", refId: "ing_broccoli", name: "Brócoli", quantity: 150, unit: "g" },
                    { type: "food", refId: "ing_aove", name: "AOVE", quantity: 10, unit: "ml" }
                ]
            }
        ]
    },

    // ─────────────────────────────────────────
    // DÍA 7 – ~2600kcal – VOLUMEN
    // ─────────────────────────────────────────
    {
        name: "Menú-2600kcal-VOL-(Est.185P/320C/65G)",
        meals: [
            {
                name: "Desayuno",
                items: [
                    { type: "recipe", refId: "rec_porridge_avena", name: "Gachas de Avena y Arándanos", quantity: 1, unit: "ración" },
                    { type: "food", refId: "ing_egg", name: "Huevo L", quantity: 2, unit: "unidad" },
                    { type: "food", refId: "ing_banana", name: "Plátano", quantity: 1, unit: "unidad" },
                    { type: "food", refId: "ing_peanut_butter", name: "Crema de Cacahuete Natural", quantity: 15, unit: "g" },
                    { type: "food", refId: "ing_coffee", name: "Café solo", quantity: 150, unit: "ml" }
                ]
            },
            {
                name: "Almuerzo",
                items: [
                    { type: "food", refId: "ing_chicken_breast", name: "Pechuga de Pollo (plancha)", quantity: 200, unit: "g" },
                    { type: "food", refId: "ing_white_rice", name: "Arroz Blanco", quantity: 100, unit: "g" },
                    { type: "food", refId: "ing_broccoli", name: "Brócoli", quantity: 150, unit: "g" },
                    { type: "food", refId: "ing_aove", name: "AOVE", quantity: 10, unit: "ml" },
                    { type: "food", refId: "ing_apple", name: "Manzana", quantity: 1, unit: "unidad" }
                ]
            },
            {
                name: "Merienda",
                items: [
                    { type: "recipe", refId: "rec_snack_batido_pro", name: "Batido de Proteína y Plátano", quantity: 1, unit: "ración" },
                    { type: "food", refId: "ing_oats", name: "Copos de Avena", quantity: 30, unit: "g" },
                    { type: "food", refId: "ing_dates", name: "Dátiles Medjool", quantity: 30, unit: "g" },
                    { type: "food", refId: "ing_almonds", name: "Almendras", quantity: 20, unit: "g" }
                ]
            },
            {
                name: "Cena",
                items: [
                    { type: "recipe", refId: "rec_pasta_integral_atun", name: "Pasta Integral con Atún y Tomate", quantity: 1, unit: "ración" },
                    { type: "food", refId: "ing_turkey_breast", name: "Pechuga de Pavo", quantity: 100, unit: "g" },
                    { type: "food", refId: "ing_aove", name: "AOVE", quantity: 5, unit: "ml" },
                    { type: "food", refId: "ing_pear", name: "Pera", quantity: 1, unit: "unidad" }
                ]
            }
        ]
    },

    // ─────────────────────────────────────────
    // DÍA 8 – ~1600kcal – PESCADO PURO
    // ─────────────────────────────────────────
    {
        name: "Menú-1600kcal-PESCADO-(Est.140P/140C/48G)",
        meals: [
            {
                name: "Desayuno",
                items: [
                    { type: "food", refId: "ing_whole_wheat_bread", name: "Pan Integral", quantity: 2, unit: "unidad" },
                    { type: "food", refId: "ing_tomato", name: "Tomate rallado", quantity: 80, unit: "g" },
                    { type: "food", refId: "ing_aove", name: "AOVE", quantity: 10, unit: "ml" },
                    { type: "food", refId: "ing_sardines_fresh", name: "Sardinas Frescas", quantity: 80, unit: "g" },
                    { type: "food", refId: "ing_coffee", name: "Café solo", quantity: 150, unit: "ml" }
                ]
            },
            {
                name: "Almuerzo",
                items: [
                    { type: "recipe", refId: "rec_poke_bowl_salmon", name: "Poke Bowl de Salmón y Aguacate", quantity: 1, unit: "ración" },
                    { type: "food", refId: "ing_brown_rice", name: "Arroz Integral (extra)", quantity: 30, unit: "g" }
                ]
            },
            {
                name: "Merienda",
                items: [
                    { type: "food", refId: "ing_yogurt_beaten", name: "Queso Batido 0%", quantity: 200, unit: "g" },
                    { type: "food", refId: "ing_pineapple", name: "Piña Natural", quantity: 100, unit: "g" },
                    { type: "food", refId: "ing_walnuts", name: "Nueces", quantity: 10, unit: "g" }
                ]
            },
            {
                name: "Cena",
                items: [
                    { type: "food", refId: "ing_hake", name: "Merluza (plancha)", quantity: 200, unit: "g" },
                    { type: "food", refId: "ing_asparagus", name: "Espárragos Trigueros", quantity: 150, unit: "g" },
                    { type: "food", refId: "ing_potato", name: "Patata cocida", quantity: 150, unit: "g" },
                    { type: "food", refId: "ing_aove", name: "AOVE", quantity: 5, unit: "ml" }
                ]
            }
        ]
    },

    // ─────────────────────────────────────────
    // DÍA 9 – ~1900kcal – LEGUMBRES
    // ─────────────────────────────────────────
    {
        name: "Menú-1900kcal-LEGUMBRE-(Est.120P/240C/42G)",
        meals: [
            {
                name: "Desayuno",
                items: [
                    { type: "recipe", refId: "rec_pan_tomate_jamon", name: "Tostada de Jamón, Tomate y AOVE", quantity: 1, unit: "ración" },
                    { type: "food", refId: "ing_yogurt_plain", name: "Yogur Natural", quantity: 1, unit: "unidad" },
                    { type: "food", refId: "ing_banana", name: "Plátano", quantity: 100, unit: "g" },
                    { type: "food", refId: "ing_coffee", name: "Café solo", quantity: 150, unit: "ml" }
                ]
            },
            {
                name: "Almuerzo",
                items: [
                    { type: "recipe", refId: "rec_lentejas_vegetales", name: "Lentejas Estofadas con Verduras", quantity: 1, unit: "ración" },
                    { type: "food", refId: "ing_whole_wheat_bread", name: "Pan Integral", quantity: 1, unit: "unidad" },
                    { type: "food", refId: "ing_orange", name: "Naranja", quantity: 1, unit: "unidad" }
                ]
            },
            {
                name: "Merienda",
                items: [
                    { type: "recipe", refId: "rec_snack_manzana_almendras", name: "Manzana con Almendras", quantity: 1, unit: "ración" },
                    { type: "food", refId: "ing_turkey_breast", name: "Pechuga de Pavo (fiambre)", quantity: 60, unit: "g" }
                ]
            },
            {
                name: "Cena",
                items: [
                    { type: "recipe", refId: "rec_garbanzos_espinacas", name: "Potaje de Garbanzos y Espinacas", quantity: 1, unit: "ración" },
                    { type: "food", refId: "ing_white_rice", name: "Arroz Blanco", quantity: 40, unit: "g" },
                    { type: "food", refId: "ing_aove", name: "AOVE", quantity: 5, unit: "ml" }
                ]
            }
        ]
    },

    // ─────────────────────────────────────────
    // DÍA 10 – ~2100kcal – MIX VARIADO
    // ─────────────────────────────────────────
    {
        name: "Menú-2100kcal-MIX-(Est.160P/220C/55G)",
        meals: [
            {
                name: "Desayuno",
                items: [
                    { type: "recipe", refId: "rec_bowl_griego", name: "Bowl de Yogur Griego y Chía", quantity: 1, unit: "ración" },
                    { type: "food", refId: "ing_oats", name: "Copos de Avena (extra)", quantity: 20, unit: "g" },
                    { type: "food", refId: "ing_strawberries", name: "Fresas", quantity: 80, unit: "g" },
                    { type: "food", refId: "ing_coffee", name: "Café solo", quantity: 150, unit: "ml" }
                ]
            },
            {
                name: "Almuerzo",
                items: [
                    { type: "recipe", refId: "rec_fajitas_fit", name: "Fajitas de Pollo y Pimientos \"Fit\"", quantity: 1, unit: "ración" },
                    { type: "food", refId: "ing_brown_rice", name: "Arroz Integral", quantity: 60, unit: "g" },
                    { type: "food", refId: "ing_canned_chickpeas", name: "Garbanzos Cocidos (bote)", quantity: 80, unit: "g" }
                ]
            },
            {
                name: "Merienda",
                items: [
                    { type: "food", refId: "ing_whey_protein", name: "Proteína Whey", quantity: 30, unit: "g" },
                    { type: "food", refId: "ing_milk_semi", name: "Leche Semidesnatada", quantity: 250, unit: "ml" },
                    { type: "food", refId: "ing_pear", name: "Pera", quantity: 1, unit: "unidad" },
                    { type: "food", refId: "ing_almonds", name: "Almendras", quantity: 15, unit: "g" }
                ]
            },
            {
                name: "Cena",
                items: [
                    { type: "food", refId: "ing_salmon", name: "Salmón Fresco (horno)", quantity: 150, unit: "g" },
                    { type: "food", refId: "ing_quinoa", name: "Quinoa", quantity: 50, unit: "g" },
                    { type: "food", refId: "ing_asparagus", name: "Espárragos Trigueros", quantity: 150, unit: "g" },
                    { type: "food", refId: "ing_tomato", name: "Tomate", quantity: 100, unit: "g" },
                    { type: "food", refId: "ing_aove", name: "AOVE", quantity: 10, unit: "ml" }
                ]
            }
        ]
    }
];

// =============================================
// EXECUTION
// =============================================
async function seed() {
    console.log('🫒 Seeding Mediterranean Nutrition Data...\n');

    // Phase 1: Ingredients
    console.log('📦 Phase 1: Creating new ingredients...');
    const ingBatch = db.batch();
    for (const ing of newIngredients) {
        const ref = db.collection('nutri_ingredients').doc(ing.id);
        const { id, ...data } = ing;
        ingBatch.set(ref, { ...data, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    }
    await ingBatch.commit();
    console.log(`   ✅ ${newIngredients.length} ingredients created/updated.\n`);

    // Phase 2: Nutrition Days
    console.log('🍽️  Phase 2: Creating nutrition days...');
    for (const menu of menus) {
        const res = await db.collection('nutrition_days').add({
            ...menu,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`   ✅ ${menu.name} → ID: ${res.id}`);
    }

    console.log(`\n🎉 Done! ${menus.length} Mediterranean days created.`);
    console.log('   Open the app → Nutrition Editor to verify macros.');
    console.log('   Rename days after checking actual calculated values.');
}

seed().then(() => process.exit(0)).catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
