import React from "react";
import { fechaLegible, formatoFechaVisible } from "../utils/format";
import "./HistoryList.css";

export default function HistoryList({
  filtrados,
  busqueda,
  onBusquedaChange,
  onDelete,
}) {
  return (
    <div className="history-list">
      <input
        className="search-bar"
        placeholder="Buscar..."
        value={busqueda}
        onChange={(e) => onBusquedaChange(e.target.value)}
      />

      {filtrados.map((m, index) => {
        const mostrarSeparador =
          index === 0 || m.fecha !== filtrados[index - 1].fecha;
        return (
          <React.Fragment key={m.id}>
            {mostrarSeparador && (
              <div className="date-separator">{fechaLegible(m.fecha)}</div>
            )}
            <div className="history-item">
              <div className="item-info">
                <strong>{m.nombre}</strong>
                <div className="item-meta">
                  <span className="meta-date">
                    {formatoFechaVisible(m.fecha)}
                  </span>
                  <span className="meta-time">{m.hora}</span>
                </div>
              </div>
              <div className="item-right">
                <span className={`item-amount ${m.tipo}`}>
                  {m.tipo === "gasto" ? "-" : "+"} S/ {m.monto.toFixed(2)}
                </span>
                <button
                  className="btn-delete"
                  onClick={() => onDelete(m)}
                >
                  &times;
                </button>
              </div>
            </div>
          </React.Fragment>
        );
      })}

      {filtrados.length === 0 && (
        <div className="empty-state">
          <p>No hay movimientos para esta fecha</p>
        </div>
      )}
    </div>
  );
}
