// server.js — Solo levanta el servidor. Sin lógica de negocio.
const app    = require('./src/app');
const { env } = require('./src/config/env');
const logger = require('./src/utils/logger');

const PORT = env.PORT;

app.listen(PORT, () => {
  logger.info(`🚀 Servidor corriendo en puerto ${PORT} [${env.NODE_ENV}]`);
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
