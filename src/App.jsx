import React, { useState, useEffect } from 'react';
import { db, auth, googleProvider } from './firebase';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// --- 1. FUNCIÓN DE STICKERS AUTOMÁTICOS ---
const getSticker = (texto) => {
  const t = texto.toLowerCase();
  if (t.includes('comida')) return '🍴';
  if (t.includes('diversion') || t.includes('cine')) return '🎬';
  if (t.includes('gnv') || t.includes('gas')) return '⛽';
  if (t.includes('sueldo')) return '💰';
  return '📝';
};

function App() {
  const [user, setUser] = useState(null);
  const [monto, setMonto] = useState('');
  const [detalle, setDetalle] = useState('');
  const [movimientos, setMovimientos] = useState([]);
  const [fechaSeleccionada, setFechaSeleccionada] = useState("2026-01-09"); // Fecha de tu foto

  // --- 2. GESTIÓN DE USUARIO ---
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => setUser(currentUser));
    return () => unsub();
  }, []);

  // --- 3. CARGA DE DATOS REALES ---
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "movimientos"), where("uid", "==", user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      setMovimientos(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user]);

  // --- 4. EXPORTAR A PDF (NUEVO) ---
  const exportarPDF = () => {
    const doc = new jsPDF();
    doc.text("Reporte de Gastos - Detalle Día", 14, 15);
    const tableData = movimientos.map(m => [m.fecha, m.detalle, m.tipo, `S/ ${m.monto}`]);
    doc.autoTable({ head: [['Fecha', 'Detalle', 'Tipo', 'Monto']], body: tableData, startY: 25 });
    doc.save("finanzas.pdf");
  };

  const agregar = async (tipo) => {
    if (!monto || !detalle) return;
    const sticker = getSticker(detalle);
    await addDoc(collection(db, "movimientos"), {
      monto: parseFloat(monto),
      detalle: `${sticker} ${detalle}`,
      tipo,
      fecha: fechaSeleccionada,
      uid: user.uid
    });
    setMonto(''); setDetalle('');
  };

  return (
    <div className="main-container">
      <div className="phone-screen">
        
        {/* HEADER ORIGINAL */}
        <div className="app-header">
          <h2 style={{color: 'white'}}>Detalle Día</h2>
          <div className="header-btns">
             <button className="btn-switch">📊</button>
             <button className="btn-switch">📅</button>
          </div>
        </div>

        {/* BOTÓN LOGIN */}
        {!user ? (
          <button className="btn-login" onClick={() => signInWithPopup(auth, googleProvider)}>
            🚀 Sincronizar con Google
          </button>
        ) : (
          <div className="user-profile">
            <img src={user.photoURL} alt="u" />
            <span>{user.displayName}</span>
            <button className="btn-logout" onClick={() => signOut(auth)}>Salir</button>
          </div>
        )}

        {/* SELECTOR DE FECHA (CON TU COMENTARIO) */}
        <div className="date-selector">
          <p className="edit-hint">✨ Pulsa la fecha para ver por día o mes</p>
          <input type="date" value={fechaSeleccionada} onChange={(e) => setFechaSeleccionada(e.target.value)} />
        </div>

        {/* TU CÍRCULO DE BALANCE ORIGINAL */}
        <div className="main-card">
          <div className="circle-chart-multi">
            <div className="inner-circle">
               <div className="chart-info">
                 <p>S/ 0.00</p>
                 <span>Balance</span>
               </div>
            </div>
          </div>
          <div className="dashboard-stats">
            <div className="stat"><p>S/ 0.00</p><span>Gastos</span></div>
            <div className="stat"><p>S/ 0.00</p><span>Ingresos</span></div>
          </div>
          {/* NUEVO BOTÓN PDF ABAJO DEL CÍRCULO */}
          <button className="btn-pdf" onClick={exportarPDF}>📄 Exportar PDF</button>
        </div>

        {/* INPUTS CON TU DISEÑO DE BOTONES GNV/COMIDA */}
        <div className="input-section">
          <p className="edit-hint">💡 Pulsa aquí para registrar un movimiento</p>
          <div className="quick-tags">
            {['GNV', 'Comida', 'Diversión'].map(t => (
              <button key={t} className="tag-btn" onClick={() => setDetalle(t)}>{t}</button>
            ))}
          </div>
          <input type="text" placeholder="Detalle del gasto/ingreso" value={detalle} onChange={(e)=>setDetalle(e.target.value)} />
          <input type="number" placeholder="Monto S/" value={monto} onChange={(e)=>setMonto(e.target.value)} />
          
          <div className="btn-group-direct">
            <button className="btn-direct in" onClick={() => agregar('ingreso')}>💰 Ingreso</button>
            <button className="btn-direct out" onClick={() => agregar('gasto')}>💸 Gasto</button>
          </div>
        </div>

        {/* LISTA DE HISTORIAL */}
        <div className="history-list">
          {movimientos.map(m => (
            <div key={m.id} className="history-item">
               <div className="item-info">
                 <strong>{m.detalle}</strong>
                 <span>{m.fecha}</span>
               </div>
               <div className="item-right">
                 <span className={`item-amount ${m.tipo}`}>S/ {m.monto}</span>
                 <button className="delete-btn" onClick={() => deleteDoc(doc(db, "movimientos", m.id))}>×</button>
               </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

export default App;