// src/middlewares/roles.middleware.js
const AppError = require('../utils/AppError');

/**
 * Factory que retorna un middleware que verifica si el usuario
 * tiene uno de los roles permitidos.
 *
 * Uso: router.post('/tarifas', auth, requireRol('ADMIN'), controller)
 *
 * @param {...string} rolesPermitidos
 */
function requireRol(...rolesPermitidos) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError('No autenticado', 401));
    }

    if (!rolesPermitidos.includes(req.user.rol)) {
      return next(new AppError(
        `Acceso restringido. Se requiere rol: ${rolesPermitidos.join(' o ')}`,
        403,
      ));
    }

    next();
  };
}

module.exports = { requireRol };
