// src/modules/tickets/tickets.service.js
const repo     = require('./tickets.repository');
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

module.exports = { getByRegistro, getByCodigo };
