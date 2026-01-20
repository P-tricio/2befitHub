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
                const userSnap = await getDoc(userRef);

                if (!userSnap.exists()) {
                    await setDoc(userRef, {
                        email: user.email,
                        displayName: user.displayName || 'Usuario Nuevo',
                        photoURL: user.photoURL,
                        createdAt: serverTimestamp(),
                        role: 'user', // Default role
                        currentProgramId: null
                    });
                }
            }
            setCurrentUser(user);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const updateUserProfile = (data) => {
        return updateProfile(auth.currentUser, data).then(() => {
            setCurrentUser({ ...auth.currentUser, ...data });
        });
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
