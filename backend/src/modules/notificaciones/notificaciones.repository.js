// src/modules/notificaciones/notificaciones.repository.js
const { pool } = require('../../config/db');

// ─── SUSCRIPCIONES PUSH ───────────────────────────────────────────────────────
async function guardarSuscripcionPush(usuarioId, endpoint, keysP256dh, keysAuth) {
  // Guardar o actualizar si el endpoint ya existe (por si cambia el usuario o claves)
  const [result] = await pool.execute(
    `INSERT INTO suscripciones_push (usuario_id, endpoint, keys_p256dh, keys_auth)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE 
       usuario_id = VALUES(usuario_id),
       keys_p256dh = VALUES(keys_p256dh),
       keys_auth = VALUES(keys_auth)`,
    [usuarioId, endpoint, keysP256dh, keysAuth]
  );
  return result;
}

async function obtenerSuscripcionesPush(usuarioId) {
  const [rows] = await pool.execute(
    `SELECT endpoint, keys_p256dh, keys_auth 
     FROM suscripciones_push 
     WHERE usuario_id = ?`,
    [usuarioId]
  );
  return rows;
}

async function eliminarSuscripcionPush(endpoint) {
  await pool.execute(
    `DELETE FROM suscripciones_push WHERE endpoint = ?`,
    [endpoint]
  );
}

// ─── PREFERENCIAS ─────────────────────────────────────────────────────────────
async function obtenerPreferencias(usuarioId) {
  const [rows] = await pool.execute(
    `SELECT canal_telegram, canal_push, chat_id_telegram 
     FROM preferencias_notificacion 
     WHERE usuario_id = ?`,
    [usuarioId]
  );
  return rows[0] || null;
}

async function actualizarPreferencias(usuarioId, canalTelegram, canalPush, chatIdTelegram) {
  await pool.execute(
    `INSERT INTO preferencias_notificacion (usuario_id, canal_telegram, canal_push, chat_id_telegram)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       canal_telegram = VALUES(canal_telegram),
       canal_push = VALUES(canal_push),
       chat_id_telegram = VALUES(chat_id_telegram)`,
    [usuarioId, canalTelegram ? 1 : 0, canalPush ? 1 : 0, chatIdTelegram]
  );
}

// ─── CONFIGURACIÓN DEL SISTEMA ────────────────────────────────────────────────
async function obtenerConfiguracion(clave) {
  const [rows] = await pool.execute(
    `SELECT valor FROM config_sistema WHERE clave = ?`,
    [clave]
  );
  return rows[0] ? rows[0].valor : null;
}

// ─── CONSULTAS PARA NOTIFICACIONES (CRON Y EVENTOS) ───────────────────────────
async function obtenerOperadores() {
  const [rows] = await pool.execute(
    `SELECT id FROM usuarios WHERE activo = 1`
  );
  // Notificamos a todos los usuarios activos (operadores y admins)
  return rows;
}

async function obtenerRegistrosPermanenciaLarga(horas) {
  const [rows] = await pool.execute(
    `SELECT r.id, r.placa, r.hora_entrada, e.codigo AS espacio_codigo
     FROM registros r
     JOIN espacios e ON e.id = r.espacio_id
     WHERE r.estado = 'ABIERTO' 
       AND r.hora_entrada <= DATE_SUB(NOW(), INTERVAL ? HOUR)`,
    [horas]
  );
  return rows;
}

async function obtenerReservasPorExpirar() {
  // Expiración es hora_inicio + 15 min. 
  // 15 min antes de expirar = hora_inicio.
  // Buscamos reservas cuya hora_inicio esté en los próximos 5 minutos.
  const [rows] = await pool.execute(
    `SELECT rv.id, rv.placa, rv.codigo_reserva, rv.usuario_id, rv.hora_inicio
     FROM reservas rv
     WHERE rv.estado IN ('PENDIENTE', 'CONFIRMADA')
       AND rv.fecha_reserva = CURDATE()
       AND rv.hora_inicio BETWEEN TIME(NOW()) AND ADDTIME(TIME(NOW()), '00:05:00')`
  );
  return rows;
}

module.exports = {
  guardarSuscripcionPush,
  obtenerSuscripcionesPush,
  eliminarSuscripcionPush,
  obtenerPreferencias,
  actualizarPreferencias,
  obtenerConfiguracion,
  obtenerOperadores,
  obtenerRegistrosPermanenciaLarga,
  obtenerReservasPorExpirar
};
