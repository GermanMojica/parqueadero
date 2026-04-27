// src/modules/descuentos/descuentos.service.js
const { withTransaction }  = require('../../config/db');
const descuentosRepo       = require('./descuentos.repository');
const registrosRepo        = require('../registros/registros.repository');
const auditoriaRepo        = require('../auditoria/auditoria.repository');
const { aplicarDescuento } = require('../../utils/tarifa.calculator');
const AppError             = require('../../utils/AppError');
const { pool }             = require('../../config/db');

async function getTiposActivos() {
  return descuentosRepo.findTiposActivos();
}

/**
 * Aplica un descuento a un registro YA CERRADO.
 * Flujo: operador cierra → admin revisa → aplica descuento → se ajusta total_cobrado.
 *
 * También soporta aplicar durante el cierre si se pasa descuentoId al service de registros.
 */
async function aplicarARegistro({ registroId, tipoDescuentoId, usuarioId, esAdmin, motivo }) {
  return withTransaction(async (conn) => {

    // 1. Verificar que el registro exista y esté cerrado
    const registro = await registrosRepo.findById(registroId);
    if (!registro)              throw new AppError('Registro no encontrado', 404);
    if (registro.estado !== 'CERRADO') throw new AppError('Solo se pueden aplicar descuentos a registros cerrados', 409);

    // 2. Verificar que no tenga ya un descuento
    const yaAplicado = await descuentosRepo.findAplicadoByRegistro(registroId);
    if (yaAplicado) throw new AppError('Este registro ya tiene un descuento aplicado', 409);

    // 3. Verificar tipo de descuento
    const tipoDescuento = await descuentosRepo.findTipoById(tipoDescuentoId);
    if (!tipoDescuento) throw new AppError('Tipo de descuento no encontrado o inactivo', 404);

    // 4. Validar permisos: si el descuento es solo_admin, verificar rol
    if (tipoDescuento.solo_admin && !esAdmin) {
      throw new AppError('Este descuento requiere autorización de administrador', 403);
    }

    // 5. Calcular descuento
    const totalOriginal = registro.total_cobrado;
    const resultado = aplicarDescuento(
      totalOriginal,
      tipoDescuento,
      registro.minutos_total,
      registro.tarifa_valor_aplicado,
    );

    // 6. Actualizar total_cobrado del registro con nuevo total
    await conn.execute(
      'UPDATE registros SET total_cobrado = ?, observaciones = CONCAT(IFNULL(observaciones,""), ?) WHERE id = ?',
      [
        resultado.totalDespues,
        ` | Descuento aplicado: ${tipoDescuento.nombre} (-$${resultado.valorDescuento})`,
        registroId,
      ],
    );

    // 7. Registrar descuento aplicado (auditoría)
    await descuentosRepo.registrarDescuento({
      registroId,
      tipoDescuentoId,
      autorizadoPorId: usuarioId,
      totalAntes:      resultado.totalAntes,
      valorDescuento:  resultado.valorDescuento,
      totalDespues:    resultado.totalDespues,
      motivo,
    }, conn);

    // 8. Log de auditoría
    await auditoriaRepo.log({
      usuarioId,
      accion:    'DESCUENTO',
      entidad:   'registros',
      entidadId: registroId,
      detalle: { tipoDescuento: tipoDescuento.nombre, ...resultado, motivo },
    }, conn);

    return {
      registroId,
      descuento:    tipoDescuento.nombre,
      totalAntes:   resultado.totalAntes,
      valorDescontado: resultado.valorDescuento,
      totalFinal:   resultado.totalDespues,
    };
  });
}

module.exports = { getTiposActivos, aplicarARegistro };
