const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

// Models to try in order — primary + fallbacks
const MODELS = [
    "google/gemini-2.0-flash-lite-001",
    "meta-llama/llama-3.3-8b-instruct:free",
    "stepfun/step-3.5-flash:free"
];

const SYSTEM_PROMPT = "Eres un experto en nutrición deportiva. Extrae alimentos de un texto y devuelve un ARRAY JSON.\n\nReglas:\n1. 'name': nombre descriptivo en español.\n2. 'quantity': número (asume porción lógica si no se indica).\n3. 'unit': g, ml o unidad.\n4. 'baseMacros': objeto con calories, protein, carbs, fats y fiber SIEMPRE para 100g (si la unidad es g/ml) o para 1 UNIDAD (si la unidad es 'unidad').\n5. 'totalMacros': los macros calculados para la cantidad específica indicada.\n6. 'type': 'food'.\n\nDevuelve SOLO el array JSON sin markdown.";

/**
 * Validates if calories approximately match the sum of macros (4-4-9 rule).
 */
const validateMacros = (m) => {
    const calc = (m.protein * 4) + (m.carbs * 4) + (m.fats * 9);
    const diff = Math.abs(calc - m.calories);
    // Allow 15% or 40kcal margin of error for AI estimations/rounding
    return diff < 40 || diff < (m.calories * 0.15);
};

/**
 * Attempts to call OpenRouter with a specific model.
 * Returns the parsed response or throws on failure.
 */
const callOpenRouter = async (text, model) => {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "HTTP-Referer": window.location.origin,
            "X-Title": "BeFitHub AI Nutrition",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "model": model,
            "messages": [
                { "role": "system", "content": SYSTEM_PROMPT },
                { "role": "user", "content": `Extrae los alimentos: "${text}"` }
            ]
        })
    });

    if (!response.ok) {
        const status = response.status;
        let errorMsg = `HTTP ${status}`;
        try {
            const errorData = await response.json();
            errorMsg = errorData.error?.message || errorMsg;
        } catch (_) { /* ignore parse error */ }
        const err = new Error(errorMsg);
        err.status = status;
        throw err;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
        throw new Error("Respuesta vacía del modelo.");
    }

    return content;
};

/**
 * Parses a natural language description of a meal into structured JSON using OpenRouter.
 * Tries multiple models with automatic fallback.
 * Returns an array of objects { name, quantity, unit, type: 'food', baseMacros }.
 */
export const parseMealDescription = async (text) => {
    if (!OPENROUTER_API_KEY) {
        throw new Error("Clave API no configurada. Contacta con tu coach.");
    }

    let lastError = null;

    for (const model of MODELS) {
        try {
            console.log(`[AI Nutrition] Trying model: ${model}`);
            const resultText = await callOpenRouter(text, model);

            // Parse JSON from response
            let parsed;
            try {
                const rawParsed = JSON.parse(resultText.replace(/```json|```/g, '').trim());
                parsed = Array.isArray(rawParsed) ? rawParsed : (rawParsed.items || Object.values(rawParsed)[0]);
            } catch (e) {
                const jsonMatch = resultText.match(/\[[\s\S]*\]/);
                parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
            }

            if (!Array.isArray(parsed) || parsed.length === 0) {
                throw new Error("El modelo no devolvió alimentos válidos.");
            }

            console.log(`[AI Nutrition] Success with model: ${model}, ${parsed.length} items`);

            // Enrich and validate
            return parsed.map(item => {
                const m = item.totalMacros || item.baseMacros;
                if (!m) {
                    return {
                        ...item,
                        isValidEstimation: false,
                        calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0
                    };
                }
                const isValid = validateMacros(m);

                return {
                    ...item,
                    isValidEstimation: isValid,
                    calories: Math.round(m.calories || 0),
                    protein: Math.round(m.protein || 0),
                    carbs: Math.round(m.carbs || 0),
                    fats: Math.round(m.fats || 0),
                    fiber: Math.round(m.fiber || 0)
                };
            });

        } catch (error) {
            console.warn(`[AI Nutrition] Model ${model} failed:`, error.message);
            lastError = error;

            // Only retry on transient errors (429 rate limit, 5xx server errors, empty response)
            const isRetryable = !error.status || error.status === 429 || error.status >= 500;
            if (!isRetryable) {
                throw error; // Non-retryable (auth error, bad request, etc.) — fail immediately
            }
            // Continue to next model...
        }
    }

    // All models failed
    console.error("[AI Nutrition] All models failed. Last error:", lastError);
    throw new Error("El servicio de IA no está disponible en este momento. Inténtalo de nuevo en unos minutos.");
};
