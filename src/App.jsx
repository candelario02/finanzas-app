import React, { useState, useEffect } from 'react';
import './App.css';
import { db, auth, googleProvider } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, setDoc, getDoc } from 'firebase/firestore';

import 'jspdf-autotable';

function App() {
  const [user, setUser] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [tags, setTags] = useState(["GNV ⛽", "Comida 🍔", "Diversión 🎮", "Generé 💰"]);
  const [loading, setLoading] = useState(true);

  const [nombre, setNombre] = useState('');
  const [monto, setMonto] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [vistaMensual, setVistaMensual] = useState(false);
  const [fechaFiltro, setFechaFiltro] = useState(new Date().toISOString().split('T')[0]);

  // 1. Persistencia Forzada y Recuperación de Datos
  useEffect(() => {
    // Forzamos a Firebase a recordar la sesión en el navegador local
    setPersistence(auth, browserLocalPersistence).then(() => {
      return onAuthStateChanged(auth, async (u) => {
        if (u) {
          setUser(u);
          const docRef = doc(db, "config_usuario", u.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) setTags(docSnap.data().tags);
        } else {
          setUser(null);
          setMovimientos([]);
        }
        setLoading(false);
      });
    }).catch(err => console.error("Error persistencia:", err));
  }, []);

  // 2. Escucha de Movimientos (Firestore)
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "movimientos"), where("uid", "==", user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
      setMovimientos(docs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
    });
    return () => unsub();
  }, [user]);

  // 3. Registro con Limpieza Forzada de Cajas
  const registrar = async (tipo) => {
    if (!nombre || !monto || !user) return alert("Error: Inicia sesión y llena todos los campos.");
    
    try {
      await addDoc(collection(db, "movimientos"), {
        uid: user.uid,
        nombre: nombre.trim(),
        monto: parseFloat(monto),
        tipo: tipo,
        fecha: new Date().toLocaleDateString('en-CA'),
        hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: Date.now()
      });
      
      // LIMPIEZA ABSOLUTA DE LAS CAJAS
      setNombre('');
      setMonto('');
      
      // Aviso de éxito (Opcional, lo quitas si prefieres silencio)
      console.log("Registrado con éxito");
    } catch (err) {
      alert("Error al guardar: " + err.message);
    }
  };

  const login = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) alert("✅ ¡Bienvenido, " + result.user.displayName + "!");
    } catch (err) {
      alert("Error en Login: " + err.message);
    }
  };

  const logout = async () => {
    if (window.confirm("¿Seguro que quieres cerrar sesión?")) {
      await signOut(auth);
      alert("Sesión cerrada correctamente.");
    }
  };

  const editarTag = async (i) => {
    const n = prompt("Edita tu favorito:", tags[i]);
    if (n && user) {
      const nt = [...tags];
      nt[i] = n;
      setTags(nt);
      await setDoc(doc(db, "config_usuario", user.uid), { tags: nt });
    }
  };

  // Lógica de filtrado
  const filtrados = movimientos.filter(m => {
    const matchFecha = vistaMensual ? m.fecha.startsWith(fechaFiltro.substring(0, 7)) : m.fecha === fechaFiltro;
    return matchFecha && m.nombre.toLowerCase().includes(busqueda.toLowerCase());
  });

  const tIn = filtrados.filter(m => m.tipo === 'ingreso').reduce((a, b) => a + b.monto, 0);
  const tOut = filtrados.filter(m => m.tipo === 'gasto').reduce((a, b) => a + b.monto, 0);
  const bal = tIn - tOut;
  const ahorro = bal > 0 ? bal : 0;
  const totalG = tIn + tOut + ahorro;
  const pOut = totalG > 0 ? (tOut / totalG) * 360 : 0;
  const pIn = totalG > 0 ? (tIn / totalG) * 360 : 0;

  if (loading) return <div style={{background:'#000', height:'100vh', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center'}}>Conectando con Firebase...</div>;

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
              <button className="btn-google-login-oficial" onClick={login}>Login</button>
            ) : (
              <img src={user.photoURL} alt="u" className="mini-avatar" onClick={logout} title="Click para salir" />
            )}
            <button className="btn-icon" onClick={() => setVistaMensual(!vistaMensual)}>{vistaMensual ? "📅" : "🗓️"}</button>
          </div>
        </header>

        <div className="main-card donut-area">
          <div className="circle-chart-multi" style={{ background: totalG > 0 ? `conic-gradient(#ff4757 0deg ${pOut}deg, #00d1b2 ${pOut}deg ${pOut + pIn}deg, #bb86fc ${pOut + pIn}deg 360deg)` : '#222' }}>
            <div className="inner-circle">
              <div className="chart-info">
                <p>S/ {bal.toFixed(2)}</p>
                <span>Balance {vistaMensual ? "Mensual" : "Diario"}</span>
              </div>
            </div>
          </div>
          <div className="dashboard-stats">
            <div className="stat"><span>Gastos</span><p className="gasto-monto">S/ {tOut.toFixed(2)}</p></div>
            <div className="stat"><span>Ingresos</span><p>S/ {tIn.toFixed(2)}</p></div>
            <div className="stat"><span>Ahorro</span><p style={{color:'#bb86fc'}}>S/ {ahorro.toFixed(2)}</p></div>
          </div>
        </div>

        <div className="input-section">
          {!user && <p style={{color:'yellow', fontSize:'11px', textAlign:'center'}}>⚠️ Inicia sesión para guardar</p>}
          <div className="quick-tags">
            {tags.map((t, i) => (
              <button key={i} onClick={() => setNombre(t)} onContextMenu={(e)=>{e.preventDefault(); editarTag(i);}} className="tag-btn">{t}</button>
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
          <input className="search-bar" type="text" placeholder="🔍 Buscar..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          {filtrados.map(m => (
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