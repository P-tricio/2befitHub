const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

/**
 * Validates if calories approximately match the sum of macros (4-4-9 rule).
 */
const validateMacros = (m) => {
    const calc = (m.protein * 4) + (m.carbs * 4) + (m.fats * 9);
    const diff = Math.abs(calc - m.calories);
    // Allow 10% or 20kcal margin of error for AI estimations/rounding
    return diff < 40 || diff < (m.calories * 0.15);
};

/**
 * Parses a natural language description of a meal into structured JSON using OpenRouter.
 * Returns an array of objects { name, quantity, unit, type: 'food', baseMacros }.
 */
export const parseMealDescription = async (text) => {
    if (!OPENROUTER_API_KEY) {
        throw new Error("OpenRouter API key not found in environment variables.");
    }

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "HTTP-Referer": window.location.origin,
                "X-Title": "BeFitHub AI Nutrition",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "model": "stepfun/step-3.5-flash:free",
                "messages": [
                    {
                        "role": "system",
                        "content": "Eres un experto en nutrición deportiva. Extrae alimentos de un texto y devuelve un ARRAY JSON.\n\nReglas:\n1. 'name': nombre descriptivo en español.\n2. 'quantity': número (asume porción lógica si no se indica).\n3. 'unit': g, ml o unidad.\n4. 'baseMacros': objeto con calories, protein, carbs, fats y fiber SIEMPRE para 100g (si la unidad es g/ml) o para 1 UNIDAD (si la unidad es 'unidad').\n5. 'totalMacros': los macros calculados para la cantidad específica indicada.\n6. 'type': 'food'.\n\nDevuelve SOLO el array JSON sin markdown."
                    },
                    {
                        "role": "user",
                        "content": `Extrae los alimentos: "${text}"`
                    }
                ]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || "Error al conectar con OpenRouter.");
        }

        const data = await response.json();
        const resultText = data.choices[0].message.content;

        let parsed;
        try {
            const rawParsed = JSON.parse(resultText.replace(/```json|```/g, '').trim());
            parsed = Array.isArray(rawParsed) ? rawParsed : (rawParsed.items || Object.values(rawParsed)[0]);
        } catch (e) {
            const jsonMatch = resultText.match(/\[[\s\S]*\]/);
            parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
        }

        if (!Array.isArray(parsed)) return [];

        // Enrich and validate
        return parsed.map(item => {
            const m = item.totalMacros || item.baseMacros;
            const isValid = validateMacros(m);

            // If the model didn't provide baseMacros, but provided total, we can technically infer it,
            // but the prompt now asks for it explicitly.
            return {
                ...item,
                isValidEstimation: isValid,
                // Ensure consistency in property names and clean integers
                calories: Math.round(m.calories || 0),
                protein: Math.round(m.protein || 0),
                carbs: Math.round(m.carbs || 0),
                fats: Math.round(m.fats || 0),
                fiber: Math.round(m.fiber || 0)
            };
        });
    } catch (error) {
        console.error("Error parsing meal with OpenRouter:", error);
        throw error;
    }
};
