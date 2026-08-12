export function fechaInputHoy() {
  return new Date().toLocaleDateString("en-CA");
}

export function mesActual() {
  return fechaInputHoy().substring(0, 7);
}

export function horaActual() {
  return new Date().toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatoFechaVisible(fecha) {
  if (!fecha) return "";
  return fecha.split("-").reverse().join("/");
}

export function fechaLegible(fecha) {
  return new Date(fecha + "T00:00:00").toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function moneda(n) {
  return `S/ ${Number(n).toFixed(2)}`;
}
