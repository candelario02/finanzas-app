import React, { useState, useEffect, useMemo } from 'react';
import './App.css';
import { db, auth, googleProvider } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, setDoc, getDoc } from 'firebase/firestore';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

function App() {
  const [user, setUser] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [tags, setTags] = useState(["GNV ⛽", "Comida 🍔", "Diversión 🎮", "Generé 💰"]);

  const [nombre, setNombre] = useState('');
  const [monto, setMonto] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [vistaMensual, setVistaMensual] = useState(false);
  const [fechaFiltro, setFechaFiltro] = useState(new Date().toISOString().split('T')[0]);

  // 1. Manejo de Usuario y Carga de Tags
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        const docRef = doc(db, "config_usuario", u.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setTags(docSnap.data().tags);
        } else {
          await setDoc(docRef, { tags: ["GNV ⛽", "Comida 🍔", "Diversión 🎮", "Generé 💰"] });
        }
      } else {
        setUser(null);
        setMovimientos([]);
        setTags(["GNV ⛽", "Comida 🍔", "Diversión 🎮", "Generé 💰"]);
      }
    });
    return () => unsub();
  }, []);

  // 2. Escucha de Movimientos
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, "movimientos"), where("uid", "==", user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
      setMovimientos(docs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
    });
    return () => unsub();
  }, [user]);

  const registrar = async (tipo) => {
    if (!nombre || !monto || !user) return alert("Falta detalle, monto o sesión");
    try {
      await addDoc(collection(db, "movimientos"), {
        uid: user.uid,
        nombre: nombre,
        monto: parseFloat(monto),
        tipo: tipo,
        fecha: new Date().toLocaleDateString('en-CA'),
        hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: Date.now()
      });
      // LIMPIEZA AUTOMÁTICA DE CAJAS
      setNombre(''); 
      setMonto('');
    } catch (err) { 
      console.error("Error al registrar:", err); 
    }
  };

  const stats = useMemo(() => {
    const filtrados = movimientos.filter(m => {
      const matchFecha = vistaMensual ? m.fecha.startsWith(fechaFiltro.substring(0, 7)) : m.fecha === fechaFiltro;
      return matchFecha && m.nombre.toLowerCase().includes(busqueda.toLowerCase());
    });
    const tIn = filtrados.filter(m => m.tipo === 'ingreso').reduce((a, b) => a + b.monto, 0);
    const tOut = filtrados.filter(m => m.tipo === 'gasto').reduce((a, b) => a + b.monto, 0);
    const bal = tIn - tOut;
    const ahorro = bal > 0 ? bal : 0;
    const totalG = tIn + tOut + ahorro;
    return { 
      filtrados, tIn, tOut, bal, ahorro,
      pOut: totalG > 0 ? (tOut / totalG) * 360 : 0,
      pIn: totalG > 0 ? (tIn / totalG) * 360 : 0
    };
  }, [movimientos, vistaMensual, fechaFiltro, busqueda]);

  const exportarPDF = () => {
    if (window.confirm("¿Deseas descargar el reporte PDF?")) {
      const docPDF = new jsPDF();
      docPDF.text("Reporte de Finanzas", 14, 20);
      const data = stats.filtrados.map(m => [m.fecha, m.nombre, m.tipo.toUpperCase(), `S/ ${m.monto.toFixed(2)}`]);
      docPDF.autoTable({ head: [['Fecha', 'Detalle', 'Tipo', 'Monto']], body: data, startY: 30 });
      docPDF.save(`Reporte_Finanzas.pdf`);
    }
  };

  const editarTag = (i) => {
    const n = prompt("Edita tu botón:", tags[i]);
    if (n !== null && n.trim() !== "") {
      const nt = [...tags];
      nt[i] = n;
      setTags(nt);
      if (user) setDoc(doc(db, "config_usuario", user.uid), { tags: nt });
    }
  };

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
              <button className="btn-google-login-oficial" onClick={() => signInWithPopup(auth, googleProvider)}>
                <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" alt="G" />
                Login
              </button>
            ) : (
              <img src={user.photoURL} alt="u" className="mini-avatar" onClick={() => signOut(auth)} />
            )}
            <button className="btn-icon" onClick={exportarPDF}>📄</button>
            <button className="btn-icon" onClick={() => setVistaMensual(!vistaMensual)}>{vistaMensual ? "📅" : "🗓️"}</button>
          </div>
        </header>

        <div className="main-card donut-area">
          <div className="circle-chart-multi" style={{
            background: (stats.tIn + stats.tOut + stats.ahorro) > 0 
              ? `conic-gradient(#ff4757 0deg ${stats.pOut}deg, #00d1b2 ${stats.pOut}deg ${stats.pOut + stats.pIn}deg, #bb86fc ${stats.pOut + stats.pIn}deg 360deg)` 
              : '#222'
          }}>
            <div className="inner-circle">
              <div className="chart-info">
                <p>S/ {stats.bal.toFixed(2)}</p>
                <span>Balance {vistaMensual ? "Mensual" : "Diario"}</span>
              </div>
            </div>
          </div>
          <div className="dashboard-stats">
            <div className="stat"><span className="gasto-label">Gastos</span><p className="gasto-monto">S/ {stats.tOut.toFixed(2)}</p></div>
            <div className="stat"><span>Ingresos</span><p>S/ {stats.tIn.toFixed(2)}</p></div>
            <div className="stat"><span>Ahorro</span><p style={{color: '#bb86fc'}}>S/ {stats.ahorro.toFixed(2)}</p></div>
          </div>
        </div>

        <div className="input-section">
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
          <input type="text" placeholder="Detalle" value={nombre} onChange={e => setNombre(e.target.value)} />
          <input type="number" placeholder="Monto S/" value={monto} onChange={e => setMonto(e.target.value)} />
          <div className="btn-group-direct">
            <button onClick={() => registrar('ingreso')} className="btn-direct in">💰 Ingreso</button>
            <button onClick={() => registrar('gasto')} className="btn-direct out">💸 Gasto</button>
          </div>
        </div>

        <div className="history-list">
          <input className="search-bar" type="text" placeholder="🔍 Buscar..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
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