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

  const [tags, setTags] = useState(() => {
    const savedTags = localStorage.getItem('finanzas_tags');
    return savedTags ? JSON.parse(savedTags) : ["GNV", "Comida", "Diversión", "Generé"];
  });

  const [nombre, setNombre] = useState('');
  const [monto, setMonto] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [vistaMensual, setVistaMensual] = useState(false);
  const [fechaFiltro, setFechaFiltro] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    localStorage.setItem('finanzas_v7', JSON.stringify(movimientos));
    localStorage.setItem('finanzas_tags', JSON.stringify(tags));
  }, [movimientos, tags]);

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
      fecha: ahora.toLocaleDateString('en-CA'), // Formato YYYY-MM-DD para fácil filtrado
      hora: ahora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMovimientos(prev => [nuevo, ...prev]);
    setNombre(''); setMonto('');
  };

  const editarTag = (index) => {
    const nuevoNombre = prompt("Nuevo nombre para la etiqueta:", tags[index]);
    if (nuevoNombre) {
      const nuevosTags = [...tags];
      nuevosTags[index] = nuevoNombre;
      setTags(nuevosTags);
    }
  };

  const exportarCSV = () => {
    if (movimientos.length === 0) return alert("No hay datos para exportar");
    const encabezados = "Fecha,Hora,Detalle,Tipo,Monto\n";
    const filas = movimientos.map(m => `${m.fecha},${m.hora},${m.nombre},${m.tipo},${m.monto}`).join("\n");
    const blob = new Blob([encabezados + filas], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `finanzas_${new Date().toLocaleDateString()}.csv`;
    link.click();
  };

  /* =========================================
     3. FILTROS Y CÁLCULOS
     ========================================= */
  const datosFiltrados = movimientos
    .filter(m => {
      if (vistaMensual) return true;
      return m.fecha === fechaFiltro;
    })
    .filter(m => m.nombre.toLowerCase().includes(busqueda.toLowerCase()));

  const totalIn = datosFiltrados.filter(m => m.tipo === 'ingreso').reduce((acc, m) => acc + m.monto, 0);
  const totalOut = datosFiltrados.filter(m => m.tipo === 'gasto').reduce((acc, m) => acc + m.monto, 0);
  const ahorro = totalIn - totalOut;

  // Gráfico
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
          <h2>{vistaMensual ? "Todo el Mes" : "Detalle Día"}</h2>
          <div className="header-btns">
            <button className="btn-switch" onClick={exportarCSV}>📥</button>
            <button className="btn-switch" onClick={() => setVistaMensual(!vistaMensual)}>
              {vistaMensual ? "📅 Ver Día" : "📊 Ver Todo"}
            </button>
          </div>
        </header>

        {!vistaMensual && (
          <div className="date-selector">
            <input type="date" value={fechaFiltro} onChange={(e) => setFechaFiltro(e.target.value)} />
          </div>
        )}

        <div className="main-card">
          <div className="circle-chart-multi" style={graficoEstilo}>
            <div className="inner-circle">
              <div className="chart-info">
                <p>S/ {ahorro.toFixed(2)}</p>
                <span>{vistaMensual ? "Balance Total" : "Balance Día"}</span>
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
          <small style={{opacity: 0.5, fontSize: '0.6rem'}}>Mantén presionado para editar etiquetas</small>
          <div className="quick-tags">
            {tags.map((cat, index) => (
              <button 
                key={index} 
                onClick={() => setNombre(cat)} 
                onContextMenu={(e) => { e.preventDefault(); editarTag(index); }}
                className="tag-btn"
              >
                {cat}
              </button>
            ))}
          </div>
          <input type="text" placeholder="¿Qué registramos?" value={nombre} onChange={e => setNombre(e.target.value)} />
          <input type="number" placeholder="Monto S/" value={monto} onChange={e => setMonto(e.target.value)} />
          <div className="btn-group-direct">
            <button onClick={() => registrar('ingreso')} className="btn-direct in">💰 Ingreso</button>
            <button onClick={() => registrar('gasto')} className="btn-direct out">💸 Gasto</button>
          </div>
        </div>

        <div className="search-box">
          <input type="text" placeholder="🔍 Buscar en esta vista..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
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
        </div>
      </div>
    </div>
  );
}

export default App;