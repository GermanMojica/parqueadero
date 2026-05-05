// src/modules/tarifas/tarifas.routes.js
const { Router }     = require('express');
const ctrl           = require('./tarifas.controller');
const auth           = require('../../middlewares/auth.middleware');
const { requireRol } = require('../../middlewares/roles.middleware');
const { validate }   = require('../../middlewares/validate.middleware');

const router = Router();

router.use(auth);

router.get('/',           ctrl.getAll);                                              // todos pueden ver
router.post('/',          requireRol('ADMIN'), validate(ctrl.createSchema), ctrl.create);
router.patch('/:id',      requireRol('ADMIN'), validate(ctrl.updateSchema), ctrl.update);
router.delete('/:id',     requireRol('ADMIN'), ctrl.deactivate);

module.exports = router;
