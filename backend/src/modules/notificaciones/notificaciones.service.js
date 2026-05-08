// src/modules/notificaciones/notificaciones.service.js
const repo = require('./notificaciones.repository');
const telegramService = require('./telegram.service');
const webpushService = require('./webpush.service');
const logger = require('../../utils/logger');

// ─── SIMPLE IN-MEMORY QUEUE & WORKER ──────────────────────────────────────────
const queue = [];
let isProcessing = false;

async function processQueue() {
  if (isProcessing || queue.length === 0) return;
  isProcessing = true;

  while (queue.length > 0) {
    const tarea = queue.shift();
    const { usuarioId, titulo, mensaje } = tarea;

    try {
      const prefs = await repo.obtenerPreferencias(usuarioId);
      if (!prefs) continue;

      // Canal Telegram
      if (prefs.canal_telegram && prefs.chat_id_telegram) {
        await telegramService.enviarMensaje(prefs.chat_id_telegram, `*${titulo}*\n${mensaje}`);
      }

      // Canal Web Push
      if (prefs.canal_push) {
        const suscripciones = await repo.obtenerSuscripcionesPush(usuarioId);
        for (const sub of suscripciones) {
          try {
            await webpushService.enviarPush(sub, { title: titulo, body: mensaje });
          } catch (e) {
            if (e.name === 'SuscripcionInvalida') {
              await repo.eliminarSuscripcionPush(e.endpoint);
              logger.info('🗑️ Suscripción push inválida eliminada.', { endpoint: e.endpoint });
            }
          }
        }
      }
    } catch (error) {
      logger.error('Error procesando tarea de notificación', { error: error.message });
    }
  }

  isProcessing = false;
}

// ─── API PÚBLICA DEL SERVICIO ─────────────────────────────────────────────────

function encolarNotificacion(usuarioId, titulo, mensaje) {
  queue.push({ usuarioId, titulo, mensaje });
  processQueue(); // Iniciar worker si no está corriendo
}

async function notificarAOperadores(titulo, mensaje) {
  const operadores = await repo.obtenerOperadores();
  for (const op of operadores) {
    encolarNotificacion(op.id, titulo, mensaje);
  }
}

// Gestión de Suscripciones y Preferencias
async function guardarSuscripcionPush(usuarioId, suscripcion) {
  await repo.guardarSuscripcionPush(
    usuarioId, 
    suscripcion.endpoint, 
    suscripcion.keys.p256dh, 
    suscripcion.keys.auth
  );
  return { message: 'Suscripción push guardada correctamente.' };
}

async function obtenerPreferencias(usuarioId) {
  let prefs = await repo.obtenerPreferencias(usuarioId);
  if (!prefs) {
    await repo.actualizarPreferencias(usuarioId, false, false, null);
    prefs = await repo.obtenerPreferencias(usuarioId);
  }
  return prefs;
}

async function actualizarPreferencias(usuarioId, { canalTelegram, canalPush, chatIdTelegram }) {
  await repo.actualizarPreferencias(usuarioId, canalTelegram, canalPush, chatIdTelegram);
  return { message: 'Preferencias actualizadas correctamente.' };
}

module.exports = {
  encolarNotificacion,
  notificarAOperadores,
  guardarSuscripcionPush,
  obtenerPreferencias,
  actualizarPreferencias
};
