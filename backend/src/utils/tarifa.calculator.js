// src/utils/tarifa.calculator.js  — VERSIÓN EXTENDIDA
// Lógica pura. Sin dependencias de Express, DB ni ningún módulo del sistema.
// Soporta: fracciones, mínimo cobrable, tarifa nocturna, cálculo por tramos.

/**
 * Calcula el cobro dividiendo la permanencia en tramos horarios.
 * Detecta automáticamente si aplica tarifa especial en cada tramo.
 */
function calcularTarifaConTramos(params) {
  const {
    horaEntrada, horaSalida, precioHoraBase,
    fraccionMinutos = 15, tarifasEspeciales = [],
  } = params;

  const entrada = new Date(horaEntrada);
  const salida  = new Date(horaSalida);
  _validarFechas(entrada, salida);

  const minutosTotales = Math.floor((salida - entrada) / 60_000);

  // Permanencia menor a la fracción mínima → cobra 1 fracción completa
  if (minutosTotales < fraccionMinutos) {
    const total = _precioFraccion(precioHoraBase, fraccionMinutos);
    return {
      minutosTotales, fraccionesUsadas: 1, total,
      tramos: [{ desde: entrada, hasta: salida, precioHora: precioHoraBase, minutos: minutosTotales, cobro: total }],
      tarifaEspecialAplicada: false,
    };
  }

  // Dividir en tramos de 1 hora máximo
  const tramos = _dividirEnTramos(entrada, salida, tarifasEspeciales, precioHoraBase);
  let totalAcumulado = 0;
  let tarifaEspecialUsada = false;

  tramos.forEach((tramo, i) => {
    const esUltimo = i === tramos.length - 1;
    if (esUltimo && tramo.minutos % 60 !== 0) {
      // Último tramo incompleto: aplicar techo de fracción
      const fracciones = Math.ceil(tramo.minutos / fraccionMinutos);
      const horasFacturadas = (fracciones * fraccionMinutos) / 60;
      tramo.cobro = parseFloat((tramo.precioHora * horasFacturadas).toFixed(2));
    } else {
      tramo.cobro = parseFloat((tramo.precioHora * (tramo.minutos / 60)).toFixed(2));
    }
    if (tramo.esTarifaEspecial) tarifaEspecialUsada = true;
    totalAcumulado += tramo.cobro;
  });

  return {
    minutosTotales,
    fraccionesUsadas: Math.ceil(minutosTotales / fraccionMinutos),
    total: parseFloat(totalAcumulado.toFixed(2)),
    tramos,
    tarifaEspecialAplicada: tarifaEspecialUsada,
  };
}

/**
 * Aplica un descuento al total calculado.
 * Tipos soportados: PORCENTAJE, VALOR_FIJO, MINUTOS_GRATIS
 */
function aplicarDescuento(total, tipoDescuento, minutosTotal = 0, precioHoraBase = 0, fraccionMinutos = 15) {
  let valorDescuento = 0;

  switch (tipoDescuento.tipo_calculo) {
    case 'PORCENTAJE':
      valorDescuento = parseFloat((total * (tipoDescuento.valor / 100)).toFixed(2));
      break;
    case 'VALOR_FIJO':
      valorDescuento = Math.min(Number(tipoDescuento.valor), total);
      break;
    case 'MINUTOS_GRATIS': {
      const minutosGratis = Math.min(tipoDescuento.valor, minutosTotal);
      const fracciones    = Math.ceil(minutosGratis / fraccionMinutos);
      const horasGratis   = (fracciones * fraccionMinutos) / 60;
      valorDescuento = Math.min(parseFloat((precioHoraBase * horasGratis).toFixed(2)), total);
      break;
    }
    default:
      throw new Error(`tipo_calculo desconocido: ${tipoDescuento.tipo_calculo}`);
  }

  const totalDespues = parseFloat(Math.max(0, total - valorDescuento).toFixed(2));
  return {
    totalAntes: total,
    valorDescuento: parseFloat(valorDescuento.toFixed(2)),
    totalDespues,
  };
}

/** Preview con hora actual para taquilla */
function calcularTarifaPreliminar(horaEntrada, precioHora, fraccionMinutos = 15) {
  return calcularTarifaConTramos({
    horaEntrada, horaSalida: new Date(),
    precioHoraBase: precioHora, fraccionMinutos,
  });
}

// ── Helpers privados ──────────────────────────────────────────────────────────

function _validarFechas(entrada, salida) {
  if (isNaN(entrada.getTime()) || isNaN(salida.getTime()))
    throw new Error('calcularTarifa: fechas inválidas');
  if (salida <= entrada)
    throw new Error('calcularTarifa: hora_salida debe ser posterior a hora_entrada');
}

function _dividirEnTramos(entrada, salida, tarifasEspeciales, precioBase) {
  const tramos = [];
  let cursor = new Date(entrada);
  while (cursor < salida) {
    const finTramo = new Date(Math.min(cursor.getTime() + 60 * 60_000, salida.getTime()));
    const minutos  = Math.round((finTramo - cursor) / 60_000);
    const especial = _tarifaEspecialActiva(cursor, tarifasEspeciales);
    tramos.push({
      desde: new Date(cursor), hasta: new Date(finTramo),
      minutos, precioHora: especial ? especial.precio_hora : precioBase,
      esTarifaEspecial: !!especial,
      nombreTarifa: especial?.nombre ?? 'Base', cobro: 0,
    });
    cursor = finTramo;
  }
  return tramos;
}

function _tarifaEspecialActiva(momento, tarifasEspeciales) {
  if (!tarifasEspeciales?.length) return null;
  const hhmm = momento.getHours() * 60 + momento.getMinutes();
  const diaSemana = momento.getDay(); // 0=dom...6=sab
  const diasProps = ['aplica_domingo','aplica_lunes','aplica_martes',
                     'aplica_miercoles','aplica_jueves','aplica_viernes','aplica_sabado'];
  for (const te of tarifasEspeciales) {
    if (!te.activo || !te[diasProps[diaSemana]]) continue;
    const ini = _timeToMin(te.hora_inicio);
    const fin = _timeToMin(te.hora_fin);
    const enRango = ini <= fin ? hhmm >= ini && hhmm < fin : hhmm >= ini || hhmm < fin;
    if (enRango) return te;
  }
  return null;
}

function _timeToMin(str = '00:00') {
  const [h, m] = str.split(':').map(Number);
  return h * 60 + (m || 0);
}

function _precioFraccion(precioHora, fraccionMinutos) {
  return parseFloat((precioHora * (fraccionMinutos / 60)).toFixed(2));
}

module.exports = { calcularTarifaConTramos, aplicarDescuento, calcularTarifaPreliminar };
