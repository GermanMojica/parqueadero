// src/modules/tarifas/tarifas.repository.js
const { pool } = require('../../config/db');

async function findAll(sedeId) {
  const [rows] = await pool.execute(
    `SELECT t.id, tv.nombre AS tipo_vehiculo, tv.id AS tipo_vehiculo_id,
            t.precio_hora, t.fraccion_minutos, t.vigente_desde, t.activo, t.created_at
     FROM tarifas t
     JOIN tipos_vehiculo tv ON tv.id = t.tipo_vehiculo_id
     WHERE t.sede_id = ?
     ORDER BY tv.nombre, t.vigente_desde DESC`,
    [sedeId]
  );
  return rows;
}

// Tarifa vigente en este momento para un tipo de vehículo
async function findVigentePorTipo(tipoVehiculoId, sedeId) {
  const [rows] = await pool.execute(
    `SELECT id, tipo_vehiculo_id, precio_hora, fraccion_minutos, vigente_desde
     FROM tarifas
     WHERE tipo_vehiculo_id = ?
       AND sede_id = ?
       AND activo = 1
       AND vigente_desde <= NOW()
     ORDER BY vigente_desde DESC
     LIMIT 1`,
    [tipoVehiculoId, sedeId],
  );
  return rows[0] || null;
}

async function create({ sedeId, tipoVehiculoId, precioHora, fraccionMinutos, vigenteDesde }) {
  const [result] = await pool.execute(
    'INSERT INTO tarifas (sede_id, tipo_vehiculo_id, precio_hora, fraccion_minutos, vigente_desde) VALUES (?, ?, ?, ?, ?)',
    [sedeId, tipoVehiculoId, precioHora, fraccionMinutos, vigenteDesde || new Date()],
  );
  return result.insertId;
}

async function deactivate(id, sedeId) {
  await pool.execute('UPDATE tarifas SET activo = 0 WHERE id = ? AND sede_id = ?', [id, sedeId]);
}

module.exports = { findAll, findVigentePorTipo, create, deactivate };
