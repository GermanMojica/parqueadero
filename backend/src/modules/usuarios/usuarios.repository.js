// src/modules/usuarios/usuarios.repository.js
const { pool } = require('../../config/db');

const CAMPOS_PUBLICOS = 'u.id, u.nombre, u.email, u.activo, u.created_at, r.nombre AS rol';

async function findAll() {
  const [rows] = await pool.execute(
    `SELECT ${CAMPOS_PUBLICOS} FROM usuarios u JOIN roles r ON r.id = u.rol_id ORDER BY u.id`,
  );
  return rows;
}

async function findById(id) {
  const [rows] = await pool.execute(
    `SELECT ${CAMPOS_PUBLICOS} FROM usuarios u JOIN roles r ON r.id = u.rol_id WHERE u.id = ?`,
    [id],
  );
  return rows[0] || null;
}

async function findByEmail(email) {
  const [rows] = await pool.execute(
    'SELECT id, email FROM usuarios WHERE email = ? LIMIT 1',
    [email],
  );
  return rows[0] || null;
}

async function create({ nombre, email, passwordHash, rolId }) {
  const [result] = await pool.execute(
    'INSERT INTO usuarios (nombre, email, password_hash, rol_id) VALUES (?, ?, ?, ?)',
    [nombre, email, passwordHash, rolId],
  );
  return findById(result.insertId);
}

async function update(id, { nombre, activo, rolId }) {
  await pool.execute(
    'UPDATE usuarios SET nombre = ?, activo = ?, rol_id = ? WHERE id = ?',
    [nombre, activo, rolId, id],
  );
  return findById(id);
}

async function updatePassword(id, passwordHash) {
  await pool.execute('UPDATE usuarios SET password_hash = ? WHERE id = ?', [passwordHash, id]);
}

module.exports = { findAll, findById, findByEmail, create, update, updatePassword };
