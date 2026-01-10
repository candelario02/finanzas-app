import React, { useState, useEffect, useMemo } from "react";
import "./App.css";
import { db, auth, googleProvider } from "./firebase";

import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";

import jsPDF from "jspdf";
import "jspdf-autotable";

function App() {
  /* ======================= STATES ======================= */
  const [user, setUser] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const [nombre, setNombre] = useState("");
  const [monto, setMonto] = useState("");
  const [busqueda, setBusqueda] = useState("");

  const [vistaMensual, setVistaMensual] = useState(false);
  const [fechaFiltro, setFechaFiltro] = useState(
    new Date().toLocaleDateString("en-CA")
  );

  const [tags, setTags] = useState([
    "GNV ⛽",
    "Comida 🍔",
    "Diversión 🎮",
    "Generé 💰",
  ]);

  /* ======================= TOAST ======================= */
  const showToast = (msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  /* ======================= AUTH ======================= */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        const snap = await getDoc(doc(db, "config_usuarios", u.uid));
        if (snap.exists()) setTags(snap.data().tags);
        showToast("Sesión iniciada", "success");
      } else {
        setUser(null);
        setMovimientos([]);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  /* ======================= DATA ======================= */
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "movimientos"),
      where("uid", "==", user.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({
        ...d.data(),
        id: d.id,
      }));
      setMovimientos(data.sort((a, b) => b.createdAt - a.createdAt));
    });

    return () => unsub();
  }, [user]);

  /* ======================= STATS ======================= */
  const stats = useMemo(() => {
    const filtrados = movimientos.filter((m) => {
      const fechaOK = vistaMensual
        ? m.fecha.startsWith(fechaFiltro.slice(0, 7))
        : m.fecha === fechaFiltro;

      const busqOK = m.nombre
        .toLowerCase()
        .includes(busqueda.toLowerCase());

      return fechaOK && busqOK;
    });

    const ing = filtrados
      .filter((m) => m.tipo === "ingreso")
      .reduce((a, b) => a + b.monto, 0);

    const gas = filtrados
      .filter((m) => m.tipo === "gasto")
      .reduce((a, b) => a + b.monto, 0);

    return {
      filtrados,
      ing,
      gas,
      bal: ing - gas,
    };
  }, [movimientos, vistaMensual, fechaFiltro, busqueda]);

  /* ======================= ACTIONS ======================= */
  const registrar = async (tipo) => {
    if (!nombre || !monto) {
      showToast("Completa los campos", "error");
      return;
    }

    await addDoc(collection(db, "movimientos"), {
      uid: user.uid,
      nombre,
      monto: parseFloat(monto),
      tipo,
      fecha: new Date().toLocaleDateString("en-CA"),
      hora: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      createdAt: Date.now(),
    });

    setNombre("");
    setMonto("");
    showToast("Movimiento guardado", "success");
  };

  const eliminar = async (id) => {
    if (!window.confirm("¿Eliminar movimiento?")) return;
    await deleteDoc(doc(db, "movimientos", id));
    showToast("Eliminado", "info");
  };

  const editarTags = async () => {
    const nuevos = prompt(
      "Edita tus categorías (separadas por coma):",
      tags.join(", ")
    );
    if (!nuevos) return;

    const lista = nuevos.split(",").map((t) => t.trim());
    setTags(lista);
    await setDoc(doc(db, "config_usuarios", user.uid), { tags: lista });
    showToast("Categorías actualizadas", "success");
  };

  const exportarPDF = () => {
    if (stats.filtrados.length === 0) {
      showToast("No hay datos", "error");
      return;
    }

    const pdf = new jsPDF();
    pdf.text(`Reporte - ${user.displayName}`, 14, 20);
    pdf.autoTable({
      startY: 30,
      head: [["Fecha", "Detalle", "Tipo", "Monto"]],
      body: stats.filtrados.map((m) => [
        m.fecha,
        m.nombre,
        m.tipo,
        `S/ ${m.monto.toFixed(2)}`,
      ]),
    });
    pdf.save("finanzas.pdf");
  };

  const cerrarSesion = async () => {
    if (!window.confirm("¿Cerrar sesión?")) return;
    await signOut(auth);
  };

  /* ======================= UI ======================= */
  if (loading) return <div className="loading-screen">Cargando...</div>;

  return (
    <div className="main-container">
      <div className="phone-screen">

        <header className="app-header">
          <h2>Finanzas</h2>
          <div>
            {!user ? (
              <button onClick={() => signInWithPopup(auth, googleProvider)}>
                Login
              </button>
            ) : (
              <>
                <button onClick={exportarPDF}>📄</button>
                <img
                  src={user.photoURL}
                  alt="avatar"
                  className="mini-avatar"
                  onClick={cerrarSesion}
                />
              </>
            )}
          </div>
        </header>

        {user && (
          <>
            <input
              placeholder="Buscar..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />

            <input
              type="date"
              value={fechaFiltro}
              onChange={(e) => setFechaFiltro(e.target.value)}
            />

            <button onClick={() => setVistaMensual(!vistaMensual)}>
              {vistaMensual ? "Vista diaria" : "Vista mensual"}
            </button>

            <div className="tags">
              {tags.map((t) => (
                <button key={t} onClick={() => setNombre(t)}>
                  {t}
                </button>
              ))}
              <button onClick={editarTags}>✏️</button>
            </div>

            <input
              placeholder="Detalle"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
            <input
              type="number"
              placeholder="Monto"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
            />

            <div className="acciones">
              <button onClick={() => registrar("ingreso")}>Ingreso</button>
              <button onClick={() => registrar("gasto")}>Gasto</button>
            </div>

            <ul>
              {stats.filtrados.map((m) => (
                <li key={m.id}>
                  {m.nombre} - S/ {m.monto}
                  <button onClick={() => eliminar(m.id)}>❌</button>
                </li>
              ))}
            </ul>

            <h3>Balance: S/ {stats.bal.toFixed(2)}</h3>
          </>
        )}
      </div>

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}

export default App;
