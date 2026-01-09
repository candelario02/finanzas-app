import React, { useState, useEffect } from 'react';
import { db, auth, googleProvider } from './firebase';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// --- 1. LÓGICA DE STICKERS (Acepta stickers manuales o automáticos) ---
const getSticker = (texto) => {
  // Si el usuario ya escribió un emoji al inicio, no agregamos otro
  const emojiRegex = /\p{Emoji}/u;
  if (emojiRegex.test(texto.trim().substring(0, 2))) return '';

  const t = texto.toLowerCase();
  if (t.includes('comida')) return '🍴 ';
  if (t.includes('diversion') || t.includes('cine')) return '🎬 ';
  if (t.includes('gnv') || t.includes('gas')) return '⛽ ';
  if (t.includes('sueldo')) return '💰 ';
  return '📝 ';
};

function App() {
  const [user, setUser] = useState(null);
  const [monto, setMonto] = useState('');
  const [detalle, setDetalle] = useState('');
  const [movimientos, setMovimientos] = useState([]);
  const [fechaSeleccionada, setFechaSeleccionada] = useState("2026-01-09");

  // Sesión de usuario
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => setUser(currentUser));
    return () => unsub();
  }, []);

  // Carga de datos de Firebase
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "movimientos"), where("uid", "==", user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      setMovimientos(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user]);

  // --- EXPORTAR A PDF (Reemplaza al Excel) ---
  const exportarPDF = () => {
    const doc = new jsPDF();
    doc.text(`Reporte de Finanzas - ${fechaSeleccionada}`, 14, 15);
    const tableData = movimientos
      .filter(m => m.fecha === fechaSeleccionada)
      .map(m => [m.detalle, m.tipo.toUpperCase(), `S/ ${m.monto.toFixed(2)}`]);
    
    doc.autoTable({
      head: [['Detalle', 'Tipo', 'Monto']],
      body: tableData,
      startY: 25
    });
    doc.save(`finanzas_${fechaSeleccionada}.pdf`);
  };

  const agregar = async (tipo) => {
    if (!monto || !detalle) return;
    const stickerSugerido = getSticker(detalle);
    
    await addDoc(collection(db, "movimientos"), {
      monto: parseFloat(monto),
      detalle: `${stickerSugerido}${detalle}`,
      tipo,
      fecha: fechaSeleccionada,
      uid: user.uid
    });
    setMonto(''); 
    setDetalle('');
  };

  // Cálculos de Balance para el círculo
  const ingresos = movimientos.filter(m => m.tipo === 'ingreso').reduce((acc, m) => acc + m.monto, 0);
  const gastos = movimientos.filter(m => m.tipo === 'gasto').reduce((acc, m) => acc + m.monto, 0);
  const balance = ingresos - gastos;

  return (
    <div className="main-container">
      <div className="phone-screen">
        
        {/* Cabecera */}
        <div className="app-header">
          <h2 style={{color: 'white'}}>Detalle Día</h2>
          <div className="header-btns">
             <button className="btn-switch">📊</button>
             <button className="btn-switch">📅</button>
          </div>
        </div>

        {/* Auth */}
        {!user ? (
          <button className="btn-login" onClick={() => signInWithPopup(auth, googleProvider)}>
            🚀 Sincronizar con Google
          </button>
        ) : (
          <div className="user-profile">
            <img src={user.photoURL} alt="u" style={{width: '30px', borderRadius: '50%'}} />
            <span>{user.displayName}</span>
            <button className="btn-logout" onClick={() => signOut(auth)}>Salir</button>
          </div>
        )}

        {/* Selector de Fecha */}
        <div className="date-selector">
          <p className="edit-hint">✨ Pulsa la fecha para ver por día o mes</p>
          <input type="date" value={fechaSeleccionada} onChange={(e) => setFechaSeleccionada(e.target.value)} />
        </div>

        {/* Círculo de Balance con Botón PDF */}
        <div className="main-card">
          <div className="circle-chart-multi">
            <div className="inner-circle">
               <div className="chart-info">
                 <p>S/ {balance.toFixed(2)}</p>
                 <span>Balance</span>
               </div>
            </div>
          </div>
          <div className="dashboard-stats">
            <div className="stat"><p>S/ {gastos.toFixed(2)}</p><span>Gastos</span></div>
            <div className="stat"><p>S/ {ingresos.toFixed(2)}</p><span>Ingresos</span></div>
          </div>
          {/* BOTÓN PDF REEMPLAZANDO EXCEL */}
          <button className="btn-pdf" onClick={exportarPDF} style={{marginTop: '15px'}}>
            📄 Exportar PDF
          </button>
        </div>

        {/* Registro de Movimientos */}
        <div className="input-section">
          {/* COMENTARIO SOLO AQUÍ ENCIMA DE LAS PALABRAS */}
          <p className="edit-hint">💡 Pulsa aquí para registrar un movimiento</p>
          <div className="quick-tags">
            {['GNV', 'Comida', 'Diversión', 'Generé'].map(t => (
              <button key={t} className="tag-btn" onClick={() => setDetalle(t)}>{t}</button>
            ))}
          </div>
          
          <input 
            type="text" 
            placeholder="Detalle (puedes incluir tu propio sticker)" 
            value={detalle} 
            onChange={(e)=>setDetalle(e.target.value)} 
          />
          <input 
            type="number" 
            placeholder="Monto S/" 
            value={monto} 
            onChange={(e)=>setMonto(e.target.value)} 
          />
          
          <div className="btn-group-direct">
            <button className="btn-direct in" onClick={() => agregar('ingreso')}>💰 Ingreso</button>
            <button className="btn-direct out" onClick={() => agregar('gasto')}>💸 Gasto</button>
          </div>
        </div>

        {/* Lista Historial */}
        <div className="history-list">
          {movimientos
            .filter(m => m.fecha === fechaSeleccionada)
            .map(m => (
              <div key={m.id} className="history-item">
                 <div className="item-info">
                   <strong>{m.detalle}</strong>
                   <span>{m.fecha}</span>
                 </div>
                 <div className="item-right">
                   <span className={`item-amount ${m.tipo}`}>S/ {m.monto.toFixed(2)}</span>
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