import React, { useState, useEffect, useMemo } from 'react';
import './App.css';
import { db, auth, googleProvider } from './firebase';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  setPersistence, 
  browserLocalPersistence 
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  deleteDoc, 
  doc,
  getDoc,
  setDoc
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

  // 1. CARGA DE USUARIO CON TIMEOUT DE SEGURIDAD
  useEffect(() => {
    // Si en 4 segundos no hay respuesta de Firebase, forzamos el cierre del loading
    const timer = setTimeout(() => setLoading(false), 4000);

    const configurarAuth = async () => {
      try {
        await setPersistence(auth, browserLocalPersistence);
        onAuthStateChanged(auth, async (u) => {
          if (u) {
            setUser(u);
            const docRef = doc(db, "config_usuarios", u.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) setTags(docSnap.data().tags);
          } else {
            setUser(null);
          }
          setLoading(false);
          clearTimeout(timer);
        });
      } catch (error) {
        console.error("Error Auth:", error);
        setLoading(false);
      }
    };
    configurarAuth();
    return () => clearTimeout(timer);
  }, []);

  // 2. ESCUCHA DE DATOS (CORREGIDO)
  useEffect(() => {
    // Si no hay usuario, no intentamos escuchar Firestore
    if (!user) return;

    const q = query(collection(db, "movimientos"), where("uid", "==", user.uid));
    
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map(d => ({ ...d.data(), id: d.id }));
      setMovimientos(items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
    }, (error) => {
      console.error("Error en Firestore:", error);
    });

    return () => unsub();
  }, [user]); // Solo se ejecuta cuando el usuario cambia

  // 3. LÓGICA DE BALANCE
  const stats = useMemo(() => {
    const filtrados = movimientos.filter(m => {
      if (!m.fecha) return false;
      const matchFecha = vistaMensual 
        ? m.fecha.substring(0, 7) === fechaFiltro.substring(0, 7)
        : m.fecha === fechaFiltro;
      const matchBusqueda = m.nombre.toLowerCase().includes(busqueda.toLowerCase());
      return matchFecha && matchBusqueda;
    });

    const ing = filtrados.filter(m => m.tipo === 'ingreso').reduce((a, b) => a + b.monto, 0);
    const gas = filtrados.filter(m => m.tipo === 'gasto').reduce((a, b) => a + b.monto, 0);
    const bal = ing - gas;
    const aho = bal > 0 ? bal : 0;
    
    const totalCirculo = ing + gas + (bal > 0 ? bal : 0);
    const pGas = totalCirculo > 0 ? (gas / totalCirculo) * 360 : 0;
    const pIng = totalCirculo > 0 ? (ing / totalCirculo) * 360 : 0;

    return { filtrados, ing, gas, bal, aho, pGas, pIng };
  }, [movimientos, vistaMensual, fechaFiltro, busqueda]);

  // 4. ACCIONES
  const registrar = async (tipo) => {
    if (!nombre || !monto || !user) return;
    const nuevo = {
      uid: user.uid,
      nombre: nombre.trim(),
      monto: parseFloat(monto),
      tipo,
      fecha: new Date().toLocaleDateString('en-CA'),
      hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: Date.now()
    };
    setNombre('');
    setMonto('');
    try {
      await addDoc(collection(db, "movimientos"), nuevo);
    } catch  {
      alert("Error al guardar: Revisa las reglas de Firebase");
    }
  };

  const editarTags = async () => {
    const nuevos = prompt("Categorías (separadas por coma):", tags.join(", "));
    if (nuevos && user) {
      const lista = nuevos.split(",").map(t => t.trim()).slice(0, 4);
      setTags(lista);
      await setDoc(doc(db, "config_usuarios", user.uid), { tags: lista });
    }
  };

  const exportarPDF = () => {
    if (!user) return;
    const docPDF = new jsPDF();
    docPDF.text(`Reporte Finanzas: ${user.email}`, 14, 20);
    const filas = stats.filtrados.map(m => [m.fecha, m.nombre, m.tipo, `S/ ${m.monto.toFixed(2)}`]);
    docPDF.autoTable({ head: [['Fecha', 'Detalle', 'Tipo', 'Monto']], body: filas, startY: 30 });
    docPDF.save(`Finanzas_${fechaFiltro}.pdf`);
  };

  if (loading) return <div className="loading-screen">Sincronizando nube...</div>;

  return (
    <div className="main-container">
      <div className="phone-screen">
        <header className="app-header">
          <div className="header-left">
            <h2>Finanzas</h2>
            <input className="mini-date-picker" type={vistaMensual ? "month" : "date"} 
                   value={vistaMensual ? fechaFiltro.substring(0, 7) : fechaFiltro} 
                   onChange={e => setFechaFiltro(e.target.value)} />
          </div>
          <div className="header-btns">
            {!user ? (
              <button onClick={() => signInWithPopup(auth, googleProvider)} className="btn-google-login-oficial">Login</button>
            ) : (
              <img src={user.photoURL} alt="u" className="mini-avatar" onClick={() => signOut(auth)} />
            )}
            <button className="btn-icon" onClick={exportarPDF}>📄</button>
            <button className="btn-icon" onClick={() => setVistaMensual(!vistaMensual)}>{vistaMensual ? "📅" : "🗓️"}</button>
          </div>
        </header>

        <div className="main-card donut-area">
          <div className="circle-chart-multi" style={{ 
            background: `conic-gradient(#ff4757 0deg ${stats.pGas}deg, #00d1b2 ${stats.pGas}deg ${stats.pGas + stats.pIng}deg, #a29bfe ${stats.pGas + stats.pIng}deg 360deg)` 
          }}>
            <div className="inner-circle">
              <div className="chart-info">
                <p>S/ {stats.bal.toFixed(2)}</p>
                <span>{vistaMensual ? "Mes" : "Hoy"}</span>
              </div>
            </div>
          </div>
          <div className="dashboard-stats">
            <div className="stat"><span className="gasto-label">Gastos</span><p className="gasto-monto">S/ {stats.gas.toFixed(2)}</p></div>
            <div className="stat"><span>Ingresos</span><p>S/ {stats.ing.toFixed(2)}</p></div>
            <div className="stat"><span>Ahorro</span><p style={{color: '#a29bfe'}}>S/ {stats.aho.toFixed(2)}</p></div>
          </div>
        </div>

        <div className="input-section">
          <div className="quick-tags">
            {tags.map((t, i) => <button key={i} onClick={() => setNombre(t)} className="tag-btn">{t}</button>)}
            <button onClick={editarTags} className="tag-btn">⚙️</button>
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