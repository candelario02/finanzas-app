import { describe, expect, it } from "vitest";
import { calcularStats } from "./stats";

const base = {
  uid: "u1",
  hora: "10:00",
  createdAt: 1,
};

function mov(fecha, tipo, monto, nombre = "Detalle") {
  return { ...base, fecha, tipo, monto, nombre };
}

describe("calcularStats", () => {
  const movimientos = [
    mov("2026-08-07", "ingreso", 100, "Sueldo"),
    mov("2026-08-07", "gasto", 40, "Comida"),
    mov("2026-08-07", "gasto", 10, "Otro gasto"),
    mov("2026-08-06", "ingreso", 50, "Extra"),
  ];

  it("filtra por día y suma ingresos/gastos/balance", () => {
    const stats = calcularStats(movimientos, {
      vistaMensual: false,
      fechaFiltro: "2026-08-07",
      busqueda: "",
    });
    expect(stats.ing).toBe(100);
    expect(stats.gas).toBe(50);
    expect(stats.bal).toBe(50);
    expect(stats.filtrados).toHaveLength(3);
  });

  it("filtra por mes cuando vistaMensual es true", () => {
    const stats = calcularStats(movimientos, {
      vistaMensual: true,
      fechaFiltro: "2026-08-01",
      busqueda: "",
    });
    expect(stats.filtrados).toHaveLength(4);
  });

  it("aplica la búsqueda por nombre (sin distinguir mayúsculas)", () => {
    const stats = calcularStats(movimientos, {
      vistaMensual: true,
      fechaFiltro: "2026-08-01",
      busqueda: "comida",
    });
    expect(stats.filtrados).toHaveLength(1);
    expect(stats.filtrados[0].nombre).toBe("Comida");
  });

  it("devuelve ceros y sin filtrados cuando no hay coincidencias", () => {
    const stats = calcularStats(movimientos, {
      vistaMensual: false,
      fechaFiltro: "2020-01-01",
      busqueda: "",
    });
    expect(stats.filtrados).toHaveLength(0);
    expect(stats.ing).toBe(0);
    expect(stats.gas).toBe(0);
    expect(stats.bal).toBe(0);
  });

  it("no divide por cero al calcular el círculo sin datos", () => {
    const stats = calcularStats([], {
      vistaMensual: true,
      fechaFiltro: "2026-08-01",
      busqueda: "",
    });
    expect(stats.pGas).toBe(0);
    expect(stats.pIng).toBe(0);
  });

  it("calcula los ángulos del círculo proporcionalmente", () => {
    const stats = calcularStats(
      [
        mov("2026-08-07", "ingreso", 100),
        mov("2026-08-07", "gasto", 100),
      ],
      { vistaMensual: false, fechaFiltro: "2026-08-07", busqueda: "" },
    );
    expect(stats.pGas).toBeCloseTo(180, 5);
    expect(stats.pIng).toBeCloseTo(180, 5);
  });
});
