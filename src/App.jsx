import React, { useState, useEffect, useMemo } from "react";
import "./App.css";
import { db, auth, googleProvider } from "./firebase";

import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";

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

/* eslint-disable no-unused-vars */

function App() {
  /* =======================
     STATES
  ======================= */
  const [user, setUser] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const [nombre, setNombre] = useState("");
  const [monto, setMonto] = useState("");

  const [tags, setTags] = useState([
    "GNV ⛽",
    "Comida 🍔",
    "Diversión 🎮",
    "Generé 💰",
  ]);

  const [busqueda, setBusqueda] = useState("");
  const [vistaMensual, setVistaMensual] = useState(false);
  const [fechaFiltro, setFechaFiltro] = useState(
    new Date().toLocaleDateString("en-CA")
  );

  /* =======================
     TOAST
  ======================= */
  const showToast = (msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  /* =======================
     AUTH
  ======================= */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        const ref = doc(db, "config_usuarios", u.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setTags(snap.data().tags);
        }
      } else {
        setUser(null);
        setMovimientos([]);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  /* =======================
     DATA REALTIME
  ======================= */
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
      setMovimientos(
        data.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      );
    });

    return () => unsub();
  }, [user]);

  /* =======================
     STATS
  ======================= */
  const stats = useMemo(() => {
    const filtrados = movimientos.filter((m) => {
      const matchFecha = vistaMensual
        ? m.fecha?.startsWith(fechaFiltro.substring(0, 7))
        : m.fecha === fechaFiltro;

      const matchBusqueda = m.nombre
        ?.toLowerCase()
        .includes(busqueda.toLowerCase());

      return matchFecha && matchBusqueda;
    });

    const ing = filtrados
      .filter((m) => m.tipo === "ingreso")
      .reduce((a, b) => a + b.monto, 0);

    const gas = filtrados
      .filter((m) => m.tipo === "gasto")
      .reduce((a, b) => a + b.monto, 0);

    const bal = ing - gas;
    const total = ing + gas + Math.max(bal, 0);

    return {
      filtrados,
      ing,
      gas,
      bal,
      pGas: total ? (gas / total) * 360 : 0,
      pIng: total ? (ing / total) * 360 : 0,
    };
  }, [movimientos, vistaMensual, fechaFiltro, busqueda]);

  /* =======================
     ACTIONS
  ======================= */
  const registrar = async (tipo) => {
    if (!nombre || !monto || !user) return;

    try {
      await addDoc(collection(db, "movimientos"), {
        uid: user.uid,
        nombre: nombre.trim(),
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
    } catch {
      showToast("Error al guardar", "error");
    }
  };

  const editarTags = async () => {
    const nuevos = prompt(
      "Edita tus categorías separadas por coma:",
      tags.join(", ")
    );
    if (!nuevos || !user) return;

    const lista = nuevos.split(",").map((t) => t.trim());
    setTags(lista);
    await setDoc(doc(db, "config_usuarios", user.uid), { tags: lista });
  };

  const exportarPDF = () => {
    const pdf = new jsPDF();
    pdf.text(`Reporte Finanzas - ${user?.displayName}`, 14, 20);
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
    showToast("PDF generado", "success");
  };

  /* =======================
     RENDER
  ======================= */
  if (loading) {
    return <div className="loading-screen">Sincronizando nube...</div>;
  }

  return (
    <div className="main-container">
      <div className="phone-screen">

        {/* HEADER */}
        <header className="app-header">
          <div className="header-left">
            <h2>Finanzas</h2>
            <input
              className="mini-date-picker"
              type={vistaMensual ? "month" : "date"}
              value={
                vistaMensual
                  ? fechaFiltro.substring(0, 7)
                  : fechaFiltro
              }
              onChange={(e) => setFechaFiltro(e.target.value)}
            />
          </div>

          <div className="header-btns">
            {!user ? (
              <button
                className="btn-google-mini"
                onClick={async () => {
                  await signInWithPopup(auth, googleProvider);
                  showToast("Sesión iniciada", "success");
                }}
              >
                Login
              </button>
            ) : (
              <img
                src={user.photoURL}
                alt="u"
                className="mini-avatar"
                onClick={async () => {
                  await signOut(auth);
                  showToast("Sesión cerrada", "info");
                }}
              />
            )}
            <button className="btn-icon" onClick={exportarPDF}>
              📄
            </button>
            <button
              className="btn-icon"
              onClick={() => setVistaMensual(!vistaMensual)}
            >
              {vistaMensual ? "📅" : "🗓️"}
            </button>
          </div>
        </header>

        {/* DASHBOARD */}
        <div className="main-card donut-area">
          <div
            className="circle-chart-multi"
            style={{
              background: `conic-gradient(
                #ff4757 0deg ${stats.pGas}deg,
                #00d1b2 ${stats.pGas}deg ${stats.pGas + stats.pIng}deg,
                #a29bfe ${stats.pGas + stats.pIng}deg 360deg
              )`,
            }}
          >
            <div className="inner-circle">
              <div className="chart-info">
                <p>S/ {stats.bal.toFixed(2)}</p>
                <span>
                  {vistaMensual ? "Balance Mensual" : "Balance Diario"}
                </span>
              </div>
            </div>
          </div>

          <div className="dashboard-stats">
            <div className="stat">
              <span>Gastos</span>
              <p className="gasto-monto">S/ {stats.gas.toFixed(2)}</p>
            </div>
            <div className="stat">
              <span>Ingresos</span>
              <p>S/ {stats.ing.toFixed(2)}</p>
            </div>
            <div className="stat">
              <span>Balance</span>
              <p>S/ {stats.bal.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* INPUTS */}
        <div className="input-section">
          <div className="quick-tags">
            {tags.map((t, i) => (
              <button
                key={i}
                className="tag-btn"
                onClick={() => setNombre(t)}
              >
                {t}
              </button>
            ))}
            <button className="tag-btn-edit" onClick={editarTags}>
              ⚙️
            </button>
          </div>

          <input
            placeholder="Detalle"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />

          <input
            type="number"
            placeholder="Monto S/"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
          />

          <div className="btn-group-direct">
            <button
              className="btn-direct in"
              onClick={() => registrar("ingreso")}
            >
              💰 Ingreso
            </button>
            <button
              className="btn-direct out"
              onClick={() => registrar("gasto")}
            >
              💸 Gasto
            </button>
          </div>
        </div>

        {/* HISTORIAL */}
        <div className="history-list">
          <input
            className="search-bar"
            placeholder="🔍 Buscar..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />

          {stats.filtrados.map((m) => (
            <div key={m.id} className="history-item">
              <div className="item-info">
                <strong>{m.nombre}</strong>
                <span>{m.hora}</span>
              </div>
              <div className="item-right">
                <span className={`item-amount ${m.tipo}`}>
                  S/ {m.monto.toFixed(2)}
                </span>
                <button
                  className="delete-btn"
                  onClick={() =>
                    deleteDoc(doc(db, "movimientos", m.id))
                  }
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

export default App;
