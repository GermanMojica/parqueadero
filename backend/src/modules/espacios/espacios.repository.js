// src/modules/espacios/espacios.repository.js
const { pool } = require('../../config/db');

async function findAll(conn = null) {
  const db = conn || pool;
  const [rows] = await db.execute(
    `SELECT e.id, e.codigo, e.estado, tv.nombre AS tipo_vehiculo, tv.id AS tipo_vehiculo_id
     FROM espacios e
     JOIN tipos_vehiculo tv ON tv.id = e.tipo_vehiculo_id
     ORDER BY tv.nombre, e.codigo`,
  );
  return rows;
}

async function findDisponibleByTipo(tipoVehiculoId, conn) {
  // SELECT FOR UPDATE: bloquea la fila durante la transacción
  // Previene la race condition de cupos simultáneos
  const db = conn || pool;
  const [rows] = await db.execute(
    `SELECT id, codigo FROM espacios
     WHERE tipo_vehiculo_id = ? AND estado = 'DISPONIBLE'
     LIMIT 1
     FOR UPDATE`,
    [tipoVehiculoId],
  );
  return rows[0] || null;
}

async function countDisponibles() {
  const [rows] = await pool.execute(
    `SELECT tv.id, tv.nombre AS tipo_vehiculo, tv.capacidad_total,
            SUM(CASE WHEN e.estado = 'DISPONIBLE'    THEN 1 ELSE 0 END) AS disponibles,
            SUM(CASE WHEN e.estado = 'OCUPADO'       THEN 1 ELSE 0 END) AS ocupados,
            SUM(CASE WHEN e.estado = 'MANTENIMIENTO' THEN 1 ELSE 0 END) AS en_mantenimiento
     FROM tipos_vehiculo tv
     LEFT JOIN espacios e ON e.tipo_vehiculo_id = tv.id
     GROUP BY tv.id, tv.nombre, tv.capacidad_total`,
  );
  return rows;
}

async function setEstado(id, estado, conn = null) {
  const db = conn || pool;
  await db.execute('UPDATE espacios SET estado = ? WHERE id = ?', [estado, id]);
}

module.exports = { findAll, findDisponibleByTipo, countDisponibles, setEstado };
