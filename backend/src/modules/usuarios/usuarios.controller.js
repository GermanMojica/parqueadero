// src/modules/usuarios/usuarios.controller.js
const service         = require('./usuarios.service');
const { ok, created } = require('../../utils/response.helper');
const { z }           = require('zod');

const createSchema = z.object({
  nombre:    z.string().min(2).max(100),
  email:     z.string().email(),
  password:  z.string().min(8, 'Mínimo 8 caracteres'),
  rolNombre: z.enum(['ADMIN', 'OPERADOR']),
});

const updateSchema = z.object({
  nombre:    z.string().min(2).max(100),
  activo:    z.boolean(),
  rolNombre: z.enum(['ADMIN', 'OPERADOR']),
});

const passwordSchema = z.object({
  passwordActual: z.string().min(1),
  passwordNuevo:  z.string().min(8),
});

async function getAll(req, res, next) {
  try { ok(res, await service.getAll()); } catch (e) { next(e); }
}

async function getById(req, res, next) {
  try { ok(res, await service.getById(Number(req.params.id))); } catch (e) { next(e); }
}

async function create(req, res, next) {
  try { created(res, await service.create(req.body)); } catch (e) { next(e); }
}

async function update(req, res, next) {
  try { ok(res, await service.update(Number(req.params.id), req.body)); } catch (e) { next(e); }
}

async function cambiarPassword(req, res, next) {
  try {
    await service.cambiarPassword(Number(req.params.id), req.body);
    ok(res, { message: 'Contraseña actualizada correctamente' });
  } catch (e) { next(e); }
}

module.exports = { getAll, getById, create, update, cambiarPassword, createSchema, updateSchema, passwordSchema };
