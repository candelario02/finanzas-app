import "./DashboardCard.css";

export default function DashboardCard({ stats, vistaMensual }) {
  return (
    <div className="main-card">
      <div
        className="circle-chart"
        style={{ "--pGas": `${stats.pGas}deg`, "--pIng": `${stats.pIng}deg` }}
      >
        <div className="inner-circle">
          <div className="chart-info">
            <p>S/ {stats.bal.toFixed(2)}</p>
            <span>
              {vistaMensual ? "Balance del mes" : "Balance de hoy"}
            </span>
          </div>
        </div>
      </div>
      <div className="dashboard-stats">
        <div className="stat">
          <span>Gastos</span>
          <p className="txt-gasto">S/ {stats.gas.toFixed(2)}</p>
        </div>
        <div className="stat">
          <span>Ingresos</span>
          <p>S/ {stats.ing.toFixed(2)}</p>
        </div>
        <div className="stat">
          <span>Balance</span>
          <p>S/ {stats.bal.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}
