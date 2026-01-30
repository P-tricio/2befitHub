import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, limit } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "dummy",
    authDomain: "befithub-369.firebaseapp.com",
    projectId: "befithub-369",
    storageBucket: "befithub-369.firebasestorage.app",
    messagingSenderId: "1098616149955",
    appId: "1:1098616149955:web:86687293a970e7a1773099",
    measurementId: "G-FKEV0LND31"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkNames() {
    console.log("Checking exercises in group 'Míos'...");
    const q = query(collection(db, "exercises"), where("group", "==", "Míos"), limit(10));
    const querySnapshot = await getDocs(q);

    querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`- ${data.name} (ES: ${data.name_es || 'N/A'})`);
    });

    process.exit(0);
}

checkNames().catch(err => {
    console.error(err);
    process.exit(1);
});
