import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "TU_API_KEY_AQUI",
  authDomain: "finanzas-personales-bfefc.firebaseapp.com",
  projectId: "finanzas-personales-bfefc",
  storageBucket: "finanzas-personales-bfefc.appspot.com",
  messagingSenderId: "TU_ID",
  appId: "TU_APP_ID"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar herramientas
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();