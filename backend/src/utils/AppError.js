// src/utils/AppError.js
// Errores de negocio con código HTTP explícito.
// Se distinguen de los errores genéricos en el middleware global.

class AppError extends Error {
  /**
   * @param {string} message  Mensaje legible para el cliente
   * @param {number} httpCode Código HTTP (400, 401, 403, 404, 409, 422...)
   */
  constructor(message, httpCode = 400) {
    super(message);
    this.name       = 'AppError';
    this.httpCode   = httpCode;
    this.isOperational = true;  // Marca que es un error controlado, no un bug
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
