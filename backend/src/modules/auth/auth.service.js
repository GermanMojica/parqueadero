// src/modules/auth/auth.service.js
const bcrypt   = require('bcrypt');
const jwt      = require('jsonwebtoken');
const { pool } = require('../../config/db');
const { env }  = require('../../config/env');
const AppError = require('../../utils/AppError');

async function login(email, password) {
  // Buscar usuario activo por email
  const [rows] = await pool.execute(
    `SELECT u.id, u.nombre, u.email, u.password_hash, r.nombre AS rol
     FROM usuarios u
     JOIN roles r ON r.id = u.rol_id
     WHERE u.email = ? AND u.activo = 1
     LIMIT 1`,
    [email],
  );

  const usuario = rows[0];

  if (!usuario) {
    // Mismo mensaje para email no encontrado y password incorrecto (evita enumeración)
    throw new AppError('Credenciales inválidas', 401);
  }

  const passwordOk = await bcrypt.compare(password, usuario.password_hash);
  if (!passwordOk) {
    throw new AppError('Credenciales inválidas', 401);
  }

  const payload = {
    id:     usuario.id,
    nombre: usuario.nombre,
    rol:    usuario.rol,
  };

  const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });

  return {
    token,
    usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
  };
}

module.exports = { login };
