import React, { useState, useEffect } from 'react';
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
  doc 
} from 'firebase/firestore';

function App() {
  const [user, setUser] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nombre, setNombre] = useState('');
  const [monto, setMonto] = useState('');

  // 1. PERSISTENCIA Y CARGA (Soluciona pantalla negra al refrescar)
  useEffect(() => {
    const init = async () => {
      try {
        await setPersistence(auth, browserLocalPersistence);
        onAuthStateChanged(auth, (u) => {
          setUser(u || null);
          setLoading(false); // Quita el "Cargando..."
        });
      } catch {
        setLoading(false);
      }
    };
    init();
  }, []);

  // 2. ESCUCHA DE DATOS (Trae tus registros de Firebase)
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "movimientos"), where("uid", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ ...d.data(), id: d.id }));
      setMovimientos(docs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
    });
    return () => unsub();
  }, [user]);

  // 3. REGISTRO Y LIMPIEZA TOTAL (Limpia las cajas al instante)
  const registrar = async (tipo) => {
    if (!nombre || !monto || !user) return;
    
    const datos = {
      uid: user.uid,
      nombre: nombre.trim(),
      monto: parseFloat(monto),
      tipo,
      fecha: new Date().toISOString().split('T')[0],
      hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: Date.now()
    };

    // LIMPIEZA INMEDIATA
    setNombre('');
    setMonto('');

    try {
      await addDoc(collection(db, "movimientos"), datos);
    } catch {
      alert("Error de conexión");
    }
  };

  const login = () => signInWithPopup(auth, googleProvider);
  const logout = () => window.confirm("¿Cerrar sesión?") && signOut(auth);

  // Cálculos
  const tIn = movimientos.filter(m => m.tipo === 'ingreso').reduce((a, b) => a + b.monto, 0);
  const tOut = movimientos.filter(m => m.tipo === 'gasto').reduce((a, b) => a + b.monto, 0);
  const bal = tIn - tOut;

  if (loading) return <div className="loading-screen">Sincronizando...</div>;

  return (
    <div className="main-container">
      <div className="phone-screen">
        <header className="app-header">
          <h2>Finanzas</h2>
          {!user ? (
            <button onClick={login} className="btn-login">Login</button>
          ) : (
            <img src={user.photoURL} alt="u" className="mini-avatar" onClick={logout} />
          )}
        </header>

        <div className="main-card">
          <div className="circle-balance" style={{borderColor: bal >= 0 ? '#00d1b2' : '#ff4757'}}>
            <h3>S/ {bal.toFixed(2)}</h3>
            <p>Balance Total</p>
          </div>
        </div>

        <div className="input-section">
          <div className="quick-tags">
            {["GNV ⛽", "Comida 🍔", "Diversión 🎮"].map(t => (
              <button key={t} onClick={() => setNombre(t)} className="tag-btn">{t}</button>
            ))}
          </div>
          <input type="text" placeholder="Detalle" value={nombre} onChange={e => setNombre(e.target.value)} />
          <input type="number" placeholder="Monto S/" value={monto} onChange={e => setMonto(e.target.value)} />
          <div className="btn-group">
            <button onClick={() => registrar('ingreso')} className="btn-in">Ingreso</button>
            <button onClick={() => registrar('gasto')} className="btn-out">Gasto</button>
          </div>
        </div>

        <div className="history-list">
          {movimientos.map(m => (
            <div key={m.id} className="history-item">
              <div><strong>{m.nombre}</strong><br/><small>{m.hora}</small></div>
              <div className={m.tipo}>S/ {m.monto.toFixed(2)}</div>
              <button onClick={() => deleteDoc(doc(db, "movimientos", m.id))}>×</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;