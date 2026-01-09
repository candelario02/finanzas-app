import React, { useState, useEffect, useMemo } from 'react';
import './App.css';
import { db, auth, googleProvider } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

function App() {
  const [user, setUser] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para las cajas de texto
  const [nombre, setNombre] = useState('');
  const [monto, setMonto] = useState('');
  
  // Estados para filtros y búsqueda
  const [busqueda, setBusqueda] = useState('');
  const [vistaMensual, setVistaMensual] = useState(false);
  const [fechaFiltro, setFechaFiltro] = useState(new Date().toISOString().split('T')[0]);

  // 1. Manejo de Usuario y Persistencia de Sesión
  useEffect(() => {
    const initAuth = async () => {
      try {
        await setPersistence(auth, browserLocalPersistence);
        const unsub = onAuthStateChanged(auth, (u) => {
          setUser(u || null);
          setLoading(false);
        });
        return () => unsub();
      } catch (e) {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  // 2. Sincronización con Firestore (Evita que los datos se pierdan)
  useEffect(() => {
    if (!user) {
      setMovimientos([]);
      return;
    }
    const q = query(collection(db, "movimientos"), where("uid", "==", user.uid));
    const unsubSnap = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
      setMovimientos(docs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
    });
    return () => unsubSnap();
  }, [user]);

  // 3. Lógica de Cálculos para la Gráfica y Balance
  const stats = useMemo(() => {
    const filtrados = movimientos.filter(m => {
      const matchFecha = vistaMensual 
        ? m.fecha.startsWith(fechaFiltro.substring(0, 7)) 
        : m.fecha === fechaFiltro;
      const matchBusqueda = m.nombre.toLowerCase().includes(busqueda.toLowerCase());
      return matchFecha && matchBusqueda;
    });

    const tIn = filtrados.filter(m => m.tipo === 'ingreso').reduce((a, b) => a + b.monto, 0);
    const tOut = filtrados.filter(m => m.tipo === 'gasto').reduce((a, b) => a + b.monto, 0);
    const bal = tIn - tOut;
    const totalG = tIn + tOut;
    
    // Ángulo para la dona (CSS conic-gradient)
    const pOut = totalG > 0 ? (tOut / totalG) * 360 : 0;
    
    return { filtrados, tIn, tOut, bal, pOut };
  }, [movimientos, vistaMensual, fechaFiltro, busqueda]);

  // 4. Función para Registrar con Limpieza Instantánea
  const registrar = async (tipo) => {
    if (!nombre || !monto || !user) return;
    
    const nuevoMovimiento = {
      uid: user.uid,
      nombre: nombre.trim(),
      monto: parseFloat(monto),
      tipo: tipo,
      fecha: new Date().toISOString().split('T')[0],
      hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: Date.now()
    };

    // LIMPIEZA INMEDIATA DE CAJAS
    setNombre('');
    setMonto('');

    try {
      await addDoc(collection(db, "movimientos"), nuevoMovimiento);
    } catch (err) {
      console.error("Error al guardar en Firebase");
    }
  };

  // 5. Exportar a PDF (Recuperado)
  const exportarPDF = () => {
    const docPDF = new jsPDF();
    docPDF.text("Reporte de Finanzas Personales", 14, 15);
    const tablaData = stats.filtrados.map(m => [m.fecha, m.nombre, m.tipo.toUpperCase(), `S/ ${m.monto.toFixed(2)}`]);
    docPDF.autoTable({
      head: [['Fecha', 'Detalle', 'Tipo', 'Monto']],
      body: tablaData,
      startY: 25,
    });
    docPDF.save(`Reporte_${fechaFiltro}.pdf`);
  };

  if (loading) return <div className="loading-screen">Sincronizando con la nube...</div>;

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
              onChange={e => setFechaFiltro(e.target.value)} 
            />
          </div>
          <div className="header-btns">
            {!user ? (
              <button className="btn-login-small" onClick={() => signInWithPopup(auth, googleProvider)}>Login</button>
            ) : (
              <img src={user.photoURL} alt="avatar" className="mini-avatar" onClick={() => signOut(auth)} />
            )}
            <button className="btn-icon" onClick={() => setVistaMensual(!vistaMensual)}>{vistaMensual ? "📅" : "🗓️"}</button>
            <button className="btn-icon" onClick={exportarPDF}>📄</button>
          </div>
        </header>

        {/* Gráfica Circular Pro */}
        <div className="main-card donut-area">
          <div className="circle-chart-multi" style={{ 
            background: `conic-gradient(#ff4757 0deg ${stats.pOut}deg, #00d1b2 ${stats.pOut}deg 360deg)` 
          }}>
            <div className="inner-circle">
              <div className="chart-info">
                <p>S/ {stats.bal.toFixed(2)}</p>
                <span>{vistaMensual ? "Balance Mensual" : "Balance Diario"}</span>
              </div>
            </div>
          </div>
          <div className="dashboard-stats">
            <div className="stat"><span>Gastos</span><p className="gasto-monto">S/ {stats.tOut.toFixed(2)}</p></div>
            <div className="stat"><span>Ingresos</span><p>S/ {stats.tIn.toFixed(2)}</p></div>
          </div>
        </div>

        <div className="input-section">
          <div className="quick-tags">
            {["GNV ⛽", "Comida 🍔", "Diversión 🎮", "Generé 💰"].map(t => (
              <button key={t} onClick={() => setNombre(t)} className="tag-btn">{t}</button>
            ))}
          </div>
          <input type="text" placeholder="Detalle" value={nombre} onChange={e => setNombre(e.target.value)} />
          <input type="number" placeholder="Monto S/" value={monto} onChange={e => setMonto(e.target.value)} />
          <div className="btn-group-direct">
            <button onClick={() => registrar('ingreso')} className="btn-direct in">💰 Ingreso</button>
            <button onClick={() => registrar('gasto')} className="btn-direct out">💸 Gasto</button>
          </div>
        </div>

        <div className="history-list">
          <input 
            className="search-bar" 
            type="text" 
            placeholder="🔍 Buscar en historial..." 
            value={busqueda} 
            onChange={e => setBusqueda(e.target.value)} 
          />
          {stats.filtrados.map(m => (
            <div key={m.id} className="history-item">
              <div className="item-info"><strong>{m.nombre}</strong><span>{m.hora}</span></div>
              <div className="item-right">
                <span className={`item-amount ${m.tipo}`}>S/ {m.monto.toFixed(2)}</span>
                <button className="delete-btn" onClick={() => deleteDoc(doc(db, "movimientos", m.id))}>&times;</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;