import { useState } from "react";
import "./Modal.css";

export default function TagEditorModal({ initialValue, onSave, onCancel }) {
  const [value, setValue] = useState(initialValue);

  return (
    <div className="overlay" onClick={onCancel}>
      <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
        <div className="icon-q">&#9874;</div>
        <p className="modal-title">Edita tus palabras favoritas</p>
        <input
          className="modal-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Sepáralas con coma"
          autoFocus
        />
        <div className="confirm-btns">
          <button className="btn-c" onClick={onCancel}>
            Cancelar
          </button>
          <button className="btn-a" onClick={() => onSave(value)}>
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
