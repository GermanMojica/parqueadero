// src/modules/reportes/reportes.repository.js
const { pool } = require('../../config/db');

/** Reporte financiero por rango de fechas y tipo de vehículo */
async function resumenFinanciero({ fechaDesde, fechaHasta }) {
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
       AND DATE(r.hora_salida) BETWEEN ? AND ?
     GROUP BY DATE(r.hora_salida), tv.id, tv.nombre
     ORDER BY fecha DESC, tipo_vehiculo`,
    [fechaDesde, fechaHasta],
  );
  return rows;
}

/** Ocupación por hora del día — útil para detectar picos */
async function ocupacionPorHora({ fecha }) {
  const [rows] = await pool.execute(
    `SELECT
       HOUR(r.hora_entrada)   AS hora,
       COUNT(r.id)            AS entradas,
       tv.nombre              AS tipo_vehiculo
     FROM registros r
     JOIN tipos_vehiculo tv ON tv.id = r.tipo_vehiculo_id
     WHERE DATE(r.hora_entrada) = ?
     GROUP BY HOUR(r.hora_entrada), tv.id, tv.nombre
     ORDER BY hora ASC`,
    [fecha],
  );
  return rows;
}

/** KPIs rápidos del día actual */
async function kpisHoy() {
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
     FROM registros r`,
  );
  return kpis;
}

/** Alertas: vehículos con permanencia excesiva */
async function alertasTiempo(horasUmbral = 12) {
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
       AND TIMESTAMPDIFF(HOUR, r.hora_entrada, NOW()) >= ?
     ORDER BY horas_dentro DESC`,
    [horasUmbral],
  );
  return rows;
}

/** Top 10 placas más frecuentes */
async function placasFrecuentes(limite = 10) {
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
     WHERE r.estado = 'CERRADO'
     GROUP BY r.placa, r.tipo_vehiculo_id, tv.nombre
     ORDER BY total_visitas DESC
     LIMIT ?`,
    [limite],
  );
  return rows;
}

/** Ingresos y cantidad de vehículos por día */
async function porDia({ desde, hasta }) {
  const [rows] = await pool.execute(
    `SELECT 
       DATE(hora_entrada) as fecha,
       COUNT(*) as cantidad,
       SUM(total_cobrado) as ingresos
     FROM registros 
     WHERE DATE(hora_entrada) BETWEEN ? AND ?
     GROUP BY DATE(hora_entrada)
     ORDER BY fecha ASC`,
    [desde, hasta]
  );
  return rows;
}

/** Horas pico (promedio histórico) */
async function horasPico() {
  const [rows] = await pool.execute(
    `SELECT 
       HOUR(hora_entrada) as hora,
       COUNT(*) as cantidad
     FROM registros
     GROUP BY HOUR(hora_entrada)
     ORDER BY hora ASC`
  );
  return rows;
}

/** Distribución por tipo de vehículo */
async function porTipo() {
  const [rows] = await pool.execute(
    `SELECT 
       tv.nombre as tipo,
       COUNT(r.id) as cantidad,
       SUM(r.total_cobrado) as ingresos
     FROM registros r
     JOIN tipos_vehiculo tv ON tv.id = r.tipo_vehiculo_id
     GROUP BY tv.id, tv.nombre`
  );
  return rows;
}

/** Resumen total del periodo */
async function resumenPeriodo({ desde, hasta }) {
  const [[res]] = await pool.execute(
    `SELECT 
       COUNT(*) as total_vehiculos,
       COALESCE(SUM(total_cobrado), 0) as total_ingresos,
       COALESCE(AVG(minutos_total), 0) as tiempo_promedio,
       COALESCE(SUM(total_cobrado) / NULLIF(COUNT(*), 0), 0) as ingreso_promedio
     FROM registros
     WHERE DATE(hora_entrada) BETWEEN ? AND ?`,
    [desde, hasta]
  );
  return res;
}

module.exports = { 
  resumenFinanciero, ocupacionPorHora, kpisHoy, alertasTiempo, placasFrecuentes,
  porDia, horasPico, porTipo, resumenPeriodo
};
