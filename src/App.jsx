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

  // 1. Manejo de Usuario y Carga de Tags desde Firebase
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        if (!user) alert("¡Iniciaste sesión exitosamente! 🚀");
        setUser(u);
        
        // CARGAR TAGS DEL USUARIO DESDE FIREBASE
        const docRef = doc(db, "config_usuario", u.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setTags(docSnap.data().tags);
        } else {
          // Si es usuario nuevo, creamos sus tags iniciales en la nube
          await setDoc(docRef, { tags: ["GNV ⛽", "Comida 🍔", "Diversión 🎮", "Generé 💰"] });
        }
      } else {
        setUser(null);
        setMovimientos([]);
        setTags(["GNV ⛽", "Comida 🍔", "Diversión 🎮", "Generé 💰"]); // Reset al cerrar sesión
      }
    });
    return () => unsub();
  }, [user]);

  // 2. Guardar Tags en Firebase cuando se editen
  const guardarTagsEnNube = async (nuevosTags) => {
    if (user) {
      try {
        await setDoc(doc(db, "config_usuario", user.uid), { tags: nuevosTags });
      } catch (e) { console.error("Error al guardar tags:", e); }
    }
  };

  const editarTag = (i) => {
    const n = prompt("Edita tu botón:", tags[i]);
    if (n !== null && n.trim() !== "") {
      const nt = [...tags];
      nt[i] = n;
      setTags(nt);
      guardarTagsEnNube(nt); // Se guarda en Firebase inmediatamente
    }
  };

  // 3. Escucha de Movimientos (Firebase)
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, "movimientos"), where("uid", "==", user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
      setMovimientos(docs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
    });
    return () => unsub();
  }, [user?.uid]);

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
      setNombre(''); setMonto(''); // Limpia las cajas
    } catch (e) { console.error(e); }
  };

  // ... (stats y exportarPDF se mantienen igual que el código anterior)
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
    if (window.confirm("¿Estás seguro de querer ver en PDF?")) {
      const doc = new jsPDF();
      doc.text("Reporte de Finanzas", 14, 20);
      const data = stats.filtrados.map(m => [m.fecha, m.nombre, m.tipo, `S/ ${m.monto.toFixed(2)}`]);
      doc.autoTable({ head: [['Fecha', 'Detalle', 'Tipo', 'Monto']], body: data, startY: 30 });
      doc.save(`Reporte_Finanzas.pdf`);
    }
  };

  const logout = () => {
    if (window.confirm("¿Estás seguro que quieres salir?")) signOut(auth);
  };

  return (
    <div className="main-container">
      <div className="phone-screen">
        <header className="app-header">
          <h2>Finanzas</h2>
          <div className="header-btns">
            {!user ? (
              <button className="btn-google-mini" onClick={() => signInWithPopup(auth, googleProvider)}>G Login</button>
            ) : (
              <img src={user.photoURL} alt="u" className="mini-avatar" onClick={logout} title="Cerrar sesión" />
            )}
            <button className="btn-icon" onClick={exportarPDF}>📄</button>
            <button className="btn-icon" onClick={() => setVistaMensual(!vistaMensual)}>
              {vistaMensual ? "📅" : "🗓️"}
            </button>
          </div>
        </header>

        <div className="date-selector-area">
          <label>{vistaMensual ? "Mes:" : "Día:"}</label>
          <input 
            className="date-input" 
            type={vistaMensual ? "month" : "date"} 
            value={vistaMensual ? fechaFiltro.substring(0, 7) : fechaFiltro} 
            onChange={e => setFechaFiltro(e.target.value)} 
          />
        </div>

        <div className="main-card">
          <div className="circle-chart-multi" style={{
            background: (stats.tIn + stats.tOut + stats.ahorro) > 0 
              ? `conic-gradient(#ff4757 0deg ${stats.pOut}deg, #00d1b2 ${stats.pOut}deg ${stats.pOut + stats.pIn}deg, #bb86fc ${stats.pOut + stats.pIn}deg 360deg)` 
              : '#222'
          }}>
            <div className="inner-circle">
              <div className="chart-info">
                <p>S/ {stats.bal.toFixed(2)}</p>
                <span>Balance del {vistaMensual ? "Mes" : "Día"}</span>
              </div>
            </div>
          </div>
          <div className="dashboard-stats">
            <div className="stat"><span>Gastos</span><p>S/ {stats.tOut.toFixed(2)}</p></div>
            <div className="stat"><span>Ingresos</span><p>S/ {stats.tIn.toFixed(2)}</p></div>
            <div className="stat"><span>Ahorro</span><p style={{color: 'var(--accent)'}}>S/ {stats.ahorro.toFixed(2)}</p></div>
          </div>
        </div>

        <div className="input-section">
          <p className="edit-hint">✨ Mantén pulsado para editar favoritos</p>
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

        <div className="search-box">
          <input type="text" placeholder="🔍 Buscar..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>

        <div className="history-list">
          {stats.filtrados.map(m => (
            <div key={m.id} className="history-item">
              <div className={`icon-box ${m.tipo}`}>{m.tipo === 'ingreso' ? '💰' : '💸'}</div>
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