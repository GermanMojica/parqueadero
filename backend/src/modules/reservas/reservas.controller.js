// src/modules/reservas/reservas.controller.js
const service         = require('./reservas.service');
const { ok, created } = require('../../utils/response.helper');
const { z }           = require('zod');

// ─── Schemas de validación ────────────────────────────────────────────────────
const placaSchema = z.string()
  .min(5).max(8)
  .regex(/^[A-Z0-9]{5,8}$/, 'Formato de placa inválido')
  .transform((v) => v.toUpperCase());

const crearReservaSchema = z.object({
  placa:           placaSchema,
  tipoVehiculoId:  z.number().int().positive(),
  fechaReserva:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
  horaInicio:      z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Formato de hora inválido (HH:MM)'),
  horaFinEstimada: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Formato de hora inválido (HH:MM)'),
});

// ─── Controladores ───────────────────────────────────────────────────────────

async function crear(req, res, next) {
  try {
    const result = await service.crearReserva({
      ...req.body,
      usuarioId: req.user.id,
      sedeId: req.sedeId,
    });
    created(res, result);
  } catch (e) { next(e); }
}

async function listar(req, res, next) {
  try {
    ok(res, await service.listarReservas({ ...req.query, sedeId: req.sedeId }));
  } catch (e) { next(e); }
}

async function cancelar(req, res, next) {
  try {
    ok(res, await service.cancelarReserva(Number(req.params.id), req.user.id, req.sedeId));
  } catch (e) { next(e); }
}

async function convertir(req, res, next) {
  try {
    const result = await service.convertirReserva(
      req.params.codigo.toUpperCase(),
      req.user.id,
      req.sedeId,
    );
    ok(res, result);
  } catch (e) { next(e); }
}

module.exports = {
  crear,
  listar,
  cancelar,
  convertir,
  crearReservaSchema,
};
