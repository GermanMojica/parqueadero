// src/modules/tickets/tickets.repository.js
const { pool } = require('../../config/db');

async function create({ registroId, codigoTicket, tipo, datosJson }, conn = null) {
  const db = conn || pool;
  const [result] = await db.execute(
    'INSERT INTO tickets (registro_id, codigo_ticket, tipo, datos_json) VALUES (?, ?, ?, ?)',
    [registroId, codigoTicket, tipo, JSON.stringify(datosJson)],
  );
  return result.insertId;
}

async function findByRegistro(registroId) {
  const [rows] = await pool.execute(
    'SELECT id, codigo_ticket, tipo, datos_json, generado_at FROM tickets WHERE registro_id = ? ORDER BY generado_at',
    [registroId],
  );
  return rows.map((r) => ({ ...r, datos_json: JSON.parse(r.datos_json) }));
}

async function findByCodigo(codigoTicket) {
  const [rows] = await pool.execute(
    'SELECT id, registro_id, codigo_ticket, tipo, datos_json, generado_at FROM tickets WHERE codigo_ticket = ? LIMIT 1',
    [codigoTicket],
  );
  if (!rows[0]) return null;
  return { ...rows[0], datos_json: JSON.parse(rows[0].datos_json) };
}

module.exports = { create, findByRegistro, findByCodigo };
