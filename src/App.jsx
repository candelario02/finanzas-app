import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) setMovimientos([]); 
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "movimientos"), where("uid", "==", user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
      setMovimientos(docs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
    }, (error) => console.error("Error en Firebase:", error));
    return () => unsub();
  }, [user]);

  useEffect(() => {
    localStorage.setItem('finanzas_tags', JSON.stringify(tags));
  }, [tags]);

  const registrar = async (tipo) => {
    if (!nombre || !monto || !user) {
      alert("Falta detalle, monto o iniciar sesión");
      return;
    }
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
    } catch (error) { alert("Error al conectar con la nube"); }
  };

  const eliminar = async (id) => {
    if (window.confirm("¿Estás seguro de borrar este registro?")) {
      await deleteDoc(doc(db, "movimientos", id));
    }
  };

  const editarTag = (i) => {
    const n = prompt("Edita tu botón (puedes incluir stickers/emojis):", tags[i]);
    if (n) {
      const nt = [...tags]; 
      nt[i] = n; 
      setTags(nt);
    }
  };

  const exportarPDF = () => {
    if (filtrados.length === 0) return alert("No hay datos para exportar");
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(vistaMensual ? "Reporte Mensual" : "Reporte del Día", 14, 20);
    doc.setFontSize(10);
    doc.text(`Usuario: ${user.email} - Fecha: ${fechaFiltro}`, 14, 28);
    
    const tableData = filtrados.map(m => [m.fecha, m.hora, m.nombre, m.tipo.toUpperCase(), `S/ ${m.monto.toFixed(2)}`]);
    doc.autoTable({
      head: [['Fecha', 'Hora', 'Detalle', 'Tipo', 'Monto']],
      body: tableData,
      startY: 35,
      theme: 'grid'
    });
    doc.save(`Reporte_${fechaFiltro}.pdf`);
  };

  const filtrados = movimientos.filter(m => {
    const matchFecha = vistaMensual 
      ? m.fecha.startsWith(fechaFiltro.substring(0, 7)) 
      : m.fecha === fechaFiltro;
    return matchFecha && m.nombre.toLowerCase().includes(busqueda.toLowerCase());
  });

  const tIn = filtrados.filter(m => m.tipo === 'ingreso').reduce((a, b) => a + b.monto, 0);
  const tOut = filtrados.filter(m => m.tipo === 'gasto').reduce((a, b) => a + b.monto, 0);
  const bal = tIn - tOut;
  const ahorro = bal > 0 ? bal : 0;

  // Lógica del gráfico: Gastos (Rojo), Ingresos (Turquesa), Ahorro (Morado)
  const totalParaGrafico = tIn + tOut + ahorro;
  const pOut = totalParaGrafico > 0 ? (tOut / totalParaGrafico) * 360 : 0;
  const pIn = totalParaGrafico > 0 ? (tIn / totalParaGrafico) * 360 : 0;

  const login = () => signInWithPopup(auth, googleProvider);
  const logout = () => signOut(auth);

  return (
    <div className="main-container">
      <div className="phone-screen">
        <header className="app-header">
          <h2>{vistaMensual ? "Resumen Mes" : "Detalle Día"}</h2>
          <div className="header-btns">
            <button className="btn-icon" onClick={exportarPDF} title="Exportar PDF">📄</button>
            <button className="btn-icon" onClick={() => setVistaMensual(!vistaMensual)}>
              {vistaMensual ? "📅" : "🗓️"}
            </button>
          </div>
        </header>

        <div className="auth-bar">
          {user ? (
            <div className="user-profile">
              <img src={user.photoURL} alt="avatar" />
              <span>{user.displayName.split(' ')[0]}</span>
              <button onClick={logout} className="btn-logout">Salir</button>
            </div>
          ) : (
            <button onClick={login} className="btn-login">🚀 Sincronizar con Google</button>
          )}
        </div>

        <div className="date-selector">
          <input 
            className="date-input" 
            type={vistaMensual ? "month" : "date"} 
            value={vistaMensual ? fechaFiltro.substring(0, 7) : fechaFiltro} 
            onChange={e => setFechaFiltro(e.target.value)} 
          />
        </div>

        <div className="main-card">
          <div className="circle-chart-multi" style={{
            background: totalParaGrafico > 0 
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
          <p className="edit-hint">✨ Pulsa para editar tus palabras favoritas</p>
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
          <input type="text" placeholder="Detalle (puedes incluir stickers)" value={nombre} onChange={e => setNombre(e.target.value)} />
          <input type="number" placeholder="Monto S/" value={monto} onChange={e => setMonto(e.target.value)} />
          <div className="btn-group-direct">
            <button onClick={() => registrar('ingreso')} className="btn-direct in">💰 Ingreso</button>
            <button onClick={() => registrar('gasto')} className="btn-direct out">💸 Gasto</button>
          </div>
        </div>

        <div className="search-box">
          <input type="text" placeholder="🔍 Buscar movimiento..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>

        <div className="history-list">
          {filtrados.map(m => (
            <div key={m.id} className="history-item">
              <div className={`icon-box ${m.tipo}`}>{m.tipo === 'ingreso' ? '💰' : '💸'}</div>
              <div className="item-info">
                <strong>{m.nombre}</strong>
                <span>{m.hora}</span>
              </div>
              <div className="item-right">
                <span className={`item-amount ${m.tipo}`}>S/ {m.monto.toFixed(2)}</span>
                <button className="delete-btn" onClick={() => eliminar(m.id)}>&times;</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;