// src/modules/registros/registros.routes.js
const { Router }     = require('express');
const ctrl           = require('./registros.controller');
const auth           = require('../../middlewares/auth.middleware');
const { requireRol } = require('../../middlewares/roles.middleware');
const { validate }   = require('../../middlewares/validate.middleware');

const router = Router();

// Ruta pública para la vista de TV (últimos 5 movimientos)
router.get('/public-movimientos', (req, res, next) => {
  req.query.limite = 5;
  next();
}, ctrl.getHistorial);

router.use(auth);

// Operaciones de taquilla — cualquier usuario autenticado
router.post('/entrada',              validate(ctrl.entradaSchema),  ctrl.registrarEntrada);
router.get('/activo/:placa',                                         ctrl.previewSalida);
router.post('/salida',               validate(ctrl.salidaSchema),   ctrl.registrarSalida);

// Historial y detalle
router.get('/',    ctrl.getHistorial);
router.get('/:id', ctrl.getById);

// Anulación — solo admin
router.patch('/:id/anular', requireRol('ADMIN'), validate(ctrl.anularSchema), ctrl.anular);

module.exports = router;
