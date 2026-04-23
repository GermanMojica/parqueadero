// src/modules/tarifas/tarifas.repository.js
const { pool } = require('../../config/db');

async function findAll() {
  const [rows] = await pool.execute(
    `SELECT t.id, tv.nombre AS tipo_vehiculo, tv.id AS tipo_vehiculo_id,
            t.precio_hora, t.fraccion_minutos, t.vigente_desde, t.activo, t.created_at
     FROM tarifas t
     JOIN tipos_vehiculo tv ON tv.id = t.tipo_vehiculo_id
     ORDER BY tv.nombre, t.vigente_desde DESC`,
  );
  return rows;
}

// Tarifa vigente en este momento para un tipo de vehículo
async function findVigentePorTipo(tipoVehiculoId) {
  const [rows] = await pool.execute(
    `SELECT id, tipo_vehiculo_id, precio_hora, fraccion_minutos, vigente_desde
     FROM tarifas
     WHERE tipo_vehiculo_id = ?
       AND activo = 1
       AND vigente_desde <= NOW()
     ORDER BY vigente_desde DESC
     LIMIT 1`,
    [tipoVehiculoId],
  );
  return rows[0] || null;
}

async function create({ tipoVehiculoId, precioHora, fraccionMinutos, vigenteDesdе }) {
  const [result] = await pool.execute(
    'INSERT INTO tarifas (tipo_vehiculo_id, precio_hora, fraccion_minutos, vigente_desde) VALUES (?, ?, ?, ?)',
    [tipoVehiculoId, precioHora, fraccionMinutos, vigenteDesdе || new Date()],
  );
  return result.insertId;
}

async function deactivate(id) {
  await pool.execute('UPDATE tarifas SET activo = 0 WHERE id = ?', [id]);
}

module.exports = { findAll, findVigentePorTipo, create, deactivate };
