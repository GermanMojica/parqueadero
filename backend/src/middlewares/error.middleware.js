// src/middlewares/error.middleware.js
const { env } = require('../config/env');
const logger  = require('../utils/logger');

/**
 * Manejador global de errores — debe registrarse ÚLTIMO en app.js.
 * Distingue errores operacionales (AppError) de errores inesperados (bugs).
 */
// eslint-disable-next-line no-unused-vars
function errorMiddleware(err, req, res, _next) {
  // Loggear siempre
  logger.error({
    message:  err.message,
    path:     req.path,
    method:   req.method,
    httpCode: err.httpCode,
    stack:    env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  // Error operacional conocido (AppError)
  if (err.isOperational) {
    return res.status(err.httpCode).json({
      success: false,
      error: {
        code:    err.httpCode,
        message: err.message,
        ...(err.errores && { errores: err.errores }), // errores de validación Zod
      },
    });
  }

  // Error inesperado (bug, DB caída, etc.) — no exponer detalles en prod
  return res.status(500).json({
    success: false,
    error: {
      code:    500,
      message: env.NODE_ENV === 'development'
        ? err.message
        : 'Error interno del servidor. Contacte al administrador.',
    },
  });
}

module.exports = errorMiddleware;
