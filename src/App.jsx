import React, { useState, useEffect, useMemo } from 'react';
import './App.css';
import { db, auth, googleProvider } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, setDoc, getDoc } from 'firebase/firestore';

function App() {
  const [user, setUser] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nombre, setNombre] = useState('');
  const [monto, setMonto] = useState('');
  const [tags, setTags] = useState(["GNV ⛽", "Comida 🍔", "Diversión 🎮", "Generé 💰"]);

  // 1. CARGA INICIAL Y PERSISTENCIA DE USUARIO
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        // Cargar favoritos personalizados
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

  // 2. ESCUCHA DE DATOS EN TIEMPO REAL (SIN BUCLES)
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "movimientos"), where("uid", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ ...d.data(), id: d.id }));
      setMovimientos(docs.sort((a, b) => b.createdAt - a.createdAt));
    }, (err) => {
      console.error("Error en Firestore:", err);
    });

    return () => unsub();
  }, [user]);

  // 3. FUNCIONES DE LOGIN / LOGOUT CON ALERTAS
  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      alert("¡Sesión iniciada!");
    } catch { alert("Error al entrar con Google"); }
  };

  const logout = async () => {
    if (window.confirm("¿Quieres salir?")) {
      await signOut(auth);
      alert("Sesión cerrada");
    }
  };

  // 4. REGISTRAR DATOS
  const registrar = async (tipo) => {
    if (!nombre || !monto || !user) return;
    const nuevo = {
      nombre,
      monto: parseFloat(monto),
      tipo,
      uid: user.uid,
      createdAt: Date.now(),
      hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    try {
      await addDoc(collection(db, "movimientos"), nuevo);
      setNombre(''); setMonto('');
    } catch { alert("Error al guardar. Revisa reglas de Firebase."); }
  };

  // 5. EDITAR FAVORITOS (ACEPTA CUALQUIER STICKER)
  const editarTags = async () => {
    const r = prompt("Edita tus 4 favoritos (usa stickers o texto), separados por coma:", tags.join(", "));
    if (r && user) {
      const lista = r.split(",").map(t => t.trim()).slice(0, 4);
      setTags(lista);
      await setDoc(doc(db, "config_usuarios", user.uid), { tags: lista });
    }
  };

  const stats = useMemo(() => {
    const i = movimientos.filter(m => m.tipo === 'ingreso').reduce((a, b) => a + b.monto, 0);
    const g = movimientos.filter(m => m.tipo === 'gasto').reduce((a, b) => a + b.monto, 0);
    return { i, g, t: i - g };
  }, [movimientos]);

  if (loading) return <div className="cargando">Sincronizando...</div>;

  return (
    <div className="container">
      <header>
        <h1>Finanzas</h1>
        {user ? <img src={user.photoURL} onClick={logout} className="avatar" alt="user" /> : <button onClick={login}>Login</button>}
      </header>

      {user && (
        <>
          <div className="card-balance">
            <div className="total-circle">
              <h2>S/ {stats.t.toFixed(2)}</h2>
              <p>Balance</p>
            </div>
            <div className="row">
              <div className="st"><span>Gastos</span><p className="r">S/ {stats.g.toFixed(2)}</p></div>
              <div className="st"><span>Ingresos</span><p className="v">S/ {stats.i.toFixed(2)}</p></div>
            </div>
          </div>

          <div className="card-form">
            <p className="guia">Pulse las palabras para editar favoritos</p>
            <div className="tags">
              {tags.map((t, idx) => (
                <button key={idx} onClick={() => setNombre(t)} className="tag">{t}</button>
              ))}
              <button onClick={editarTags} className="edit-btn">⚙️</button>
            </div>
            <input type="text" placeholder="Detalle" value={nombre} onChange={e => setNombre(e.target.value)} />
            <input type="number" placeholder="Monto S/" value={monto} onChange={e => setMonto(e.target.value)} />
            <div className="btns">
              <button onClick={() => registrar('ingreso')} className="b-i">💰 Ingreso</button>
              <button onClick={() => registrar('gasto')} className="b-g">💸 Gasto</button>
            </div>
          </div>

          <div className="lista">
            {movimientos.map(m => (
              <div key={m.id} className="item">
                <div><strong>{m.nombre}</strong><br/><small>{m.hora}</small></div>
                <div className={m.tipo}>
                  {m.tipo === 'gasto' ? '-' : '+'} S/ {m.monto.toFixed(2)}
                  <button onClick={() => deleteDoc(doc(db, "movimientos", m.id))}>×</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default App;