// src/modules/usuarios/usuarios.service.js
const bcrypt   = require('bcrypt');
const repo     = require('./usuarios.repository');
const { pool } = require('../../config/db');
const AppError = require('../../utils/AppError');

const SALT_ROUNDS = 12;

async function getAll() {
  return repo.findAll();
}

async function getById(id) {
  const usuario = await repo.findById(id);
  if (!usuario) throw new AppError('Usuario no encontrado', 404);
  return usuario;
}

async function create({ nombre, email, password, rolNombre }) {
  // Verificar email único
  const existente = await repo.findByEmail(email);
  if (existente) throw new AppError('El email ya está registrado', 409);

  // Verificar que el rol exista
  const [roles] = await pool.execute('SELECT id FROM roles WHERE nombre = ?', [rolNombre]);
  if (!roles[0]) throw new AppError(`Rol '${rolNombre}' no existe`, 400);

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  return repo.create({ nombre, email, passwordHash, rolId: roles[0].id });
}

async function update(id, { nombre, activo, rolNombre }) {
  await getById(id); // Valida existencia

  const [roles] = await pool.execute('SELECT id FROM roles WHERE nombre = ?', [rolNombre]);
  if (!roles[0]) throw new AppError(`Rol '${rolNombre}' no existe`, 400);

  return repo.update(id, { nombre, activo, rolId: roles[0].id });
}

async function cambiarPassword(id, { passwordActual, passwordNuevo }) {
  const [rows] = await pool.execute(
    'SELECT password_hash FROM usuarios WHERE id = ? AND activo = 1',
    [id],
  );
  if (!rows[0]) throw new AppError('Usuario no encontrado', 404);

  const ok = await bcrypt.compare(passwordActual, rows[0].password_hash);
  if (!ok) throw new AppError('Contraseña actual incorrecta', 400);

  const nuevoHash = await bcrypt.hash(passwordNuevo, SALT_ROUNDS);
  await repo.updatePassword(id, nuevoHash);
}

module.exports = { getAll, getById, create, update, cambiarPassword };
