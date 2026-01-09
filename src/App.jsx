import React, { useState, useEffect } from 'react';
import { db, auth, googleProvider } from './firebase';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Lógica de stickers sugeridos (solo si el usuario no pone uno)
const getSticker = (texto) => {
  const emojiRegex = /\p{Emoji}/u;
  if (emojiRegex.test(texto)) return ''; // Si el usuario ya puso sticker, no hacemos nada
  const t = texto.toLowerCase();
  if (t.includes('comida')) return '🍴 ';
  if (t.includes('gnv') || t.includes('gas')) return '⛽ ';
  if (t.includes('diversion')) return '🎬 ';
  return '📝 ';
};

function App() {
  const [user, setUser] = useState(null);
  const [monto, setMonto] = useState('');
  const [detalle, setDetalle] = useState('');
  const [movimientos, setMovimientos] = useState([]);
  const [fechaSeleccionada, setFechaSeleccionada] = useState("2026-01-09");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "movimientos"), where("uid", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      setMovimientos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user]);

  const exportarPDF = () => {
    const doc = new jsPDF();
    doc.text("Reporte de Gastos", 14, 15);
    const data = movimientos.map(m => [m.detalle, m.tipo, `S/ ${m.monto}`]);
    doc.autoTable({ head: [['Detalle', 'Tipo', 'Monto']], body: data, startY: 20 });
    doc.save("finanzas.pdf");
  };

  const agregar = async (tipo) => {
    if (!monto || !detalle) return;
    const sticker = getSticker(detalle);
    await addDoc(collection(db, "movimientos"), {
      monto: parseFloat(monto),
      detalle: `${sticker}${detalle}`,
      tipo,
      fecha: fechaSeleccionada,
      uid: user.uid
    });
    setMonto(''); setDetalle('');
  };

  return (
    <div className="main-container">
      <div className="phone-screen">
        <div className="app-header">
          <h2>Detalle Día</h2>
          <div className="header-btns">
            <button className="btn-switch">📊</button>
            <button className="btn-switch">📅</button>
          </div>
        </div>

        {!user ? (
          <button className="btn-login" onClick={() => signInWithPopup(auth, googleProvider)}>🚀 Sincronizar con Google</button>
        ) : (
          <div className="user-profile">
            <img src={user.photoURL} alt="u" />
            <span>{user.displayName}</span>
            <button className="btn-logout" onClick={() => signOut(auth)}>Salir</button>
          </div>
        )}

        <div className="date-selector">
          <p className="edit-hint">✨ Pulsa la fecha para ver por día o mes</p>
          <input type="date" value={fechaSeleccionada} onChange={(e) => setFechaSeleccionada(e.target.value)} />
        </div>

        <div className="main-card">
          <div className="circle-chart-multi" style={{background: 'conic-gradient(#bb86fc 0% 70%, #00d1b2 70% 100%)'}}>
            <div className="inner-circle">
               <div className="chart-info"><p>S/ 0.00</p><span>Balance</span></div>
            </div>
          </div>
          <div className="dashboard-stats">
            <div className="stat"><p>S/ 0.00</p><span>Gastos</span></div>
            <div className="stat"><p>S/ 0.00</p><span>Ingresos</span></div>
          </div>
          <button className="btn-pdf" onClick={exportarPDF}>📄 Exportar PDF</button>
        </div>

        <div className="input-section">
          <p className="edit-hint">💡 Pulsa aquí para registrar un movimiento</p>
          <div className="quick-tags">
            {['GNV', 'Comida', 'Diversión', 'Generé'].map(t => (
              <button key={t} className="tag-btn" onClick={() => setDetalle(t)}>{t}</button>
            ))}
          </div>
          <input type="text" placeholder="Detalle (ej. Comida)" value={detalle} onChange={(e)=>setDetalle(e.target.value)} />
          <input type="number" placeholder="Monto S/" value={monto} onChange={(e)=>setMonto(e.target.value)} />
          <div className="btn-group-direct">
            <button className="btn-direct in" onClick={() => agregar('ingreso')}>💰 Ingreso</button>
            <button className="btn-direct out" onClick={() => agregar('gasto')}>💸 Gasto</button>
          </div>
        </div>

        <div className="history-list">
          {movimientos.map(m => (
            <div key={m.id} className="history-item">
              <div className="item-info"><strong>{m.detalle}</strong><span>{m.fecha}</span></div>
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