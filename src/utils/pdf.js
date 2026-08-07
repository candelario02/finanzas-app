import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const EMOJI_REGEX =
  /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g;

function limpiarEmojis(texto) {
  return texto.replace(EMOJI_REGEX, "");
}

export function exportarMovimientosPDF({ movimientos, fechaFiltro, ing, gas, bal }) {
  if (!movimientos || movimientos.length === 0) {
    return { ok: false, error: "No hay datos para exportar" };
  }

  try {
    const docPDF = new jsPDF();
    docPDF.setFontSize(18);
    docPDF.text("Reporte de Finanzas", 14, 20);

    const rows = [];
    let totalDiaIng = 0;
    let totalDiaGas = 0;
    let fechaActual = movimientos[0].fecha;

    movimientos.forEach((m, index) => {
      if (m.fecha !== fechaActual) {
        rows.push([
          {
            content: `TOTAL DEL DIA (${fechaActual})`,
            colSpan: 3,
            styles: { fillColor: [0, 209, 178], fontStyle: "bold" },
          },
          { content: `ING: S/ ${totalDiaIng.toFixed(2)}` },
          { content: `GAS: S/ ${totalDiaGas.toFixed(2)}` },
        ]);
        totalDiaIng = 0;
        totalDiaGas = 0;
        fechaActual = m.fecha;
      }

      rows.push([
        m.fecha,
        m.hora || "--:--",
        limpiarEmojis(m.nombre),
        m.tipo.toUpperCase(),
        `S/ ${m.monto.toFixed(2)}`,
      ]);

      if (m.tipo === "ingreso") totalDiaIng += m.monto;
      else totalDiaGas += m.monto;

      if (index === movimientos.length - 1) {
        rows.push([
          {
            content: `TOTAL DEL DIA (${m.fecha})`,
            colSpan: 3,
            styles: { fillColor: [0, 209, 178], fontStyle: "bold" },
          },
          { content: `ING: S/ ${totalDiaIng.toFixed(2)}` },
          { content: `GAS: S/ ${totalDiaGas.toFixed(2)}` },
        ]);
      }
    });

    rows.push([
      {
        content: "TOTAL MENSUAL",
        colSpan: 2,
        styles: {
          fillColor: [0, 209, 178],
          fontStyle: "bold",
          textColor: 255,
        },
      },
      { content: `ING: S/ ${ing.toFixed(2)}` },
      { content: `GAS: S/ ${gas.toFixed(2)}` },
      { content: `NETO: S/ ${bal.toFixed(2)}` },
    ]);

    autoTable(docPDF, {
      startY: 30,
      head: [["Fecha", "Hora", "Detalle", "Tipo", "Monto"]],
      body: rows,
      theme: "grid",
      headStyles: { fillColor: [0, 209, 178] },
    });

    docPDF.save(`reporte_${fechaFiltro}.pdf`);
    return { ok: true };
  } catch (err) {
    console.error("Error al generar PDF:", err);
    return { ok: false, error: "Error al generar el PDF" };
  }
}
