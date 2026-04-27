// src/utils/ticket.generator.js — VERSIÓN CON QR
const { generarQRDataURL, buildQRPayload } = require('./qr.generator');

function generarCodigoTicket(registroId) {
  const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const id    = String(registroId).padStart(5, '0');
  return `TK-${fecha}-${id}`;
}

async function buildTicketEntrada({ registro, espacio, tipoVehiculo, operador }) {
  const codigoTicket = generarCodigoTicket(registro.id);
  const qrPayload    = buildQRPayload(registro.id, registro.placa, 'ENTRADA', codigoTicket);
  const qrDataURL    = await generarQRDataURL(qrPayload);

  return {
    tipo:         'ENTRADA',
    codigoTicket,
    qrDataURL,                    // ← imagen QR en base64
    qrPayload,                    // ← datos crudos del QR
    registro: {
      id:          registro.id,
      placa:       registro.placa,
      horaEntrada: registro.hora_entrada,
    },
    espacio: { id: espacio.id, codigo: espacio.codigo },
    tipoVehiculo: tipoVehiculo.nombre,
    operador:     { id: operador.id, nombre: operador.nombre },
    generadoAt:   new Date().toISOString(),
  };
}

async function buildTicketSalida({ registro, espacio, tipoVehiculo, operador, calculo, tarifa }) {
  const codigoTicket = generarCodigoTicket(registro.id) + '-S';
  const qrPayload    = buildQRPayload(registro.id, registro.placa, 'SALIDA', codigoTicket);
  const qrDataURL    = await generarQRDataURL(qrPayload);

  return {
    tipo:         'SALIDA',
    codigoTicket,
    qrDataURL,
    qrPayload,
    registro: {
      id:          registro.id,
      placa:       registro.placa,
      horaEntrada: registro.hora_entrada,
      horaSalida:  registro.hora_salida,
    },
    espacio:     { id: espacio.id, codigo: espacio.codigo },
    tipoVehiculo: tipoVehiculo.nombre,
    operador:     { id: operador.id, nombre: operador.nombre },
    cobro: {
      minutosTotales:     calculo.minutosTotales,
      fraccionesUsadas:   calculo.fraccionesUsadas,
      tarifaHoraAplicada: tarifa.precio_hora,
      fraccionMinutos:    tarifa.fraccion_minutos,
      totalCobrado:       calculo.total,
    },
    generadoAt: new Date().toISOString(),
  };
}

module.exports = { generarCodigoTicket, buildTicketEntrada, buildTicketSalida };
