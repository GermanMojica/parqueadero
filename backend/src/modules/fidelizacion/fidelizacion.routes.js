// src/modules/fidelizacion/fidelizacion.routes.js
const { Router } = require('express');
const ctrl = require('./fidelizacion.controller');
const auth = require('../../middlewares/auth.middleware');
const { requireRol: roles } = require('../../middlewares/roles.middleware');

const router = Router();

router.use(auth);

router.get('/reglas', ctrl.getReglas);
router.put('/reglas/:id', roles('ADMIN'), ctrl.updateRegla);
router.post('/tarjetas', ctrl.crearTarjeta);
router.get('/tarjetas/:idOrPlaca', ctrl.consultarTarjeta);
router.put('/tarjetas/:id', roles('ADMIN'), ctrl.updateTarjeta);
router.post('/canjear', ctrl.canjearPuntos);
router.get('/dashboard', roles('ADMIN'), ctrl.getDashboard);

module.exports = router;
