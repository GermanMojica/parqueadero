// src/modules/reservas/reservas.cron.js
// Job que corre cada 5 minutos para expirar reservas cuya hora_inicio + 15 min ya pasó.
// No requiere dependencias externas — usa setInterval nativo.

const logger  = require('../../utils/logger');
const service = require('./reservas.service');

const INTERVALO_MS = 5 * 60 * 1000; // 5 minutos

let intervalId = null;

function iniciar() {
  logger.info('⏰ Cron de expiración de reservas iniciado (cada 5 min)');

  // Ejecutar inmediatamente al iniciar
  ejecutar();

  // Luego cada 5 minutos
  intervalId = setInterval(ejecutar, INTERVALO_MS);
}

async function ejecutar() {
  try {
    const resultado = await service.expirarReservasVencidas();
    if (resultado.expiradas > 0) {
      logger.info(`⏰ Cron: ${resultado.expiradas} reserva(s) expirada(s)`);
    }
  } catch (err) {
    logger.error('❌ Error en cron de expiración de reservas', { error: err.message });
  }
}

function detener() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    logger.info('⏰ Cron de expiración de reservas detenido');
  }
}

module.exports = { iniciar, detener };
