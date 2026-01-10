import React, { useState, useEffect, useMemo } from 'react';
import './App.css';
import { db, auth, googleProvider } from './firebase';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  setDoc, 
  getDoc 
} from 'firebase/firestore';

function App() {
  const [user, setUser] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nombre, setNombre] = useState('');
  const [monto, setMonto] = useState('');
  const [tags, setTags] = useState(["GNV ⛽", "Comida 🍔", "Diversión 🎮", "Generé 💰"]);

  // 1. GESTIÓN DE USUARIO (SIN ALERTAS QUE BLOQUEEN EL INICIO)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        const docSnap = await getDoc(doc(db, "config_usuarios", u.uid));
        if (docSnap.exists()) setTags(docSnap.data().tags);
      } else {
        setUser(null);
        setMovimientos([]); // Esto ahora es seguro aquí
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      alert("Sesión iniciada correctamente.");
    } catch { alert("Error al conectar con Google."); }
  };

  const logout = async () => {
    if(window.confirm("¿Cerrar sesión?")) {
      await signOut(auth);
    }
  };

  // 2. ESCUCHA DE DATOS (CORREGIDO PARA EVITAR ERROR DE IMAGEN 46a6db)
  useEffect(() => {
    if (!user) return;

    // Consulta simple para evitar errores de índice en Firebase
    const q = query(
      collection(db, "movimientos"), 
      where("uid", "==", user.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ ...d.data(), id: d.id }));
      // Ordenamos aquí en memoria para no depender de índices complejos en Firebase
      setMovimientos(docs.sort((a, b) => b.createdAt - a.createdAt));
    }, (err) => {
      console.error("Error en Snapshot:", err);
    });

    return () => unsub();
  }, [user]);

  // 3. REGISTRAR MOVIMIENTO (ASEGURANDO PERSISTENCIA)
  const registrar = async (tipo) => {
    if (!nombre || !monto || !user) {
      alert("Por favor rellena detalle y monto.");
      return;
    }
    
    const nuevoMov = {
      nombre: nombre.trim(),
      monto: parseFloat(monto),
      tipo,
      uid: user.uid,
      fecha: new Date().toLocaleDateString('en-CA'),
      hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: Date.now()
    };

    try {
      await addDoc(collection(db, "movimientos"), nuevoMov);
      setNombre('');
      setMonto('');
    } catch {
      alert("Error de guardado. Revisa si Firestore está en 'Modo de Prueba'.");
    }
  };

  // 4. EDITAR FAVORITOS (ACEPTA CUALQUIER STICKER)
  const editarTags = async () => {
    const msg = "Escribe tus 4 favoritos separados por coma (ej: Gasolina ⛽, Cena 🍕, etc):";
    const nuevos = prompt(msg, tags.join(", "));
    
    if (nuevos && user) {
      const lista = nuevos.split(",").map(t => t.trim()).slice(0, 4);
      setTags(lista);
      try {
        await setDoc(doc(db, "config_usuarios", user.uid), { tags: lista });
      } catch { alert("No se pudieron guardar tus favoritos."); }
    }
  };

  const stats = useMemo(() => {
    const ing = movimientos.filter(m => m.tipo === 'ingreso').reduce((a, b) => a + b.monto, 0);
    const gas = movimientos.filter(m => m.tipo === 'gasto').reduce((a, b) => a + b.monto, 0);
    return { ing, gas, total: ing - gas };
  }, [movimientos]);

  if (loading) return <div className="loading-screen">Sincronizando...</div>;

  return (
    <div className="main-container">
      <header className="header">
        <h1>Finanzas</h1>
        {user ? (
          <img src={user.photoURL} className="avatar" onClick={logout} alt="user" />
        ) : (
          <button onClick={login} className="login-btn">Entrar</button>
        )}
      </header>

      {user && (
        <main className="content">
          <section className="card-balance">
            <div className="donut">
              <h2>S/ {stats.total.toFixed(2)}</h2>
              <span>Balance Total</span>
            </div>
            <div className="stats">
              <div className="stat-item"><span>Gastos</span><p className="txt-red">S/ {stats.gas.toFixed(2)}</p></div>
              <div className="stat-item"><span>Ingresos</span><p className="txt-green">S/ {stats.ing.toFixed(2)}</p></div>
            </div>
          </section>

          <section className="card-input">
            <p className="edit-info">Pulse las palabras para editar favoritos</p>
            <div className="tags">
              {tags.map((t, i) => (
                <button key={i} onClick={() => setNombre(t)} className="tag">{t}</button>
              ))}
              <button onClick={editarTags} className="tag-settings">⚙️</button>
            </div>
            
            <input type="text" placeholder="¿En qué?" value={nombre} onChange={e => setNombre(e.target.value)} />
            <input type="number" placeholder="Monto S/" value={monto} onChange={e => setMonto(e.target.value)} />
            
            <div className="btn-group">
              <button onClick={() => registrar('ingreso')} className="btn in">💰 Ingreso</button>
              <button onClick={() => registrar('gasto')} className="btn out">💸 Gasto</button>
            </div>
          </section>

          <section className="history">
            {movimientos.map(m => (
              <div key={m.id} className="item">
                <div className="item-left"><strong>{m.nombre}</strong><small>{m.hora}</small></div>
                <div className="item-right">
                  <span className={m.tipo}>S/ {m.monto.toFixed(2)}</span>
                  <button onClick={() => deleteDoc(doc(db, "movimientos", m.id))} className="btn-del">×</button>
                </div>
              </div>
            ))}
          </section>
        </main>
      )}
    </div>
  );
}

export default App;