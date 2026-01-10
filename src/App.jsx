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
      TOAST (MEJORADO)
  ======================= */
  const showToast = (msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  /* =======================
      AUTH & PREFERENCIAS (SIN CAMBIOS)
  ======================= */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        try {
          const ref = doc(db, "config_usuarios", u.uid);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            setTags(snap.data().tags);
          }
        } catch (err) {
          console.error("Error al cargar tags:", err);
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
      DATA REALTIME (SIN CAMBIOS)
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
      STATS (CÁLCULOS)
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
    const totalCirculo = ing + gas + Math.abs(bal);

    return {
      filtrados,
      ing,
      gas,
      bal,
      pGas: totalCirculo ? (gas / totalCirculo) * 360 : 0,
      pIng: totalCirculo ? (ing / totalCirculo) * 360 : 0,
    };
  }, [movimientos, vistaMensual, fechaFiltro, busqueda]);

  /* =======================
      ACCIONES (LÓGICA ORIGINAL)
  ======================= */
  const registrar = async (tipo) => {
    if (!nombre || !monto || !user) {
        showToast("Completa los campos", "error");
        return;
    }

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
      showToast("¡Movimiento registrado!", "success");
    } catch (err) {
      console.error(err);
      showToast("Error al guardar en la nube", "error");
    }
  };

  const handleLogout = async () => {
    if (window.confirm("¿Cerrar sesión?")) {
      await signOut(auth);
    }
  };

  const editarTags = async () => {
    const nuevos = prompt("Editar favoritos (separados por coma):", tags.join(", "));
    if (nuevos === null) return;

    const lista = nuevos.split(",").map((t) => t.trim()).filter(t => t !== "");
    setTags(lista);
    
    if (user) {
        try {
            await setDoc(doc(db, "config_usuarios", user.uid), { tags: lista });
            showToast("Favoritos actualizados", "success");
        } catch (err) {
            console.error(err);
        }
    }
  };

  /* =======================
      EXPORTAR PDF (CORREGIDO)
  ======================= */
  const exportarPDF = () => {
    if (stats.filtrados.length === 0) {
      showToast("No hay datos para exportar", "info");
      return;
    }

    try {
        const docPDF = new jsPDF();
        
        // Encabezado
        docPDF.setFontSize(20);
        docPDF.setTextColor(40);
        docPDF.text("Reporte de Movimientos", 14, 22);
        
        docPDF.setFontSize(10);
        docPDF.setTextColor(100);
        docPDF.text(`Usuario: ${user?.displayName || user?.email}`, 14, 30);
        docPDF.text(`Periodo: ${fechaFiltro}`, 14, 35);
        docPDF.text(`Generado: ${new Date().toLocaleString()}`, 14, 40);

        const tableColumn = ["Fecha", "Hora", "Detalle", "Tipo", "Monto"];
        const tableRows = stats.filtrados.map(m => [
          m.fecha,
          m.hora || "--:--",
          m.nombre,
          m.tipo.toUpperCase(),
          `S/ ${Number(m.monto).toFixed(2)}`
        ]);

        docPDF.autoTable({
          startY: 45,
          head: [tableColumn],
          body: tableRows,
          theme: 'striped',
          headStyles: { fillColor: [0, 209, 178] }
        });

        docPDF.save(`Reporte_Finanzas_${fechaFiltro}.pdf`);
        showToast("PDF generado con éxito", "success");
    } catch (err) {
        console.error("Error detallado PDF:", err);
        showToast("Error al crear PDF", "error");
    }
  };

  /* =======================
      RENDER
  ======================= */
  if (loading) return <div className="loading-screen">Sincronizando...</div>;

  return (
    <div className="main-container">
      <div className="phone-screen">
        <header className="app-header">
          <div className="header-left">
            <h2>Finanzas</h2>
            <input
              className="mini-date-picker"
              type={vistaMensual ? "month" : "date"}
              value={vistaMensual ? fechaFiltro.substring(0, 7) : fechaFiltro}
              onChange={(e) => setFechaFiltro(e.target.value)}
            />
          </div>
          <div className="header-btns">
            {!user ? (
              <button onClick={() => signInWithPopup(auth, googleProvider)}>Login</button>
            ) : (
              <img src={user.photoURL} alt="u" className="mini-avatar" onClick={handleLogout} />
            )}
            <button className="btn-icon" onClick={exportarPDF}>📄</button>
            <button className="btn-icon" onClick={() => setVistaMensual(!vistaMensual)}>
              {vistaMensual ? "📅" : "🗓️"}
            </button>
          </div>
        </header>

        {/* ... Resto de tu UI igual ... */}
        <div className="main-card donut-area">
          <div className="circle-chart-multi" style={{
              background: `conic-gradient(#ff4757 0deg ${stats.pGas}deg, #00d1b2 ${stats.pGas}deg ${stats.pGas + stats.pIng}deg, #a29bfe ${stats.pGas + stats.pIng}deg 360deg)`
          }}>
            <div className="inner-circle">
              <div className="chart-info">
                <p>S/ {stats.bal.toFixed(2)}</p>
                <span>Balance</span>
              </div>
            </div>
          </div>
          <div className="dashboard-stats">
            <div className="stat"><span>Gastos</span><p className="gasto-monto">S/ {stats.gas.toFixed(2)}</p></div>
            <div className="stat"><span>Ingresos</span><p>S/ {stats.ing.toFixed(2)}</p></div>
            <div className="stat"><span>Balance</span><p>S/ {stats.bal.toFixed(2)}</p></div>
          </div>
        </div>

        <div className="input-section">
          <div className="quick-tags">
            {tags.map((t, i) => (
              <button key={i} className="tag-btn" onClick={() => setNombre(t)}
                onContextMenu={(e) => { e.preventDefault(); editarTags(); }}>{t}</button>
            ))}
            <button className="tag-btn-edit" onClick={editarTags}>⚙️</button>
          </div>
          <input placeholder="Detalle..." value={nombre} onChange={(e) => setNombre(e.target.value)} />
          <input type="number" placeholder="Monto S/" value={monto} onChange={(e) => setMonto(e.target.value)} />
          <div className="btn-group-direct">
            <button className="btn-direct in" onClick={() => registrar("ingreso")}>💰 Ingreso</button>
            <button className="btn-direct out" onClick={() => registrar("gasto")}>💸 Gasto</button>
          </div>
        </div>

        <div className="history-list">
          <input className="search-bar" placeholder="🔍 Buscar..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          {stats.filtrados.map((m) => (
            <div key={m.id} className="history-item">
              <div className="item-info"><strong>{m.nombre}</strong><span>{m.hora}</span></div>
              <div className="item-right">
                <span className={`item-amount ${m.tipo}`}>{m.tipo === 'gasto' ? '-' : '+'} S/ {m.monto.toFixed(2)}</span>
                <button className="delete-btn" onClick={() => window.confirm("¿Eliminar?") && deleteDoc(doc(db, "movimientos", m.id))}>×</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* TOAST PROFESIONAL EN EL CENTRO */}
      {toast && (
        <div className="toast-overlay">
          <div className={`toast-card ${toast.type}`}>
            <div className="toast-icon">
              {toast.type === "success" ? "✅" : toast.type === "error" ? "❌" : "ℹ️"}
            </div>
            <div className="toast-msg">{toast.msg}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;