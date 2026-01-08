import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC3IiIKb77nAe6LEJ_yXPiXk_poUOmBfQo",
  authDomain: "finanzas-personales-bfefc.firebaseapp.com",
  projectId: "finanzas-personales-bfefc",
  storageBucket: "finanzas-personales-bfefc.firebasestorage.app",
  messagingSenderId: "364064479158",
  appId: "1:364064479158:web:e7aaed68777304be3a9317",
  measurementId: "G-WFQQG87WMG"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar herramientas
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();