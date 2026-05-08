// src/modules/notificaciones/notificaciones.routes.js
const { Router } = require('express');
const ctrl = require('./notificaciones.controller');
const auth = require('../../middlewares/auth.middleware');

const router = Router();
router.use(auth);

router.post('/suscribir', ctrl.suscribirPush);
router.get('/preferencias', ctrl.obtenerPreferencias);
router.put('/preferencias', ctrl.actualizarPreferencias);

module.exports = router;
