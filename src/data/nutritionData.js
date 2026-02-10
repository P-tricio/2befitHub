
/**
 * Curated list of common Spanish ingredients and recipes.
 * Values are estimates based on BEDCA (Base de Datos Española de Composición de Alimentos)
 * and generic nutritional databases.
 */

export const curateIngredients = [
    // --- PROTEÍNAS (Carnes, Pescados, Huevos) ---
    { id: 'ing_chicken_breast', name: 'Pechuga de Pollo', category: 'Proteínas', macros: { kcal: 113, protein: 23, carbs: 0, fat: 2.5 }, micros: { iron: 1.0, calcium: 12 }, unit: '100g' },
    { id: 'ing_chicken_thigh_skinless', name: 'Contramuslo de Pollo (sin piel)', category: 'Proteínas', macros: { kcal: 155, protein: 18, carbs: 0, fat: 9.0 }, micros: { iron: 1.2, zinc: 2.0 }, unit: '100g' },
    { id: 'ing_chicken_thigh_skin', name: 'Contramuslo de Pollo (con piel)', category: 'Proteínas', macros: { kcal: 215, protein: 21, carbs: 0, fat: 14.0 }, micros: { vitaminA: 40, iron: 1.0 }, unit: '100g' },
    { id: 'ing_turkey_breast', name: 'Pechuga de Pavo', category: 'Proteínas', macros: { kcal: 105, protein: 24, carbs: 0, fat: 1.0 }, micros: { iron: 0.8, potassium: 330 }, unit: '100g' },
    { id: 'ing_rabbit', name: 'Conejo', category: 'Proteínas', macros: { kcal: 133, protein: 22, carbs: 0, fat: 5.0 }, micros: { b12: 8.0, potassium: 350 }, unit: '100g' },
    { id: 'ing_beef_lean', name: 'Ternera Magra', category: 'Proteínas', macros: { kcal: 130, protein: 21, carbs: 0, fat: 5.0 }, micros: { iron: 2.5, b12: 2.0 }, unit: '100g' },
    { id: 'ing_pork_sirloin', name: 'Solomillo de Cerdo', category: 'Proteínas', macros: { kcal: 140, protein: 22, carbs: 0, fat: 6.0 }, micros: { thiamine: 0.8, zinc: 2.5 }, unit: '100g' },
    { id: 'ing_pork_loin', name: 'Lomo de Cerdo', category: 'Proteínas', macros: { kcal: 104, protein: 20, carbs: 0, fat: 2.6 }, micros: { thiamine: 0.7, zinc: 2.1 }, unit: '100g' },
    { id: 'ing_burger_lean', name: 'Hamburguesa Magra (<5% grasa)', category: 'Proteínas', macros: { kcal: 125, protein: 20, carbs: 0, fat: 5.0 }, micros: { b12: 2.0, iron: 2.1 }, unit: '100g' },
    { id: 'ing_offal', name: 'Vísceras (Hígado)', category: 'Proteínas', macros: { kcal: 135, protein: 20, carbs: 4.0, fat: 4.0 }, micros: { vitaminA: 6000, b12: 60 }, unit: '100g' },
    { id: 'ing_egg', name: 'Huevo L (aprox 60g)', category: 'Proteínas', macros: { kcal: 150, protein: 12.5, carbs: 0.7, fat: 10.5 }, micros: { vitaminD: 1.8, iron: 1.2 }, unit: 'unidad', portionWeight: 60 },
    { id: 'ing_egg_whites', name: 'Claras de Huevo', category: 'Proteínas', macros: { kcal: 52, protein: 11, carbs: 0.7, fat: 0.2 }, micros: { potassium: 160, selenium: 20 }, unit: '100g' },

    // --- PESCADOS Y MARISCOS ---
    { id: 'ing_salmon', name: 'Salmón Fresco', category: 'Pescados', macros: { kcal: 200, protein: 20, carbs: 0, fat: 13.0 }, micros: { omega3: 2.5, vitaminD: 10 }, unit: '100g' },
    { id: 'ing_hake', name: 'Merluza', category: 'Pescados', macros: { kcal: 75, protein: 16.5, carbs: 0, fat: 0.8 }, micros: { selenium: 25, iodine: 30 }, unit: '100g' },
    { id: 'ing_cod', name: 'Bacalao Fresco', category: 'Pescados', macros: { kcal: 82, protein: 18, carbs: 0, fat: 0.7 }, micros: { potassium: 400, iodine: 15 }, unit: '100g' },
    { id: 'ing_tuna_fresh', name: 'Atún Fresco', category: 'Pescados', macros: { kcal: 130, protein: 24, carbs: 0, fat: 3.0 }, micros: { b12: 9.0, selenium: 90 }, unit: '100g' },
    { id: 'ing_shrimp', name: 'Gambas / Langostinos', category: 'Mariscos', macros: { kcal: 95, protein: 20, carbs: 0, fat: 1.0 }, micros: { iodine: 30, selenium: 40 }, unit: '100g' },
    { id: 'ing_squid', name: 'Calamar / Sepia', category: 'Mariscos', macros: { kcal: 90, protein: 16, carbs: 1.0, fat: 1.5 }, micros: { copper: 2.0, b12: 1.5 }, unit: '100g' },
    { id: 'ing_clams', name: 'Almejas / Berberechos', category: 'Mariscos', macros: { kcal: 75, protein: 13, carbs: 3.5, fat: 1.0 }, micros: { iron: 14, b12: 50 }, unit: '100g' },
    { id: 'ing_mussels', name: 'Mejillones', category: 'Mariscos', macros: { kcal: 86, protein: 12, carbs: 3.7, fat: 2.2 }, micros: { iron: 4.5, b12: 12 }, unit: '100g' },

    // --- CONSERVAS ---
    { id: 'ing_tuna_water', name: 'Atún al Natural (lata)', category: 'Conservas', macros: { kcal: 100, protein: 24, carbs: 0, fat: 0.5 }, micros: { b12: 4.0, niacin: 12 }, unit: 'unidad', portionWeight: 56 },
    { id: 'ing_tuna_oil_oliva', name: 'Atún en Aceite de Oliva (conserva)', category: 'Conservas', macros: { kcal: 220, protein: 28, carbs: 0, fat: 12.0 }, micros: { b12: 3.5, iron: 1.2 }, unit: '100g (escurrido)' },
    { id: 'ing_tuna_oil_girasol', name: 'Atún en Aceite de Girasol (conserva)', category: 'Conservas', macros: { kcal: 200, protein: 26, carbs: 0, fat: 10.5 }, micros: { vitaminE: 5.0 }, unit: '100g (escurrido)' },
    { id: 'ing_mackerel_oil', name: 'Caballa en Aceite de Oliva (conserva)', category: 'Conservas', macros: { kcal: 250, protein: 23, carbs: 0, fat: 18.0 }, micros: { omega3: 3.0, b12: 8.0 }, unit: '100g (escurrido)' },
    { id: 'ing_sardines_oil', name: 'Sardinas en Aceite de Oliva (conserva)', category: 'Conservas', macros: { kcal: 210, protein: 24, carbs: 0, fat: 12.0 }, micros: { calcium: 300, vitaminD: 12 }, unit: '100g (escurrido)' },

    // --- PROTEÍNAS VEGANAS ---
    { id: 'ing_tofu', name: 'Tofu firme', category: 'Proteínas Veganas', macros: { kcal: 85, protein: 10, carbs: 2.0, fat: 4.5 }, micros: { calcium: 350, iron: 5.4 }, unit: '100g' },
    { id: 'ing_textured_soy', name: 'Soja Texturizada', category: 'Proteínas Veganas', macros: { kcal: 350, protein: 50, carbs: 30, fat: 1.0 }, micros: { iron: 9.0, magnesium: 250 }, unit: '100g (seco)' },
    { id: 'ing_edamame', name: 'Edamame', category: 'Proteínas Veganas', macros: { kcal: 120, protein: 11, carbs: 10, fat: 5.0 }, micros: { fiber: 5.0, folate: 311 }, unit: '100g' },
    { id: 'ing_seitan', name: 'Seitán', category: 'Proteínas Veganas', macros: { kcal: 110, protein: 21, carbs: 4.0, fat: 1.0 }, micros: { iron: 1.5 }, unit: '100g' },
    { id: 'ing_tempeh', name: 'Tempeh', category: 'Proteínas Veganas', macros: { kcal: 190, protein: 19, carbs: 9.0, fat: 11 }, micros: { probiotics: 100, magnesium: 80 }, unit: '100g' },

    // --- CARBOHIDRATOS (Cereales, Tubérculos) ---
    { id: 'ing_brown_rice', name: 'Arroz Integral', category: 'Carbohidratos', macros: { kcal: 350, protein: 7.5, carbs: 72, fat: 2.5 }, micros: { magnesium: 143, fiber: 3.5 }, unit: '100g (seco)' },
    { id: 'ing_white_rice', name: 'Arroz Blanco', category: 'Carbohidratos', macros: { kcal: 355, protein: 7.0, carbs: 78, fat: 0.6 }, micros: { b1: 0.1, selenium: 15 }, unit: '100g (seco)' },
    { id: 'ing_quinoa', name: 'Quinoa (seca)', category: 'Carbohidratos', macros: { kcal: 360, protein: 14, carbs: 64, fat: 6.0 }, micros: { magnesium: 197, fiber: 7.0 }, unit: '100g' },
    { id: 'ing_oats', name: 'Copos de Avena', category: 'Carbohidratos', macros: { kcal: 380, protein: 13, carbs: 66, fat: 7.0 }, micros: { fiber: 10, magnesium: 177 }, unit: '100g' },
    { id: 'ing_pasta_wheat', name: 'Pasta de Trigo Duro', category: 'Carbohidratos', macros: { kcal: 360, protein: 12, carbs: 72, fat: 1.5 }, micros: { selenium: 30, iron: 1.5 }, unit: '100g (seco)' },
    { id: 'ing_potato', name: 'Patata', category: 'Carbohidratos', macros: { kcal: 77, protein: 2.0, carbs: 17, fat: 0.1 }, micros: { potassium: 420, vitaminC: 20 }, unit: '100g' },
    { id: 'ing_sweet_potato', name: 'Boniato / Batata', category: 'Carbohidratos', macros: { kcal: 86, protein: 1.6, carbs: 20, fat: 0.1 }, micros: { vitaminA: 700, potassium: 337 }, unit: '100g' },
    { id: 'ing_gnocchi', name: 'Gnocchi (Ñoquis)', category: 'Carbohidratos', macros: { kcal: 150, protein: 3.5, carbs: 32, fat: 0.5 }, micros: { sodium: 300 }, unit: '100g' },
    { id: 'ing_yucca', name: 'Yuca / Mandioca', category: 'Carbohidratos', macros: { kcal: 160, protein: 1.4, carbs: 38, fat: 0.3 }, micros: { vitaminC: 20, potassium: 270 }, unit: '100g' },
    { id: 'ing_corn_tortilla', name: 'Tortilla de Maíz', category: 'Carbohidratos', macros: { kcal: 210, protein: 5.0, carbs: 45, fat: 2.5 }, micros: { calcium: 150, magnesium: 60 }, unit: '100g' },
    { id: 'ing_couscous', name: 'Cuscús (seco)', category: 'Carbohidratos', macros: { kcal: 360, protein: 13, carbs: 73, fat: 0.6 }, micros: { selenium: 27, fiber: 5.0 }, unit: '100g' },
    { id: 'ing_wasa_bread', name: 'Pan Wasa / Tostado', category: 'Panes', macros: { kcal: 330, protein: 9.0, carbs: 60, fat: 2.0 }, micros: { fiber: 15 }, unit: '100g' },
    { id: 'ing_rice_corn_cakes', name: 'Tortitas de Arroz o Maíz', category: 'Snacks', macros: { kcal: 380, protein: 8.0, carbs: 80, fat: 3.0 }, micros: { sodium: 300 }, unit: 'unidad', portionWeight: 8 },

    // --- PANES ---
    { id: 'ing_whole_wheat_bread', name: 'Pan Integral (rebanada)', category: 'Panes', macros: { kcal: 250, protein: 9.0, carbs: 45, fat: 3.0 }, micros: { fiber: 7.0, magnesium: 75 }, unit: 'unidad', portionWeight: 30 },
    { id: 'ing_white_bread', name: 'Pan Blanco (rebanada)', category: 'Panes', macros: { kcal: 270, protein: 8.5, carbs: 52, fat: 1.6 }, micros: { b1: 0.1, iron: 1.2, fiber: 2.7 }, unit: 'unidad', portionWeight: 30 },
    { id: 'ing_rye_bread', name: 'Pan de Centeno (rebanada)', category: 'Panes', macros: { kcal: 230, protein: 6.5, carbs: 46, fat: 1.5 }, micros: { fiber: 8.0, magnesium: 55 }, unit: 'unidad', portionWeight: 30 },
    { id: 'ing_multigrain_bread', name: 'Pan de Cereales (rebanada)', category: 'Panes', macros: { kcal: 280, protein: 10, carbs: 40, fat: 8.0 }, micros: { iron: 2.5, fiber: 6.0 }, unit: 'unidad', portionWeight: 35 },

    // --- GRASAS (Aceites, Frutos Secos) ---
    { id: 'ing_aove', name: 'Aceite de Oliva Virgen Extra', category: 'Grasas', macros: { kcal: 884, protein: 0, carbs: 0, fat: 100 }, micros: { vitaminE: 14, iron: 0.1 }, unit: '100ml' },
    { id: 'ing_coconut_oil', name: 'Aceite de Coco Virgen Extra', category: 'Grasas', macros: { kcal: 860, protein: 0, carbs: 0, fat: 100 }, micros: { mct: 60 }, unit: '100ml' },
    { id: 'ing_butter', name: 'Mantequilla (de pasto)', category: 'Grasas', macros: { kcal: 717, protein: 0.8, carbs: 0.1, fat: 81 }, micros: { vitaminA: 680, vitaminD: 1.5 }, unit: '100g' },
    { id: 'ing_avocado', name: 'Aguacate', category: 'Grasas', macros: { kcal: 160, protein: 2.0, carbs: 8.5, fat: 15.0 }, micros: { potassium: 485, fiber: 6.7 }, unit: '100g' },
    { id: 'ing_olives', name: 'Aceitunas', category: 'Grasas', macros: { kcal: 115, protein: 0.8, carbs: 6.0, fat: 11 }, micros: { vitaminE: 1.5, fiber: 3.0 }, unit: '100g' },
    { id: 'ing_walnuts', name: 'Nueces', category: 'Grasas', macros: { kcal: 650, protein: 15, carbs: 14, fat: 65 }, micros: { omega3: 9.0, magnesium: 158, fiber: 6.7 }, unit: '100g' },
    { id: 'ing_almonds', name: 'Almendras', category: 'Grasas', macros: { kcal: 580, protein: 21, carbs: 21, fat: 50 }, micros: { magnesium: 270, calcium: 260, fiber: 12.5 }, unit: '100g' },
    { id: 'ing_hazelnuts', name: 'Avellanas', category: 'Grasas', macros: { kcal: 628, protein: 15, carbs: 17, fat: 61 }, micros: { vitaminE: 15, magnesium: 160, fiber: 9.7 }, unit: '100g' },
    { id: 'ing_pistachios', name: 'Pistachos', category: 'Grasas', macros: { kcal: 560, protein: 20, carbs: 27, fat: 45 }, micros: { potassium: 1025, fiber: 10 }, unit: '100g' },
    { id: 'ing_cashews', name: 'Anacardos', category: 'Grasas', macros: { kcal: 550, protein: 18, carbs: 30, fat: 44 }, micros: { iron: 6.7, magnesium: 290, fiber: 3.3 }, unit: '100g' },
    { id: 'ing_peanut_butter', name: 'Crema de Cacahuete Natural', category: 'Grasas', macros: { kcal: 590, protein: 25, carbs: 13, fat: 50 }, micros: { magnesium: 150, potassium: 650, fiber: 6.0 }, unit: '100g' },
    { id: 'ing_chia_seeds', name: 'Semillas de Chía', category: 'Grasas', macros: { kcal: 485, protein: 17, carbs: 42, fat: 31 }, micros: { fiber: 34, calcium: 630 }, unit: '100g' },
    { id: 'ing_cured_cheese', name: 'Queso Curado', category: 'Grasas / Lácteos', macros: { kcal: 400, protein: 25, carbs: 1.0, fat: 33 }, micros: { calcium: 800, phosphorus: 500 }, unit: '100g' },

    // --- LEGUMBRES ---
    { id: 'ing_lentils', name: 'Lentejas (secas)', category: 'Legumbres', macros: { kcal: 310, protein: 24, carbs: 48, fat: 1.5 }, micros: { iron: 7.0, fiber: 11 }, unit: '100g' },
    { id: 'ing_chickpeas', name: 'Garbanzos (secos)', category: 'Legumbres', macros: { kcal: 340, protein: 19, carbs: 50, fat: 6.0 }, micros: { folate: 550, iron: 6.2, fiber: 15 }, unit: '100g' },
    { id: 'ing_white_beans', name: 'Alubias Blancas (secas)', category: 'Legumbres', macros: { kcal: 330, protein: 23, carbs: 45, fat: 1.5 }, micros: { fiber: 15, iron: 10 }, unit: '100g' },
    { id: 'ing_peas', name: 'Guisantes', category: 'Legumbres / Vegetales', macros: { kcal: 81, protein: 5.4, carbs: 14, fat: 0.4 }, micros: { vitaminC: 40, fiber: 5.0 }, unit: '100g' },

    // --- LÁCTEOS Y ALTERNATIVAS ---
    { id: 'ing_milk_whole', name: 'Leche Entera', category: 'Lácteos', macros: { kcal: 63, protein: 3.3, carbs: 4.7, fat: 3.6 }, micros: { calcium: 120, vitaminA: 40 }, unit: '100ml' },
    { id: 'ing_milk_semi', name: 'Leche Semidesnatada', category: 'Lácteos', macros: { kcal: 46, protein: 3.4, carbs: 4.8, fat: 1.6 }, micros: { calcium: 120, vitaminD: 0.5 }, unit: '100ml' },
    { id: 'ing_milk_skim', name: 'Leche Desnatada', category: 'Lácteos', macros: { kcal: 35, protein: 3.4, carbs: 4.8, fat: 0.1 }, micros: { calcium: 120, vitaminD: 1.0 }, unit: '100ml' },
    { id: 'ing_yogurt_plain', name: 'Yogur Natural (unidad)', category: 'Lácteos', macros: { kcal: 61, protein: 3.5, carbs: 4.7, fat: 3.3 }, micros: { calcium: 120, b12: 0.5 }, unit: 'unidad', portionWeight: 125 },
    { id: 'ing_yogurt_skim', name: 'Yogur Desnatado 0% (unidad)', category: 'Lácteos', macros: { kcal: 34, protein: 4.3, carbs: 4.2, fat: 0.1 }, micros: { calcium: 140, magnesium: 12 }, unit: 'unidad', portionWeight: 125 },
    { id: 'ing_yogurt_beaten', name: 'Queso Batido 0%', category: 'Lácteos', macros: { kcal: 48, protein: 8.0, carbs: 3.5, fat: 0.1 }, micros: { calcium: 120, b12: 0.3 }, unit: '100g' },
    { id: 'ing_yogurt_greek', name: 'Yogur Griego Natural (unidad)', category: 'Lácteos', macros: { kcal: 115, protein: 9.0, carbs: 4.0, fat: 7.0 }, micros: { calcium: 110, b12: 0.7 }, unit: 'unidad', portionWeight: 125 },
    { id: 'ing_yogurt_bifidus', name: 'Yogur Bífidus Natural (unidad)', category: 'Lácteos', macros: { kcal: 45, protein: 3.5, carbs: 4.8, fat: 1.5 }, micros: { probiotics: 1000 }, unit: 'unidad', portionWeight: 125 },
    { id: 'ing_kefir', name: 'Kéfir Natural', category: 'Lácteos', macros: { kcal: 60, protein: 3.5, carbs: 4.0, fat: 3.3 }, micros: { probiotics: 2000, b12: 0.4 }, unit: '100ml' },
    { id: 'ing_cottage_cheese', name: 'Queso Cottage', category: 'Lácteos', macros: { kcal: 98, protein: 11, carbs: 3.4, fat: 4.3 }, micros: { selenium: 15, b12: 0.4 }, unit: '100g' },
    { id: 'ing_fresh_cheese', name: 'Queso Fresco (tipo Burgos)', category: 'Lácteos', macros: { kcal: 180, protein: 12, carbs: 3.0, fat: 13 }, micros: { calcium: 180, phosphorus: 150 }, unit: '100g' },
    { id: 'ing_whey_protein', name: 'Proteína de Suero (Whey)', category: 'Suplementos', macros: { kcal: 380, protein: 80, carbs: 4.0, fat: 3.0 }, micros: { bcaa: 18, calcium: 500 }, unit: '100g' },

    // --- VEGETALES Y HORTALIZAS ---
    { id: 'ing_spinach', name: 'Espinacas Frescas', category: 'Vegetales', macros: { kcal: 23, protein: 2.9, carbs: 3.6, fat: 0.4 }, micros: { vitaminK: 480, iron: 2.7, fiber: 2.2 }, unit: '100g' },
    { id: 'ing_lambs_lettuce', name: 'Canónigos', category: 'Vegetales', macros: { kcal: 14, protein: 2.0, carbs: 0.7, fat: 0.4 }, micros: { vitaminC: 35, iron: 2.0, fiber: 1.5 }, unit: '100g' },
    { id: 'ing_arugula', name: 'Rúcula', category: 'Vegetales', macros: { kcal: 25, protein: 2.6, carbs: 3.7, fat: 0.7 }, micros: { vitaminK: 108, calcium: 160, fiber: 1.6 }, unit: '100g' },
    { id: 'ing_chard', name: 'Acelgas', category: 'Vegetales', macros: { kcal: 19, protein: 1.8, carbs: 3.7, fat: 0.2 }, micros: { potassium: 370, fiber: 1.6 }, unit: '100g' },
    { id: 'ing_kale', name: 'Kale / Col Rizada', category: 'Vegetales', macros: { kcal: 49, protein: 4.3, carbs: 8.8, fat: 0.9 }, micros: { vitaminC: 120, calcium: 150, fiber: 3.6 }, unit: '100g' },
    { id: 'ing_broccoli', name: 'Brócoli', category: 'Vegetales', macros: { kcal: 34, protein: 2.8, carbs: 7.0, fat: 0.4 }, micros: { vitaminC: 89, folate: 63, fiber: 2.6 }, unit: '100g' },
    { id: 'ing_cauliflower', name: 'Coliflor', category: 'Vegetales', macros: { kcal: 25, protein: 1.9, carbs: 4.9, fat: 0.3 }, micros: { vitaminC: 48, vitaminK: 15, fiber: 2.0 }, unit: '100g' },
    { id: 'ing_brussels_sprouts', name: 'Coles de Bruselas', category: 'Vegetales', macros: { kcal: 43, protein: 3.4, carbs: 9.0, fat: 0.3 }, micros: { vitaminC: 85, fiber: 3.8 }, unit: '100g' },
    { id: 'ing_asparagus', name: 'Espárragos Trigueros', category: 'Vegetales', macros: { kcal: 20, protein: 2.2, carbs: 3.9, fat: 0.1 }, micros: { vitaminK: 41, folate: 52, fiber: 2.1 }, unit: '100g' },
    { id: 'ing_zucchini', name: 'Calabacín', category: 'Vegetales', macros: { kcal: 17, protein: 1.2, carbs: 3.1, fat: 0.3 }, micros: { potassium: 260, vitaminC: 18, fiber: 1.0 }, unit: '100g' },
    { id: 'ing_cucumber', name: 'Pepino', category: 'Vegetales', macros: { kcal: 15, protein: 0.7, carbs: 3.6, fat: 0.1 }, micros: { potassium: 147, vitaminK: 16, fiber: 0.5 }, unit: '100g' },
    { id: 'ing_artichoke', name: 'Alcachofa', category: 'Vegetales', macros: { kcal: 47, protein: 3.3, carbs: 10, fat: 0.2 }, micros: { fiber: 5.4, magnesium: 60 }, unit: '100g' },
    { id: 'ing_tomato', name: 'Tomate', category: 'Vegetales', macros: { kcal: 18, protein: 0.9, carbs: 3.9, fat: 0.2 }, micros: { vitaminC: 13, lycopene: 2.5, fiber: 1.2 }, unit: '100g' },
    { id: 'ing_pepper', name: 'Pimiento Rojo / Verde', category: 'Vegetales', macros: { kcal: 26, protein: 1.0, carbs: 6.0, fat: 0.3 }, micros: { vitaminC: 127, vitaminA: 150, fiber: 1.5 }, unit: '100g' },
    { id: 'ing_carrot', name: 'Zanahoria', category: 'Vegetales', macros: { kcal: 41, protein: 0.9, carbs: 10, fat: 0.2 }, micros: { vitaminA: 835, beta_carotene: 8000, fiber: 2.8 }, unit: '100g' },
    { id: 'ing_pumpkin', name: 'Calabaza', category: 'Vegetales', macros: { kcal: 26, protein: 1.0, carbs: 6.5, fat: 0.1 }, micros: { vitaminA: 426, potassium: 340, fiber: 0.5 }, unit: '100g' },
    { id: 'ing_eggplant', name: 'Berenjena', category: 'Vegetales', macros: { kcal: 25, protein: 1.0, carbs: 6.0, fat: 0.2 }, micros: { fiber: 3.0, potassium: 230 }, unit: '100g' },
    { id: 'ing_onion', name: 'Cebolla', category: 'Vegetales', macros: { kcal: 40, protein: 1.1, carbs: 9.0, fat: 0.1 }, micros: { quercetin: 20, vitaminC: 7.4, fiber: 1.7 }, unit: '100g' },
    { id: 'ing_mushrooms', name: 'Setas / Champiñones', category: 'Vegetales', macros: { kcal: 22, protein: 3.1, carbs: 3.3, fat: 0.3 }, micros: { vitaminD: 0.2, selenium: 9.0, fiber: 1.0 }, unit: '100g' },

    // --- FRUTAS ---
    { id: 'ing_banana', name: 'Plátano (unidad)', category: 'Frutas', macros: { kcal: 89, protein: 1.1, carbs: 23, fat: 0.3 }, micros: { potassium: 358, vitaminB6: 0.4, fiber: 2.6 }, unit: 'unidad', portionWeight: 120 },
    { id: 'ing_apple', name: 'Manzana (unidad)', category: 'Frutas', macros: { kcal: 52, protein: 0.3, carbs: 14, fat: 0.2 }, micros: { fiber: 2.4, vitaminC: 4.6 }, unit: 'unidad', portionWeight: 180 },
    { id: 'ing_pear', name: 'Pera (unidad)', category: 'Frutas', macros: { kcal: 57, protein: 0.4, carbs: 15, fat: 0.1 }, micros: { fiber: 3.1, potassium: 116 }, unit: 'unidad', portionWeight: 160 },
    { id: 'ing_strawberries', name: 'Fresas', category: 'Frutas', macros: { kcal: 33, protein: 0.7, carbs: 8.0, fat: 0.3 }, micros: { vitaminC: 58, folate: 24, fiber: 2.0 }, unit: '100g' },
    { id: 'ing_blueberries', name: 'Arándanos', category: 'Frutas', macros: { kcal: 57, protein: 0.7, carbs: 14, fat: 0.3 }, micros: { antioxidants: 9000, vitaminC: 9.7, fiber: 2.4 }, unit: '100g' },
    { id: 'ing_rasp_blackberries', name: 'Frambuesas / Moras', category: 'Frutas', macros: { kcal: 45, protein: 1.2, carbs: 10, fat: 0.5 }, micros: { fiber: 6.5, vitaminC: 25 }, unit: '100g' },
    { id: 'ing_melon_watermelon', name: 'Melón / Sandía', category: 'Frutas', macros: { kcal: 30, protein: 0.6, carbs: 7.5, fat: 0.2 }, micros: { lycopene: 4.5, potassium: 110, fiber: 0.4 }, unit: '100g' },
    { id: 'ing_orange', name: 'Naranja (unidad)', category: 'Frutas', macros: { kcal: 47, protein: 0.9, carbs: 12, fat: 0.1 }, micros: { vitaminC: 53, folate: 30, fiber: 2.4 }, unit: 'unidad', portionWeight: 150 },
    { id: 'ing_peach', name: 'Melocotón / Nectarina (unidad)', category: 'Frutas', macros: { kcal: 40, protein: 0.9, carbs: 9.5, fat: 0.3 }, micros: { vitaminA: 16, vitaminC: 6.6, fiber: 1.5 }, unit: 'unidad', portionWeight: 150 },
    { id: 'ing_kiwi', name: 'Kiwi (unidad)', category: 'Frutas', macros: { kcal: 61, protein: 1.1, carbs: 15, fat: 0.5 }, micros: { vitaminC: 93, fiber: 3.0 }, unit: 'unidad', portionWeight: 80 },
    { id: 'ing_grapes', name: 'Uvas', category: 'Frutas', macros: { kcal: 67, protein: 0.6, carbs: 18, fat: 0.4 }, micros: { resveratrol: 0.5, potassium: 191, fiber: 0.9 }, unit: '100g' },

    // --- OTROS / CONDIMENTOS / BEBIDAS ---
    { id: 'ing_honey', name: 'Miel', category: 'Otros', macros: { kcal: 304, protein: 0.3, carbs: 82, fat: 0 }, micros: { minerals: 0.2, antioxidants: 0.1 }, unit: '100g' },
    { id: 'ing_jamon_ibérico', name: 'Jamón Ibérico', category: 'Embutidos Magros', macros: { kcal: 375, protein: 28, carbs: 0, fat: 28 }, micros: { iron: 3.3, zinc: 2.1 }, unit: '100g' },
    { id: 'ing_dark_chocolate', name: 'Chocolate Negro >85%', category: 'Snacks', macros: { kcal: 580, protein: 8.0, carbs: 20, fat: 45 }, micros: { magnesium: 230, iron: 12 }, unit: '100g' },
    { id: 'ing_oat_milk', name: 'Bebida de Avena', category: 'Lácteos Alternativos', macros: { kcal: 45, protein: 1.0, carbs: 7.0, fat: 1.5 }, micros: { calcium: 120, b12: 0.4 }, unit: '100ml' },
    { id: 'ing_water', name: 'Agua', category: 'Bebidas', macros: { kcal: 0, protein: 0, carbs: 0, fat: 0 }, micros: { minerals: 50 }, unit: '100ml' },
    { id: 'ing_coffee', name: 'Café solo', category: 'Bebidas', macros: { kcal: 2, protein: 0.1, carbs: 0, fat: 0 }, micros: { caffeine: 40 }, unit: '100ml' },
    { id: 'ing_tea', name: 'Té sin azúcar', category: 'Bebidas', macros: { kcal: 1, protein: 0, carbs: 0.2, fat: 0 }, micros: { antioxidants: 20 }, unit: '100ml' },

    // --- ESPECIAS Y ADEREZOS ---
    { id: 'ing_sp_turmeric', name: 'Cúrcuma', category: 'Especias', macros: { kcal: 350, protein: 8.0, carbs: 65, fat: 10 }, micros: { curcumin: 3000 }, unit: '100g' },
    { id: 'ing_sp_ginger', name: 'Jengibre', category: 'Especias', macros: { kcal: 80, protein: 1.8, carbs: 18, fat: 0.8 }, micros: { gingerol: 200 }, unit: '100g' },
    { id: 'ing_season_lemon', name: 'Limón', category: 'Aderezos', macros: { kcal: 29, protein: 1.1, carbs: 9.0, fat: 0.3 }, micros: { vitaminC: 53 }, unit: '100g' },
    { id: 'ing_season_mustard', name: 'Mostaza (sin azúcar)', category: 'Aderezos', macros: { kcal: 66, protein: 4.4, carbs: 5.0, fat: 4.0 }, micros: { sodium: 1100 }, unit: '100g' }
];

export const curatedRecipes = [
    // --- DESAYUNOS ---
    {
        id: 'rec_pan_tomate_jamon',
        name: 'Tostada de Jamón, Tomate y AOVE',
        type: 'Desayuno',
        difficulty: 'Fácil',
        description: 'Desayuno clásico mediterráneo, rico en proteínas y grasas saludables.',
        instructions: '1. Tuesta el pan integral.\n2. Ralla el tomate y mézclalo con el AOVE.\n3. Extiende sobre el pan y añade el jamón.',
        totalMacros: { kcal: 310, protein: 14, carbs: 25, fat: 18, fiber: 8 },
        ingredients: [
            { id: 'ing_whole_wheat_bread', name: 'Pan Integral (60g)', amount: 2, unit: 'unidad' },
            { id: 'ing_tomato', name: 'Tomate Rallado', amount: 50, unit: 'g' },
            { id: 'ing_aove', name: 'AOVE', amount: 10, unit: 'ml' },
            { id: 'ing_jamon_ibérico', name: 'Jamón Ibérico', amount: 30, unit: 'g' }
        ]
    },
    {
        id: 'rec_porridge_avena',
        name: 'Gachas de Avena y Arándanos',
        type: 'Desayuno',
        difficulty: 'Fácil',
        description: 'Bowl saciante con carbohidratos de absorción lenta y antioxidantes.',
        instructions: '1. Cocina la avena con la leche a fuego lento hasta que espese.\n2. Retira del fuego y añade los arándanos y nueces.\n3. Endulza con miel al gusto.',
        totalMacros: { kcal: 380, protein: 12, carbs: 55, fat: 12, fiber: 9 },
        ingredients: [
            { id: 'ing_oats', name: 'Copos de Avena', amount: 50, unit: 'g' },
            { id: 'ing_milk_skim', name: 'Leche Desnatada', amount: 200, unit: 'ml' },
            { id: 'ing_blueberries', name: 'Arándanos', amount: 50, unit: 'g' },
            { id: 'ing_walnuts', name: 'Nueces', amount: 15, unit: 'g' },
            { id: 'ing_honey', name: 'Miel', amount: 5, unit: 'g' }
        ]
    },
    {
        id: 'rec_tortitas_avena_platano',
        name: 'Tortitas de Avena y Plátano',
        description: 'Tortitas esponjosas y saludables, sin azúcares añadidos.',
        instructions: '1. Tritura la avena, el huevo, el plátano y la leche.\n2. Cocina a la plancha en pequeñas porciones hasta que burbujeen.\n3. Da la vuelta y termina de cocinar.',
        totalMacros: { kcal: 420, protein: 18, carbs: 58, fat: 14, fiber: 6 },
        ingredients: [
            { id: 'ing_oats', name: 'Copos de Avena', amount: 50, unit: 'g' },
            { id: 'ing_egg', name: 'Huevo L (60g)', amount: 1, unit: 'unidad' },
            { id: 'ing_banana', name: 'Plátano (100g)', amount: 0.8, unit: 'unidad' },
            { id: 'ing_milk_skim', name: 'Leche Desnatada', amount: 30, unit: 'ml' }
        ]
    },
    {
        id: 'rec_bowl_griego',
        name: 'Bowl de Yogur Griego y Chía',
        type: 'Desayuno / Snack',
        difficulty: 'Fácil',
        description: 'Combinación perfecta de probióticos, fibra y grasas saludables.',
        instructions: '1. Sirve el yogur en un bowl.\n2. Añade la chía, las almendras y la miel.\n3. Deja reposar 5 min para que la chía hidrate.',
        totalMacros: { kcal: 320, protein: 16, carbs: 22, fat: 18, fiber: 10 },
        ingredients: [
            { id: 'ing_yogurt_greek', name: 'Yogur Griego Natural (150g)', amount: 1.2, unit: 'unidad' },
            { id: 'ing_chia_seeds', name: 'Semillas de Chía', amount: 10, unit: 'g' },
            { id: 'ing_almonds', name: 'Almendras', amount: 20, unit: 'g' },
            { id: 'ing_honey', name: 'Miel', amount: 5, unit: 'g' }
        ]
    },

    // --- ALMUERZOS ---
    {
        id: 'rec_lentejas_vegetales',
        name: 'Lentejas Estofadas con Verduras',
        type: 'Almuerzo',
        difficulty: 'Media',
        description: 'Plato tradicional de legumbres, alto en fibra y hierro.',
        instructions: '1. Rehoga la cebolla, zanahoria y tomate.\n2. Añade las lentejas y cubre con agua.\n3. Cocina a fuego lento hasta que estén tiernas.',
        totalMacros: { kcal: 480, protein: 28, carbs: 68, fat: 8, fiber: 20 },
        ingredients: [
            { id: 'ing_lentils', name: 'Lentejas (80g)', amount: 80, unit: 'g' },
            { id: 'ing_onion', name: 'Cebolla', amount: 40, unit: 'g' },
            { id: 'ing_carrot', name: 'Zanahoria', amount: 50, unit: 'g' },
            { id: 'ing_tomato', name: 'Tomate', amount: 40, unit: 'g' },
            { id: 'ing_aove', name: 'AOVE', amount: 5, unit: 'ml' },
            { id: 'ing_brown_rice', name: 'Arroz Integral', amount: 20, unit: 'g' }
        ]
    },
    {
        id: 'rec_pollo_arroz_brocoli',
        name: 'Pollo al Curry con Arroz y Brócoli',
        type: 'Almuerzo',
        difficulty: 'Fácil',
        description: 'Plato equilibrado ideal para el post-entrenamiento.',
        instructions: '1. Cocina el arroz integral.\n2. Saltea el pollo con el curry y el AOVE.\n3. Cocina el brócoli al vapor y mézclalo todo.',
        totalMacros: { kcal: 550, protein: 42, carbs: 65, fat: 12, fiber: 10 },
        ingredients: [
            { id: 'ing_chicken_breast', name: 'Pechuga de Pollo', amount: 150, unit: 'g' },
            { id: 'ing_brown_rice', name: 'Arroz Integral', amount: 80, unit: 'g' },
            { id: 'ing_broccoli', name: 'Brócoli', amount: 150, unit: 'g' },
            { id: 'ing_aove', name: 'AOVE', amount: 10, unit: 'ml' }
        ]
    },
    {
        id: 'rec_salmon_boniato',
        name: 'Salmón al Horno con Boniato',
        type: 'Almuerzo / Cena',
        difficulty: 'Fácil',
        description: 'Cena elegante y nutritiva con Omega-3 y carbohidratos complejos.',
        instructions: '1. Corta el boniato en dados y hornea con AOVE.\n2. Añade el salmón sazonado los últimos 12 min.\n3. Sirve sobre una cama de espinacas frescas.',
        totalMacros: { kcal: 580, protein: 35, carbs: 45, fat: 28, fiber: 8 },
        ingredients: [
            { id: 'ing_salmon', name: 'Salmón fresco', amount: 150, unit: 'g' },
            { id: 'ing_sweet_potato', name: 'Boniato / Batata', amount: 200, unit: 'g' },
            { id: 'ing_spinach', name: 'Espinacas', amount: 50, unit: 'g' },
            { id: 'ing_aove', name: 'AOVE', amount: 5, unit: 'ml' }
        ]
    },
    {
        id: 'rec_garbanzos_espinacas',
        name: 'Potaje de Garbanzos y Espinacas',
        type: 'Almuerzo',
        difficulty: 'Media',
        description: 'Versión rápida y nutritiva de un clásico, ideal para días de legumbre.',
        instructions: '1. Cocina los garbanzos con las espinacas en un poco de caldo.\n2. Añade el huevo cocido picado.\n3. Aliña con AOVE al servir.',
        totalMacros: { kcal: 410, protein: 22, carbs: 55, fat: 14, fiber: 15 },
        ingredients: [
            { id: 'ing_chickpeas', name: 'Garbanzos', amount: 80, unit: 'g' },
            { id: 'ing_spinach', name: 'Espinacas', amount: 100, unit: 'g' },
            { id: 'ing_egg', name: 'Huevo L (60g)', amount: 1, unit: 'unidad' },
            { id: 'ing_aove', name: 'AOVE', amount: 5, unit: 'ml' }
        ]
    },
    {
        id: 'rec_pasta_integral_atun',
        name: 'Pasta Integral con Atún y Tomate',
        type: 'Almuerzo',
        difficulty: 'Fácil',
        description: 'Comida rápida, económica y equilibrada para el día a día.',
        instructions: '1. Cuece la pasta integral.\n2. Sofríe la cebolla con AOVE y añade el tomate.\n3. Mezcla con el atún escurrido y la pasta.',
        totalMacros: { kcal: 490, protein: 32, carbs: 68, fat: 10, fiber: 10 },
        ingredients: [
            { id: 'ing_pasta_wheat', name: 'Pasta Integral', amount: 80, unit: 'g' },
            { id: 'ing_tuna_water', name: 'Atún al Natural (100g)', amount: 1.8, unit: 'unidad' },
            { id: 'ing_tomato', name: 'Tomate (salsa casera)', amount: 100, unit: 'g' },
            { id: 'ing_onion', name: 'Cebolla', amount: 30, unit: 'g' },
            { id: 'ing_aove', name: 'AOVE', amount: 5, unit: 'ml' }
        ]
    },

    // --- CENAS ---
    {
        id: 'rec_tortilla_patata_fit',
        name: 'Tortilla de Patatas "Fit"',
        type: 'Cena',
        difficulty: 'Media',
        description: 'La versión más ligera del clásico español, cocinando la patata sin fritura.',
        instructions: '1. Corta la patata en láminas finas y cocínala al vapor o en airfryer.\n2. Bate los huevos y mézclalos con la patata y la cebolla.\n3. Cuaja en la sartén con una gota de AOVE.',
        totalMacros: { kcal: 410, protein: 20, carbs: 35, fat: 22, fiber: 5 },
        ingredients: [
            { id: 'ing_egg', name: 'Huevos L (120g)', amount: 2, unit: 'unidad' },
            { id: 'ing_potato', name: 'Patata (cocida/airfryer)', amount: 150, unit: 'g' },
            { id: 'ing_onion', name: 'Cebolla', amount: 30, unit: 'g' },
            { id: 'ing_aove', name: 'AOVE', amount: 5, unit: 'ml' }
        ]
    },
    {
        id: 'rec_merluza_vapor',
        name: 'Merluza al Vapor con Verduras',
        type: 'Cena',
        difficulty: 'Fácil',
        description: 'Cena rápida, ligera y con proteínas de alta calidad.',
        instructions: '1. Cocina los filetes de merluza al vapor.\n2. Añade el calabacín y la zanahoria en juliana al mismo tiempo.\n3. Aliña con un chorrito de AOVE y pimienta.',
        totalMacros: { kcal: 280, protein: 35, carbs: 12, fat: 8, fiber: 4 },
        ingredients: [
            { id: 'ing_hake', name: 'Merluza', amount: 200, unit: 'g' },
            { id: 'ing_zucchini', name: 'Calabacín', amount: 150, unit: 'g' },
            { id: 'ing_carrot', name: 'Zanahoria', amount: 50, unit: 'g' },
            { id: 'ing_aove', name: 'AOVE', amount: 5, unit: 'ml' }
        ]
    },
    {
        id: 'rec_ensalada_quinoa_pavo',
        name: 'Ensalada de Quinoa y Pavo',
        type: 'Cena',
        difficulty: 'Fácil',
        description: 'Ensalada fresca y completa, rica en grasas saludables.',
        instructions: '1. Cuece la quinoa y deja enfriar.\n2. Corta el pavo a la plancha, el aguacate y el tomate.\n3. Mezcla todo en un bowl y aliña al gusto.',
        totalMacros: { kcal: 430, protein: 35, carbs: 45, fat: 12, fiber: 8 },
        ingredients: [
            { id: 'ing_quinoa', name: 'Quinoa', amount: 60, unit: 'g' },
            { id: 'ing_turkey_breast', name: 'Pechuga de Pavo', amount: 120, unit: 'g' },
            { id: 'ing_avocado', name: 'Aguacate', amount: 50, unit: 'g' },
            { id: 'ing_tomato', name: 'Tomate', amount: 50, unit: 'g' }
        ]
    },
    {
        id: 'rec_revuelto_espinacas_gambas',
        name: 'Revuelto de Espinacas y Queso Fresco',
        type: 'Cena',
        difficulty: 'Fácil',
        description: 'Cena rápida rica en proteínas para favorecer la recuperación nocturna.',
        instructions: '1. Saltea las espinacas con una gota de AOVE.\n2. Bate los huevos y añádelos a la sartén.\n3. Añade el queso fresco al final para que temple sin fundirse.',
        totalMacros: { kcal: 320, protein: 25, carbs: 6, fat: 22, fiber: 5 },
        ingredients: [
            { id: 'ing_egg', name: 'Huevos L (120g)', amount: 2, unit: 'unidad' },
            { id: 'ing_spinach', name: 'Espinacas Frescas', amount: 150, unit: 'g' },
            { id: 'ing_fresh_cheese', name: 'Queso Fresco Burgos', amount: 50, unit: 'g' },
            { id: 'ing_aove', name: 'AOVE', amount: 5, unit: 'ml' }
        ]
    },

    // --- SNACKS ---
    {
        id: 'rec_snack_manzana_almendras',
        name: 'Manzana con Almendras',
        type: 'Snack',
        difficulty: 'Fácil',
        description: 'Snack crujiente y equilibrado que combina fibra y grasas esenciales.',
        instructions: '1. Lava y trocea la manzana.\n2. Acompáñala con un puñado de almendras naturales.',
        totalMacros: { kcal: 250, protein: 6, carbs: 24, fat: 15, fiber: 5 },
        ingredients: [
            { id: 'ing_apple', name: 'Manzana (150g)', amount: 0.8, unit: 'unidad' },
            { id: 'ing_almonds', name: 'Almendras', amount: 25, unit: 'g' }
        ]
    },
    {
        id: 'rec_snack_batido_pro',
        name: 'Batido de Proteína y Plátano',
        type: 'Snack Post-Entreno',
        difficulty: 'Fácil',
        description: 'Batido post-entrenamiento para una rápida absorción de proteínas.',
        instructions: '1. Añade todos los ingredientes al vaso de la batidora.\n2. Tritura hasta obtener una textura homogénea.\n3. Consumir frío.',
        totalMacros: { kcal: 310, protein: 30, carbs: 35, fat: 4, fiber: 2 },
        ingredients: [
            { id: 'ing_whey_protein', name: 'Proteína Whey', amount: 30, unit: 'g' },
            { id: 'ing_milk_skim', name: 'Leche Desnatada', amount: 250, unit: 'ml' },
            { id: 'ing_banana', name: 'Plátano (100g)', amount: 0.8, unit: 'unidad' }
        ]
    },
    {
        id: 'rec_poke_bowl_salmon',
        name: 'Poke Bowl de Salmón y Aguacate',
        type: 'Almuerzo / Cena',
        difficulty: 'Fácil',
        description: 'Plato refrescante y completo, de inspiración hawaiana.',
        instructions: '1. Prepara el arroz integral como base.\n2. Corta el salmón frescos, el aguacate y el pepino.\n3. Añade el edamame y termina con semillas de sésamo.',
        totalMacros: { kcal: 410, protein: 27, carbs: 27, fat: 23, fiber: 8 },
        ingredients: [
            { id: 'ing_salmon', name: 'Salmón Fresco', amount: 100, unit: 'g' },
            { id: 'ing_brown_rice', name: 'Arroz Integral', amount: 25, unit: 'g' },
            { id: 'ing_avocado', name: 'Aguacate', amount: 50, unit: 'g' },
            { id: 'ing_cucumber', name: 'Pepino', amount: 50, unit: 'g' },
            { id: 'ing_edamame', name: 'Edamame', amount: 30, unit: 'g' }
        ]
    },
    {
        id: 'rec_ensalada_garbanzos_langostinos',
        name: 'Ensalada de Garbanzos y Langostinos',
        type: 'Almuerzo / Cena',
        difficulty: 'Fácil',
        description: 'Plato fresco, proteico y lleno de color.',
        instructions: '1. Cuece o usa garbanzos ya cocidos.\n2. Saltea los langostinos con ajo y AOVE.\n3. Pica el pimiento y la cebolla, y mezcla todo en un bowl.',
        totalMacros: { kcal: 430, protein: 35, carbs: 45, fat: 12, fiber: 12 },
        ingredients: [
            { id: 'ing_chickpeas', name: 'Garbanzos', amount: 80, unit: 'g' },
            { id: 'ing_shrimp', name: 'Langostinos', amount: 100, unit: 'g' },
            { id: 'ing_pepper', name: 'Pimiento', amount: 50, unit: 'g' },
            { id: 'ing_onion', name: 'Cebolla', amount: 30, unit: 'g' },
            { id: 'ing_aove', name: 'AOVE', amount: 5, unit: 'ml' }
        ]
    },
    {
        id: 'rec_salteado_ternera_brocoli',
        name: 'Salteado de Ternera, Brócoli y Anacardos',
        type: 'Almuerzo / Cena',
        difficulty: 'Fácil',
        description: 'Salteado rápido de estilo asiático, muy saciante y nutritivo.',
        instructions: '1. Corta la ternera en tiras y saltéala a fuego fuerte.\n2. Añade el brócoli (previamente cocido al vapor 3 min).\n3. Termina con los anacardos y un toque de salsa de soja opcional.',
        totalMacros: { kcal: 400, protein: 39, carbs: 16, fat: 22, fiber: 6 },
        ingredients: [
            { id: 'ing_beef_lean', name: 'Ternera Magra', amount: 150, unit: 'g' },
            { id: 'ing_broccoli', name: 'Brócoli', amount: 150, unit: 'g' },
            { id: 'ing_cashews', name: 'Anacardos', amount: 20, unit: 'g' },
            { id: 'ing_aove', name: 'AOVE', amount: 5, unit: 'ml' }
        ]
    },
    {
        id: 'rec_fajitas_fit',
        name: 'Fajitas de Pollo y Pimientos "Fit"',
        type: 'Almuerzo / Cena',
        difficulty: 'Fácil',
        description: 'Cena divertida y saludable, perfecta para compartir.',
        instructions: '1. Corta el pollo y los vegetales en tiras.\n2. Saltea todo con tus especias favoritas.\n3. Monta sobre las tortillas con un poco de aguacate.',
        totalMacros: { kcal: 355, protein: 32, carbs: 40, fat: 9, fiber: 6 },
        ingredients: [
            { id: 'ing_chicken_breast', name: 'Pechuga de Pollo', amount: 120, unit: 'g' },
            { id: 'ing_pepper', name: 'Pimientos', amount: 100, unit: 'g' },
            { id: 'ing_onion', name: 'Cebolla', amount: 50, unit: 'g' },
            { id: 'ing_corn_tortilla', name: 'Tortillas de Maíz', amount: 60, unit: 'g' },
            { id: 'ing_avocado', name: 'Aguacate', amount: 30, unit: 'g' }
        ]
    },
    {
        id: 'rec_bacalao_pisto',
        name: 'Bacalao al Horno con Pisto',
        type: 'Almuerzo / Cena',
        difficulty: 'Media',
        description: 'Pescado blanco al horno sobre una cama de verduras tradicionales.',
        instructions: '1. Corta y saltea el calabacín, berenjena y tomate para el pisto.\n2. Hornea el bacalao a 180°C durante 12-15 minutos.\n3. Sirve el bacalao sobre el pisto.',
        totalMacros: { kcal: 310, protein: 39, carbs: 13, fat: 12, fiber: 6 },
        ingredients: [
            { id: 'ing_cod', name: 'Bacalao Fresco', amount: 200, unit: 'g' },
            { id: 'ing_zucchini', name: 'Calabacín', amount: 100, unit: 'g' },
            { id: 'ing_eggplant', name: 'Berenjena', amount: 100, unit: 'g' },
            { id: 'ing_tomato', name: 'Tomate', amount: 100, unit: 'g' },
            { id: 'ing_aove', name: 'AOVE', amount: 10, unit: 'ml' }
        ]
    },
    {
        id: 'rec_smoothie_kefir',
        name: 'Smoothie Bowl de Kéfir y Frutos Rojos',
        type: 'Desayuno / Snack',
        difficulty: 'Fácil',
        description: 'Cena ligera de inspiración mediterránea, muy rica en probióticos.',
        instructions: '1. Sirve el kéfir en un bowl.\n2. Añade las fresas y arándanos frescos.\n3. Espolvorea la chía y termina con un hilo de miel.',
        totalMacros: { kcal: 235, protein: 10, carbs: 28, fat: 10, fiber: 6 },
        ingredients: [
            { id: 'ing_kefir', name: 'Kéfir Natural', amount: 200, unit: 'ml' },
            { id: 'ing_strawberries', name: 'Fresas', amount: 50, unit: 'g' },
            { id: 'ing_blueberries', name: 'Arándanos', amount: 50, unit: 'g' },
            { id: 'ing_chia_seeds', name: 'Semillas de Chía', amount: 10, unit: 'g' },
            { id: 'ing_honey', name: 'Miel', amount: 5, unit: 'g' }
        ]
    },
    {
        id: 'rec_pasta_pollo_champis',
        name: 'Pasta Integral con Pollo y Champiñones',
        type: 'Almuerzo',
        difficulty: 'Fácil',
        description: 'Combinación clásica, sabrosa y muy fácil de preparar.',
        instructions: '1. Cuece la pasta.\n2. Saltea el pollo con los champiñones y AOVE.\n3. Mezcla todo y sazona al gusto.',
        totalMacros: { kcal: 465, protein: 36, carbs: 60, fat: 9, fiber: 10 },
        ingredients: [
            { id: 'ing_pasta_wheat', name: 'Pasta Integral', amount: 80, unit: 'g' },
            { id: 'ing_chicken_breast', name: 'Pechuga de Pollo', amount: 100, unit: 'g' },
            { id: 'ing_mushrooms', name: 'Champiñones', amount: 100, unit: 'g' },
            { id: 'ing_aove', name: 'AOVE', amount: 5, unit: 'ml' }
        ]
    },
    {
        id: 'rec_merluza_calabaza',
        name: 'Merluza con Puré de Calabaza',
        type: 'Almuerzo / Cena',
        difficulty: 'Fácil',
        description: 'Cena suave y reconfortante, ideal para digestiones fáciles.',
        instructions: '1. Cuece la calabaza y tritúrala hasta obtener un puré fino.\n2. Cocina la merluza a la plancha o al vapor.\n3. Sirve la merluza sobre el puré.',
        totalMacros: { kcal: 245, protein: 35, carbs: 13, fat: 7, fiber: 5 },
        ingredients: [
            { id: 'ing_hake', name: 'Merluza', amount: 200, unit: 'g' },
            { id: 'ing_pumpkin', name: 'Calabaza', amount: 200, unit: 'g' },
            { id: 'ing_aove', name: 'AOVE', amount: 5, unit: 'ml' }
        ]
    },
    {
        id: 'rec_tofu_arroz_espinacas',
        name: 'Tofu Crujiente con Arroz y Espinacas',
        type: 'Almuerzo / Cena',
        difficulty: 'Fácil',
        description: 'Opción vegetariana completa y muy sabrosa.',
        instructions: '1. Corta el tofu en dados y saltéalo hasta que dore.\n2. Sirve sobre el arroz blanco cocido.\n3. Acompaña con espinacas frescas o ligeramente salteadas.',
        totalMacros: { kcal: 410, protein: 22, carbs: 54, fat: 12, fiber: 6 },
        ingredients: [
            { id: 'ing_tofu', name: 'Tofu firme', amount: 150, unit: 'g' },
            { id: 'ing_white_rice', name: 'Arroz Blanco', amount: 60, unit: 'g' },
            { id: 'ing_spinach', name: 'Espinacas Frescas', amount: 100, unit: 'g' },
            { id: 'ing_aove', name: 'AOVE', amount: 5, unit: 'ml' }
        ]
    },
    {
        id: 'rec_burger_pollo_integral',
        name: 'Burger de Pollo Fit en Pan Integral',
        type: 'Almuerzo / Cena',
        difficulty: 'Fácil',
        description: 'La hamburguesa favorita, en versión saludable.',
        instructions: '1. Cocina la pechuga de pollo picada a la plancha dándole forma de burger.\n2. Tuesta el pan integral.\n3. Monta con rodajas de tomate fresco.',
        totalMacros: { kcal: 320, protein: 39, carbs: 27, fat: 6, fiber: 7 },
        ingredients: [
            { id: 'ing_chicken_breast', name: 'Pollo (picada)', amount: 150, unit: 'g' },
            { id: 'ing_whole_wheat_bread', name: 'Pan Integral (60g)', amount: 2, unit: 'unidad' },
            { id: 'ing_tomato', name: 'Tomate', amount: 30, unit: 'g' }
        ]
    },
    {
        id: 'rec_tortilla_claras_jamon',
        name: 'Tortilla de Claras, Huevo y Jamón',
        type: 'Cena / Desayuno',
        difficulty: 'Fácil',
        description: 'Cena súper proteica y muy baja en calorías.',
        instructions: '1. Bate las claras con el huevo entero.\n2. Cocina en la sartén como una tortilla normal.\n3. Añade el jamón al final.',
        totalMacros: { kcal: 245, protein: 29, carbs: 1, fat: 12, fiber: 0.5 },
        ingredients: [
            { id: 'ing_egg_whites', name: 'Claras de Huevo', amount: 150, unit: 'g' },
            { id: 'ing_egg', name: 'Huevo L (60g)', amount: 1, unit: 'unidad' },
            { id: 'ing_jamon_ibérico', name: 'Jamón Ibérico', amount: 20, unit: 'g' }
        ]
    },
    {
        id: 'rec_burrito_pavo_fit',
        name: 'Burrito de Pavo y Aguacate',
        type: 'Almuerzo / Cena',
        difficulty: 'Fácil',
        description: 'Wrap rápido y saludable, ideal para transportar.',
        instructions: '1. Cocina el pavo a la plancha en tiras.\n2. Extiende el aguacate sobre las tortillas.\n3. Enrolla con el pavo dentro.',
        totalMacros: { kcal: 335, protein: 33, carbs: 31, fat: 10, fiber: 5 },
        ingredients: [
            { id: 'ing_turkey_breast', name: 'Pechuga de Pavo', amount: 120, unit: 'g' },
            { id: 'ing_avocado', name: 'Aguacate', amount: 50, unit: 'g' },
            { id: 'ing_corn_tortilla', name: 'Tortillas de Maíz', amount: 60, unit: 'g' }
        ]
    },
    {
        id: 'rec_gnocchi_tomate_queso',
        name: 'Gnocchi con Tomate y Queso Curado',
        type: 'Almuerzo',
        difficulty: 'Fácil',
        description: 'Plato reconfortante con un toque de queso gourmet.',
        instructions: '1. Cuece los gnocchi (suelen tardar 2-3 min).\n2. Mezcla con salsa de tomate o tomates cherry salteados.\n3. Termina con lascas de queso curado.',
        totalMacros: { kcal: 325, protein: 11, carbs: 56, fat: 6, fiber: 3 },
        ingredients: [
            { id: 'ing_gnocchi', name: 'Gnocchi', amount: 150, unit: 'g' },
            { id: 'ing_tomato', name: 'Tomate', amount: 100, unit: 'g' },
            { id: 'ing_cured_cheese', name: 'Queso Curado', amount: 15, unit: 'g' }
        ]
    },
    {
        id: 'rec_bowl_cottage_nueces',
        name: 'Bowl de Requesón (Cottage) y Nueces',
        type: 'Snack',
        difficulty: 'Fácil',
        description: 'Snack alto en proteínas y grasas saludables, muy saciante.',
        instructions: '1. Sirve el queso cottage en un bowl.\n2. Añade las nueces troceadas y la miel.',
        totalMacros: { kcal: 340, protein: 25, carbs: 14, fat: 22, fiber: 4 },
        ingredients: [
            { id: 'ing_cottage_cheese', name: 'Queso Cottage', amount: 200, unit: 'g' },
            { id: 'ing_walnuts', name: 'Nueces', amount: 20, unit: 'g' },
            { id: 'ing_honey', name: 'Miel', amount: 5, unit: 'g' }
        ]
    },
    {
        id: 'rec_ensalada_lentejas_atun',
        name: 'Ensalada de Lentejas y Atún',
        type: 'Almuerzo / Cena',
        difficulty: 'Fácil',
        description: 'Opción par comida rápida fuera de casa, nutritiva y fresca.',
        instructions: '1. Usa lentejas ya cocidas lavadas.\n2. Mezcla con el atún al natural, tomate y cebolla picada.\n3. Aliña con vinagre y una gota de AOVE.',
        totalMacros: { kcal: 310, protein: 33, carbs: 38, fat: 2, fiber: 22 },
        ingredients: [
            { id: 'ing_lentils', name: 'Lentejas (cocidas)', amount: 200, unit: 'g' },
            { id: 'ing_tuna_water', name: 'Atún al Natural (60g)', amount: 1.1, unit: 'unidad' },
            { id: 'ing_tomato', name: 'Tomate', amount: 50, unit: 'g' },
            { id: 'ing_onion', name: 'Cebolla', amount: 30, unit: 'g' }
        ]
    }
];
