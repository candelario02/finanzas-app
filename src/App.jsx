import React, { useState, useEffect, useMemo } from 'react';
import './App.css';
import { db, auth, googleProvider } from './firebase';
import { 
  signInWithPopup, signOut, onAuthStateChanged, 
  setPersistence, browserLocalPersistence 
} from 'firebase/auth';
import { 
  collection, addDoc, query, where, onSnapshot, 
  deleteDoc, doc, getDoc, setDoc 
} from 'firebase/firestore';
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
  const [fechaFiltro, setFechaFiltro] = useState(new Date().toLocaleDateString('en-CA'));

  useEffect(() => {
    const init = async () => {
      try {
        await setPersistence(auth, browserLocalPersistence);
        onAuthStateChanged(auth, async (u) => {
          if (u) {
            setUser(u);
            const dS = await getDoc(doc(db, "config_usuarios", u.uid));
            if (dS.exists()) setTags(dS.data().tags);
          } else {
            setUser(null);
          }
          setLoading(false);
        });
      } catch { setLoading(false); }
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
      const mF = vistaMensual ? m.fecha.startsWith(fechaFiltro.substring(0, 7)) : m.fecha === fechaFiltro;
      return mF && m.nombre.toLowerCase().includes(busqueda.toLowerCase());
    });
    const i = filtrados.filter(m => m.tipo === 'ingreso').reduce((a, b) => a + b.monto, 0);
    const g = filtrados.filter(m => m.tipo === 'gasto').reduce((a, b) => a + b.monto, 0);
    const b = i - g;
    const a = b > 0 ? b : 0;
    const t = i + g + a;
    return { filtrados, i, g, b, a, pG: t > 0 ? (g/t)*360 : 0, pI: t > 0 ? (i/t)*360 : 0 };
  }, [movimientos, vistaMensual, fechaFiltro, busqueda]);

  const registrar = async (tipo) => {
    if (!nombre || !monto || !user) return;
    const n = {
      uid: user.uid, nombre: nombre.trim(), monto: parseFloat(monto), tipo,
      fecha: new Date().toLocaleDateString('en-CA'),
      hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: Date.now()
    };
    setNombre(''); setMonto('');
    try { await addDoc(collection(db, "movimientos"), n); } catch { alert("Error"); }
  };

  const editarTags = async () => {
    const nT = prompt("Categorías (comas):", tags.join(", "));
    if (nT && user) {
      const l = nT.split(",").map(t => t.trim());
      setTags(l);
      await setDoc(doc(db, "config_usuarios", user.uid), { tags: l });
    }
  };

  const exportarPDF = () => {
    const dP = new jsPDF();
    dP.text("Reporte Finanzas", 14, 20);
    dP.autoTable({ 
      head: [['Fecha', 'Detalle', 'Monto']], 
      body: stats.filtrados.map(m => [m.fecha, m.nombre, `S/ ${m.monto}`]) 
    });
    dP.save("reporte.pdf");
  };

  if (loading) return <div className="loading-screen">Cargando...</div>;

  return (
    <div className="main-container">
      <div className="phone-screen">
        <header className="app-header">
          <div className="header-left">
            <h2>Finanzas</h2>
            <input type={vistaMensual ? "month" : "date"} value={vistaMensual ? fechaFiltro.substring(0, 7) : fechaFiltro} onChange={e => setFechaFiltro(e.target.value)} />
          </div>
          <div className="header-btns">
            {!user ? <button onClick={() => signInWithPopup(auth, googleProvider)}>Login</button> : <img src={user.photoURL} alt="" className="mini-avatar" onClick={() => signOut(auth)} />}
            <button onClick={exportarPDF}>📄</button>
            <button onClick={() => setVistaMensual(!vistaMensual)}>{vistaMensual ? "📅" : "🗓️"}</button>
          </div>
        </header>
        <div className="main-card">
          <div className="circle-chart-multi" style={{ background: `conic-gradient(#ff4757 0 ${stats.pG}deg, #00d1b2 ${stats.pG}deg ${stats.pG + stats.pI}deg, #a29bfe ${stats.pG + stats.pI}deg 360deg)` }}>
            <div className="inner-circle"><p>S/ {stats.b.toFixed(2)}</p><span>{vistaMensual ? "Mensual" : "Diario"}</span></div>
          </div>
          <div className="dashboard-stats">
            <div className="stat"><span>Gastos</span><p>S/ {stats.g.toFixed(2)}</p></div>
            <div className="stat"><span>Ingresos</span><p>S/ {stats.i.toFixed(2)}</p></div>
            <div className="stat"><span>Ahorro</span><p>S/ {stats.a.toFixed(2)}</p></div>
          </div>
        </div>
        <div className="input-section">
          <div className="quick-tags">{tags.map((t, i) => <button key={i} onClick={() => setNombre(t)} className="tag-btn">{t}</button>)}<button onClick={editarTags}>⚙️</button></div>
          <input placeholder="Detalle" value={nombre} onChange={e => setNombre(e.target.value)} />
          <input type="number" placeholder="Monto" value={monto} onChange={e => setMonto(e.target.value)} />
          <div className="btn-group-direct">
            <button onClick={() => registrar('ingreso')} className="btn-direct in">Ingreso</button>
            <button onClick={() => registrar('gasto')} className="btn-direct out">Gasto</button>
          </div>
        </div>
        <div className="history-list">
          <input className="search-bar" placeholder="Buscar..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          {stats.filtrados.map(m => (
            <div key={m.id} className="history-item">
              <div><strong>{m.nombre}</strong><span>{m.hora}</span></div>
              <div className="item-right">
                <span className={m.tipo}>S/ {m.monto.toFixed(2)}</span>
                <button onClick={() => deleteDoc(doc(db, "movimientos", m.id))}>&times;</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
export default App;