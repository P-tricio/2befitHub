import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyA4X3QjW9jeMdRoHSpun29WvHCVdruTYr4",
    authDomain: "befithub-f6202.firebaseapp.com",
    projectId: "befithub-f6202",
    storageBucket: "befithub-f6202.firebasestorage.app",
    messagingSenderId: "20961130148",
    appId: "1:20961130148:web:df76988bf460dd683fd831",
    measurementId: "G-LMNHNPE88Q"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db, analytics };
