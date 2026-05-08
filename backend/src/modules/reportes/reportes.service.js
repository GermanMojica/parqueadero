// src/modules/reportes/reportes.service.js
const repo     = require('./reportes.repository');
const AppError = require('../../utils/AppError');
const redis    = require('../../config/redis');

// Función helper para caché
async function withCache(key, ttl, fetcher) {
  try {
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached);
  } catch (err) { /* ignore cache error */ }

  const data = await fetcher();
  
  try {
    await redis.setex(key, ttl, JSON.stringify(data));
  } catch (err) { /* ignore */ }
  
  return data;
}

async function getListado(params) {
  return repo.obtenerListadoRegistros(params);
}

async function getResumenFinanciero({ sedeId, fechaDesde, fechaHasta }) {
  if (!fechaDesde || !fechaHasta) throw new AppError('Se requieren fechaDesde y fechaHasta (YYYY-MM-DD)', 400);

  const desde = new Date(fechaDesde);
  const hasta = new Date(fechaHasta);
  if (isNaN(desde) || isNaN(hasta) || desde > hasta) throw new AppError('Rango de fecha inválido', 400);

  const data = await repo.resumenFinanciero({ sedeId, fechaDesde, fechaHasta });

  const totales = data.reduce((acc, row) => ({
    total_vehiculos:      acc.total_vehiculos      + Number(row.total_vehiculos),
    ingresos_brutos:      acc.ingresos_brutos      + Number(row.ingresos_brutos),
    total_descuentos:     acc.total_descuentos     + Number(row.total_descuentos),
    ingresos_netos:       acc.ingresos_netos       + Number(row.ingresos_netos),
    con_descuento:        acc.con_descuento        + Number(row.con_descuento),
  }), { total_vehiculos: 0, ingresos_brutos: 0, total_descuentos: 0, ingresos_netos: 0, con_descuento: 0 });

  return { detalle: data, totales };
}

async function getOcupacionPorHora(sedeId, fechaDesde, fechaHasta) {
  const fD = fechaDesde || new Date().toISOString().slice(0, 10);
  const fH = fechaHasta || new Date().toISOString().slice(0, 10);
  const cacheKey = `reporte:${sedeId}:${fD}:${fH}:ocupacion`;
  // Cachear ocupación por 60 segundos
  return withCache(cacheKey, 60, () => repo.ocupacionPorHora({ sedeId, fechaDesde: fD, fechaHasta: fH }));
}

async function getKpisHoy(sedeId) {
  const f = new Date().toISOString().slice(0, 10);
  const cacheKey = `reporte:${sedeId}:${f}:kpishoy`;
  // Cachear KPIs hoy por 60 segundos (1 minuto)
  return withCache(cacheKey, 60, () => repo.kpisHoy({ sedeId }));
}

async function getAlertas(sedeId, horasUmbral)          { return repo.alertasTiempo({ sedeId, horasUmbral: horasUmbral || 12 }); }
async function getPlacasFrecuentes(sedeId, limite)      { return repo.placasFrecuentes({ sedeId, limite: limite || 10 }); }

module.exports = { 
  getListado,
  getResumenFinanciero, getOcupacionPorHora, getKpisHoy, getAlertas, getPlacasFrecuentes
};
