import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCIn6xn18DgFvgxbHKhCplzl45DzKaQ1Zc",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "ntemo-one.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "ntemo-one",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "ntemo-one.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "371281892741",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:371281892741:web:bfa8647b5dbf5a7adb60ec",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-6X9CMGZCRR",
};

export const isFirebaseConfigured = true;

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Analytics initialisé uniquement si supporté (dans le navigateur)
let analytics = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {});
}

export { app, db, auth, storage, analytics };
