/**
 * Seed Script: Mediterranean Menu VARIANTS (V2 + V3)
 * 2 variants per original day = 20 new days
 * Same structure, different ingredients for variety
 * Run: node scripts/seed_mediterranean_variants.cjs
 */
const admin = require('firebase-admin');
const serviceAccount = require('../service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

// Helper to create a food item shorthand
const F = (refId, name, qty, unit = 'g') => ({ type: 'food', refId, name, quantity: qty, unit });
const R = (refId, name, qty = 1) => ({ type: 'recipe', refId, name, quantity: qty, unit: 'ración' });

const variants = [

    // ═══════════════════════════════════════
    // DÍA 1 VARIANTS – ~1500kcal DÉFICIT
    // ═══════════════════════════════════════
    {
        name: "Menú-1500kcal-Déficit-V2-(Est.125P/140C/48G)",
        meals: [
            {
                name: "Desayuno", items: [
                    R("rec_pan_tomate_jamon", "Tostada de Jamón, Tomate y AOVE"),
                    F("ing_yogurt_beaten", "Queso Batido 0%", 150),
                    F("ing_coffee", "Café solo", 150, "ml")
                ]
            },
            {
                name: "Almuerzo", items: [
                    R("rec_merluza_calabaza", "Merluza con Puré de Calabaza"),
                    F("ing_brown_rice", "Arroz Integral", 50)
                ]
            },
            {
                name: "Merienda", items: [
                    F("ing_fresh_cheese", "Queso Fresco Burgos", 80),
                    F("ing_blueberries", "Arándanos", 100),
                    F("ing_walnuts", "Nueces", 10)
                ]
            },
            {
                name: "Cena", items: [
                    F("ing_cod", "Bacalao Fresco (horno)", 200),
                    F("ing_asparagus", "Espárragos Trigueros", 150),
                    F("ing_potato", "Patata cocida", 150),
                    F("ing_aove", "AOVE", 5, "ml")
                ]
            }
        ]
    },
    {
        name: "Menú-1500kcal-Déficit-V3-(Est.125P/140C/48G)",
        meals: [
            {
                name: "Desayuno", items: [
                    R("rec_tortilla_claras_jamon", "Tortilla de Claras, Huevo y Jamón"),
                    F("ing_whole_wheat_bread", "Pan Integral", 1, "unidad"),
                    F("ing_coffee", "Café solo", 150, "ml")
                ]
            },
            {
                name: "Almuerzo", items: [
                    R("rec_bacalao_pisto", "Bacalao al Horno con Pisto"),
                    F("ing_quinoa", "Quinoa", 40)
                ]
            },
            {
                name: "Merienda", items: [
                    F("ing_cottage_cheese", "Queso Cottage", 150),
                    F("ing_rasp_blackberries", "Frambuesas / Moras", 120),
                    F("ing_hazelnuts", "Avellanas", 10)
                ]
            },
            {
                name: "Cena", items: [
                    F("ing_sardines_fresh", "Sardinas Frescas (plancha)", 150),
                    F("ing_sweet_potato", "Boniato", 150),
                    F("ing_spinach", "Espinacas Frescas", 100),
                    F("ing_aove", "AOVE", 5, "ml")
                ]
            }
        ]
    },

    // ═══════════════════════════════════════
    // DÍA 2 VARIANTS – ~1700kcal LOW-CARB
    // ═══════════════════════════════════════
    {
        name: "Menú-1700kcal-LC-V2-(Est.145P/105C/75G)",
        meals: [
            {
                name: "Desayuno", items: [
                    F("ing_egg", "Huevo L", 2, "unidad"),
                    F("ing_mushrooms", "Champiñones", 100),
                    F("ing_jamon_serrano", "Jamón Serrano", 30),
                    F("ing_aove", "AOVE", 5, "ml"),
                    F("ing_rye_bread", "Pan de Centeno", 1, "unidad"),
                    F("ing_coffee", "Café solo", 150, "ml")
                ]
            },
            {
                name: "Almuerzo", items: [
                    F("ing_pork_loin", "Lomo de Cerdo (plancha)", 180),
                    F("ing_broccoli", "Brócoli", 200),
                    F("ing_sweet_potato", "Boniato", 100),
                    F("ing_aove", "AOVE", 5, "ml")
                ]
            },
            {
                name: "Merienda", items: [
                    F("ing_yogurt_greek", "Yogur Griego Natural", 1, "unidad"),
                    F("ing_almonds", "Almendras", 15),
                    F("ing_strawberries", "Fresas", 80)
                ]
            },
            {
                name: "Cena", items: [
                    R("rec_revuelto_espinacas_gambas", "Revuelto de Espinacas y Queso Fresco"),
                    F("ing_tomato", "Tomate", 100),
                    F("ing_aove", "AOVE", 5, "ml")
                ]
            }
        ]
    },
    {
        name: "Menú-1700kcal-LC-V3-(Est.145P/105C/75G)",
        meals: [
            {
                name: "Desayuno", items: [
                    F("ing_egg", "Huevo L", 2, "unidad"),
                    F("ing_asparagus", "Espárragos Trigueros", 100),
                    F("ing_manchego_semi", "Queso Manchego", 20),
                    F("ing_aove", "AOVE", 5, "ml"),
                    F("ing_whole_wheat_bread", "Pan Integral", 1, "unidad"),
                    F("ing_coffee", "Café solo", 150, "ml")
                ]
            },
            {
                name: "Almuerzo", items: [
                    F("ing_turkey_breast", "Pechuga de Pavo (plancha)", 180),
                    F("ing_cauliflower", "Coliflor", 200),
                    F("ing_potato", "Patata", 100),
                    F("ing_aove", "AOVE", 10, "ml")
                ]
            },
            {
                name: "Merienda", items: [
                    F("ing_kefir", "Kéfir Natural", 200, "ml"),
                    F("ing_pistachios", "Pistachos", 15),
                    F("ing_pear", "Pera", 1, "unidad")
                ]
            },
            {
                name: "Cena", items: [
                    R("rec_tortilla_claras_jamon", "Tortilla de Claras, Huevo y Jamón"),
                    F("ing_arugula", "Rúcula", 50),
                    F("ing_cucumber", "Pepino", 100),
                    F("ing_aove", "AOVE", 5, "ml")
                ]
            }
        ]
    },

    // ═══════════════════════════════════════
    // DÍA 3 VARIANTS – ~1800kcal EQUILIBRADO
    // ═══════════════════════════════════════
    {
        name: "Menú-1800kcal-EQ-V2-(Est.125P/195C/50G)",
        meals: [
            {
                name: "Desayuno", items: [
                    R("rec_tortitas_avena_platano", "Tortitas de Avena y Plátano"),
                    F("ing_yogurt_beaten", "Queso Batido 0%", 100),
                    F("ing_coffee", "Café solo", 150, "ml")
                ]
            },
            {
                name: "Almuerzo", items: [
                    R("rec_pasta_pollo_champis", "Pasta Integral con Pollo y Champiñones"),
                    F("ing_pear", "Pera", 1, "unidad")
                ]
            },
            {
                name: "Merienda", items: [
                    F("ing_fresh_cheese", "Queso Fresco Burgos", 60),
                    F("ing_whey_protein", "Proteína Whey", 25),
                    F("ing_mango", "Mango", 100),
                    F("ing_pistachios", "Pistachos", 15)
                ]
            },
            {
                name: "Cena", items: [
                    F("ing_cod", "Bacalao Fresco (plancha)", 200),
                    F("ing_zucchini", "Calabacín", 150),
                    F("ing_carrot", "Zanahoria", 80),
                    F("ing_aove", "AOVE", 10, "ml")
                ]
            }
        ]
    },
    {
        name: "Menú-1800kcal-EQ-V3-(Est.125P/195C/50G)",
        meals: [
            {
                name: "Desayuno", items: [
                    R("rec_smoothie_kefir", "Smoothie Bowl de Kéfir y Frutos Rojos"),
                    F("ing_whole_wheat_bread", "Pan Integral", 2, "unidad"),
                    F("ing_peanut_butter", "Crema de Cacahuete", 10),
                    F("ing_coffee", "Café solo", 150, "ml")
                ]
            },
            {
                name: "Almuerzo", items: [
                    F("ing_chicken_breast", "Pechuga de Pollo", 150),
                    F("ing_couscous", "Cuscús", 70),
                    F("ing_pepper", "Pimiento Rojo", 100),
                    F("ing_onion", "Cebolla", 40),
                    F("ing_aove", "AOVE", 5, "ml")
                ]
            },
            {
                name: "Merienda", items: [
                    F("ing_cottage_cheese", "Queso Cottage", 120),
                    F("ing_peach", "Melocotón", 1, "unidad"),
                    F("ing_cashews", "Anacardos", 15)
                ]
            },
            {
                name: "Cena", items: [
                    R("rec_merluza_vapor", "Merluza al Vapor con Verduras"),
                    F("ing_brown_rice", "Arroz Integral", 40),
                    F("ing_aove", "AOVE", 5, "ml")
                ]
            }
        ]
    },

    // ═══════════════════════════════════════
    // DÍA 4 VARIANTS – ~2000kcal HIGH-PROTEIN
    // ═══════════════════════════════════════
    {
        name: "Menú-2000kcal-HP-V2-(Est.165P/190C/50G)",
        meals: [
            {
                name: "Desayuno", items: [
                    R("rec_porridge_avena", "Gachas de Avena y Arándanos"),
                    F("ing_whey_protein", "Proteína Whey", 30),
                    F("ing_coffee", "Café solo", 150, "ml")
                ]
            },
            {
                name: "Almuerzo", items: [
                    R("rec_pasta_pollo_champis", "Pasta Integral con Pollo y Champiñones"),
                    F("ing_turkey_breast", "Pechuga de Pavo (extra)", 80)
                ]
            },
            {
                name: "Merienda", items: [
                    R("rec_bowl_cottage_nueces", "Bowl de Requesón y Nueces"),
                    F("ing_kiwi", "Kiwi", 1, "unidad")
                ]
            },
            {
                name: "Cena", items: [
                    R("rec_ensalada_garbanzos_langostinos", "Ensalada de Garbanzos y Langostinos"),
                    F("ing_aove", "AOVE", 5, "ml")
                ]
            }
        ]
    },
    {
        name: "Menú-2000kcal-HP-V3-(Est.165P/190C/50G)",
        meals: [
            {
                name: "Desayuno", items: [
                    R("rec_pan_tomate_jamon", "Tostada de Jamón, Tomate y AOVE"),
                    F("ing_egg_whites", "Claras de Huevo", 150),
                    F("ing_banana", "Plátano", 100),
                    F("ing_coffee", "Café solo", 150, "ml")
                ]
            },
            {
                name: "Almuerzo", items: [
                    F("ing_beef_lean", "Ternera Magra (plancha)", 180),
                    F("ing_white_rice", "Arroz Blanco", 70),
                    F("ing_broccoli", "Brócoli", 150),
                    F("ing_aove", "AOVE", 5, "ml")
                ]
            },
            {
                name: "Merienda", items: [
                    R("rec_snack_batido_pro", "Batido de Proteína y Plátano"),
                    F("ing_almonds", "Almendras", 15)
                ]
            },
            {
                name: "Cena", items: [
                    R("rec_burrito_pavo_fit", "Burrito de Pavo y Aguacate"),
                    F("ing_tomato", "Tomate", 100),
                    F("ing_lambs_lettuce", "Canónigos", 50)
                ]
            }
        ]
    },

    // ═══════════════════════════════════════
    // DÍA 5 VARIANTS – ~2200kcal HIGH-CARB
    // ═══════════════════════════════════════
    {
        name: "Menú-2200kcal-HC-V2-(Est.150P/270C/52G)",
        meals: [
            {
                name: "Desayuno", items: [
                    R("rec_tortitas_avena_platano", "Tortitas de Avena y Plátano"),
                    F("ing_whey_protein", "Proteína Whey", 30),
                    F("ing_honey", "Miel", 10),
                    F("ing_coffee", "Café solo", 150, "ml")
                ]
            },
            {
                name: "Almuerzo", items: [
                    R("rec_lentejas_vegetales", "Lentejas Estofadas con Verduras"),
                    F("ing_chicken_breast", "Pechuga de Pollo", 100),
                    F("ing_whole_wheat_bread", "Pan Integral", 2, "unidad")
                ]
            },
            {
                name: "Merienda", items: [
                    F("ing_yogurt_greek", "Yogur Griego", 1, "unidad"),
                    F("ing_oats", "Copos de Avena", 30),
                    F("ing_mango", "Mango", 100),
                    F("ing_walnuts", "Nueces", 15)
                ]
            },
            {
                name: "Cena", items: [
                    F("ing_hake", "Merluza (plancha)", 200),
                    F("ing_sweet_potato", "Boniato", 200),
                    F("ing_spinach", "Espinacas", 100),
                    F("ing_aove", "AOVE", 10, "ml")
                ]
            }
        ]
    },
    {
        name: "Menú-2200kcal-HC-V3-(Est.150P/270C/52G)",
        meals: [
            {
                name: "Desayuno", items: [
                    R("rec_porridge_avena", "Gachas de Avena y Arándanos"),
                    F("ing_egg", "Huevo L", 1, "unidad"),
                    F("ing_orange", "Naranja", 1, "unidad"),
                    F("ing_coffee", "Café solo", 150, "ml")
                ]
            },
            {
                name: "Almuerzo", items: [
                    R("rec_gnocchi_tomate_queso", "Gnocchi con Tomate y Queso Curado"),
                    F("ing_chicken_breast", "Pechuga de Pollo", 150),
                    F("ing_apple", "Manzana", 1, "unidad")
                ]
            },
            {
                name: "Merienda", items: [
                    R("rec_snack_batido_pro", "Batido de Proteína y Plátano"),
                    F("ing_dates", "Dátiles Medjool", 30),
                    F("ing_cashews", "Anacardos", 15)
                ]
            },
            {
                name: "Cena", items: [
                    R("rec_poke_bowl_salmon", "Poke Bowl de Salmón y Aguacate"),
                    F("ing_brown_rice", "Arroz Integral (extra)", 40),
                    F("ing_aove", "AOVE", 5, "ml")
                ]
            }
        ]
    },

    // ═══════════════════════════════════════
    // DÍA 6 VARIANTS – ~2400kcal FUERZA
    // ═══════════════════════════════════════
    {
        name: "Menú-2400kcal-FUERZA-V2-(Est.175P/275C/62G)",
        meals: [
            {
                name: "Desayuno", items: [
                    R("rec_porridge_avena", "Gachas de Avena y Arándanos"),
                    F("ing_egg", "Huevo L", 2, "unidad"),
                    F("ing_banana", "Plátano", 1, "unidad"),
                    F("ing_coffee", "Café solo", 150, "ml")
                ]
            },
            {
                name: "Almuerzo", items: [
                    F("ing_turkey_breast", "Pechuga de Pavo (plancha)", 200),
                    F("ing_white_rice", "Arroz Blanco", 90),
                    F("ing_asparagus", "Espárragos Trigueros", 150),
                    F("ing_aove", "AOVE", 10, "ml"),
                    F("ing_pear", "Pera", 1, "unidad")
                ]
            },
            {
                name: "Merienda", items: [
                    R("rec_fajitas_fit", "Fajitas de Pollo y Pimientos Fit"),
                    F("ing_yogurt_beaten", "Queso Batido 0%", 150)
                ]
            },
            {
                name: "Cena", items: [
                    F("ing_salmon", "Salmón Fresco (horno)", 180),
                    F("ing_potato", "Patata", 200),
                    F("ing_kale", "Kale / Col Rizada", 100),
                    F("ing_aove", "AOVE", 5, "ml")
                ]
            }
        ]
    },
    {
        name: "Menú-2400kcal-FUERZA-V3-(Est.175P/275C/62G)",
        meals: [
            {
                name: "Desayuno", items: [
                    R("rec_pan_tomate_jamon", "Tostada de Jamón, Tomate y AOVE"),
                    F("ing_egg_whites", "Claras de Huevo", 200),
                    F("ing_banana", "Plátano", 1, "unidad"),
                    F("ing_yogurt_skim", "Yogur Desnatado", 1, "unidad"),
                    F("ing_coffee", "Café solo", 150, "ml")
                ]
            },
            {
                name: "Almuerzo", items: [
                    F("ing_pork_sirloin", "Solomillo de Cerdo", 180),
                    F("ing_quinoa", "Quinoa", 80),
                    F("ing_brussels_sprouts", "Coles de Bruselas", 150),
                    F("ing_aove", "AOVE", 10, "ml"),
                    F("ing_orange", "Naranja", 1, "unidad")
                ]
            },
            {
                name: "Merienda", items: [
                    R("rec_snack_batido_pro", "Batido de Proteína y Plátano"),
                    F("ing_oats", "Copos de Avena", 30),
                    F("ing_peanut_butter", "Crema de Cacahuete", 10)
                ]
            },
            {
                name: "Cena", items: [
                    R("rec_ensalada_quinoa_pavo", "Ensalada de Quinoa y Pavo"),
                    F("ing_canned_chickpeas", "Garbanzos Cocidos (bote)", 80),
                    F("ing_aove", "AOVE", 5, "ml")
                ]
            }
        ]
    },

    // ═══════════════════════════════════════
    // DÍA 7 VARIANTS – ~2600kcal VOLUMEN
    // ═══════════════════════════════════════
    {
        name: "Menú-2600kcal-VOL-V2-(Est.185P/320C/65G)",
        meals: [
            {
                name: "Desayuno", items: [
                    R("rec_tortitas_avena_platano", "Tortitas de Avena y Plátano"),
                    F("ing_egg", "Huevo L", 2, "unidad"),
                    F("ing_honey", "Miel", 10),
                    F("ing_peanut_butter", "Crema de Cacahuete", 15),
                    F("ing_coffee", "Café solo", 150, "ml")
                ]
            },
            {
                name: "Almuerzo", items: [
                    F("ing_beef_lean", "Ternera Magra (plancha)", 200),
                    F("ing_brown_rice", "Arroz Integral", 100),
                    F("ing_cauliflower", "Coliflor", 150),
                    F("ing_aove", "AOVE", 10, "ml"),
                    F("ing_pear", "Pera", 1, "unidad")
                ]
            },
            {
                name: "Merienda", items: [
                    F("ing_whey_protein", "Proteína Whey", 30),
                    F("ing_milk_semi", "Leche Semidesnatada", 250, "ml"),
                    F("ing_oats", "Copos de Avena", 40),
                    F("ing_mango", "Mango", 100),
                    F("ing_walnuts", "Nueces", 20)
                ]
            },
            {
                name: "Cena", items: [
                    R("rec_pasta_integral_atun", "Pasta Integral con Atún y Tomate"),
                    F("ing_chicken_breast", "Pechuga de Pollo (extra)", 100),
                    F("ing_apple", "Manzana", 1, "unidad")
                ]
            }
        ]
    },
    {
        name: "Menú-2600kcal-VOL-V3-(Est.185P/320C/65G)",
        meals: [
            {
                name: "Desayuno", items: [
                    R("rec_bowl_griego", "Bowl de Yogur Griego y Chía"),
                    F("ing_oats", "Copos de Avena", 40),
                    F("ing_banana", "Plátano", 1, "unidad"),
                    F("ing_dates", "Dátiles Medjool", 25),
                    F("ing_coffee", "Café solo", 150, "ml")
                ]
            },
            {
                name: "Almuerzo", items: [
                    R("rec_pollo_arroz_brocoli", "Pollo al Curry con Arroz y Brócoli"),
                    F("ing_whole_wheat_bread", "Pan Integral", 2, "unidad"),
                    F("ing_aove", "AOVE", 5, "ml"),
                    F("ing_orange", "Naranja", 1, "unidad")
                ]
            },
            {
                name: "Merienda", items: [
                    R("rec_ensalada_lentejas_atun", "Ensalada de Lentejas y Atún"),
                    F("ing_walnuts", "Nueces", 15),
                    F("ing_kiwi", "Kiwi", 1, "unidad")
                ]
            },
            {
                name: "Cena", items: [
                    F("ing_pork_sirloin", "Solomillo de Cerdo (horno)", 180),
                    F("ing_white_rice", "Arroz Blanco", 80),
                    F("ing_mushrooms", "Champiñones", 100),
                    F("ing_aove", "AOVE", 10, "ml"),
                    F("ing_peach", "Melocotón", 1, "unidad")
                ]
            }
        ]
    },

    // ═══════════════════════════════════════
    // DÍA 8 VARIANTS – ~1600kcal PESCADO
    // ═══════════════════════════════════════
    {
        name: "Menú-1600kcal-PESCADO-V2-(Est.140P/140C/48G)",
        meals: [
            {
                name: "Desayuno", items: [
                    F("ing_rye_bread", "Pan de Centeno", 2, "unidad"),
                    F("ing_tomato", "Tomate rallado", 80),
                    F("ing_aove", "AOVE", 10, "ml"),
                    F("ing_tuna_water", "Atún al Natural", 1, "unidad"),
                    F("ing_coffee", "Café solo", 150, "ml")
                ]
            },
            {
                name: "Almuerzo", items: [
                    R("rec_merluza_vapor", "Merluza al Vapor con Verduras"),
                    F("ing_white_rice", "Arroz Blanco", 50),
                    F("ing_orange", "Naranja", 1, "unidad")
                ]
            },
            {
                name: "Merienda", items: [
                    F("ing_yogurt_greek", "Yogur Griego Natural", 1, "unidad"),
                    F("ing_strawberries", "Fresas", 100),
                    F("ing_almonds", "Almendras", 10)
                ]
            },
            {
                name: "Cena", items: [
                    F("ing_salmon", "Salmón Fresco (plancha)", 150),
                    F("ing_eggplant", "Berenjena", 150),
                    F("ing_tomato", "Tomate", 100),
                    F("ing_aove", "AOVE", 5, "ml")
                ]
            }
        ]
    },
    {
        name: "Menú-1600kcal-PESCADO-V3-(Est.140P/140C/48G)",
        meals: [
            {
                name: "Desayuno", items: [
                    F("ing_whole_wheat_bread", "Pan Integral", 2, "unidad"),
                    F("ing_avocado", "Aguacate", 40),
                    F("ing_egg_whites", "Claras de Huevo", 100),
                    F("ing_coffee", "Café solo", 150, "ml")
                ]
            },
            {
                name: "Almuerzo", items: [
                    R("rec_bacalao_pisto", "Bacalao al Horno con Pisto"),
                    F("ing_potato", "Patata cocida", 100),
                    F("ing_kiwi", "Kiwi", 1, "unidad")
                ]
            },
            {
                name: "Merienda", items: [
                    F("ing_cottage_cheese", "Queso Cottage", 150),
                    F("ing_pineapple", "Piña Natural", 100),
                    F("ing_hazelnuts", "Avellanas", 10)
                ]
            },
            {
                name: "Cena", items: [
                    F("ing_shrimp", "Gambas / Langostinos (plancha)", 150),
                    F("ing_zucchini", "Calabacín", 150),
                    F("ing_artichoke", "Alcachofa", 100),
                    F("ing_aove", "AOVE", 10, "ml")
                ]
            }
        ]
    },

    // ═══════════════════════════════════════
    // DÍA 9 VARIANTS – ~1900kcal LEGUMBRES
    // ═══════════════════════════════════════
    {
        name: "Menú-1900kcal-LEGUMBRE-V2-(Est.120P/240C/42G)",
        meals: [
            {
                name: "Desayuno", items: [
                    R("rec_tortitas_avena_platano", "Tortitas de Avena y Plátano"),
                    F("ing_yogurt_skim", "Yogur Desnatado", 1, "unidad"),
                    F("ing_coffee", "Café solo", 150, "ml")
                ]
            },
            {
                name: "Almuerzo", items: [
                    R("rec_garbanzos_espinacas", "Potaje de Garbanzos y Espinacas"),
                    F("ing_whole_wheat_bread", "Pan Integral", 1, "unidad"),
                    F("ing_kiwi", "Kiwi", 1, "unidad")
                ]
            },
            {
                name: "Merienda", items: [
                    F("ing_fresh_cheese", "Queso Fresco Burgos", 60),
                    F("ing_whey_protein", "Proteína Whey", 25),
                    F("ing_pear", "Pera", 1, "unidad"),
                    F("ing_pistachios", "Pistachos", 15)
                ]
            },
            {
                name: "Cena", items: [
                    R("rec_ensalada_lentejas_atun", "Ensalada de Lentejas y Atún"),
                    F("ing_brown_rice", "Arroz Integral", 40),
                    F("ing_aove", "AOVE", 5, "ml"),
                    F("ing_cucumber", "Pepino", 100)
                ]
            }
        ]
    },
    {
        name: "Menú-1900kcal-LEGUMBRE-V3-(Est.120P/240C/42G)",
        meals: [
            {
                name: "Desayuno", items: [
                    R("rec_smoothie_kefir", "Smoothie Bowl de Kéfir y Frutos Rojos"),
                    F("ing_whole_wheat_bread", "Pan Integral", 1, "unidad"),
                    F("ing_egg", "Huevo L", 1, "unidad"),
                    F("ing_coffee", "Café solo", 150, "ml")
                ]
            },
            {
                name: "Almuerzo", items: [
                    F("ing_canned_chickpeas", "Garbanzos Cocidos (bote)", 200),
                    F("ing_chicken_breast", "Pechuga de Pollo", 100),
                    F("ing_pepper", "Pimiento Rojo", 100),
                    F("ing_onion", "Cebolla", 40),
                    F("ing_couscous", "Cuscús", 50),
                    F("ing_aove", "AOVE", 10, "ml")
                ]
            },
            {
                name: "Merienda", items: [
                    R("rec_snack_manzana_almendras", "Manzana con Almendras"),
                    F("ing_whey_protein", "Proteína Whey", 25),
                    F("ing_turkey_breast", "Pechuga de Pavo (fiambre)", 60)
                ]
            },
            {
                name: "Cena", items: [
                    R("rec_lentejas_vegetales", "Lentejas Estofadas con Verduras"),
                    F("ing_fresh_cheese", "Queso Fresco Burgos", 50),
                    F("ing_peach", "Melocotón", 1, "unidad")
                ]
            }
        ]
    },

    // ═══════════════════════════════════════
    // DÍA 10 VARIANTS – ~2100kcal MIX
    // ═══════════════════════════════════════
    {
        name: "Menú-2100kcal-MIX-V2-(Est.160P/220C/55G)",
        meals: [
            {
                name: "Desayuno", items: [
                    R("rec_porridge_avena", "Gachas de Avena y Arándanos"),
                    F("ing_egg_whites", "Claras de Huevo", 100),
                    F("ing_peanut_butter", "Crema de Cacahuete", 10),
                    F("ing_coffee", "Café solo", 150, "ml")
                ]
            },
            {
                name: "Almuerzo", items: [
                    R("rec_burger_pollo_integral", "Burger de Pollo Fit en Pan Integral"),
                    F("ing_sweet_potato", "Boniato", 150),
                    F("ing_arugula", "Rúcula", 50),
                    F("ing_aove", "AOVE", 5, "ml")
                ]
            },
            {
                name: "Merienda", items: [
                    F("ing_whey_protein", "Proteína Whey", 30),
                    F("ing_milk_semi", "Leche Semidesnatada", 250, "ml"),
                    F("ing_apple", "Manzana", 1, "unidad"),
                    F("ing_walnuts", "Nueces", 15)
                ]
            },
            {
                name: "Cena", items: [
                    F("ing_hake", "Merluza (horno)", 200),
                    F("ing_potato", "Patata cocida", 150),
                    F("ing_chard", "Acelgas", 150),
                    F("ing_aove", "AOVE", 10, "ml")
                ]
            }
        ]
    },
    {
        name: "Menú-2100kcal-MIX-V3-(Est.160P/220C/55G)",
        meals: [
            {
                name: "Desayuno", items: [
                    R("rec_pan_tomate_jamon", "Tostada de Jamón, Tomate y AOVE"),
                    F("ing_yogurt_greek", "Yogur Griego Natural", 1, "unidad"),
                    F("ing_blueberries", "Arándanos", 50),
                    F("ing_coffee", "Café solo", 150, "ml")
                ]
            },
            {
                name: "Almuerzo", items: [
                    F("ing_pork_loin", "Lomo de Cerdo (plancha)", 180),
                    F("ing_white_rice", "Arroz Blanco", 70),
                    F("ing_pepper", "Pimiento Rojo", 100),
                    F("ing_mushrooms", "Champiñones", 100),
                    F("ing_aove", "AOVE", 10, "ml")
                ]
            },
            {
                name: "Merienda", items: [
                    R("rec_bowl_cottage_nueces", "Bowl de Requesón y Nueces"),
                    F("ing_banana", "Plátano", 100)
                ]
            },
            {
                name: "Cena", items: [
                    R("rec_ensalada_quinoa_pavo", "Ensalada de Quinoa y Pavo"),
                    F("ing_canned_lentils", "Lentejas Cocidas (bote)", 80),
                    F("ing_aove", "AOVE", 5, "ml")
                ]
            }
        ]
    }
];

// =============================================
// EXECUTION
// =============================================
async function seed() {
    console.log('🫒 Seeding Mediterranean Menu VARIANTS...\n');

    for (const menu of variants) {
        const res = await db.collection('nutrition_days').add({
            ...menu,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`   ✅ ${menu.name} → ${res.id}`);
    }

    console.log(`\n🎉 Done! ${variants.length} variant days created.`);
}

seed().then(() => process.exit(0)).catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
