import { useState } from "react";
import "./TransactionForm.css";

export default function TransactionForm({ tags, onRegistrar, onOpenTagEditor }) {
  const [nombre, setNombre] = useState("");
  const [monto, setMonto] = useState("");

  const registrar = async (tipo) => {
    const ok = await onRegistrar(nombre, monto, tipo);
    if (ok) {
      setNombre("");
      setMonto("");
    }
  };

  return (
    <div className="input-section">
      <div className="quick-tags">
        {tags.map((t, i) => (
          <button
            key={`${t}-${i}`}
            className="tag-btn"
            onClick={() => setNombre(t)}
            onContextMenu={(e) => {
              e.preventDefault();
              onOpenTagEditor();
            }}
          >
            {t}
          </button>
        ))}
        <button className="tag-btn-edit" onClick={onOpenTagEditor}>
          &#9881;&#65039;
        </button>
      </div>

      <input
        placeholder="Detalle..."
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
      />

      <input
        type="number"
        placeholder="Monto S/"
        value={monto}
        min="0"
        step="0.01"
        onChange={(e) => setMonto(e.target.value)}
      />

      <div className="btn-group-main">
        <button
          className="btn-action in"
          onClick={() => registrar("ingreso")}
        >
          Ingreso
        </button>
        <button
          className="btn-action out"
          onClick={() => registrar("gasto")}
        >
          Gasto
        </button>
      </div>
    </div>
  );
}
