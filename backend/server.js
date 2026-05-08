// server.js — Solo levanta el servidor. Sin lógica de negocio. // restart
const app    = require('./src/app');
const { env } = require('./src/config/env');
const logger = require('./src/utils/logger');

const http   = require('http');
const socket = require('./src/config/socket');
const reservasCron = require('./src/modules/reservas/reservas.cron');
const notificacionesCron = require('./src/modules/notificaciones/notificaciones.cron');

const PORT = env.PORT;
const server = http.createServer(app);

// Inicializar Socket.io
socket.init(server);

server.listen(PORT, () => {
  logger.info(`🚀 Servidor corriendo en puerto ${PORT} [${env.NODE_ENV}]`);

  // Iniciar cron de expiración de reservas (cada 5 min)
  reservasCron.iniciar();

  // Iniciar cron de notificaciones
  notificacionesCron.iniciar();
});

// Manejo de errores no capturados — evita que el proceso muera silenciosamente
process.on('unhandledRejection', (reason) => {
  logger.error('unhandledRejection', { reason });
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('uncaughtException', { error: error.message });
  process.exit(1);
});
