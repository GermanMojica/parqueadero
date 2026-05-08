// src/modules/reservas/reservas.routes.js
const { Router }     = require('express');
const ctrl           = require('./reservas.controller');
const auth           = require('../../middlewares/auth.middleware');
const { validate }   = require('../../middlewares/validate.middleware');

const router = Router();

// Todas las rutas requieren autenticación
router.use(auth);

// POST   /api/reservas             → Crear reserva
router.post('/',                validate(ctrl.crearReservaSchema), ctrl.crear);

// GET    /api/reservas             → Listar con filtros
router.get('/',                 ctrl.listar);

// PATCH  /api/reservas/:id/cancelar → Cancelar reserva
router.patch('/:id/cancelar',   ctrl.cancelar);

// POST   /api/reservas/:codigo/convertir → Convertir reserva en registro real
router.post('/:codigo/convertir', ctrl.convertir);

module.exports = router;
