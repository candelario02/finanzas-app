import { useCallback, useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { DEFAULT_TAGS } from "../utils/constants";

export function useTags(user, showToast) {
  const [tags, setTags] = useState(DEFAULT_TAGS);
  const [prevUid, setPrevUid] = useState(user?.uid || null);

  if ((user?.uid || null) !== prevUid) {
    setPrevUid(user?.uid || null);
    setTags(DEFAULT_TAGS);
  }

  useEffect(() => {
    if (!user) return undefined;

    let activo = true;
    (async () => {
      try {
        const ref = doc(db, "config_usuarios", user.uid);
        const snap = await getDoc(ref);
        if (activo && snap.exists() && snap.data().tags?.length) {
          setTags(snap.data().tags);
        }
      } catch (err) {
        console.error("Error al cargar tags:", err);
        if (activo) showToast("No se pudieron cargar tus favoritos", "info");
      }
    })();

    return () => {
      activo = false;
    };
  }, [user, showToast]);

  const guardarTags = useCallback(
    async (lista) => {
      setTags(lista);
      if (user) {
        try {
          await setDoc(doc(db, "config_usuarios", user.uid), { tags: lista });
          showToast("Favoritos actualizados", "success");
        } catch (err) {
          console.error("Error al guardar tags:", err);
          showToast("Error al guardar favoritos", "error");
        }
      }
    },
    [user, showToast],
  );

  return { tags, guardarTags };
}
