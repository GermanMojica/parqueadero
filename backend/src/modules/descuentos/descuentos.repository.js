// src/modules/descuentos/descuentos.repository.js
const { pool } = require('../../config/db');

async function findTiposActivos() {
  const [rows] = await pool.execute(
    `SELECT id, nombre, descripcion, tipo_calculo, valor, solo_admin
     FROM tipos_descuento WHERE activo = 1 ORDER BY nombre`,
  );
  return rows;
}

async function findTipoById(id) {
  const [rows] = await pool.execute(
    'SELECT * FROM tipos_descuento WHERE id = ? AND activo = 1 LIMIT 1',
    [id],
  );
  return rows[0] || null;
}

async function findAplicadoByRegistro(registroId) {
  const [rows] = await pool.execute(
    `SELECT da.*, td.nombre AS tipo_descuento_nombre, u.nombre AS autorizado_por
     FROM descuentos_aplicados da
     JOIN tipos_descuento td ON td.id = da.tipo_descuento_id
     JOIN usuarios u ON u.id = da.autorizado_por_id
     WHERE da.registro_id = ? LIMIT 1`,
    [registroId],
  );
  return rows[0] || null;
}

async function registrarDescuento(
  { registroId, tipoDescuentoId, autorizadoPorId, totalAntes, valorDescuento, totalDespues, motivo },
  conn,
) {
  const db = conn || pool;
  const [result] = await db.execute(
    `INSERT INTO descuentos_aplicados
       (registro_id, tipo_descuento_id, autorizado_por_id, total_antes, valor_descuento, total_despues, motivo)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [registroId, tipoDescuentoId, autorizadoPorId, totalAntes, valorDescuento, totalDespues, motivo || null],
  );
  return result.insertId;
}

module.exports = { findTiposActivos, findTipoById, findAplicadoByRegistro, registrarDescuento };
