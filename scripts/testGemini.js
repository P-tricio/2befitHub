import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const API_KEY = process.env.VITE_GEMINI_API_KEY;

async function testConnection() {
    if (!API_KEY) {
        console.error("❌ Error: No se encontró VITE_GEMINI_API_KEY en el archivo .env");
        return;
    }

    console.log("--- 🔍 Diagnóstico de API Gemini ---");
    console.log(`API Key detectada: ${API_KEY.substring(0, 5)}...${API_KEY.substring(API_KEY.length - 4)}`);

    try {
        console.log("\n1. Intentando listar modelos vía REST...");
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.models) {
            console.log("✅ Modelos disponibles:");
            data.models.forEach(m => console.log(` - ${m.name} (${m.displayName})`));
        } else {
            console.log("❌ No se devolvieron modelos. Respuesta completa:");
            console.log(JSON.stringify(data, null, 2));
        }
    } catch (err) {
        console.error("❌ Error al conectar:", err.message);
    }
}

testConnection();
