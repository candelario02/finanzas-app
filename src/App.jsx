import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import './App.css';

function App() {
  const [movimientos, setMovimientos] = useState(() => {
    const datos = localStorage.getItem('finanzas_v7');
    return datos ? JSON.parse(datos) : [];
  });

  const [nombre, setNombre] = useState('');
  const [monto, setMonto] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [vistaMensual, setVistaMensual] = useState(false);

  useEffect(() => {
    localStorage.setItem('finanzas_v7', JSON.stringify(movimientos));
  }, [movimientos]);

  const registrar = (tipo) => {
    if (!nombre || !monto) return alert("Escribe detalle y monto");
    const ahora = new Date();

    const nuevo = { 
      id: Date.now().toString(), 
      nombre: nombre, // Se guarda exactamente lo que el usuario escribió o pulsó
      monto: parseFloat(monto), 
      tipo, 
      fecha: ahora.toLocaleDateString(),
      hora: ahora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMovimientos(prev => [nuevo, ...prev]);
    setNombre(''); setMonto('');
  };

  const exportarPDF = () => {
    const doc = new jsPDF();
    doc.text(vistaMensual ? "Reporte Mensual" : "Reporte Diario", 14, 15);
    const tableData = datosFiltrados.map(m => [m.fecha, m.nombre, m.tipo, `S/ ${m.monto.toFixed(2)}`]);
    doc.autoTable({ head: [['Fecha', 'Detalle', 'Tipo', 'Monto']], body: tableData, startY: 25 });
    doc.save(`finanzas_${vistaMensual ? 'mes' : 'dia'}.pdf`);
  };

  const limpiarTodo = () => {
    if (window.confirm("⚠️ ¿Borrar todos los registros?")) {
      setMovimientos([]);
    }
  };

  const hoy = new Date().toLocaleDateString();
  const datosFiltrados = movimientos
    .filter(m => vistaMensual ? true : m.fecha === hoy)
    .filter(m => m.nombre.toLowerCase().includes(busqueda.toLowerCase()));

  const totalIn = datosFiltrados.filter(m => m.tipo === 'ingreso').reduce((acc, m) => acc + m.monto, 0);
  const totalOut = datosFiltrados.filter(m => m.tipo === 'gasto').reduce((acc, m) => acc + m.monto, 0);
  const ahorro = totalIn - totalOut;

  const totalG = totalIn + totalOut + (ahorro > 0 ? ahorro : 0);
  const pOut = totalG > 0 ? (totalOut / totalG) * 360 : 0;
  const pIn = totalG > 0 ? (totalIn / totalG) * 360 : 0;

  const graficoEstilo = {
    background: totalG > 0 
      ? `conic-gradient(#ff4757 0deg ${pOut}deg, #00d1b2 ${pOut}deg ${pOut + pIn}deg, #bb86fc ${pOut + pIn}deg 360deg)`
      : `#222` 
  };

  return (
    <div className="main-container">
      <div className="phone-screen">
        
        <header className="app-header">
          <h2>{vistaMensual ? "Resumen Mes" : "Detalle Día"}</h2>
          <div className="header-btns">
            <button className="btn-switch" onClick={() => setVistaMensual(!vistaMensual)}>
              {vistaMensual ? "Ver Hoy" : "Ver Mes"}
            </button>
            <button className="btn-clear" onClick={limpiarTodo}>Limpiar</button>
          </div>
        </header>

        <div className="main-card">
          <div className="circle-chart-multi" style={graficoEstilo}>
            <div className="inner-circle">
              <div className="chart-info">
                <p>S/ {ahorro.toFixed(2)}</p>
                <span>Balance</span>
              </div>
            </div>
          </div>
          <div className="dashboard-stats">
            <div className="stat"><span className="dot out"></span><span>Gastos</span><p>S/ {totalOut.toFixed(2)}</p></div>
            <div className="stat"><span className="dot in"></span><span>Ingresos</span><p>S/ {totalIn.toFixed(2)}</p></div>
            <div className="stat"><span className="dot save"></span><span>Ahorro</span><p>S/ {ahorro.toFixed(2)}</p></div>
          </div>
          <button className="btn-pdf" onClick={exportarPDF}>📄 Exportar PDF</button>
        </div>

        <div className="input-section">
          {/* AVISO SOLICITADO */}
          <p className="edit-hint">✨ Pulse para editar palabras o registrar manual</p>
          <div className="quick-tags">
            {["GNV", "Comida", "Diversión", "Generé"].map(cat => (
              <button key={cat} onClick={() => setNombre(cat)} className="tag-btn">{cat}</button>
            ))}
          </div>
          <input 
            type="text" 
            placeholder="Escribe detalle o usa sticker..." 
            value={nombre} 
            onChange={e => setNombre(e.target.value)} 
          />
          <input 
            type="number" 
            placeholder="Monto S/" 
            value={monto} 
            onChange={e => setMonto(e.target.value)} 
          />
          <div className="btn-group-direct">
            <button onClick={() => registrar('ingreso')} className="btn-direct in">💰 Ingreso</button>
            <button onClick={() => registrar('gasto')} className="btn-direct out">💸 Gasto</button>
          </div>
        </div>

        <div className="search-box">
          <input 
            type="text" 
            placeholder="🔍 Buscar movimiento..." 
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <div className="history-list">
          {datosFiltrados.map(m => (
            <div key={m.id} className="history-item">
              <div className={`icon-box ${m.tipo}`}>{m.tipo === 'ingreso' ? '💰' : '💸'}</div>
              <div className="item-info">
                <strong>{m.nombre}</strong>
                <span>{m.fecha} · {m.hora}</span>
              </div>
              <div className="item-right">
                <span className={`item-amount ${m.tipo}`}>
                  S/ {m.monto.toFixed(2)}
                </span>
                <button className="delete-btn" onClick={() => setMovimientos(prev => prev.filter(x => x.id !== m.id))}>&times;</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;