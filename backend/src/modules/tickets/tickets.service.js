// src/modules/tickets/tickets.service.js
const repo     = require('./tickets.repository');
const { generarQRDataURL, buildQRPayload } = require('../../utils/qr.generator');
const AppError = require('../../utils/AppError');

async function getByRegistro(registroId) {
  const tickets = await repo.findByRegistro(registroId);
  if (!tickets.length) throw new AppError('No se encontraron tickets para este registro', 404);
  return tickets;
}

async function getByCodigo(codigo) {
  const ticket = await repo.findByCodigo(codigo);
  if (!ticket) throw new AppError(`Ticket ${codigo} no encontrado`, 404);
  return ticket;
}

/**
 * Regenera el QR de un ticket existente.
 * Útil si el QR impreso se dañó o el operador necesita reimprimirlo.
 */
async function getQR(registroId, tipo = 'ENTRADA') {
  const tickets = await repo.findByRegistro(registroId);
  const ticket  = tickets.find(t => t.tipo === tipo);
  if (!ticket) throw new AppError(`No existe ticket de ${tipo} para el registro ${registroId}`, 404);

  const d = ticket.datos_json;
  const payload = buildQRPayload(
    d.registro?.id ?? registroId,
    d.registro?.placa ?? '',
    tipo,
    ticket.codigo_ticket,
  );
  const qrDataURL = await generarQRDataURL(payload);
  return { codigoTicket: ticket.codigo_ticket, tipo, qrDataURL, generadoAt: ticket.generado_at };
}

module.exports = { getByRegistro, getByCodigo, getQR };

