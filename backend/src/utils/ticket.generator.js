// src/utils/ticket.generator.js
// Construye el objeto de datos del ticket.
// No genera PDFs aquí — eso es responsabilidad del cliente o de un servicio externo.
// El JSON generado es el que se guarda en tickets.datos_json.

/**
 * Genera un código de ticket único y legible.
 * Formato: TK-YYYYMMDD-{registroId padded}
 * Ejemplo: TK-20240615-00042
 */
function generarCodigoTicket(registroId) {
  const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const id    = String(registroId).padStart(5, '0');
  return `TK-${fecha}-${id}`;
}

/**
 * Construye el snapshot del ticket de ENTRADA.
 */
function buildTicketEntrada({ registro, espacio, tipoVehiculo, operador }) {
  return {
    tipo:          'ENTRADA',
    codigoTicket:  generarCodigoTicket(registro.id),
    registro: {
      id:          registro.id,
      placa:       registro.placa,
      horaEntrada: registro.hora_entrada,
    },
    espacio: {
      id:     espacio.id,
      codigo: espacio.codigo,
    },
    tipoVehiculo: tipoVehiculo.nombre,
    operador: {
      id:     operador.id,
      nombre: operador.nombre,
    },
    generadoAt: new Date().toISOString(),
  };
}

/**
 * Construye el snapshot del ticket de SALIDA con información de cobro.
 */
function buildTicketSalida({ registro, espacio, tipoVehiculo, operador, calculo, tarifa }) {
  return {
    tipo:         'SALIDA',
    codigoTicket: generarCodigoTicket(registro.id),
    registro: {
      id:           registro.id,
      placa:        registro.placa,
      horaEntrada:  registro.hora_entrada,
      horaSalida:   registro.hora_salida,
    },
    espacio: {
      id:     espacio.id,
      codigo: espacio.codigo,
    },
    tipoVehiculo: tipoVehiculo.nombre,
    operador: {
      id:     operador.id,
      nombre: operador.nombre,
    },
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
