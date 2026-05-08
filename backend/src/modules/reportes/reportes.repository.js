// src/modules/reportes/reportes.repository.js
const { pool } = require('../../config/db');
const { buildFilters, buildCursorPagination, buildSort } = require('../../utils/query.builder');

/**
 * Listado general paginado por cursor (para reportes detallados y exportación)
 */
async function obtenerListadoRegistros({ sedeId, cursor, limit, fechaDesde, fechaHasta }) {
  const { sql: filterSql, params: filterParams } = buildFilters({
    sedeId, cursor, fechaDesde, fechaHasta
  }, {
    sedeId: 'r.sede_id',
    cursor: 'r.id',
    fechaDesde: 'DATE(r.hora_entrada)',
    fechaHasta: 'DATE(r.hora_entrada)'
  });

  const { sql: limitSql, limit: parsedLimit, queryLimit } = buildCursorPagination(limit);

  // WHERE requiere que sede_id se maneje correctamente, por eso el QueryBuilder.
  const query = `
    SELECT
      r.id, r.placa, r.hora_entrada, r.hora_salida, r.estado, r.total_cobrado,
      tv.nombre AS tipo_vehiculo, e.codigo AS espacio
    FROM registros r
    JOIN tipos_vehiculo tv ON tv.id = r.tipo_vehiculo_id
    JOIN espacios e ON e.id = r.espacio_id
    ${filterSql}
    ORDER BY r.id DESC
    ${limitSql}
  `;

  const [rows] = await pool.execute(query, filterParams);
  
  const hasMore = rows.length === queryLimit;
  if (hasMore) rows.pop(); // Remove the extra row
  
  const nextCursor = rows.length > 0 ? rows[rows.length - 1].id : null;
  
  return { data: rows, pagination: { limit: parsedLimit, nextCursor, hasMore } };
}

/** Reporte financiero por rango de fechas y tipo de vehículo */
async function resumenFinanciero({ sedeId, fechaDesde, fechaHasta }) {
  const sId = parseInt(sedeId, 10) || 0;
  try {
    const [rows] = await pool.execute(
      `SELECT
         DATE(r.hora_salida)                                AS fecha,
         tv.nombre                                          AS tipo_vehiculo,
         COUNT(r.id)                                        AS total_vehiculos,
         SUM(r.total_cobrado)                               AS ingresos_brutos,
         COALESCE(SUM(da.valor_descuento), 0)              AS total_descuentos,
         SUM(r.total_cobrado) - COALESCE(SUM(da.valor_descuento),0) AS ingresos_netos,
         ROUND(AVG(r.minutos_total), 0)                    AS minutos_promedio,
         MIN(r.total_cobrado)                               AS cobro_minimo,
         MAX(r.total_cobrado)                               AS cobro_maximo,
         COUNT(da.id)                                       AS con_descuento
       FROM registros r
       JOIN tipos_vehiculo tv ON tv.id = r.tipo_vehiculo_id
       LEFT JOIN descuentos_aplicados da ON da.registro_id = r.id
       WHERE r.estado = 'CERRADO'
         AND r.sede_id = ?
         AND DATE(r.hora_salida) BETWEEN ? AND ?
       GROUP BY DATE(r.hora_salida), tv.id, tv.nombre
       ORDER BY fecha DESC, tipo_vehiculo`,
      [sId, fechaDesde, fechaHasta],
    );
    return rows;
  } catch (error) {
    console.error('❌ Error en resumenFinanciero:', error.message, { sId, fechaDesde, fechaHasta });
    throw error;
  }
}

/** Ocupación por hora del día — útil para detectar picos */
async function ocupacionPorHora({ sedeId, fechaDesde, fechaHasta }) {
  const sId = parseInt(sedeId, 10) || 0;
  try {
    const [rows] = await pool.execute(
      `SELECT
         HOUR(r.hora_entrada)   AS hora,
         COUNT(r.id)            AS entradas,
         tv.nombre              AS tipo_vehiculo
       FROM registros r
       JOIN tipos_vehiculo tv ON tv.id = r.tipo_vehiculo_id
       WHERE r.sede_id = ? AND DATE(r.hora_entrada) BETWEEN ? AND ?
       GROUP BY HOUR(r.hora_entrada), tv.id, tv.nombre
       ORDER BY hora ASC`,
      [sId, fechaDesde, fechaHasta],
    );
    return rows;
  } catch (error) {
    console.error('❌ Error en ocupacionPorHora:', error.message, { sId, fechaDesde, fechaHasta });
    throw error;
  }
}

/** KPIs rápidos del día actual */
async function kpisHoy({ sedeId }) {
  const sId = parseInt(sedeId, 10) || 0;
  try {
    const [[kpis]] = await pool.execute(
      `SELECT
         COUNT(CASE WHEN r.estado = 'ABIERTO'  THEN 1 END) AS vehiculos_dentro,
         COUNT(CASE WHEN r.estado = 'CERRADO'
                     AND DATE(r.hora_salida) = CURDATE() THEN 1 END) AS vehiculos_atendidos_hoy,
         COALESCE(SUM(CASE WHEN r.estado = 'CERRADO'
                            AND DATE(r.hora_salida) = CURDATE()
                            THEN r.total_cobrado END), 0)  AS ingresos_hoy,
         COALESCE(AVG(CASE WHEN r.estado = 'CERRADO'
                            AND DATE(r.hora_salida) = CURDATE()
                            THEN r.minutos_total END), 0) AS minutos_promedio_hoy
       FROM registros r
       WHERE r.sede_id = ?`,
       [sId]
    );
    return kpis;
  } catch (error) {
    console.error('❌ Error en kpisHoy:', error.message, { sId });
    throw error;
  }
}

/** Alertas: vehículos con permanencia excesiva */
async function alertasTiempo({ sedeId, horasUmbral = 12 }) {
  const sId = parseInt(sedeId, 10) || 0;
  const umbral = parseInt(horasUmbral, 10) || 12;
  try {
    const [rows] = await pool.execute(
      `SELECT
         r.id AS registro_id, r.placa,
         tv.nombre AS tipo_vehiculo, e.codigo AS espacio,
         r.hora_entrada,
         TIMESTAMPDIFF(HOUR, r.hora_entrada, NOW()) AS horas_dentro,
         u.nombre AS operador_entrada
       FROM registros r
       JOIN espacios e       ON e.id  = r.espacio_id
       JOIN tipos_vehiculo tv ON tv.id = r.tipo_vehiculo_id
       JOIN usuarios u        ON u.id  = r.usuario_entrada_id
       WHERE r.estado = 'ABIERTO'
         AND r.sede_id = ?
         AND TIMESTAMPDIFF(HOUR, r.hora_entrada, NOW()) >= ?
       ORDER BY horas_dentro DESC`,
      [sId, umbral],
    );
    return rows;
  } catch (error) {
    console.error('❌ Error en alertasTiempo:', error.message, { sId, umbral });
    throw error;
  }
}

/** Top 10 placas más frecuentes */
async function placasFrecuentes({ sedeId, limite = 10 }) {
  const sId = parseInt(sedeId, 10) || 0;
  const l = parseInt(limite, 10) || 10;
  try {
    const [rows] = await pool.execute(
      `SELECT
         placa,
         COUNT(*) AS total_visitas,
         tv.nombre AS tipo_vehiculo,
         MAX(r.hora_entrada) AS ultima_visita,
         ROUND(AVG(r.minutos_total), 0) AS minutos_promedio,
         SUM(r.total_cobrado) AS total_cobrado
       FROM registros r
       JOIN tipos_vehiculo tv ON tv.id = r.tipo_vehiculo_id
       WHERE r.estado = 'CERRADO' AND r.sede_id = ?
       GROUP BY r.placa, r.tipo_vehiculo_id, tv.nombre
       ORDER BY total_visitas DESC
       LIMIT ${l}`,
      [sId],
    );
    return rows;
  } catch (error) {
    console.error('❌ Error en placasFrecuentes:', error.message, { sId, l });
    throw error;
  }
}

module.exports = { 
  obtenerListadoRegistros,
  resumenFinanciero, ocupacionPorHora, kpisHoy, alertasTiempo, placasFrecuentes
};
