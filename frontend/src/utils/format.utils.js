// src/utils/format.utils.js

/** Formatea fecha a string legible: 15 Jun 2024, 10:32 */
export function formatFecha(fecha) {
  if (!fecha) return '—';
  return new Date(fecha).toLocaleString('es-CO', {
    day:    '2-digit',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/** Formatea solo la hora */
export function formatHora(fecha) {
  if (!fecha) return '—';
  return new Date(fecha).toLocaleTimeString('es-CO', {
    hour:   '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/** Formatea minutos totales como "Xh Ym" */
export function formatDuracion(minutos) {
  if (minutos == null) return '—';
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Formatea número como moneda COP */
export function formatMoneda(valor) {
  if (valor == null) return '—';
  return new Intl.NumberFormat('es-CO', {
    style:    'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(valor);
}

/** Normaliza placa a mayúsculas sin espacios */
export function normalizarPlaca(placa = '') {
  return placa.toUpperCase().replace(/\s/g, '');
}
