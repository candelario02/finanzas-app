import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  /* =========================================
     1. ESTADO Y PERSISTENCIA
     ========================================= */
  const [movimientos, setMovimientos] = useState(() => {
    const datos = localStorage.getItem('finanzas_v7');
    return datos ? JSON.parse(datos) : [];
  });

  const [nombre, setNombre] = useState('');
  const [monto, setMonto] = useState('');
  const [busqueda, setBusqueda] = useState(''); // Estado para el buscador
  const [vistaMensual, setVistaMensual] = useState(false);

  useEffect(() => {
    localStorage.setItem('finanzas_v7', JSON.stringify(movimientos));
  }, [movimientos]);

  /* =========================================
     2. LÓGICA DE NEGOCIO
     ========================================= */
  const registrar = (tipo) => {
    if (!nombre || !monto) return alert("Escribe detalle y monto");
    const ahora = new Date();
    const nuevo = { 
      id: Date.now().toString(), 
      nombre, 
      monto: parseFloat(monto), 
      tipo, 
      fecha: ahora.toLocaleDateString(),
      hora: ahora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMovimientos(prev => [nuevo, ...prev]);
    setNombre(''); setMonto('');
  };

  // Función con Alerta de Seguridad
  const limpiarTodo = () => {
    if (window.confirm("⚠️ ¿Estás seguro? Se borrarán todos los registros permanentemente.")) {
      setMovimientos([]);
    }
  };

  /* =========================================
     3. FILTROS Y CÁLCULOS
     ========================================= */
  const hoy = new Date().toLocaleDateString();
  
  // Filtrado por Fecha + Filtrado por Buscador
  const datosFiltrados = movimientos
    .filter(m => vistaMensual ? true : m.fecha === hoy)
    .filter(m => m.nombre.toLowerCase().includes(busqueda.toLowerCase()));

  // Los totales siempre se calculan sobre la vista actual (Hoy o Mes)
  const datosParaDashboard = movimientos.filter(m => vistaMensual ? true : m.fecha === hoy);
  const totalIn = datosParaDashboard.filter(m => m.tipo === 'ingreso').reduce((acc, m) => acc + m.monto, 0);
  const totalOut = datosParaDashboard.filter(m => m.tipo === 'gasto').reduce((acc, m) => acc + m.monto, 0);
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
          <h2>{vistaMensual ? "Resumen Mes" : "Hoy"}</h2>
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
        </div>

        <div className="input-section">
          <div className="quick-tags">
            {["Pasajes", "Almuerzo", "Venta", "Cena"].map(cat => (
              <button key={cat} onClick={() => setNombre(cat)} className="tag-btn">{cat}</button>
            ))}
          </div>
          <input type="text" placeholder="¿Qué registramos?" value={nombre} onChange={e => setNombre(e.target.value)} />
          <input type="number" placeholder="Monto S/" value={monto} onChange={e => setMonto(e.target.value)} />
          <div className="btn-group-direct">
            <button onClick={() => registrar('ingreso')} className="btn-direct in">💰 Ingreso</button>
            <button onClick={() => registrar('gasto')} className="btn-direct out">💸 Gasto</button>
          </div>
        </div>

        {/* BUSCADOR */}
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
                  {m.tipo === 'ingreso' ? '+' : '-'} S/ {m.monto.toFixed(2)}
                </span>
                <button className="delete-btn" onClick={() => setMovimientos(prev => prev.filter(x => x.id !== m.id))}>&times;</button>
              </div>
            </div>
          ))}
          {datosFiltrados.length === 0 && <p className="empty-text">No se encontraron resultados</p>}
        </div>

      </div>
    </div>
  );
}

export default App;