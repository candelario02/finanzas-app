import React, { useState, useEffect, useMemo } from 'react';
import './App.css';
import { db, auth, googleProvider } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

function App() {
  const [user, setUser] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nombre, setNombre] = useState('');
  const [monto, setMonto] = useState('');
  const [tags, setTags] = useState(["GNV ⛽", "Comida 🍔", "Diversión 🎮", "Generé 💰"]);
  const [busqueda, setBusqueda] = useState('');
  const [vistaMensual, setVistaMensual] = useState(false);
  const [fechaFiltro, setFechaFiltro] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const init = async () => {
      try {
        await setPersistence(auth, browserLocalPersistence);
        onAuthStateChanged(auth, async (u) => {
          if (u) {
            setUser(u);
            const s = await getDoc(doc(db, "config_usuarios", u.uid));
            if (s.exists()) setTags(s.data().tags);
          } else {
            setUser(null);
          }
          setLoading(false);
        });
      } catch (e) { setLoading(false); }
    };
    init();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "movimientos"), where("uid", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map(d => ({ ...d.data(), id: d.id }));
      setMovimientos(items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
    });
    return () => unsub();
  }, [user]);

  const stats = useMemo(() => {
    const filtrados = movimientos.filter(m => {
      const coincideFecha = vistaMensual ? m.fecha.startsWith(fechaFiltro.substring(0, 7)) : m.fecha === fechaFiltro;
      const coincideBusqueda = m.nombre.toLowerCase().includes(busqueda.toLowerCase());
      return coincideFecha && coincideBusqueda;
    });
    const ing = filtrados.filter(m => m.tipo === 'ingreso').reduce((a, b) => a + b.monto, 0);
    const gas = filtrados.filter(m => m.tipo === 'gasto').reduce((a, b) => a + b.monto, 0);
    const bal = ing - gas;
    const total = ing + gas + (bal > 0 ? bal : 0);
    return { 
      filtrados, ing, gas, bal,
      pG: total > 0 ? (gas / total) * 360 : 0,
      pI: total > 0 ? (ing / total) * 360 : 0 
    };
  }, [movimientos, vistaMensual, fechaFiltro, busqueda]);

  const registrar = async (tipo) => {
    if (!nombre || !monto || !user) return;
    const item = {
      uid: user.uid, nombre: nombre.trim(), monto: parseFloat(monto), tipo,
      fecha: new Date().toISOString().split('T')[0],
      hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: Date.now()
    };
    try {
      setNombre(''); setMonto('');
      await addDoc(collection(db, "movimientos"), item);
    } catch (e) { console.error(e); }
  };

  const exportar = () => {
    const docPdf = new jsPDF();
    docPdf.text("Reporte de Finanzas", 14, 20);
    const filas = stats.filtrados.map(m => [m.fecha, m.nombre, m.tipo, `S/ ${m.monto.toFixed(2)}`]);
    docPdf.autoTable({ head: [['Fecha', 'Detalle', 'Tipo', 'Monto']], body: filas, startY: 30 });
    docPdf.save("finanzas.pdf");
  };

  if (loading) return <div className="loading-screen">Cargando datos...</div>;

  return (
    <div className="main-container">
      <div className="phone-screen">
        <header className="app-header">
          <div className="header-left">
            <h2>Finanzas</h2>
            <input className="mini-date-picker" type={vistaMensual ? "month" : "date"} value={vistaMensual ? fechaFiltro.substring(0, 7) : fechaFiltro} onChange={e => setFechaFiltro(e.target.value)} />
          </div>
          <div className="header-btns">
            {!user ? (
              <button className="btn-google-login-oficial" onClick={() => signInWithPopup(auth, googleProvider)}>Login</button>
            ) : (
              <img src={user.photoURL} alt="u" className="mini-avatar" onClick={() => signOut(auth)} />
            )}
            <button className="btn-icon" onClick={exportar}>📄</button>
            <button className="btn-icon" onClick={() => setVistaMensual(!vistaMensual)}>{vistaMensual ? "📅" : "🗓️"}</button>
          </div>
        </header>

        <div className="main-card donut-area">
          <div className="circle-chart-multi" style={{ background: `conic-gradient(#ff4757 0 ${stats.pG}deg, #00d1b2 ${stats.pG}deg ${stats.pG + stats.pI}deg, #a29bfe ${stats.pG + stats.pI}deg 360deg)` }}>
            <div className="inner-circle">
              <div className="chart-info">
                <p>S/ {stats.bal.toFixed(2)}</p>
                <span>{vistaMensual ? "Balance Mensual" : "Balance Diario"}</span>
              </div>
            </div>
          </div>
          <div className="dashboard-stats">
            <div className="stat"><span className="gasto-label">Gastos</span><p className="gasto-monto">S/ {stats.gas.toFixed(2)}</p></div>
            <div className="stat"><span>Ingresos</span><p>S/ {stats.ing.toFixed(2)}</p></div>
            <div className="stat"><span>Ahorro</span><p style={{color:'#a29bfe'}}>S/ {(stats.bal > 0 ? stats.bal : 0).toFixed(2)}</p></div>
          </div>
        </div>

        <div className="input-section">
          <div className="quick-tags">
            {tags.map((t, i) => <button key={i} onClick={() => setNombre(t)} className="tag-btn">{t}</button>)}
          </div>
          <input placeholder="Detalle" value={nombre} onChange={e => setNombre(e.target.value)} />
          <input type="number" placeholder="Monto S/" value={monto} onChange={e => setMonto(e.target.value)} />
          <div className="btn-group-direct">
            <button onClick={() => registrar('ingreso')} className="btn-direct in">💰 Ingreso</button>
            <button onClick={() => registrar('gasto')} className="btn-direct out">💸 Gasto</button>
          </div>
        </div>

        <div className="history-list">
          <input className="search-bar" placeholder="🔍 Buscar..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
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