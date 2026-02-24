import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();
const API_KEY = process.env.VITE_GEMINI_API_KEY;

async function testVersions() {
    const genAI = new GoogleGenerativeAI(API_KEY);

    const versions = ['v1', 'v1beta'];
    for (const v of versions) {
        console.log(`PROBANDO VERSIÓN: ${v}`);
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }, { apiVersion: v });
            const result = await model.generateContent("test");
            const text = (await result.response).text();
            console.log(`✅ ¡ÉXITO con ${v}! Respuesta: ${text.substring(0, 10)}...`);
            return;
        } catch (e) {
            console.log(`❌ FALLÓ con ${v}: ${e.message}`);
        }
    }
}
testVersions();
