// src/utils/tarifa.calculator.js
// Lógica pura de cálculo de tiempo y precio.
// Sin dependencias de Express, DB ni ningún otro módulo del sistema.
// Fácilmente testeable en aislamiento.

/**
 * Calcula el total a cobrar dado el tiempo de permanencia y la tarifa.
 *
 * Lógica de fracciones:
 * - El tiempo se divide en bloques de `fraccionMinutos`
 * - Cada bloque iniciado se cobra completo (techo, no piso)
 * - Ejemplo con fraccion=15:
 *     5 min  → 1 bloque  → 0.25 h → precio * 0.25
 *    15 min  → 1 bloque  → 0.25 h
 *    16 min  → 2 bloques → 0.50 h
 *    60 min  → 4 bloques → 1.00 h
 *    75 min  → 5 bloques → 1.25 h
 *
 * @param {Date|string} horaEntrada
 * @param {Date|string} horaSalida
 * @param {number}      precioHora       Precio por hora completa
 * @param {number}      fraccionMinutos  Unidad mínima cobrable en minutos
 * @returns {{ minutosTotales: number, fraccionesUsadas: number, total: number }}
 */
function calcularTarifa(horaEntrada, horaSalida, precioHora, fraccionMinutos = 15) {
  const entrada = new Date(horaEntrada);
  const salida  = new Date(horaSalida);

  if (isNaN(entrada.getTime()) || isNaN(salida.getTime())) {
    throw new Error('calcularTarifa: fechas inválidas');
  }
  if (salida <= entrada) {
    throw new Error('calcularTarifa: hora_salida debe ser posterior a hora_entrada');
  }

  const minutosTotales = Math.floor((salida - entrada) / 60_000); // ms → min

  // Bloques iniciados (techo)
  const fraccionesUsadas = Math.ceil(minutosTotales / fraccionMinutos);

  // Costo proporcional: cada fracción vale (fraccionMinutos/60) horas
  const horasFacturadas = (fraccionesUsadas * fraccionMinutos) / 60;
  const total = parseFloat((precioHora * horasFacturadas).toFixed(2));

  return { minutosTotales, fraccionesUsadas, total };
}

/**
 * Calcula una estimación preliminar con la hora actual (para preview en taquilla).
 */
function calcularTarifaPreliminar(horaEntrada, precioHora, fraccionMinutos = 15) {
  return calcularTarifa(horaEntrada, new Date(), precioHora, fraccionMinutos);
}

module.exports = { calcularTarifa, calcularTarifaPreliminar };
