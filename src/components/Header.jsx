import "./Header.css";

export default function Header({
  user,
  vistaMensual,
  fechaFiltro,
  onLogin,
  onLogoutClick,
  onToggleVista,
  onFechaChange,
  onExportPDF,
}) {
  return (
    <header className="app-header">
      <div className="header-left">
        <h2>Finanzas CHC</h2>
        <div className="date-select-container">
          <span className="date-label">Ver X Dias</span>
          <div className="date-select-wrapper">
            <span className="calendar-mini-icon">&#128197;</span>
            <input
              className="mini-date-picker"
              type={vistaMensual ? "month" : "date"}
              value={fechaFiltro}
              onChange={(e) => onFechaChange(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="header-btns">
        {!user ? (
          <button className="btn-login" onClick={onLogin}>
            Login
          </button>
        ) : (
          <img
            src={user.photoURL || ""}
            alt="avatar"
            className="mini-avatar"
            onClick={onLogoutClick}
          />
        )}

        <div className="btn-wrapper">
          <span className="btn-label">PDF</span>
          <button className="btn-icon" onClick={onExportPDF}>
            &#128196;
          </button>
        </div>

        <div className="btn-wrapper">
          <span className={`btn-label ${vistaMensual ? "mes" : "dia"}`}>
            {vistaMensual ? "Dia" : "Mes"}
          </span>
          <button
            className={`btn-icon ${vistaMensual ? "border-mes" : "border-dia"}`}
            onClick={onToggleVista}
          >
            {vistaMensual ? "\u2600\uFE0F" : "\uD83D\uDCC5"}
          </button>
        </div>
      </div>
    </header>
  );
}
