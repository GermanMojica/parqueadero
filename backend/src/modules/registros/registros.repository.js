// src/modules/registros/registros.repository.js
const { pool } = require('../../config/db');

const SELECT_REGISTRO = `
  SELECT
    r.id, r.placa, r.hora_entrada, r.hora_salida,
    r.minutos_total, r.tarifa_valor_aplicado, r.total_cobrado,
    r.estado, r.observaciones, r.created_at,
    e.id  AS espacio_id,  e.codigo AS espacio_codigo,
    tv.id AS tipo_vehiculo_id, tv.nombre AS tipo_vehiculo,
    ue.id AS operador_entrada_id, ue.nombre AS operador_entrada,
    us.id AS operador_salida_id,  us.nombre AS operador_salida
  FROM registros r
  JOIN espacios       e  ON e.id  = r.espacio_id
  JOIN tipos_vehiculo tv ON tv.id = r.tipo_vehiculo_id
  JOIN usuarios       ue ON ue.id = r.usuario_entrada_id
  LEFT JOIN usuarios  us ON us.id = r.usuario_salida_id
`;

// ─── BUSCAR POR ID ────────────────────────────────────────────────────────────
async function findById(id) {
  const [rows] = await pool.execute(
    `${SELECT_REGISTRO} WHERE r.id = ?`,
    [id]
  );
  return rows[0] || null;
}

// ─── BUSCAR REGISTRO ACTIVO POR PLACA ─────────────────────────────────────────
async function findAbiertoPorPlaca(placa) {
  const [rows] = await pool.execute(
    `${SELECT_REGISTRO} WHERE r.placa = ? AND r.estado = 'ABIERTO' LIMIT 1`,
    [placa.toUpperCase()]
  );
  return rows[0] || null;
}

// ─── HISTORIAL (CORREGIDO) ────────────────────────────────────────────────────
async function findAll({ estado, placa, tipoVehiculoId, fechaDesde, fechaHasta, limit, offset }) {
  const conditions = [];
  const params     = [];

  if (estado) {
    conditions.push("r.estado = ?");
    params.push(estado);
  }

  if (placa) {
    conditions.push("r.placa LIKE ?");
    params.push(`%${placa.toUpperCase()}%`);
  }

  if (tipoVehiculoId) {
    conditions.push("r.tipo_vehiculo_id = ?");
    params.push(tipoVehiculoId);
  }

  if (fechaDesde) {
    conditions.push("r.hora_entrada >= ?");
    params.push(fechaDesde);
  }

  if (fechaHasta) {
    conditions.push("r.hora_entrada <= ?");
    params.push(fechaHasta);
  }

  const where = conditions.length
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  // ✅ FIX PRINCIPAL AQUÍ (LIMIT y OFFSET como números, NO placeholders)
  const [rows] = await pool.execute(
    `${SELECT_REGISTRO}
     ${where}
     ORDER BY r.hora_entrada DESC
     LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
    params
  );

  // Conteo total
  const [[{ total }]] = await pool.execute(
    `SELECT COUNT(*) AS total FROM registros r ${where}`,
    params
  );

  return {
    data: rows,
    total,
    limit,
    offset
  };
}

// ─── CREAR ENTRADA ────────────────────────────────────────────────────────────
async function createEntrada({ espacioId, placa, tipoVehiculoId, usuarioEntradaId }, conn) {
  const [result] = await conn.execute(
    `INSERT INTO registros (espacio_id, placa, tipo_vehiculo_id, usuario_entrada_id, estado)
     VALUES (?, ?, ?, ?, 'ABIERTO')`,
    [espacioId, placa.toUpperCase(), tipoVehiculoId, usuarioEntradaId]
  );

  return result.insertId;
}

// ─── CERRAR REGISTRO ──────────────────────────────────────────────────────────
async function cerrarRegistro(
  { id, horaSalida, minutosTotal, tarifaId, tarifaValorAplicado, totalCobrado, usuarioSalidaId },
  conn
) {
  await conn.execute(
    `UPDATE registros
     SET hora_salida = ?,
         minutos_total = ?,
         tarifa_id = ?,
         tarifa_valor_aplicado = ?,
         total_cobrado = ?,
         usuario_salida_id = ?,
         estado = 'CERRADO'
     WHERE id = ?`,
    [
      horaSalida,
      minutosTotal,
      tarifaId,
      tarifaValorAplicado,
      totalCobrado,
      usuarioSalidaId,
      id
    ]
  );
}

// ─── ANULAR REGISTRO ──────────────────────────────────────────────────────────
async function anular(id, observaciones) {
  await pool.execute(
    `UPDATE registros
     SET estado = 'ANULADO', observaciones = ?
     WHERE id = ?`,
    [observaciones, id]
  );
}

module.exports = {
  findById,
  findAbiertoPorPlaca,
  findAll,
  createEntrada,
  cerrarRegistro,
  anular
};