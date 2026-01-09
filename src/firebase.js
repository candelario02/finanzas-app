import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Tu configuración única (sacada de tu última imagen)
const firebaseConfig = {
  apiKey: "AIzaSyC3IiIKb77nAe6LEJ_yXPiXk_poUOmBFqo",
  authDomain: "finanzas-personales-bfefc.firebaseapp.com",
  projectId: "finanzas-personales-bfefc",
  storageBucket: "finanzas-personales-bfefc.firebasestorage.app",
  messagingSenderId: "364064479158",
  appId: "1:364064479158:web:e7aaed68777304be3a9317",
  measurementId: "G-WFQQG87WMG"
};

// Inicializar una sola vez
const app = initializeApp(firebaseConfig);

// Exportar las herramientas necesarias para App.jsx
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Configuración opcional para evitar el parpadeo de la ventana emergente
googleProvider.setCustomParameters({ prompt: 'select_account' });