import dotenv from "dotenv";
dotenv.config();
const API_KEY = process.env.VITE_GEMINI_API_KEY;

async function checkModels() {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.models) {
        console.log("ALL MODELS:");
        data.models.forEach(m => console.log(m.name));
    } else {
        console.log("NO MODELS FOUND:", JSON.stringify(data));
    }
}
checkModels();
