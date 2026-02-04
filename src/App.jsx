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
import autoTable from "jspdf-autotable";

function App() {
  /* =======================
      STATES
  ======================= */
  const [user, setUser] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);

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
      TOAST PROFESIONAL
  ======================= */
  const showToast = (msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  /* =======================
      AUTH & PREFERENCIAS
  ======================= */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        const nickname = u.displayName || u.email.split('@')[0];
        showToast(`¡Bienvenido, ${nickname}! 👋`, "success");

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
      // Ordenar por fecha y luego por hora (createdAt)
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
      ACCIONES
  ======================= */
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error(err);
      showToast("Error al iniciar sesión", "error");
    }
  };

  const triggerConfirm = (message, onConfirm) => {
    setConfirmModal({ message, onConfirm });
  };

  const handleLogout = () => {
    triggerConfirm("¿Estás seguro de que quieres salir?", async () => {
      await signOut(auth);
      showToast("Sesión cerrada", "info");
    });
  };

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
      showToast("¡Movimiento guardado!", "success");
    } catch (err) {
      console.error(err);
      showToast("Error al guardar", "error");
    }
  };

  const editarTags = async () => {
    const nuevos = prompt("Edita tus palabras favoritas:", tags.join(", "));
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

  const exportarPDF = () => {
  if (!stats.filtrados || stats.filtrados.length === 0) {
    showToast("No hay datos para exportar", "error");
    return;
  }

  try {
    const docPDF = new jsPDF();
    docPDF.setFontSize(18);
    docPDF.text("Reporte de Finanzas", 14, 20);
    
    const limpiar = (t) => t.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');

    const rows = [];
    let totalDiaIng = 0;
    let totalDiaGas = 0;
    let fechaActual = stats.filtrados[0].fecha;

    stats.filtrados.forEach((m, index) => {
      // Si cambia la fecha, imprimimos el total acumulado del día anterior
      if (m.fecha !== fechaActual) {
        rows.push([
          { content: `TOTAL DEL DÍA (${fechaActual})`, colSpan: 3, styles: { fillColor: [0, 209, 178], fontStyle: 'bold' } },
          { content: `ING: S/ ${totalDiaIng.toFixed(2)}`, styles: { fillColor: [0, 209, 178], fontStyle: 'bold' } },
          { content: `GAS: S/ ${totalDiaGas.toFixed(2)}`, styles: { fillColor: [0, 209, 178], fontStyle: 'bold' } }
        ]);
        // Reiniciamos contadores para el nuevo día
        totalDiaIng = 0;
        totalDiaGas = 0;
        fechaActual = m.fecha;
      }

      // Añadir la fila normal del movimiento
      rows.push([
        m.fecha,
        m.hora || "--:--",
        limpiar(m.nombre),
        m.tipo.toUpperCase(),
        `S/ ${m.monto.toFixed(2)}`
      ]);

      // Sumar al total del día
      if (m.tipo === 'ingreso') totalDiaIng += m.monto;
      else totalDiaGas += m.monto;

      // Si es el último elemento de la lista, imprimir el último total del día
      if (index === stats.filtrados.length - 1) {
        rows.push([
          { content: `TOTAL DEL DÍA (${m.fecha})`, colSpan: 3, styles: { fillColor: [0, 209, 178], fontStyle: 'bold' } },
          { content: `ING: S/ ${totalDiaIng.toFixed(2)}`, styles: { fillColor: [0, 209, 178], fontStyle: 'bold' } },
          { content: `GAS: S/ ${totalDiaGas.toFixed(2)}`, styles: { fillColor: [0, 209, 178], fontStyle: 'bold' } }
        ]);
      }
    });

    // FILA FINAL DE TOTAL MENSUAL
    rows.push([
      { content: "TOTAL MENSUAL", colSpan: 2, styles: { fillColor: [0, 209, 178], fontStyle: 'bold', textColor: 255 } },
      { content: `ING: S/ ${stats.ing.toFixed(2)}`, styles: { fillColor: [0, 209, 178], fontStyle: 'bold' } },
      { content: `GAS: S/ ${stats.gas.toFixed(2)}`, styles: { fillColor: [0, 209, 178], fontStyle: 'bold' } },
      { content: `ING, NETO: S/ ${stats.bal.toFixed(2)}`, styles: { fillColor: [0, 209, 178], fontStyle: 'bold' } }
    ]);

    autoTable(docPDF, {
      startY: 30,
      head: [["Fecha", "Hora", "Detalle", "Tipo", "Monto"]],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [0, 209, 178] },
      styles: { fontSize: 9 }
    });

    docPDF.save(`reporte_${fechaFiltro}.pdf`);
    showToast("PDF generado", "success");
  } catch (err) {
    console.error("Error detalle PDF:", err);
    showToast("Error al crear PDF", "error");
  }
};

  /* =======================
      RENDER
  ======================= */
  if (loading) return <div className="loading-screen">Sincronizando...</div>;

  // Lógica para separadores de fecha en el historial
 

  return (
    <div className="main-container">
      <div className="phone-screen">
        <header className="app-header">
          <div className="header-left">
            <h2>Finanzas CHC</h2>
            <div className="date-select-container">
              <span className="date-label">Ver X Dias</span>
              <div className="date-select-wrapper">
                <span className="calendar-mini-icon">📅</span> 
                <input
                  className="mini-date-picker"
                  type={vistaMensual ? "month" : "date"}
                  value={vistaMensual ? fechaFiltro.substring(0, 7) : fechaFiltro}
                  onChange={(e) => setFechaFiltro(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="header-btns">
            {!user ? (
              <button className="btn-google-mini" onClick={handleLogin}>Login</button>
            ) : (
              <img src={user.photoURL} alt="u" className="mini-avatar" onClick={handleLogout} />
            )}
            
            <div className="btn-wrapper">
              <span className="btn-label">PDF</span>
              <button className="btn-icon" onClick={exportarPDF}>📄</button>
            </div>

            <div className="btn-wrapper">
              <span className="btn-label" style={{ color: vistaMensual ? '#bb86fc' : '#00d1b2' }}>
                {vistaMensual ? "Ver Día" : "Ver Mes"}
              </span>
              <button 
                className={`btn-icon ${vistaMensual ? 'border-mes' : 'border-dia'}`} 
                onClick={() => setVistaMensual(!vistaMensual)}
              >
                {vistaMensual ? "☀️" : "🗓️"}
              </button>
            </div>
          </div>
        </header>

        <div className="main-card donut-area">
          <div className="circle-chart-multi" style={{
              background: `conic-gradient(#ff4757 0deg ${stats.pGas}deg, #00d1b2 ${stats.pGas}deg ${stats.pGas + stats.pIng}deg, #a29bfe ${stats.pGas + stats.pIng}deg 360deg)`
          }}>
            <div className="inner-circle">
              <div className="chart-info">
                <p>S/ {stats.bal.toFixed(2)}</p>
                <span>{vistaMensual ? "Balance del mes" : "Balance de hoy"}</span>
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
  
  {stats.filtrados.map((m, index) => {
    // Lógica corregida: Comparamos con el elemento anterior del array directamente
    const mostrarSeparador = index === 0 || m.fecha !== stats.filtrados[index - 1].fecha;

    return (
      <React.Fragment key={m.id}>
        {mostrarSeparador && (
          <div className="date-separator">
            {new Date(m.fecha + "T00:00:00").toLocaleDateString("es-ES", { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        )}
        <div className="history-item">
          <div className="item-info">
            <strong>{m.nombre}</strong>
            <div className="item-time-group">
               {/* Aquí la fecha y hora estarán una al lado de la otra */}
               <span className="item-date-small">{m.fecha.split('-').slice(1).reverse().join('/')}</span>
               <span className="item-time">{m.hora}</span>
            </div>
          </div>
          <div className="item-right">
            <span className={`item-amount ${m.tipo}`}>{m.tipo === 'gasto' ? '-' : '+'} S/ {m.monto.toFixed(2)}</span>
            <button className="delete-btn" onClick={() => triggerConfirm("¿Eliminar este movimiento?", () => deleteDoc(doc(db, "movimientos", m.id)))}>×</button>
          </div>
        </div>
      </React.Fragment>
    );
  })}
</div>
      </div>

      {/* MODAL DE CONFIRMACIÓN PERSONALIZADO */}
      {confirmModal && (
        <div className="toast-overlay">
          <div className="confirm-box">
             <div className="confirm-icon">❓</div>
             <p>{confirmModal.message}</p>
             <div className="confirm-btns">
                <button className="btn-cancel" onClick={() => setConfirmModal(null)}>Cancelar</button>
                <button className="btn-confirm" onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }}>Aceptar</button>
             </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast-overlay">
          <div className={`toast-box ${toast.type}`}>
            <div className="toast-icon">
              {toast.type === "success" ? "✅" : toast.type === "error" ? "❌" : "ℹ️"}
            </div>
            <div className="toast-text">{toast.msg}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;