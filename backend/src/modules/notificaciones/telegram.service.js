// src/modules/notificaciones/telegram.service.js
const axios = require('axios');
const { env } = require('../../config/env');
const logger = require('../../utils/logger');

async function enviarMensaje(chatId, mensaje) {
  if (!env.TELEGRAM_BOT_TOKEN) {
    logger.warn('⚠️ TELEGRAM_BOT_TOKEN no configurado. Notificación no enviada.');
    return;
  }
  if (!chatId) return;

  try {
    await axios.post(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: chatId,
      text: mensaje,
      parse_mode: 'Markdown'
    });
  } catch (error) {
    logger.error('Error enviando mensaje de Telegram:', { error: error.message });
  }
}

module.exports = { enviarMensaje };
