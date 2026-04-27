// src/utils/qr.generator.js
// Genera QR codes como Data URLs (PNG base64) para incluir en tickets.
// El QR contiene un JSON mínimo que el escáner de la taquilla puede leer.

const QRCode = require('qrcode');

/**
 * Genera un QR code como Data URL (PNG base64).
 * @param {object|string} data  Datos a codificar
 * @returns {Promise<string>}   Data URL: "data:image/png;base64,..."
 */
async function generarQRDataURL(data) {
  const texto = typeof data === 'string' ? data : JSON.stringify(data);
  return QRCode.toDataURL(texto, {
    errorCorrectionLevel: 'M',
    width:    250,
    margin:   1,
    color: {
      dark:  '#000000',
      light: '#FFFFFF',
    },
  });
}

/**
 * Genera el payload del QR para un ticket.
 * El escáner lee este JSON y puede:
 *   - Tipo ENTRADA: mostrar la info del vehículo
 *   - Tipo SALIDA: no aplica (ya tiene QR de entrada)
 *   - Tipo ACTIVO: marcar directamente la salida escaneando en taquilla
 */
function buildQRPayload(registroId, placa, tipo, codigoTicket) {
  return {
    sys:    'PKG',          // identificador del sistema (evita confusión con otros QRs)
    rid:    registroId,     // registro ID
    placa,
    tipo,                   // ENTRADA | SALIDA
    tk:     codigoTicket,
    ts:     Date.now(),     // timestamp de generación
  };
}

module.exports = { generarQRDataURL, buildQRPayload };
