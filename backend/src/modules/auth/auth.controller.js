// src/modules/auth/auth.controller.js
const authService = require('./auth.service');
const { ok }      = require('../../utils/response.helper');
const { z }       = require('zod');
const { validate } = require('../../middlewares/validate.middleware');

const loginSchema = z.object({
  email:    z.string().email('Email inválido'),
  password: z.string().min(1, 'Password requerido'),
});

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    ok(res, result);
  } catch (err) {
    next(err);
  }
}

module.exports = { login, loginSchema };
