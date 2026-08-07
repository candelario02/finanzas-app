import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyC3IiIKb77nAe6LEJ_yXPiXk_poUOmBFqo",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "finanzas-personales-bfefc.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "finanzas-personales-bfefc",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "finanzas-personales-bfefc.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "364064479158",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:364064479158:web:e7aaed68777304be3a9317",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-WFQQG87WMG"
};

const app = initializeApp(firebaseConfig);

const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export { db };
export default app;
