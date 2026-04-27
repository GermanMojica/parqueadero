// src/utils/placa.validator.js  — Frontend version (ES Module)

export const PAISES = {
  CO: {
    label: '🇨🇴 Colombia',
    tipos: [
      { nombre: 'Auto / Camioneta', regex: /^[A-Z]{3}[0-9]{3}$/, mascara: 'ABC-123', maxLen: 6, desc: '3 letras + 3 números' },
      { nombre: 'Moto (estándar)',   regex: /^[A-Z]{3}[0-9]{3}$/, mascara: 'ABC-123', maxLen: 6, desc: '3 letras + 3 números' },
      { nombre: 'Moto (antiguo)',    regex: /^[A-Z]{3}[0-9]{2}[A-Z]$/, mascara: 'ABC-12D', maxLen: 6, desc: '3 letras + 2 números + 1 letra' },
    ],
  },
  VE: { label: '🇻🇪 Venezuela', tipos: [
    { nombre: 'Particular', regex: /^[A-Z]{2}[0-9]{3}[A-Z]{2}$/, mascara: 'AB123CD', maxLen: 7, desc: '2L+3N+2L' },
    { nombre: 'Antiguo',    regex: /^[A-Z]{3}[0-9]{3}$/, mascara: 'ABC123', maxLen: 6, desc: '3L+3N' },
  ]},
  EC: { label: '🇪🇨 Ecuador', tipos: [
    { nombre: 'Particular', regex: /^[A-Z]{3}[0-9]{4}$/, mascara: 'ABC-1234', maxLen: 7, desc: '3L+4N' },
  ]},
  PE: { label: '🇵🇪 Perú', tipos: [
    { nombre: 'Nuevo',   regex: /^[A-Z]{3}[0-9]{3}$/, mascara: 'ABC-123', maxLen: 6, desc: '3L+3N' },
    { nombre: 'Antiguo', regex: /^[A-Z]{2}[0-9]{4}$/, mascara: 'AB-1234', maxLen: 6, desc: '2L+4N' },
  ]},
  BR: { label: '🇧🇷 Brasil', tipos: [
    { nombre: 'MERCOSUR', regex: /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/, mascara: 'ABC1D23', maxLen: 7, desc: '3L+1N+1L+2N' },
    { nombre: 'Antiguo',  regex: /^[A-Z]{3}[0-9]{4}$/, mascara: 'ABC1234', maxLen: 7, desc: '3L+4N' },
  ]},
  MX: { label: '🇲🇽 México', tipos: [
    { nombre: 'Federal', regex: /^[A-Z]{3}[0-9]{3}[A-Z]$/, mascara: 'ABC123D', maxLen: 7, desc: '3L+3N+1L' },
    { nombre: 'CDMX',   regex: /^[A-Z]{2}[0-9]{4}[A-Z]{2}$/, mascara: 'AB1234CD', maxLen: 8, desc: '2L+4N+2L' },
  ]},
  US: { label: '🇺🇸 USA', tipos: [
    { nombre: 'Estándar', regex: /^[A-Z0-9]{2,8}$/, mascara: 'ABC1234', maxLen: 8, desc: '2-8 alfanuméricos' },
  ]},
  AR: { label: '🇦🇷 Argentina', tipos: [
    { nombre: 'MERCOSUR', regex: /^[A-Z]{2}[0-9]{3}[A-Z]{2}$/, mascara: 'AB123CD', maxLen: 7, desc: '2L+3N+2L' },
    { nombre: 'Antiguo',  regex: /^[A-Z]{3}[0-9]{3}$/, mascara: 'ABC123', maxLen: 6, desc: '3L+3N' },
  ]},
  OTRO: { label: '🌍 Otro / Internacional', tipos: [
    { nombre: 'Libre (máx 10)', regex: /^[A-Z0-9\-]{2,10}$/, mascara: 'XXXXXXXXXX', maxLen: 10, desc: 'Letras, números y guiones' },
  ]},
};

export function validarPlaca(placa, paisCodigo = 'CO', tipoIdx = 0) {
  const normalizada = placa.toUpperCase().replace(/[\s\-.]/g, '');
  const pais = PAISES[paisCodigo];
  if (!pais) return { valida: false, mensaje: `País desconocido: ${paisCodigo}` };
  const tipo = pais.tipos[tipoIdx];
  if (!tipo) return { valida: false, mensaje: 'Tipo de placa no válido' };
  if (!normalizada) return { valida: false, mensaje: 'La placa no puede estar vacía' };
  if (normalizada.length > tipo.maxLen)
    return { valida: false, mensaje: `Excede el máximo de ${tipo.maxLen} caracteres para ${tipo.nombre}` };
  if (!tipo.regex.test(normalizada))
    return { valida: false, mensaje: `Formato inválido. Esperado: ${tipo.mascara} (${tipo.desc})` };
  return { valida: true, mensaje: '' };
}

export function normalizarPlaca(placa = '') {
  return placa.toUpperCase().replace(/[\s\-.]/g, '');
}

/** Aplica máscara visual ABC-123 mientras escribe (solo Colombia 6 chars) */
export function aplicarMascaraCO(valor = '') {
  const limpio = valor.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  if (limpio.length <= 3) return limpio;
  return `${limpio.slice(0, 3)}-${limpio.slice(3)}`;
}
