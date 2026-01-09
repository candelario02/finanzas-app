import React, { useState, useEffect } from 'react';
import { db, auth, googleProvider } from './firebase';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// --- SECCIÓN: UTILIDADES Y STICKERS ---
// Diccionario de stickers automáticos según la palabra clave
const getSticker = (texto) => {
  const t = texto.toLowerCase();
  if (t.includes('comida') || t.includes('almuerzo')) return '🍴';
  if (t.includes('sueldo') || t.includes('pago')) return '💰';
  if (t.includes('transporte') || t.includes('uber') || t.includes('bus')) return '🚗';
  if (t.includes('renta') || t.includes('alquiler') || t.includes('casa')) return '🏠';
  if (t.includes('ocio') || t.includes('cine') || t.includes('salida')) return '🎬';
  return '📝'; // Sticker por defecto
};

function App() {
  const [user, setUser] = useState(null);
  const [monto, setMonto] = useState('');
  const [detalle, setDetalle] = useState('');
  const [movimientos, setMovimientos] = useState([]);
  const [filtroMes, setFiltroMes] = useState(new Date().toISOString().slice(0, 7));

  // --- SECCIÓN: AUTENTICACIÓN ---
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsub();
  }, []);

  const login = () => signInWithPopup(auth, googleProvider);
  const logout = () => signOut(auth);

  // --- SECCIÓN: BASE DE DATOS (FIRESTORE) ---
  useEffect(() => {
    if (!user) return;
    // Escuchar cambios en tiempo real filtrados por el usuario logueado
    const q = query(collection(db, "movimientos"), where("uid", "==", user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setMovimientos(docs);
    });
    return () => unsub();
  }, [user]);

  const agregarMovimiento = async (tipo) => {
    if (!monto || !detalle) return;
    const sticker = getSticker(detalle);
    await addDoc(collection(db, "movimientos"), {
      monto: parseFloat(monto),
      detalle: `${sticker} ${detalle}`,
      tipo,
      fecha: new Date().toISOString(),
      uid: user.uid
    });
    setMonto(''); setDetalle('');
  };

  const eliminar = async (id) => {
    await deleteDoc(doc(db, "movimientos", id));
  };

  // --- SECCIÓN: EXPORTAR A PDF ---
  const exportarPDF = () => {
    const doc = new jsPDF();
    doc.text("Reporte de Finanzas Personales", 14, 15);
    
    const tableData = movimientos.map(m => [
      new Date(m.fecha).toLocaleDateString(),
      m.detalle,
      m.tipo.toUpperCase(),
      `$${m.monto}`
    ]);

    doc.autoTable({
      head: [['Fecha', 'Detalle', 'Tipo', 'Monto']],
      body: tableData,
      startY: 25,
    });

    doc.save(`finanzas_${filtroMes}.pdf`);
  };

  // --- SECCIÓN: RENDERIZADO (VISTA) ---
  return (
    <div className="main-container">
      <div className="phone-screen">
        
        {/* LOGIN / LOGOUT */}
        <div className="auth-bar">
          {!user ? (
            <button className="btn-login" onClick={login}>Sincronizar con Google</button>
          ) : (
            <div className="user-profile">
              <img src={user.photoURL} alt="avatar" />
              <span>{user.displayName}</span>
              <button className="btn-logout" onClick={logout}>Salir</button>
            </div>
          )}
        </div>

        {/* SELECTOR DE FECHA CON AVISO */}
        <div className="date-selector">
          <p className="edit-hint">✨ Pulsa la fecha para ver por día o mes</p>
          <input 
            type="month" 
            value={filtroMes} 
            onChange={(e) => setFiltroMes(e.target.value)} 
          />
        </div>

        {/* CARD PRINCIPAL (Resumen) */}
        <div className="main-card">
          <div className="chart-info">
            <span>Balance Actual</span>
            <p>$ 1.500</p> {/* Aquí podrías sumar los montos reales */}
          </div>
          <button className="btn-pdf" onClick={exportarPDF}>📄 Exportar PDF</button>
        </div>

        {/* ENTRADA DE DATOS */}
        <div className="input-section">
          <p className="edit-hint">💡 Pulsa aquí para registrar un movimiento</p>
          <input 
            type="number" 
            placeholder="Monto ($)" 
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
          />
          <input 
            type="text" 
            placeholder="¿En qué? (ej. Comida, Sueldo...)" 
            value={detalle}
            onChange={(e) => setDetalle(e.target.value)}
          />
          <div className="btn-group-direct">
            <button className="btn-direct in" onClick={() => agregarMovimiento('ingreso')}>Ingreso</button>
            <button className="btn-direct out" onClick={() => agregarMovimiento('gasto')}>Gasto</button>
          </div>
        </div>

        {/* LISTA DE MOVIMIENTOS */}
        <div className="history-list">
          {movimientos.map(m => (
            <div key={m.id} className="history-item">
              <div className="item-info">
                <strong>{m.detalle}</strong>
                <span>{new Date(m.fecha).toLocaleDateString()}</span>
              </div>
              <div className="item-right">
                <span className={`item-amount ${m.tipo}`}>
                  {m.tipo === 'ingreso' ? '+' : '-'} ${m.monto}
                </span>
                <button className="delete-btn" onClick={() => eliminar(m.id)}>×</button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

export default App;