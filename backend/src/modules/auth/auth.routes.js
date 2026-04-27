// src/modules/auth/auth.routes.js
const { Router }  = require('express');
const controller  = require('./auth.controller');
const { validate } = require('../../middlewares/validate.middleware');

const router = Router();

router.post('/login', validate(controller.loginSchema), controller.login);

module.exports = router;
