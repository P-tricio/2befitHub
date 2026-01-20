import { db } from '../../../lib/firebase';
import { collection, getDocs, doc, getDoc, query, where, orderBy, limit } from 'firebase/firestore';

const COLLECTION_NAME = 'exercises';

// Rapid API Config (Restored as fallback/search)
const API_KEY = 'fb30cd1a64mshdcda716e9f826c6p19352bjsn65fac58ff883';
const API_HOST = 'exercisedb.p.rapidapi.com';

const rapidOptions = {
    method: 'GET',
    headers: {
        'X-RapidAPI-Key': API_KEY,
        'X-RapidAPI-Host': API_HOST
    }
};

export const ExerciseAPI = {
    // 1. PRIMARY: Firestore Methods
    async getAllExercises() {
        try {
            const exercisesRef = collection(db, COLLECTION_NAME);
            const snapshot = await getDocs(exercisesRef);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                // Prefer Spanish content, fallback to English
                // Ensure mediaUrl exists
                mediaUrl: doc.data().gifUrl || doc.data().imageStart || '',
            }));
        } catch (error) {
            console.error('Firestore Error:', error);
            return [];
        }
    },

    async searchByName(name) {
        if (!name) return [];
        // Local/Firestore Search
        try {
            const all = await this.getAllExercises();
            const lower = name.toLowerCase();
            return all.filter(ex =>
                (ex.name_es && ex.name_es.toLowerCase().includes(lower)) ||
                (ex.name && ex.name.toLowerCase().includes(lower))
            );
        } catch (error) {
            console.error(error);
            return [];
        }
    },

    // 2. SECONDARY: RapidAPI (Online Search)
    async searchOnline(name) {
        try {
            const url = `https://${API_HOST}/exercises/name/${name.toLowerCase()}?limit=15`;
            const response = await fetch(url, rapidOptions);
            if (!response.ok) throw new Error('RapidAPI Error');
            const data = await response.json();

            // Transform to app format
            return data.map(ex => ({
                ...ex,
                mediaUrl: ex.gifUrl || `https://${API_HOST}/image?exerciseId=${ex.id}&resolution=360&rapidapi-key=${API_KEY}`,
                name_es: '', // Needs translation
                instructions_es: [] // Needs translation
            }));
        } catch (error) {
            console.error('Online search failed:', error);
            return [];
        }
    },

    // 3. UTILITIES & TRANSLATION
    async translateText(text, targetLang = 'es') {
        if (!text) return '';
        try {
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
            const response = await fetch(url);
            if (!response.ok) return text;
            const data = await response.json();
            return data[0].map(segment => segment[0]).join('');
        } catch (error) {
            console.error('Translation Error:', error);
            return text;
        }
    },

    async fetchImageBlob(urlOrId) {
        // Handle RapidAPI image proxying if passed an ID
        if (!urlOrId.includes('http')) {
            const url = `https://${API_HOST}/image?exerciseId=${urlOrId}&resolution=360`;
            try {
                const response = await fetch(url, rapidOptions);
                if (!response.ok) throw new Error(`API Error: ${response.status}`);
                return await response.blob();
            } catch (e) {
                console.error(e);
                throw e;
            }
        }

        // Handle normal URL
        try {
            const response = await fetch(urlOrId);
            if (!response.ok) throw new Error('Image fetch failed');
            return await response.blob();
        } catch (e) {
            console.error(e);
            return null;
        }
    },

    mapBodyPartToPattern(bodyPart) {
        const mapping = {
            'back': 'Pull', 'cardio': 'Global', 'chest': 'Push',
            'lower arms': 'Pull', 'lower legs': 'Squat', 'neck': 'Global',
            'shoulders': 'Push', 'upper arms': 'Push', 'upper legs': 'Squat',
            'waist': 'Core', 'strength': 'Global', 'stretching': 'Mobility'
        };
        return mapping[bodyPart?.toLowerCase()] || 'Global';
    },

    toSentenceCase(text) {
        if (!text) return '';
        const cleaned = text.trim().toLowerCase();
        return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    },

    postProcessSpanish(text) {
        if (!text) return '';
        const replacements = {
            'Mantenga': 'Mantén', 'Coloque': 'Coloca', 'Asegúrese': 'Asegúrate',
            'Respire': 'Respira', 'Realice': 'Realiza', 'Extienda': 'Extiende',
            'Flexione': 'Flexiona', 'Inhale': 'Inhala', 'Exhale': 'Exhala',
            'Apriete': 'Aprieta', 'Empuje': 'Empuja', 'Tire': 'Tira',
            'Baje': 'Baja', 'Suba': 'Sube', 'Sostenga': 'Sostén',
            'Evite': 'Evita', 'Procure': 'Procura', 'Trate': 'Trata',
            'Comience': 'Comienza', 'Repita': 'Repite'
        };
        let processed = text;
        Object.keys(replacements).forEach(key => {
            const regex = new RegExp(`\\b${key}\\b`, 'g');
            processed = processed.replace(regex, replacements[key]);
        });
        return processed;
    },

    getYoutubeThumbnail(url) {
        if (!url) return null;

        // Updated regex to support YouTube Shorts and all common formats
        const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|shorts\/|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);

        if (match && match[2].length === 11) {
            return `https://img.youtube.com/vi/${match[2]}/mqdefault.jpg`;
        }
        return null;
    }
};
