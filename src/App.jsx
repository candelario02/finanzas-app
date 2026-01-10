import React, { useState, useEffect, useMemo } from 'react';
import './App.css';
import { db, auth, googleProvider } from './firebase';
/* eslint-disable no-unused-vars */


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
  const [toast, setToast] = useState(null);

  const [nombre, setNombre] = useState('');
  const [monto, setMonto] = useState('');
  const [tags, setTags] = useState(["GNV ⛽", "Comida 🍔", "Diversión 🎮", "Generé 💰"]);

  const [busqueda, setBusqueda] = useState('');
  const [vistaMensual, setVistaMensual] = useState(false);
  const [fechaFiltro, setFechaFiltro] = useState(new Date().toLocaleDateString('en-CA'));

  /* 🔔 TOAST */
  const showToast = (msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  /* AUTH */
  useEffect(() => {
    const initAuth = async () => {
      await setPersistence(auth, browserLocalPersistence);
      onAuthStateChanged(auth, async (u) => {
        if (u) {
          setUser(u);
          const snap = await getDoc(doc(db, "config_usuarios", u.uid));
          if (snap.exists()) setTags(snap.data().tags);
        } else {
          setUser(null);
          setMovimientos([]);
        }
        setLoading(false);
      });
    };
    initAuth();
  }, []);

  /* DATA */
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "movimientos"), where("uid", "==", user.uid));
    const unsub = onSnapshot(q, snap => {
      const data = snap.docs.map(d => ({ ...d.data(), id: d.id }));
      setMovimientos(data.sort((a, b) => b.createdAt - a.createdAt));
    });
    return () => unsub();
  }, [user]);

  /* STATS */
  const stats = useMemo(() => {
    const filtrados = movimientos.filter(m =>
      vistaMensual
        ? m.fecha.startsWith(fechaFiltro.substring(0, 7))
        : m.fecha === fechaFiltro
    );

    const ing = filtrados.filter(m => m.tipo === 'ingreso').reduce((a, b) => a + b.monto, 0);
    const gas = filtrados.filter(m => m.tipo === 'gasto').reduce((a, b) => a + b.monto, 0);
    const bal = ing - gas;

    const total = ing + gas + Math.max(bal, 0);
    return {
      filtrados,
      ing,
      gas,
      bal,
      pGas: total ? (gas / total) * 360 : 0,
      pIng: total ? (ing / total) * 360 : 0
    };
  }, [movimientos, vistaMensual, fechaFiltro]);

  /* ACTIONS */
  const registrar = async (tipo) => {
    if (!nombre || !monto || !user) return;

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

      setNombre('');
      setMonto('');
      showToast("Movimiento guardado", "success");
    } catch {
      showToast("Error al guardar", "error");
    }
  };

  const exportarPDF = () => {
    const pdf = new jsPDF();
    pdf.text(`Reporte - ${user.displayName}`, 14, 20);
    pdf.autoTable({
      startY: 30,
      head: [['Fecha', 'Detalle', 'Tipo', 'Monto']],
      body: stats.filtrados.map(m => [m.fecha, m.nombre, m.tipo, `S/ ${m.monto}`])
    });
    pdf.save("finanzas.pdf");
    showToast("PDF generado", "success");
  };

  if (loading) return <div className="loading-screen">Cargando...</div>;

  return (
    <div className="main-container">
      <div className="phone-screen">

        <header className="app-header">
          <h2>Finanzas</h2>
          {!user ? (
            <button onClick={async () => {
              await signInWithPopup(auth, googleProvider);
              showToast("Sesión iniciada", "success");
            }}>
              Login
            </button>
          ) : (
            <img
              src={user.photoURL}
              alt="u"
              className="mini-avatar"
              onClick={async () => {
                await signOut(auth);
                showToast("Sesión cerrada", "info");
              }}
            />
          )}
        </header>

        {/* TU UI SIGUE IGUAL */}

      </div>

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}

export default App;
