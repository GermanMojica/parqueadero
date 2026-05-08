// src/middlewares/sede.middleware.js
const AppError = require('../utils/AppError');

/**
 * Extrae el ID de la sede del header X-Sede-Id o del query parameter sedeId.
 * Lo inyecta en req.sedeId para que el resto de los endpoints filtren.
 */
function sedeMiddleware(req, _res, next) {
  let sedeId = req.headers['x-sede-id'] || req.query.sedeId;

  if (sedeId) {
    req.sedeId = parseInt(sedeId, 10);
  } else if (req.user && req.user.sede_id) {
    req.sedeId = req.user.sede_id;
  } else {
    // Sede por defecto para vistas públicas o si no se especifica
    req.sedeId = 1;
  }

  next();
}

module.exports = sedeMiddleware;
