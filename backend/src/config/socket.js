const { Server } = require('socket.io');
const logger = require('../utils/logger');

let io;

const init = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: "*", // En producción, especificar el origin real
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    logger.info(`🔌 Nuevo cliente conectado: ${socket.id}`);
    
    socket.on('disconnect', () => {
      logger.info(`🔌 Cliente desconectado: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.io no ha sido inicializado");
  }
  return io;
};

const emitUpdate = () => {
  if (io) {
    logger.info("📡 Emitiendo evento: parqueadero_update");
    io.emit('parqueadero_update');
  }
};

module.exports = { init, getIO, emitUpdate };
