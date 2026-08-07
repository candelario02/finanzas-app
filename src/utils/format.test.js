import { describe, expect, it } from "vitest";
import {
  fechaInputHoy,
  formatoFechaVisible,
  horaActual,
  mesActual,
  moneda,
} from "./format";

describe("format", () => {
  it("formatea la moneda en soles", () => {
    expect(moneda(12.5)).toBe("S/ 12.50");
    expect(moneda(0)).toBe("S/ 0.00");
  });

  it("fechaInputHoy devuelve YYYY-MM-DD", () => {
    expect(fechaInputHoy()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("mesActual devuelve YYYY-MM", () => {
    expect(mesActual()).toMatch(/^\d{4}-\d{2}$/);
  });

  it("horaActual devuelve HH:MM", () => {
    expect(horaActual()).toMatch(/^\d{2}:\d{2}$/);
  });

  it("formatoFechaVisible convierte ISO a dd/mm/yyyy", () => {
    expect(formatoFechaVisible("2026-08-07")).toBe("07/08/2026");
  });

  it("formatoFechaVisible maneja valores vacíos", () => {
    expect(formatoFechaVisible(undefined)).toBe("");
  });
});
