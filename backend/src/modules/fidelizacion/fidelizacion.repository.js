const { pool } = require('../../config/db');

async function findAllReglas() {
  const [rows] = await pool.execute('SELECT * FROM reglas_fidelizacion WHERE activo = TRUE ORDER BY puntos_minimo_canje ASC');
  return rows;
}

async function findTarjetaByPlaca(placa) {
  const [rows] = await pool.execute('SELECT * FROM tarjetas_fidelizacion WHERE placa = ? AND activo = TRUE', [placa]);
  return rows[0] || null;
}

async function findTarjetaByCodigo(codigo) {
  const [rows] = await pool.execute('SELECT * FROM tarjetas_fidelizacion WHERE codigo = ? AND activo = TRUE', [codigo]);
  return rows[0] || null;
}

async function createTarjeta(codigo, placa) {
  const [result] = await pool.execute(
    'INSERT INTO tarjetas_fidelizacion (codigo, placa, puntos_acumulados, nivel) VALUES (?, ?, 0, "BRONCE")',
    [codigo, placa]
  );
  return result.insertId;
}

async function updateTarjetaNivelYPuntos(id, puntos, nivel, conn) {
  const connection = conn || pool;
  await connection.execute(
    'UPDATE tarjetas_fidelizacion SET puntos_acumulados = ?, nivel = ? WHERE id = ?',
    [puntos, nivel, id]
  );
}

async function createMovimiento({ tarjetaId, registroId, puntos, tipo, descripcion }, conn) {
  const connection = conn || pool;
  await connection.execute(
    'INSERT INTO movimientos_puntos (tarjeta_id, registro_id, puntos, tipo, descripcion) VALUES (?, ?, ?, ?, ?)',
    [tarjetaId, registroId || null, puntos, tipo, descripcion]
  );
}

async function findTopClientes(limit = 10) {
  const l = parseInt(limit, 10) || 10;
  const [rows] = await pool.execute(
    `SELECT * FROM tarjetas_fidelizacion WHERE activo = TRUE ORDER BY puntos_acumulados DESC LIMIT ${l}`
  );
  return rows;
}

async function findAllTarjetas() {
  const [rows] = await pool.execute('SELECT * FROM tarjetas_fidelizacion ORDER BY created_at DESC');
  return rows;
}

module.exports = {
  findAllReglas,
  findTarjetaByPlaca,
  findTarjetaByCodigo,
  createTarjeta,
  updateTarjetaNivelYPuntos,
  createMovimiento,
  findTopClientes,
  findAllTarjetas
};
