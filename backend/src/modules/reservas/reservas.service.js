// src/modules/reservas/reservas.service.js
// Lógica de negocio para reservas anticipadas de espacios de parqueadero.

const { withTransaction, pool } = require('../../config/db');
const reservasRepo   = require('./reservas.repository');
const registrosService = require('../registros/registros.service');
const auditoriaRepo  = require('../auditoria/auditoria.repository');
const AppError       = require('../../utils/AppError');
const logger         = require('../../utils/logger');
const { getIO }      = require('../../config/socket');

// ─── Generador de código alfanumérico único (8 chars) ─────────────────────────
function generarCodigoReserva() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sin I/O/0/1 para evitar confusión
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ─── CREAR RESERVA ────────────────────────────────────────────────────────────
async function crearReserva({ sedeId, placa, tipoVehiculoId, fechaReserva, horaInicio, horaFinEstimada, usuarioId }) {
  return withTransaction(async (conn) => {
    // Validar que la fecha de reserva no sea pasada
    const ahora = new Date();
    const fechaHoraInicio = new Date(`${fechaReserva}T${horaInicio}`);
    if (fechaHoraInicio < ahora) {
      throw new AppError('No se puede reservar en una fecha/hora que ya pasó', 400);
    }

    // Buscar espacio disponible para esa franja horaria
    const espacio = await reservasRepo.findEspacioDisponibleParaReserva(
      sedeId, tipoVehiculoId, fechaReserva, horaInicio, horaFinEstimada, conn,
    );
    if (!espacio) {
      throw new AppError('No hay espacios disponibles para este tipo de vehículo en la franja horaria seleccionada', 409);
    }

    // Generar código único
    let codigoReserva;
    let intentos = 0;
    do {
      codigoReserva = generarCodigoReserva();
      const existente = await reservasRepo.findByCodigo(codigoReserva, sedeId);
      if (!existente) break;
      intentos++;
    } while (intentos < 10);

    if (intentos >= 10) {
      throw new AppError('Error interno generando código de reserva. Reintente.', 500);
    }

    // Crear la reserva
    const reservaId = await reservasRepo.create({
      sedeId,
      espacioId: espacio.id,
      placa,
      tipoVehiculoId,
      usuarioId,
      fechaReserva,
      horaInicio,
      horaFinEstimada,
      codigoReserva,
    }, conn);

    // Log de auditoría
    await auditoriaRepo.log({
      usuarioId,
      accion:    'RESERVA_CREADA',
      entidad:   'reservas',
      entidadId: reservaId,
      detalle:   { placa: placa.toUpperCase(), espacio: espacio.codigo, codigoReserva, fechaReserva, horaInicio },
    }, conn);

    // Emitir evento WebSocket
    try {
      const io = getIO();
      io.emit('reserva:nueva', { reservaId, espacio: espacio.codigo, placa, codigoReserva });
      io.emit('parqueadero_update');
    } catch (_) { /* Socket.io no inicializado en tests */ }

    return {
      reservaId,
      codigoReserva,
      espacio: espacio.codigo,
      placa: placa.toUpperCase(),
      fechaReserva,
      horaInicio,
      horaFinEstimada,
      estado: 'PENDIENTE',
    };
  });
}

// ─── LISTAR RESERVAS ──────────────────────────────────────────────────────────
async function listarReservas(filtros) {
  const limit  = Math.min(Number(filtros.limit)  || 20, 100);
  const offset = Number(filtros.offset) || 0;
  return reservasRepo.findAll({ ...filtros, limit, offset });
}

// ─── CANCELAR RESERVA ─────────────────────────────────────────────────────────
async function cancelarReserva(id, usuarioId, sedeId) {
  const reserva = await reservasRepo.findById(id, sedeId);
  if (!reserva) throw new AppError('Reserva no encontrada', 404);

  if (reserva.estado === 'CANCELADA') {
    throw new AppError('La reserva ya está cancelada', 409);
  }
  if (reserva.estado === 'CONVERTIDA') {
    throw new AppError('No se puede cancelar una reserva que ya fue convertida en registro', 409);
  }
  if (reserva.estado === 'EXPIRADA') {
    throw new AppError('No se puede cancelar una reserva expirada', 409);
  }

  await reservasRepo.updateEstado(id, 'CANCELADA');

  // Log de auditoría
  await auditoriaRepo.log({
    usuarioId,
    accion:    'RESERVA_CANCELADA',
    entidad:   'reservas',
    entidadId: id,
    detalle:   { placa: reserva.placa, codigoReserva: reserva.codigo_reserva },
  });

  return { message: 'Reserva cancelada correctamente', reservaId: id };
}

// ─── CONVERTIR RESERVA EN REGISTRO DE ENTRADA ────────────────────────────────
async function convertirReserva(codigo, usuarioId, sedeId) {
  return withTransaction(async (conn) => {
    const reserva = await reservasRepo.findByCodigo(codigo, sedeId);
    if (!reserva) throw new AppError(`Reserva con código ${codigo} no encontrada`, 404);

    if (reserva.estado === 'CONVERTIDA') {
      throw new AppError('Esta reserva ya fue convertida en un registro de entrada', 409);
    }
    if (reserva.estado === 'CANCELADA') {
      throw new AppError('No se puede convertir una reserva cancelada', 409);
    }
    if (reserva.estado === 'EXPIRADA') {
      throw new AppError('No se puede convertir una reserva expirada', 409);
    }

    // Usar la lógica de registrarEntrada pasando el espacio ya asignado
    const resultado = await registrosService.registrarEntrada({
      placa: reserva.placa,
      tipoVehiculoId: reserva.tipo_vehiculo_id,
      usuarioId,
      espacioIdReserva: reserva.espacio_id, // Espacio pre-asignado por la reserva
    });

    // Marcar reserva como CONVERTIDA
    await reservasRepo.updateEstado(reserva.id, 'CONVERTIDA', conn);

    // Log de auditoría
    await auditoriaRepo.log({
      usuarioId,
      accion:    'RESERVA_CONVERTIDA',
      entidad:   'reservas',
      entidadId: reserva.id,
      detalle:   {
        placa: reserva.placa,
        codigoReserva: reserva.codigo_reserva,
        registroId: resultado.registroId,
      },
    }, conn);

    return {
      message: 'Reserva convertida exitosamente en registro de entrada',
      reservaId: reserva.id,
      codigoReserva: reserva.codigo_reserva,
      registro: resultado,
    };
  });
}

// ─── CRON: EXPIRAR RESERVAS VENCIDAS ──────────────────────────────────────────
async function expirarReservasVencidas() {
  const expiradas = await reservasRepo.findExpiradas();
  if (expiradas.length === 0) return { expiradas: 0 };

  const ids = expiradas.map(r => r.id);
  const count = await reservasRepo.expirarMasivo(ids);

  logger.info(`⏰ ${count} reserva(s) expirada(s) automáticamente`);

  // Emitir eventos WebSocket para cada reserva expirada
  try {
    const io = getIO();
    expiradas.forEach(r => {
      io.emit('reserva:expirada', { reservaId: r.id, espacio: r.espacio_id, placa: r.placa, codigo: r.codigo_reserva });
    });
    io.emit('parqueadero_update');
  } catch (_) { /* Socket.io no inicializado */ }

  return { expiradas: count, detalles: expiradas };
}

module.exports = {
  crearReserva,
  listarReservas,
  cancelarReserva,
  convertirReserva,
  expirarReservasVencidas,
};
