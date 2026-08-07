import { useCallback, useEffect, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "../firebase";

export function useAuth(showToast) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        const nickname = u.displayName || u.email?.split("@")[0] || "Usuario";
        if (!localStorage.getItem("saludo_realizado")) {
          showToast(`Bienvenido, ${nickname}`, "success");
          localStorage.setItem("saludo_realizado", "true");
        }
      } else {
        setUser(null);
        localStorage.removeItem("saludo_realizado");
      }
      setLoading(false);
    });
    return () => unsub();
  }, [showToast]);

  const login = useCallback(async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Error de login:", err.code, err.message);
      if (err.code === "auth/popup-closed-by-user") {
        showToast("Inicio de sesion cancelado", "info");
      } else if (err.code === "auth/cancelled-popup-request") {
        showToast("Ya hay una ventana de login abierta", "info");
      } else {
        showToast("Error de conexion con Google", "error");
      }
    }
  }, [showToast]);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      showToast("Sesion cerrada", "info");
    } catch {
      showToast("Error al cerrar sesion", "error");
    }
  }, [showToast]);

  return { user, loading, login, logout };
}
