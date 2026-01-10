import React, { useState, useEffect, useMemo } from 'react';
import './App.css';
import { db, auth, googleProvider } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { 
  collection, addDoc, query, where, onSnapshot, 
  deleteDoc, doc, setDoc, getDoc 
} from 'firebase/firestore';

function App() {
  const [user, setUser] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nombre, setNombre] = useState('');
  const [monto, setMonto] = useState('');
  const [tags, setTags] = useState(["GNV ⛽", "Comida 🍔", "Diversión 🎮", "Generé 💰"]);

  // 1. PERSISTENCIA DE USUARIO Y ALERTAS
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        const dSnap = await getDoc(doc(db, "config_usuarios", u.uid));
        if (dSnap.exists()) setTags(dSnap.data().tags);
      } else {
        setUser(null);
        setMovimientos([]);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      alert("¡Sesión iniciada con éxito!");
    } catch { alert("Error al iniciar sesión con Google"); }
  };

  const logout = async () => {
    if (window.confirm("¿Deseas cerrar sesión?")) {
      await signOut(auth);
      alert("Sesión cerrada correctamente");
    }
  };

  // 2. ESCUCHA DE DATOS (CORRECCIÓN BUCLE INFINITO)
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "movimientos"), where("uid", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ ...d.data(), id: d.id }));
      // Ordenamos por fecha de creación (descendente)
      setMovimientos(docs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
    });

    return () => unsub();
  }, [user]);

  // 3. GUARDAR MOVIMIENTO
  const registrar = async (tipo) => {
    if (!nombre || !monto || !user) return;
    const nuevo = {
      nombre: nombre.trim(),
      monto: parseFloat(monto),
      tipo,
      uid: user.uid,
      createdAt: Date.now(),
      hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    try {
      await addDoc(collection(db, "movimientos"), nuevo);
      setNombre(''); setMonto('');
    } catch (err) { 
      console.error(err);
      alert("Error al guardar: Revisa las reglas de Firebase"); 
    }
  };

  // 4. EDITAR FAVORITOS (CUALQUIER STICKER)
  const editarTags = async () => {
    const r = prompt("Edita tus 4 favoritos (usa cualquier emoji o texto), separados por coma:", tags.join(", "));
    if (r && user) {
      const lista = r.split(",").map(t => t.trim()).slice(0, 4);
      setTags(lista);
      await setDoc(doc(db, "config_usuarios", user.uid), { tags: lista });
    }
  };

  // 5. ESTADÍSTICAS
  const stats = useMemo(() => {
    const i = movimientos.filter(m => m.tipo === 'ingreso').reduce((a, b) => a + b.monto, 0);
    const g = movimientos.filter(m => m.tipo === 'gasto').reduce((a, b) => a + b.monto, 0);
    return { ingresos: i, gastos: g, total: i - g };
  }, [movimientos]);

  if (loading) return <div className="cargando">Sincronizando nube...</div>;

  return (
    <div className="app-main">
      <header className="navbar">
        <h1>Finanzas</h1>
        {user ? (
          <img src={user.photoURL} onClick={logout} className="user-img" alt="perfil" title="Cerrar Sesión" />
        ) : (
          <button onClick={login} className="login-btn">Acceder</button>
        )}
      </header>

      {user && (
        <main className="content">
          <div className="balance-box">
            <div className="circle">
              <h2>S/ {stats.total.toFixed(2)}</h2>
              <p>Balance General</p>
            </div>
            <div className="summary">
              <div className="sum-item"><span>Gastos</span><p className="txt-red">S/ {stats.gastos.toFixed(2)}</p></div>
              <div className="sum-item"><span>Ingresos</span><p className="txt-green">S/ {stats.ingresos.toFixed(2)}</p></div>
            </div>
          </div>

          <div className="input-card">
            <p className="info-text">Pulse las palabras para editar favoritos</p>
            <div className="tag-list">
              {tags.map((t, idx) => (
                <button key={idx} onClick={() => setNombre(t)} className="tag-item">{t}</button>
              ))}
              <button onClick={editarTags} className="settings-icon">⚙️</button>
            </div>
            
            <input type="text" placeholder="¿En qué?" value={nombre} onChange={e => setNombre(e.target.value)} />
            <input type="number" placeholder="Monto S/" value={monto} onChange={e => setMonto(e.target.value)} />
            
            <div className="form-btns">
              <button onClick={() => registrar('ingreso')} className="btn-in">💰 Ingreso</button>
              <button onClick={() => registrar('gasto')} className="btn-out">💸 Gasto</button>
            </div>
          </div>

          <div className="history-list">
            {movimientos.map(m => (
              <div key={m.id} className="history-item">
                <div className="h-left"><strong>{m.nombre}</strong><br/><small>{m.hora}</small></div>
                <div className="h-right">
                  <span className={m.tipo}>{m.tipo === 'gasto' ? '-' : '+'} S/ {m.monto.toFixed(2)}</span>
                  <button onClick={() => deleteDoc(doc(db, "movimientos", m.id))} className="del-btn">×</button>
                </div>
              </div>
            ))}
          </div>
        </main>
      )}
    </div>
  );
}

export default App;