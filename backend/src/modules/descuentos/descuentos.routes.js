// src/modules/descuentos/descuentos.routes.js
const { Router }     = require('express');
const ctrl           = require('./descuentos.controller');
const auth           = require('../../middlewares/auth.middleware');
const { validate }   = require('../../middlewares/validate.middleware');

const router = Router();
router.use(auth);

router.get('/',                                                         ctrl.getTiposActivos);
router.post('/registro/:registroId', validate(ctrl.aplicarSchema),     ctrl.aplicarDescuento);

module.exports = router;
