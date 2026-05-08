// src/modules/reservas/reservas.repository.js
const { pool } = require('../../config/db');

const SELECT_RESERVA = `
  SELECT
    rv.id, rv.sede_id, rv.espacio_id, rv.placa, rv.tipo_vehiculo_id,
    rv.usuario_id, rv.fecha_reserva, rv.hora_inicio, rv.hora_fin_estimada,
    rv.estado, rv.codigo_reserva, rv.created_at,
    e.codigo  AS espacio_codigo,
    tv.nombre AS tipo_vehiculo,
    u.nombre  AS usuario_nombre
  FROM reservas rv
  JOIN espacios       e  ON e.id  = rv.espacio_id
  JOIN tipos_vehiculo tv ON tv.id = rv.tipo_vehiculo_id
  JOIN usuarios       u  ON u.id  = rv.usuario_id
`;

// ─── BUSCAR POR ID ────────────────────────────────────────────────────────────
async function findById(id, sedeId) {
  const [rows] = await pool.execute(
    `${SELECT_RESERVA} WHERE rv.id = ? AND rv.sede_id = ?`,
    [id, sedeId],
  );
  return rows[0] || null;
}

// ─── BUSCAR POR CÓDIGO ────────────────────────────────────────────────────────
async function findByCodigo(codigo, sedeId) {
  const [rows] = await pool.execute(
    `${SELECT_RESERVA} WHERE rv.codigo_reserva = ? AND rv.sede_id = ?`,
    [codigo.toUpperCase(), sedeId],
  );
  return rows[0] || null;
}

// ─── VERIFICAR CONFLICTOS DE FRANJA HORARIA ───────────────────────────────────
// Un espacio está ocupado si tiene una reserva activa cuya franja se solapa
async function findConflicto(sedeId, espacioId, fechaReserva, horaInicio, horaFinEstimada, excludeId = null) {
  let sql = `
    SELECT rv.id FROM reservas rv
    WHERE rv.sede_id = ?
      AND rv.espacio_id = ?
      AND rv.fecha_reserva = ?
      AND rv.estado IN ('PENDIENTE', 'CONFIRMADA')
      AND rv.hora_inicio < ?
      AND rv.hora_fin_estimada > ?
  `;
  const params = [sedeId, espacioId, fechaReserva, horaFinEstimada, horaInicio];

  if (excludeId) {
    sql += ' AND rv.id != ?';
    params.push(excludeId);
  }

  const [rows] = await pool.execute(sql, params);
  return rows[0] || null;
}

// ─── ENCONTRAR ESPACIO DISPONIBLE PARA RESERVA ───────────────────────────────
// Busca un espacio del tipo indicado que NO tenga reserva activa en esa franja
async function findEspacioDisponibleParaReserva(sedeId, tipoVehiculoId, fechaReserva, horaInicio, horaFinEstimada, conn) {
  const db = conn || pool;
  const [rows] = await db.execute(
    `SELECT e.id, e.codigo
     FROM espacios e
     WHERE e.sede_id = ?
       AND e.tipo_vehiculo_id = ?
       AND e.estado IN ('DISPONIBLE', 'OCUPADO')
       AND e.id NOT IN (
         SELECT rv.espacio_id FROM reservas rv
         WHERE rv.sede_id = ?
           AND rv.fecha_reserva = ?
           AND rv.estado IN ('PENDIENTE', 'CONFIRMADA')
           AND rv.hora_inicio < ?
           AND rv.hora_fin_estimada > ?
       )
     ORDER BY e.estado = 'DISPONIBLE' DESC, e.codigo ASC
     LIMIT 1`,
    [sedeId, tipoVehiculoId, sedeId, fechaReserva, horaFinEstimada, horaInicio],
  );
  return rows[0] || null;
}

// ─── CREAR RESERVA ────────────────────────────────────────────────────────────
async function create(data, conn) {
  const db = conn || pool;
  const [result] = await db.execute(
    `INSERT INTO reservas
       (sede_id, espacio_id, placa, tipo_vehiculo_id, usuario_id, fecha_reserva,
        hora_inicio, hora_fin_estimada, estado, codigo_reserva)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDIENTE', ?)`,
    [
      data.sedeId, data.espacioId, data.placa.toUpperCase(), data.tipoVehiculoId,
      data.usuarioId, data.fechaReserva,
      data.horaInicio, data.horaFinEstimada, data.codigoReserva,
    ],
  );
  return result.insertId;
}

// ─── CAMBIAR ESTADO ───────────────────────────────────────────────────────────
async function updateEstado(id, estado, conn = null) {
  const db = conn || pool;
  await db.execute(
    'UPDATE reservas SET estado = ? WHERE id = ?',
    [estado, id],
  );
}

// ─── LISTAR CON FILTROS ──────────────────────────────────────────────────────
async function findAll({ sedeId, estado, placa, fechaDesde, fechaHasta, limit, offset }) {
  const conditions = [];
  const params     = [];

  if (sedeId) {
    conditions.push('rv.sede_id = ?');
    params.push(sedeId);
  }
  if (estado) {
    conditions.push('rv.estado = ?');
    params.push(estado);
  }
  if (placa) {
    conditions.push('rv.placa LIKE ?');
    params.push(`%${placa.toUpperCase()}%`);
  }
  if (fechaDesde) {
    conditions.push('rv.fecha_reserva >= ?');
    params.push(fechaDesde);
  }
  if (fechaHasta) {
    conditions.push('rv.fecha_reserva <= ?');
    params.push(fechaHasta);
  }

  const where = conditions.length
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  const [rows] = await pool.execute(
    `${SELECT_RESERVA}
     ${where}
     ORDER BY rv.fecha_reserva DESC, rv.hora_inicio DESC
     LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
    params,
  );

  const [[{ total }]] = await pool.execute(
    `SELECT COUNT(*) AS total FROM reservas rv ${where}`,
    params,
  );

  return { data: rows, total, limit, offset };
}

// ─── RESERVAS EXPIRADAS (para el cron) ────────────────────────────────────────
// Reservas cuyo hora_inicio + 15 min ya pasó y siguen PENDIENTE o CONFIRMADA
async function findExpiradas() {
  const [rows] = await pool.execute(
    `SELECT rv.id, rv.espacio_id, rv.placa, rv.codigo_reserva
     FROM reservas rv
     WHERE rv.estado IN ('PENDIENTE', 'CONFIRMADA')
       AND CONCAT(rv.fecha_reserva, ' ', rv.hora_inicio) <= DATE_SUB(NOW(), INTERVAL 15 MINUTE)`,
  );
  return rows;
}

// ─── EXPIRAR MASIVAMENTE ──────────────────────────────────────────────────────
async function expirarMasivo(ids) {
  if (!ids.length) return 0;
  const placeholders = ids.map(() => '?').join(',');
  const [result] = await pool.execute(
    `UPDATE reservas SET estado = 'EXPIRADA' WHERE id IN (${placeholders})`,
    ids,
  );
  return result.affectedRows;
}

module.exports = {
  findById,
  findByCodigo,
  findConflicto,
  findEspacioDisponibleParaReserva,
  create,
  updateEstado,
  findAll,
  findExpiradas,
  expirarMasivo,
};
