// src/middlewares/auth.middleware.js
const jwt     = require('jsonwebtoken');
const { env } = require('../config/env');
const AppError = require('../utils/AppError');

/**
 * Verifica el JWT del header Authorization.
 * Si es válido, adjunta el payload al objeto req como req.user.
 */
function authMiddleware(req, _res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Token de autenticación requerido', 401));
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    req.user = payload; // { id, nombre, rol, iat, exp }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Sesión expirada. Inicie sesión nuevamente', 401));
    }
    return next(new AppError('Token inválido', 401));
  }
}

module.exports = authMiddleware;
