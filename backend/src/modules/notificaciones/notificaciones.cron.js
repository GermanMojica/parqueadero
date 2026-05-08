// src/modules/notificaciones/notificaciones.cron.js
const cron = require('node-cron');
const repo = require('./notificaciones.repository');
const service = require('./notificaciones.service');
const logger = require('../../utils/logger');

let notifTask = null;

function iniciar() {
  logger.info('⏰ Jobs de notificaciones iniciados (cada 15 min).');

  notifTask = cron.schedule('*/15 * * * *', async () => {
    try {
      await verificarPermanenciaLarga();
      await verificarReservasPorExpirar();
    } catch (e) {
      logger.error('Error en cron de notificaciones:', { error: e.message });
    }
  });
}

async function verificarPermanenciaLarga() {
  const maxHorasStr = await repo.obtenerConfiguracion('MAX_HORAS_PERMANENCIA');
  const maxHoras = parseInt(maxHorasStr, 10) || 4;

  const registros = await repo.obtenerRegistrosPermanenciaLarga(maxHoras);
  if (registros.length === 0) return;

  for (const r of registros) {
    // Nota: Para evitar notificar cada 15 mins a los mismos autos indefinidamente,
    // se requeriría una tabla de logs de notificaciones, pero para este alcance
    // simplificado lo enviamos cada vez que se cumpla la condición.
    const titulo = `Alerta: Permanencia Larga`;
    const hora = new Date(r.hora_entrada).toLocaleTimeString('es-CO');
    const mensaje = `El vehículo placa ${r.placa} en el espacio ${r.espacio_codigo} entró a las ${hora} y lleva más de ${maxHoras} horas.`;
    await service.notificarAOperadores(titulo, mensaje);
  }
}

async function verificarReservasPorExpirar() {
  const reservas = await repo.obtenerReservasPorExpirar();
  if (reservas.length === 0) return;

  for (const r of reservas) {
    const titulo = `Reserva próxima a expirar`;
    const mensaje = `Tu reserva para el vehículo ${r.placa} (Código: ${r.codigo_reserva}) expirará en los próximos minutos.`;
    service.encolarNotificacion(r.usuario_id, titulo, mensaje);
  }
}

function detener() {
  if (notifTask) notifTask.stop();
  logger.info('⏰ Jobs de notificaciones detenidos.');
}

module.exports = { iniciar, detener };
