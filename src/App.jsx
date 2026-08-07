import { useCallback, useMemo, useState } from "react";
import "./App.css";
import Header from "./components/Header";
import DashboardCard from "./components/DashboardCard";
import TransactionForm from "./components/TransactionForm";
import HistoryList from "./components/HistoryList";
import ConfirmModal from "./components/ConfirmModal";
import TagEditorModal from "./components/TagEditorModal";
import Toast from "./components/Toast";
import { useToast } from "./hooks/useToast";
import { useAuth } from "./hooks/useAuth";
import { useTags } from "./hooks/useTags";
import { useMovimientos } from "./hooks/useMovimientos";
import { calcularStats } from "./utils/stats";
import { fechaInputHoy, mesActual } from "./utils/format";

function App() {
  const { toast, showToast } = useToast();
  const { user, loading, login, logout } = useAuth(showToast);
  const { tags, guardarTags } = useTags(user, showToast);
  const { movimientos, registrar, eliminar } = useMovimientos(user, showToast);

  const [vistaMensual, setVistaMensual] = useState(false);
  const [fechaDia, setFechaDia] = useState(fechaInputHoy);
  const [fechaMes, setFechaMes] = useState(mesActual);
  const [busqueda, setBusqueda] = useState("");
  const [confirmState, setConfirmState] = useState(null);
  const [tagEditorOpen, setTagEditorOpen] = useState(false);

  const fechaFiltro = vistaMensual ? fechaMes : fechaDia;

  const stats = useMemo(
    () =>
      calcularStats(movimientos, {
        vistaMensual,
        fechaFiltro,
        busqueda,
      }),
    [movimientos, vistaMensual, fechaFiltro, busqueda],
  );

  const triggerConfirm = useCallback(
    (message, onConfirm) => setConfirmState({ message, onConfirm }),
    [],
  );

  const handleFechaChange = useCallback(
    (valor) => {
      if (vistaMensual) setFechaMes(valor);
      else setFechaDia(valor);
    },
    [vistaMensual],
  );

  const handleExportPDF = useCallback(async () => {
    const { exportarMovimientosPDF } = await import("./utils/pdf");
    const res = exportarMovimientosPDF({
      movimientos: stats.filtrados,
      fechaFiltro,
      ing: stats.ing,
      gas: stats.gas,
      bal: stats.bal,
    });
    showToast(res.ok ? "PDF generado" : res.error, res.ok ? "success" : "error");
  }, [stats, fechaFiltro, showToast]);

  const handleLogout = () =>
    triggerConfirm("Estas seguro de que quieres salir?", logout);

  const handleDelete = (movimiento) =>
    triggerConfirm("Eliminar este movimiento?", () => eliminar(movimiento));

  const handleGuardarTags = (raw) => {
    const lista = raw
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t !== "");
    if (lista.length === 0) {
      showToast("Debes tener al menos un favorito", "info");
      return;
    }
    guardarTags(lista);
    setTagEditorOpen(false);
  };

  if (loading) return <div className="loading-screen">Sincronizando...</div>;

  return (
    <div className="main-container">
      <div className="phone-screen">
        <Header
          user={user}
          vistaMensual={vistaMensual}
          fechaFiltro={fechaFiltro}
          onLogin={login}
          onLogoutClick={handleLogout}
          onToggleVista={() => setVistaMensual((v) => !v)}
          onFechaChange={handleFechaChange}
          onExportPDF={handleExportPDF}
        />

        <DashboardCard stats={stats} vistaMensual={vistaMensual} />

        <TransactionForm
          tags={tags}
          onRegistrar={registrar}
          onOpenTagEditor={() => setTagEditorOpen(true)}
        />

        <HistoryList
          filtrados={stats.filtrados}
          busqueda={busqueda}
          onBusquedaChange={setBusqueda}
          onDelete={handleDelete}
        />
      </div>

      {confirmState && (
        <ConfirmModal
          message={confirmState.message}
          onConfirm={confirmState.onConfirm}
          onClose={() => setConfirmState(null)}
        />
      )}

      {tagEditorOpen && (
        <TagEditorModal
          initialValue={tags.join(", ")}
          onSave={handleGuardarTags}
          onCancel={() => setTagEditorOpen(false)}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
}

export default App;
