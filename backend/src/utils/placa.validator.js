// src/utils/placa.validator.js
// Validación de placas colombianas y de países seleccionados.
// Funciona en Node.js y en el navegador (sin dependencias externas).

// ─── Formatos por país ────────────────────────────────────────────────────────
// Cada entrada define:
//   label:    Nombre del país mostrado en UI
//   tipos:    Objetos { nombre, regex, mascara, ejemplo, maxLen }
//   ejemplo:  Ejemplo para mostrar en placeholder

const PAISES = {
  CO: {
    label: '🇨🇴 Colombia',
    tipos: [
      {
        nombre:  'Auto / Camioneta',
        regex:   /^[A-Z]{3}[0-9]{3}$/,
        mascara: 'ABC-123',
        ejemplo: 'ABC123',
        maxLen:  6,
        desc:    '3 letras + 3 números',
      },
      {
        nombre:  'Moto (estándar)',
        regex:   /^[A-Z]{3}[0-9]{3}$/,
        mascara: 'ABC-123',
        ejemplo: 'QRT456',
        maxLen:  6,
        desc:    '3 letras + 3 números',
      },
      {
        nombre:  'Moto (formato antiguo)',
        regex:   /^[A-Z]{3}[0-9]{2}[A-Z]$/,
        mascara: 'ABC-12D',
        ejemplo: 'QRT45D',
        maxLen:  6,
        desc:    '3 letras + 2 números + 1 letra',
      },
    ],
  },
  VE: {
    label: '🇻🇪 Venezuela',
    tipos: [
      {
        nombre:  'Particular',
        regex:   /^[A-Z]{2}[0-9]{3}[A-Z]{2}$/,
        mascara: 'AB123CD',
        ejemplo: 'AB123CD',
        maxLen:  7,
        desc:    '2 letras + 3 números + 2 letras',
      },
      {
        nombre:  'Antiguo',
        regex:   /^[A-Z]{3}[0-9]{3}$/,
        mascara: 'ABC123',
        ejemplo: 'ABC123',
        maxLen:  6,
        desc:    '3 letras + 3 números',
      },
    ],
  },
  EC: {
    label: '🇪🇨 Ecuador',
    tipos: [
      {
        nombre:  'Particular',
        regex:   /^[A-Z]{3}[0-9]{4}$/,
        mascara: 'ABC-1234',
        ejemplo: 'ABC1234',
        maxLen:  7,
        desc:    '3 letras + 4 números',
      },
    ],
  },
  PE: {
    label: '🇵🇪 Perú',
    tipos: [
      {
        nombre:  'Particular (nuevo)',
        regex:   /^[A-Z]{3}[0-9]{3}$/,
        mascara: 'ABC-123',
        ejemplo: 'ABC123',
        maxLen:  6,
        desc:    '3 letras + 3 números',
      },
      {
        nombre:  'Particular (antiguo)',
        regex:   /^[A-Z]{2}[0-9]{4}$/,
        mascara: 'AB-1234',
        ejemplo: 'AB1234',
        maxLen:  6,
        desc:    '2 letras + 4 números',
      },
    ],
  },
  BR: {
    label: '🇧🇷 Brasil',
    tipos: [
      {
        nombre:  'MERCOSUR (Mercado Común)',
        regex:   /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/,
        mascara: 'ABC1D23',
        ejemplo: 'ABC1D23',
        maxLen:  7,
        desc:    '3 letras + 1 número + 1 letra + 2 números',
      },
      {
        nombre:  'Antiguo',
        regex:   /^[A-Z]{3}[0-9]{4}$/,
        mascara: 'ABC-1234',
        ejemplo: 'ABC1234',
        maxLen:  7,
        desc:    '3 letras + 4 números',
      },
    ],
  },
  MX: {
    label: '🇲🇽 México',
    tipos: [
      {
        nombre:  'Federal moderno',
        regex:   /^[A-Z]{3}[0-9]{3}[A-Z]$/,
        mascara: 'ABC-123-D',
        ejemplo: 'ABC123D',
        maxLen:  7,
        desc:    '3 letras + 3 números + 1 letra',
      },
      {
        nombre:  'CDMX',
        regex:   /^[A-Z]{2}[0-9]{4}[A-Z]{2}$/,
        mascara: 'AB1234CD',
        ejemplo: 'AB1234CD',
        maxLen:  8,
        desc:    '2 letras + 4 números + 2 letras',
      },
    ],
  },
  US: {
    label: '🇺🇸 USA',
    tipos: [
      {
        nombre:  'Estándar (varía por estado)',
        regex:   /^[A-Z0-9]{2,8}$/,
        mascara: 'ABC-1234',
        ejemplo: 'ABC1234',
        maxLen:  8,
        desc:    'Entre 2 y 8 caracteres alfanuméricos',
      },
    ],
  },
  AR: {
    label: '🇦🇷 Argentina',
    tipos: [
      {
        nombre:  'MERCOSUR',
        regex:   /^[A-Z]{2}[0-9]{3}[A-Z]{2}$/,
        mascara: 'AB123CD',
        ejemplo: 'AB123CD',
        maxLen:  7,
        desc:    '2 letras + 3 números + 2 letras',
      },
      {
        nombre:  'Antiguo',
        regex:   /^[A-Z]{3}[0-9]{3}$/,
        mascara: 'ABC123',
        ejemplo: 'ABC123',
        maxLen:  6,
        desc:    '3 letras + 3 números',
      },
    ],
  },
  OTRO: {
    label: '🌍 Otro / Internacional',
    tipos: [
      {
        nombre:  'Libre (max 10 caracteres)',
        regex:   /^[A-Z0-9\-]{2,10}$/,
        mascara: 'XXXXXXXXXX',
        ejemplo: 'INT-001',
        maxLen:  10,
        desc:    'Letras, números y guiones — máx 10 caracteres',
      },
    ],
  },
};

/**
 * Valida una placa dado un país y un índice de tipo.
 * @param {string} placa      Valor normalizado (sin espacios, mayúsculas)
 * @param {string} paisCodigo Código del país (CO, VE, EC, ...)
 * @param {number} tipoIdx    Índice del tipo dentro de PAISES[paisCodigo].tipos
 * @returns {{ valida: boolean, mensaje: string }}
 */
function validarPlaca(placa, paisCodigo = 'CO', tipoIdx = 0) {
  const normalizada = placa.toUpperCase().replace(/[\s\-\.]/g, '');

  const pais = PAISES[paisCodigo];
  if (!pais) return { valida: false, mensaje: `País desconocido: ${paisCodigo}` };

  const tipo = pais.tipos[tipoIdx];
  if (!tipo) return { valida: false, mensaje: 'Tipo de placa no válido' };

  if (normalizada.length === 0)       return { valida: false, mensaje: 'La placa no puede estar vacía' };
  if (normalizada.length > tipo.maxLen) {
    return { valida: false, mensaje: `Excede el máximo de ${tipo.maxLen} caracteres para ${tipo.nombre}` };
  }
  if (!tipo.regex.test(normalizada)) {
    return { valida: false, mensaje: `Formato inválido para ${tipo.nombre}. Formato esperado: ${tipo.mascara} (${tipo.desc})` };
  }

  return { valida: true, mensaje: '' };
}

/**
 * Normaliza la placa: elimina espacios, guiones y convierte a mayúsculas.
 */
function normalizarPlaca(placa = '') {
  return placa.toUpperCase().replace(/[\s\-\.]/g, '');
}

/**
 * Aplica la máscara visual mientras el usuario escribe.
 * Solo para Colombia CO (ABC-123): inserta guión después de 3 letras.
 */
function aplicarMascaraCO(valor = '') {
  const limpio = valor.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (limpio.length <= 3) return limpio;
  return `${limpio.slice(0, 3)}-${limpio.slice(3, 6)}`;
}

module.exports = { PAISES, validarPlaca, normalizarPlaca, aplicarMascaraCO };
