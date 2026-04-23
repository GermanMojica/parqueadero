// src/modules/tickets/tickets.routes.js
const { Router } = require('express');
const ctrl       = require('./tickets.controller');
const auth       = require('../../middlewares/auth.middleware');

const router = Router();

router.use(auth);

router.get('/registro/:registroId',  ctrl.getByRegistro);
router.get('/codigo/:codigo',        ctrl.getByCodigo);

module.exports = router;
