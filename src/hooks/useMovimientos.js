import { useCallback, useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { fechaInputHoy, horaActual } from "../utils/format";

export function useMovimientos(user, showToast) {
  const [movimientos, setMovimientos] = useState([]);
  const [prevUid, setPrevUid] = useState(user?.uid || null);

  if ((user?.uid || null) !== prevUid) {
    setPrevUid(user?.uid || null);
    setMovimientos([]);
  }

  useEffect(() => {
    if (!user) return undefined;

    const q = query(
      collection(db, "movimientos"),
      where("uid", "==", user.uid),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
        setMovimientos(
          data.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
        );
      },
      (err) => {
        console.error("Error en listener de movimientos:", err);
        showToast("Error al sincronizar movimientos", "error");
      },
    );
    return () => unsub();
  }, [user, showToast]);

  const registrar = useCallback(
    async (nombre, monto, tipo) => {
      if (!nombre.trim() || !monto || !user) {
        showToast("Completa los campos", "error");
        return false;
      }

      const montoNum = parseFloat(monto);
      if (isNaN(montoNum) || montoNum <= 0) {
        showToast("Ingresa un monto valido", "error");
        return false;
      }

      const nuevoMovimiento = {
        uid: user.uid,
        nombre: nombre.trim(),
        monto: montoNum,
        tipo,
        fecha: fechaInputHoy(),
        hora: horaActual(),
        createdAt: Date.now(),
      };

      try {
        await addDoc(collection(db, "movimientos"), nuevoMovimiento);
        showToast("Movimiento registrado!", "success");
        return true;
      } catch (err) {
        console.error("Error al guardar movimiento:", err);
        showToast("Error al sincronizar. Se reintentara.", "error");
        return false;
      }
    },
    [user, showToast],
  );

  const eliminar = useCallback(
    async (movimiento) => {
      if (movimiento.uid !== user?.uid) {
        showToast("No tienes permiso para eliminar este movimiento", "error");
        return;
      }
      try {
        await deleteDoc(doc(db, "movimientos", movimiento.id));
      } catch (err) {
        console.error("Error al eliminar:", err);
        showToast("Error al eliminar. Reintenta.", "error");
      }
    },
    [user, showToast],
  );

  return { movimientos, registrar, eliminar };
}
