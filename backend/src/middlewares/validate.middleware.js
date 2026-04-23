// src/middlewares/validate.middleware.js
const { ZodError } = require('zod');
const AppError     = require('../utils/AppError');

/**
 * Valida req.body contra un schema Zod.
 * Si falla, devuelve 422 con los errores formateados.
 * Si pasa, reemplaza req.body con el valor parseado (tipos correctos, defaults aplicados).
 *
 * @param {import('zod').ZodSchema} schema
 */
function validate(schema) {
  return (req, _res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const errores = err.errors.map((e) => ({
          campo:   e.path.join('.'),
          mensaje: e.message,
        }));
        return next(
          Object.assign(
            new AppError('Error de validación en los datos enviados', 422),
            { errores },
          ),
        );
      }
      next(err);
    }
  };
}

module.exports = { validate };
