import "./Modal.css";

export default function ConfirmModal({ message, onConfirm, onClose }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
        <div className="icon-q">?</div>
        <p>{message}</p>
        <div className="confirm-btns">
          <button className="btn-c" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn-a"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}
