// src/modules/auditoria/auditoria.routes.js
const { Router }     = require('express');
const ctrl           = require('./auditoria.controller');
const auth           = require('../../middlewares/auth.middleware');
const { requireRol } = require('../../middlewares/roles.middleware');

const router = Router();
router.use(auth, requireRol('ADMIN'));
router.get('/', ctrl.findRecent);

module.exports = router;
