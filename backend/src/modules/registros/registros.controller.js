// src/modules/registros/registros.controller.js
const service         = require('./registros.service');
const { ok, created } = require('../../utils/response.helper');
const { z }           = require('zod');

// Validación de placa colombiana: ABC123 o AB123C
const placaSchema = z.string()
  .min(5).max(8)
  .regex(/^[A-Z0-9]{5,8}$/, 'Formato de placa inválido')
  .transform((v) => v.toUpperCase());

const entradaSchema = z.object({
  placa:           placaSchema,
  tipoVehiculoId:  z.number().int().positive(),
});

const salidaSchema = z.object({
  placa: placaSchema,
});

const anularSchema = z.object({
  observaciones: z.string().max(255).optional(),
});

async function registrarEntrada(req, res, next) {
  try {
    const result = await service.registrarEntrada({
      ...req.body,
      usuarioId: req.user.id,
    });
    created(res, result);
  } catch (e) { next(e); }
}

async function previewSalida(req, res, next) {
  try {
    ok(res, await service.previewSalida(req.params.placa.toUpperCase()));
  } catch (e) { next(e); }
}

async function registrarSalida(req, res, next) {
  try {
    ok(res, await service.registrarSalida({ ...req.body, usuarioId: req.user.id }));
  } catch (e) { next(e); }
}

async function getHistorial(req, res, next) {
  try { ok(res, await service.getHistorial(req.query)); } catch (e) { next(e); }
}

async function getById(req, res, next) {
  try { ok(res, await service.getById(Number(req.params.id))); } catch (e) { next(e); }
}

async function anular(req, res, next) {
  try {
    ok(res, await service.anular(Number(req.params.id), { ...req.body, usuarioId: req.user.id }));
  } catch (e) { next(e); }
}

module.exports = {
  registrarEntrada, previewSalida, registrarSalida,
  getHistorial, getById, anular,
  entradaSchema, salidaSchema, anularSchema,
};
