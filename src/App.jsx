import React, { useState, useEffect, useMemo } from 'react';
import './App.css';
import { db, auth, googleProvider } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

function App() {
  const [user, setUser] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [tags, setTags] = useState(() => {
    const savedTags = localStorage.getItem('finanzas_tags');
    return savedTags ? JSON.parse(savedTags) : ["GNV ⛽", "Comida 🍔", "Diversión 🎮", "Generé 💰"];
  });

  const [nombre, setNombre] = useState('');
  const [monto, setMonto] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [vistaMensual, setVistaMensual] = useState(false);
  const [fechaFiltro, setFechaFiltro] = useState(new Date().toISOString().split('T')[0]);

  // 1. Manejo de Sesión
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) setMovimientos([]); // Limpiar solo cuando realmente se cierra sesión
    });
    return () => unsub();
  }, []);

  // 2. Escucha de Base de Datos (Corregido para evitar renders en cascada)
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "movimientos"), where("uid", "==", user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
      // Ordenar localmente para evitar parpadeos
      setMovimientos(docs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
    });

    return () => unsub();
  }, [user?.uid]); // Solo re-ejecutar si el ID del usuario cambia

  // 3. Persistencia de Tags
  useEffect(() => {
    localStorage.setItem('finanzas_tags', JSON.stringify(tags));
  }, [tags]);

  const registrar = async (tipo) => {
    if (!nombre || !monto || !user) return alert("Falta detalle, monto o sesión");
    try {
      await addDoc(collection(db, "movimientos"), {
        uid: user.uid,
        nombre,
        monto: parseFloat(monto),
        tipo,
        fecha: new Date().toLocaleDateString('en-CA'),
        hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: Date.now()
      });
      setNombre(''); setMonto('');
    } catch (e) { console.error("Error al registrar:", e); }
  };

  const editarTag = (i) => {
    const n = prompt("Edita tu botón (puedes poner stickers):", tags[i]);
    if (n !== null && n.trim() !== "") {
      const nt = [...tags];
      nt[i] = n;
      setTags(nt);
    }
  };

  // 4. Cálculos optimizados con useMemo para evitar cálculos innecesarios
  const { filtrados, tIn, tOut, bal, ahorro, pIn, pOut } = useMemo(() => {
    const f = movimientos.filter(m => {
      const matchFecha = vistaMensual ? m.fecha.startsWith(fechaFiltro.substring(0, 7)) : m.fecha === fechaFiltro;
      return matchFecha && m.nombre.toLowerCase().includes(busqueda.toLowerCase());
    });

    const ingresos = f.filter(m => m.tipo === 'ingreso').reduce((a, b) => a + b.monto, 0);
    const gastos = f.filter(m => m.tipo === 'gasto').reduce((a, b) => a + b.monto, 0);
    const balance = ingresos - gastos;
    const ahorroCalc = balance > 0 ? balance : 0;
    const totalCirculo = ingresos + gastos + ahorroCalc;

    return {
      filtrados: f,
      tIn: ingresos,
      tOut: gastos,
      bal: balance,
      ahorro: ahorroCalc,
      pOut: totalCirculo > 0 ? (gastos / totalCirculo) * 360 : 0,
      pIn: totalCirculo > 0 ? (ingresos / totalCirculo) * 360 : 0
    };
  }, [movimientos, vistaMensual, fechaFiltro, busqueda]);

  const exportarPDF = () => {
    const doc = new jsPDF();
    doc.text("Reporte de Finanzas", 14, 20);
    const data = filtrados.map(m => [m.fecha, m.nombre, m.tipo, `S/ ${m.monto.toFixed(2)}`]);
    doc.autoTable({ head: [['Fecha', 'Detalle', 'Tipo', 'Monto']], body: data, startY: 30 });
    doc.save(`Reporte_${fechaFiltro}.pdf`);
  };

  return (
    <div className="main-container">
      <div className="phone-screen">
        <header className="app-header">
          <h2>Finanzas</h2>
          <div className="header-btns">
            {!user ? (
              <button className="btn-google-mini" onClick={() => signInWithPopup(auth, googleProvider)}>
                G Login
              </button>
            ) : (
              <img src={user.photoURL} alt="u" className="mini-avatar" title="Cerrar sesión" onClick={() => signOut(auth)} />
            )}
            <button className="btn-icon" onClick={exportarPDF} title="Exportar PDF">📄</button>
            <button className="btn-icon" onClick={() => setVistaMensual(!vistaMensual)}>
              {vistaMensual ? "📅" : "🗓️"}
            </button>
          </div>
        </header>

        <div className="date-selector-area">
          <label>Ver por días:</label>
          <input 
            className="date-input" 
            type={vistaMensual ? "month" : "date"} 
            value={vistaMensual ? fechaFiltro.substring(0, 7) : fechaFiltro} 
            onChange={e => setFechaFiltro(e.target.value)} 
          />
        </div>

        <div className="main-card">
          <div className="circle-chart-multi" style={{
            background: (tIn + tOut + ahorro) > 0 
              ? `conic-gradient(#ff4757 0deg ${pOut}deg, #00d1b2 ${pOut}deg ${pOut + pIn}deg, #bb86fc ${pOut + pIn}deg 360deg)` 
              : '#222'
          }}>
            <div className="inner-circle">
              <div className="chart-info">
                <p>S/ {bal.toFixed(2)}</p>
                <span>Balance</span>
              </div>
            </div>
          </div>
          <div className="dashboard-stats">
            <div className="stat"><span>Gastos</span><p>S/ {tOut.toFixed(2)}</p></div>
            <div className="stat"><span>Ingresos</span><p>S/ {tIn.toFixed(2)}</p></div>
            <div className="stat"><span>Ahorro</span><p style={{color: 'var(--accent)'}}>S/ {ahorro.toFixed(2)}</p></div>
          </div>
        </div>

        <div className="input-section">
          <p className="edit-hint">✨ Click derecho o manten presionado para editar botones</p>
          <div className="quick-tags">
            {tags.map((t, i) => (
              <button 
                key={i} 
                onClick={() => setNombre(t)} 
                onContextMenu={(e) => { e.preventDefault(); editarTag(i); }} 
                className="tag-btn"
              >
                {t}
              </button>
            ))}
          </div>
          <input type="text" placeholder="Detalle (puedes poner stickers)" value={nombre} onChange={e => setNombre(e.target.value)} />
          <input type="number" placeholder="Monto S/" value={monto} onChange={e => setMonto(e.target.value)} />
          <div className="btn-group-direct">
            <button onClick={() => registrar('ingreso')} className="btn-direct in">💰 Ingreso</button>
            <button onClick={() => registrar('gasto')} className="btn-direct out">💸 Gasto</button>
          </div>
        </div>

        <div className="search-box">
          <input type="text" placeholder="🔍 Buscar..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>

        <div className="history-list">
          {filtrados.length === 0 ? <p className="empty-msg">No hay movimientos en esta fecha</p> : 
            filtrados.map(m => (
              <div key={m.id} className="history-item">
                <div className={`icon-box ${m.tipo}`}>{m.tipo === 'ingreso' ? '💰' : '💸'}</div>
                <div className="item-info"><strong>{m.nombre}</strong><span>{m.hora}</span></div>
                <div className="item-right">
                  <span className={`item-amount ${m.tipo}`}>S/ {m.monto.toFixed(2)}</span>
                  <button className="delete-btn" onClick={() => deleteDoc(doc(db, "movimientos", m.id))}>&times;</button>
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}

export default App;