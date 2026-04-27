// src/modules/descuentos/descuentos.controller.js
const service         = require('./descuentos.service');
const { ok, created } = require('../../utils/response.helper');
const { z }           = require('zod');

const aplicarSchema = z.object({
  tipoDescuentoId: z.number().int().positive(),
  motivo:          z.string().max(255).optional(),
});

async function getTiposActivos(req, res, next) {
  try { ok(res, await service.getTiposActivos()); } catch (e) { next(e); }
}

async function aplicarDescuento(req, res, next) {
  try {
    ok(res, await service.aplicarARegistro({
      registroId:      Number(req.params.registroId),
      tipoDescuentoId: req.body.tipoDescuentoId,
      motivo:          req.body.motivo,
      usuarioId:       req.user.id,
      esAdmin:         req.user.rol === 'ADMIN',
    }));
  } catch (e) { next(e); }
}

module.exports = { getTiposActivos, aplicarDescuento, aplicarSchema };
