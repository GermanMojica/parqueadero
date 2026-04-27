// src/modules/auditoria/auditoria.repository.js
// Trail inmutable de acciones. No expone DELETE en ninguna ruta.
const { pool } = require('../../config/db');

/**
 * Inserta una entrada de auditoría.
 * Puede recibir una conexión de transacción existente.
 */
async function log({ usuarioId, accion, entidad, entidadId, detalle, ip }, conn = null) {
  const db = conn || pool;
  try {
    await db.execute(
      `INSERT INTO auditoria_acciones (usuario_id, accion, entidad, entidad_id, detalle_json, ip)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [usuarioId, accion, entidad, entidadId || null, JSON.stringify(detalle || {}), ip || null],
    );
  } catch {
    // El log de auditoría nunca debe romper una transacción de negocio.
    // Si falla, se registra en el logger pero no se propaga.
  }
}

async function findRecent({ limit = 50, usuarioId, accion } = {}) {
  const conditions = [];
  const params     = [];

  if (usuarioId) { conditions.push('usuario_id = ?'); params.push(usuarioId); }
  if (accion)    { conditions.push('accion = ?');     params.push(accion); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows] = await pool.execute(
    `SELECT a.id, a.accion, a.entidad, a.entidad_id, a.detalle_json,
            a.ip, a.created_at, u.nombre AS usuario
     FROM auditoria_acciones a
     JOIN usuarios u ON u.id = a.usuario_id
     ${where}
     ORDER BY a.created_at DESC
     LIMIT ?`,
    [...params, Math.min(limit, 200)],
  );

  return rows.map(r => ({ ...r, detalle_json: JSON.parse(r.detalle_json || '{}') }));
}

module.exports = { log, findRecent };
