import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../lib/firebase';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    GoogleAuthProvider,
    signInWithPopup,
    updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const login = (email, password) => {
        return signInWithEmailAndPassword(auth, email, password);
    };

    const signup = (email, password) => {
        return createUserWithEmailAndPassword(auth, email, password);
    };

    const logout = () => {
        return signOut(auth);
    };

    const googleLogin = () => {
        const provider = new GoogleAuthProvider();
        return signInWithPopup(auth, provider);
    }

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Sync user to Firestore 'users' collection
                const userRef = doc(db, 'users', user.uid);

                try {
                    const userSnap = await getDoc(userRef);

                    if (userSnap.exists()) {
                        // User exists, merge Firestore data (role, etc.)
                        const userData = userSnap.data();
                        setCurrentUser({ ...user, ...userData });
                    } else {
                        // Create new user doc
                        const newUserData = {
                            email: user.email,
                            displayName: user.displayName || 'Usuario Nuevo',
                            photoURL: user.photoURL,
                            createdAt: serverTimestamp(),
                            role: 'user', // Default role
                            currentProgramId: null
                        };
                        await setDoc(userRef, newUserData);
                        setCurrentUser({ ...user, ...newUserData });
                    }
                } catch (error) {
                    console.error("Error fetching user data:", error);
                    setCurrentUser(user);
                }
            } else {
                setCurrentUser(null);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const updateUserProfile = async (data) => {
        // 1. Update Auth Profile
        await updateProfile(auth.currentUser, data);

        // 2. Update Firestore User Document
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await setDoc(userRef, data, { merge: true });

        // 3. Update Local State
        setCurrentUser(prev => ({ ...prev, ...data }));
    };

    const value = {
        currentUser,
        login,
        signup,
        logout,
        googleLogin,
        updateUserProfile,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
