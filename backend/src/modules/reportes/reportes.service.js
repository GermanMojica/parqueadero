// src/modules/reportes/reportes.service.js
const repo     = require('./reportes.repository');
const AppError = require('../../utils/AppError');

async function getResumenFinanciero({ fechaDesde, fechaHasta }) {
  if (!fechaDesde || !fechaHasta)
    throw new AppError('Se requieren fechaDesde y fechaHasta (YYYY-MM-DD)', 400);

  const desde = new Date(fechaDesde);
  const hasta = new Date(fechaHasta);
  if (isNaN(desde) || isNaN(hasta))
    throw new AppError('Formato de fecha inválido. Use YYYY-MM-DD', 400);
  if (desde > hasta)
    throw new AppError('fechaDesde debe ser anterior a fechaHasta', 400);

  // Máximo 90 días por consulta
  const dias = (hasta - desde) / (1000 * 60 * 60 * 24);
  if (dias > 90)
    throw new AppError('El rango máximo de consulta es 90 días', 400);

  const data = await repo.resumenFinanciero({ fechaDesde, fechaHasta });

  // Totales agregados
  const totales = data.reduce((acc, row) => ({
    total_vehiculos:      acc.total_vehiculos      + Number(row.total_vehiculos),
    ingresos_brutos:      acc.ingresos_brutos      + Number(row.ingresos_brutos),
    total_descuentos:     acc.total_descuentos     + Number(row.total_descuentos),
    ingresos_netos:       acc.ingresos_netos       + Number(row.ingresos_netos),
    con_descuento:        acc.con_descuento        + Number(row.con_descuento),
  }), { total_vehiculos: 0, ingresos_brutos: 0, total_descuentos: 0, ingresos_netos: 0, con_descuento: 0 });

  return { detalle: data, totales };
}

async function getOcupacionPorHora(fecha) {
  const f = fecha || new Date().toISOString().slice(0, 10);
  return repo.ocupacionPorHora({ fecha: f });
}

async function getKpisHoy()                     { return repo.kpisHoy(); }
async function getAlertas(horasUmbral)          { return repo.alertasTiempo(horasUmbral || 12); }
async function getPlacasFrecuentes(limite)      { return repo.placasFrecuentes(limite || 10); }

module.exports = { getResumenFinanciero, getOcupacionPorHora, getKpisHoy, getAlertas, getPlacasFrecuentes };
