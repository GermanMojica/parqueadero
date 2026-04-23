// src/modules/tarifas/tarifas.controller.js
const service         = require('./tarifas.service');
const { ok, created } = require('../../utils/response.helper');
const { z }           = require('zod');

const createSchema = z.object({
  tipoVehiculoId:  z.number().int().positive(),
  precioHora:      z.number().positive(),
  fraccionMinutos: z.number().int().refine((v) => [15, 30, 60].includes(v), {
    message: 'Fracción debe ser 15, 30 o 60 minutos',
  }),
  vigenteDesde: z.string().datetime().optional(),
});

async function getAll(req, res, next) {
  try { ok(res, await service.getAll()); } catch (e) { next(e); }
}

async function create(req, res, next) {
  try { created(res, await service.create(req.body)); } catch (e) { next(e); }
}

async function deactivate(req, res, next) {
  try { ok(res, await service.deactivate(Number(req.params.id))); } catch (e) { next(e); }
}

module.exports = { getAll, create, deactivate, createSchema };
