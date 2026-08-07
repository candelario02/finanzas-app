export function calcularStats(movimientos, { vistaMensual, fechaFiltro, busqueda }) {
  const filtrados = movimientos.filter((m) => {
    const matchFecha = vistaMensual
      ? m.fecha?.startsWith(fechaFiltro.substring(0, 7))
      : m.fecha === fechaFiltro;
    const matchBusqueda = m.nombre
      ?.toLowerCase()
      .includes(busqueda.toLowerCase());
    return matchFecha && matchBusqueda;
  });

  const ing = filtrados
    .filter((m) => m.tipo === "ingreso")
    .reduce((a, b) => a + b.monto, 0);
  const gas = filtrados
    .filter((m) => m.tipo === "gasto")
    .reduce((a, b) => a + b.monto, 0);
  const bal = ing - gas;
  const totalCirculo = ing + gas + Math.abs(bal);

  return {
    filtrados,
    ing,
    gas,
    bal,
    pGas: totalCirculo ? (gas / totalCirculo) * 360 : 0,
    pIng: totalCirculo ? (ing / totalCirculo) * 360 : 0,
  };
}
