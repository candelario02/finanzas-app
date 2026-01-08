import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import './App.css';
import { db, auth, googleProvider } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  deleteDoc, 
  doc 
} from 'firebase/firestore';

function App() {
  const [user, setUser] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [tags, setTags] = useState(() => {
    const savedTags = localStorage.getItem('finanzas_tags');
    return savedTags ? JSON.parse(savedTags) : ["GNV", "Comida", "Diversión", "Generé"];
  });

  const [nombre, setNombre] = useState('');
  const [monto, setMonto] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [vistaMensual, setVistaMensual] = useState(false);
  const [fechaFiltro, setFechaFiltro] = useState(new Date().toISOString().split('T')[0]);

  // Manejo de Usuario
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) setMovimientos([]); // Limpiar si no hay usuario
    });
    return () => unsub();
  }, []);

  // Manejo de Datos (Firebase)
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "movimientos"), 
      where("uid", "==", user.uid)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
      setMovimientos(docs.sort((a, b) => b.createdAt - a.createdAt));
    }, (error) => {
      console.error("Error en Firebase:", error);
    });

    return () => unsub();
  }, [user]);

  useEffect(() => {
    localStorage.setItem('finanzas_tags', JSON.stringify(tags));
  }, [tags]);

  const registrar = async (tipo) => {
    if (!nombre || !monto || !user) return;
    const ahora = new Date();
    try {
      await addDoc(collection(db, "movimientos"), {
        uid: user.uid,
        nombre,
        monto: parseFloat(monto),
        tipo,
        fecha: ahora.toLocaleDateString('en-CA'),
        hora: ahora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: Date.now()
      });
      setNombre(''); setMonto('');
    } catch (e) { alert("Error al guardar"); }
  };

  const eliminar = async (id) => {
    if (window.confirm("¿Borrar?")) await deleteDoc(doc(db, "movimientos", id));
  };

  const editarTag = (i) => {
    const n = prompt("Nuevo nombre:", tags[i]);
    if (n) {
      const nt = [...tags]; nt[i] = n; setTags(nt);
    }
  };

  const login = () => signInWithPopup(auth, googleProvider);
  const logout = () => signOut(auth);

  const exportarExcel = () => {
    const ws = XLSX.utils.json_to_sheet(movimientos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Finanzas");
    XLSX.writeFile(wb, "Reporte.xlsx");
  };

  // Cálculos
  const filtrados = movimientos.filter(m => {
    const matchFecha = vistaMensual ? m.fecha.startsWith(fechaFiltro.substring(0, 7)) : m.fecha === fechaFiltro;
    return matchFecha && m.nombre.toLowerCase().includes(busqueda.toLowerCase());
  });

  const tIn = filtrados.filter(m => m.tipo === 'ingreso').reduce((a, b) => a + b.monto, 0);
  const tOut = filtrados.filter(m => m.tipo === 'gasto').reduce((a, b) => a + b.monto, 0);
  const bal = tIn - tOut;

  const totalG = tIn + tOut + (bal > 0 ? bal : 0);
  const pOut = totalG > 0 ? (tOut / totalG) * 360 : 0;
  const pIn = totalG > 0 ? (tIn / totalG) * 360 : 0;

  return (
    <div className="main-container">
      <div className="phone-screen">
        <header className="app-header">
          <h2>{vistaMensual ? "Mensual" : "Día"}</h2>
          <div className="header-btns">
            <button onClick={exportarExcel}>📊</button>
            <button onClick={() => setVistaMensual(!vistaMensual)}>{vistaMensual ? "📅" : "🗓️"}</button>
          </div>
        </header>

        <div className="auth-bar">
          {user ? (
            <div className="user-profile">
              <img src={user.photoURL} alt="p" />
              <span>{user.displayName.split(' ')[0]}</span>
              <button onClick={logout} className="btn-logout">Salir</button>
            </div>
          ) : (
            <button onClick={login} className="btn-login">🚀 Sincronizar con Google</button>
          )}
        </div>

        <input className="date-input" type={vistaMensual ? "month" : "date"} value={vistaMensual ? fechaFiltro.substring(0, 7) : fechaFiltro} onChange={e => setFechaFiltro(e.target.value)} />

        <div className="main-card">
          <div className="circle-chart-multi" style={{background: totalG > 0 ? `conic-gradient(#ff4757 0deg ${pOut}deg, #00d1b2 ${pOut}deg ${pOut + pIn}deg, #bb86fc ${pOut + pIn}deg 360deg)` : '#222'}}>
            <div className="inner-circle"><div className="chart-info"><p>S/ {bal.toFixed(2)}</p><span>Balance</span></div></div>
          </div>
          <div className="dashboard-stats">
            <div className="stat"><span>Gastos</span><p>S/ {tOut.toFixed(2)}</p></div>
            <div className="stat"><span>Ingresos</span><p>S/ {tIn.toFixed(2)}</p></div>
          </div>
        </div>

        <div className="input-section">
          <div className="quick-tags">
            {tags.map((t, i) => <button key={i} onClick={() => setNombre(t)} onContextMenu={(e) => {e.preventDefault(); editarTag(i)}} className="tag-btn">{t}</button>)}
          </div>
          <input type="text" placeholder="Detalle" value={nombre} onChange={e => setNombre(e.target.value)} />
          <input type="number" placeholder="Monto" value={monto} onChange={e => setMonto(e.target.value)} />
          <div className="btn-group-direct">
            <button onClick={() => registrar('ingreso')} className="btn-direct in">💰</button>
            <button onClick={() => registrar('gasto')} className="btn-direct out">💸</button>
          </div>
        </div>

        <div className="history-list">
          {filtrados.map(m => (
            <div key={m.id} className="history-item">
              <div className="item-info"><strong>{m.nombre}</strong><span>{m.hora}</span></div>
              <div className="item-right">
                <span className={m.tipo}>S/ {m.monto.toFixed(2)}</span>
                <button onClick={() => eliminar(m.id)}>&times;</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;