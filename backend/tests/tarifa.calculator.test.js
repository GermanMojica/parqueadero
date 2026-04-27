// tests/tarifa.calculator.test.js
// Tests unitarios para la lógica crítica de cálculo de tarifas.
// Ejecutar con: node tests/tarifa.calculator.test.js
// (No requiere framework externo — usa asserts nativos de Node.js)

const assert = require('assert');
const {
  calcularTarifaConTramos,
  aplicarDescuento,
  calcularTarifaPreliminar,
} = require('../src/utils/tarifa.calculator');

let passed = 0;
let failed  = 0;

function test(nombre, fn) {
  try {
    fn();
    console.log(`  ✅ ${nombre}`);
    passed++;
  } catch (e) {
    console.error(`  ❌ ${nombre}`);
    console.error(`     → ${e.message}`);
    failed++;
  }
}

function cerca(a, b, tolerancia = 0.01) {
  return Math.abs(a - b) <= tolerancia;
}

// ─── SUITE 1: Fracción mínima ────────────────────────────────────────────────
console.log('\n📦 Suite 1: Fracción mínima y permanencia corta');

test('Permanencia de 5 min → cobra 1 fracción de 15 min', () => {
  const e = new Date('2024-06-15T10:00:00Z');
  const s = new Date('2024-06-15T10:05:00Z');
  const r = calcularTarifaConTramos({ horaEntrada: e, horaSalida: s, precioHoraBase: 3000, fraccionMinutos: 15 });
  // 15/60 * 3000 = 750
  assert.ok(cerca(r.total, 750), `Esperado ~750, got ${r.total}`);
  assert.strictEqual(r.minutosTotales, 5);
});

test('Permanencia exacta de 15 min → cobra 1 fracción', () => {
  const e = new Date('2024-06-15T10:00:00Z');
  const s = new Date('2024-06-15T10:15:00Z');
  const r = calcularTarifaConTramos({ horaEntrada: e, horaSalida: s, precioHoraBase: 3000, fraccionMinutos: 15 });
  assert.ok(cerca(r.total, 750), `Esperado ~750, got ${r.total}`);
});

test('Permanencia de 16 min → cobra 2 fracciones (30 min)', () => {
  const e = new Date('2024-06-15T10:00:00Z');
  const s = new Date('2024-06-15T10:16:00Z');
  const r = calcularTarifaConTramos({ horaEntrada: e, horaSalida: s, precioHoraBase: 3000, fraccionMinutos: 15 });
  // 30/60 * 3000 = 1500
  assert.ok(cerca(r.total, 1500), `Esperado ~1500, got ${r.total}`);
});

test('Permanencia exacta de 60 min → cobra 1 hora exacta', () => {
  const e = new Date('2024-06-15T10:00:00Z');
  const s = new Date('2024-06-15T11:00:00Z');
  const r = calcularTarifaConTramos({ horaEntrada: e, horaSalida: s, precioHoraBase: 3000, fraccionMinutos: 15 });
  assert.ok(cerca(r.total, 3000), `Esperado ~3000, got ${r.total}`);
});

test('Permanencia de 75 min → cobra 1.25 horas', () => {
  const e = new Date('2024-06-15T10:00:00Z');
  const s = new Date('2024-06-15T11:15:00Z');
  const r = calcularTarifaConTramos({ horaEntrada: e, horaSalida: s, precioHoraBase: 3000, fraccionMinutos: 15 });
  // 5 fracciones de 15min = 75min = 1.25h * 3000 = 3750
  assert.ok(cerca(r.total, 3750), `Esperado ~3750, got ${r.total}`);
});

test('Fracción de 30 min: 31 min → cobra 60 min', () => {
  const e = new Date('2024-06-15T10:00:00Z');
  const s = new Date('2024-06-15T10:31:00Z');
  const r = calcularTarifaConTramos({ horaEntrada: e, horaSalida: s, precioHoraBase: 4000, fraccionMinutos: 30 });
  // 2 fracciones de 30min = 60min = 1h * 4000 = 4000
  assert.ok(cerca(r.total, 4000), `Esperado ~4000, got ${r.total}`);
});

// ─── SUITE 2: Tarifas especiales (nocturna) ──────────────────────────────────
console.log('\n🌙 Suite 2: Tarifas especiales y tramos horarios');

const tarifaNocturna = [{
  id: 1, tipo_vehiculo_id: 1, nombre: 'Nocturna',
  precio_hora: 2000, hora_inicio: '22:00', hora_fin: '06:00',
  aplica_lunes: 1, aplica_martes: 1, aplica_miercoles: 1,
  aplica_jueves: 1, aplica_viernes: 1, aplica_sabado: 1, aplica_domingo: 1,
  activo: 1,
}];

test('Entrada diurna pura → usa solo tarifa base', () => {
  const e = new Date('2024-06-15T08:00:00Z');
  const s = new Date('2024-06-15T10:00:00Z');
  const r = calcularTarifaConTramos({
    horaEntrada: e, horaSalida: s, precioHoraBase: 3000,
    fraccionMinutos: 15, tarifasEspeciales: tarifaNocturna,
  });
  assert.ok(cerca(r.total, 6000), `Esperado ~6000, got ${r.total}`);
  assert.strictEqual(r.tarifaEspecialAplicada, false);
});

test('Entrada nocturna pura (23:00 – 01:00) → usa tarifa especial', () => {
  const e = new Date('2024-06-15T23:00:00');
  const s = new Date('2024-06-16T01:00:00');
  const r = calcularTarifaConTramos({
    horaEntrada: e, horaSalida: s, precioHoraBase: 3000,
    fraccionMinutos: 15, tarifasEspeciales: tarifaNocturna,
  });
  // 2h * 2000 = 4000
  assert.ok(cerca(r.total, 4000), `Esperado ~4000, got ${r.total}`);
  assert.strictEqual(r.tarifaEspecialAplicada, true);
});

test('Entrada mixta (21:00 – 23:00): 1h base + 1h nocturna', () => {
  const e = new Date('2024-06-15T21:00:00');
  const s = new Date('2024-06-15T23:00:00');
  const r = calcularTarifaConTramos({
    horaEntrada: e, horaSalida: s, precioHoraBase: 3000,
    fraccionMinutos: 15, tarifasEspeciales: tarifaNocturna,
  });
  // 1h * 3000 + 1h * 2000 = 5000
  assert.ok(cerca(r.total, 5000), `Esperado ~5000, got ${r.total}`);
  assert.strictEqual(r.tarifaEspecialAplicada, true);
});

test('Sin tarifas especiales → cálculo normal', () => {
  const e = new Date('2024-06-15T22:30:00');
  const s = new Date('2024-06-16T00:30:00');
  const r = calcularTarifaConTramos({
    horaEntrada: e, horaSalida: s, precioHoraBase: 3000,
    fraccionMinutos: 15, tarifasEspeciales: [],
  });
  assert.ok(cerca(r.total, 6000), `Esperado ~6000, got ${r.total}`);
  assert.strictEqual(r.tarifaEspecialAplicada, false);
});

// ─── SUITE 3: Descuentos ─────────────────────────────────────────────────────
console.log('\n🏷️  Suite 3: Descuentos y cortesías');

test('Descuento 50% PORCENTAJE sobre $6000 → $3000', () => {
  const r = aplicarDescuento(6000, { tipo_calculo: 'PORCENTAJE', valor: 50 });
  assert.ok(cerca(r.totalDespues, 3000), `got ${r.totalDespues}`);
  assert.ok(cerca(r.valorDescuento, 3000), `got ${r.valorDescuento}`);
});

test('Descuento 100% (cortesía total) → $0', () => {
  const r = aplicarDescuento(5000, { tipo_calculo: 'PORCENTAJE', valor: 100 });
  assert.strictEqual(r.totalDespues, 0);
  assert.ok(cerca(r.valorDescuento, 5000));
});

test('Descuento VALOR_FIJO $2000 sobre $5000 → $3000', () => {
  const r = aplicarDescuento(5000, { tipo_calculo: 'VALOR_FIJO', valor: 2000 });
  assert.ok(cerca(r.totalDespues, 3000), `got ${r.totalDespues}`);
});

test('Descuento VALOR_FIJO no puede exceder el total → mínimo $0', () => {
  const r = aplicarDescuento(1000, { tipo_calculo: 'VALOR_FIJO', valor: 9999 });
  assert.strictEqual(r.totalDespues, 0);
  assert.ok(cerca(r.valorDescuento, 1000));
});

test('MINUTOS_GRATIS 60 min sobre 90 min a $3000/h, fracción 15', () => {
  // 60 min gratis = 4 fracciones = 1h * 3000 = 3000 de descuento
  // total original (90min) = 6 fracciones = 1.5h * 3000 = 4500
  // totalDespues = 4500 - 3000 = 1500
  const r = aplicarDescuento(4500, { tipo_calculo: 'MINUTOS_GRATIS', valor: 60 }, 90, 3000, 15);
  assert.ok(cerca(r.totalDespues, 1500), `got ${r.totalDespues}`);
  assert.ok(cerca(r.valorDescuento, 3000), `got ${r.valorDescuento}`);
});

test('MINUTOS_GRATIS no puede descontar más del total', () => {
  // Primera hora gratis sobre una estadía de 30 min
  const r = aplicarDescuento(750, { tipo_calculo: 'MINUTOS_GRATIS', valor: 60 }, 30, 3000, 15);
  assert.strictEqual(r.totalDespues, 0);
});

// ─── SUITE 4: Edge cases de validación ──────────────────────────────────────
console.log('\n⚠️  Suite 4: Edge cases y validaciones');

test('Lanza error si salida antes que entrada', () => {
  const e = new Date('2024-06-15T12:00:00Z');
  const s = new Date('2024-06-15T10:00:00Z');
  assert.throws(
    () => calcularTarifaConTramos({ horaEntrada: e, horaSalida: s, precioHoraBase: 3000 }),
    /posterior/,
  );
});

test('Lanza error si fecha inválida', () => {
  assert.throws(
    () => calcularTarifaConTramos({ horaEntrada: 'no-es-fecha', horaSalida: new Date(), precioHoraBase: 3000 }),
    /inválidas/,
  );
});

test('Permanencia de exactamente 0 min → error (salida = entrada)', () => {
  const t = new Date('2024-06-15T10:00:00Z');
  assert.throws(
    () => calcularTarifaConTramos({ horaEntrada: t, horaSalida: t, precioHoraBase: 3000 }),
    /posterior/,
  );
});

test('Permanencia muy larga (48h) → cálculo correcto', () => {
  const e = new Date('2024-06-15T08:00:00Z');
  const s = new Date('2024-06-17T08:00:00Z');
  const r = calcularTarifaConTramos({ horaEntrada: e, horaSalida: s, precioHoraBase: 1000, fraccionMinutos: 15 });
  // 48h * 1000 = 48000
  assert.ok(cerca(r.total, 48000, 1), `got ${r.total}`);
  assert.strictEqual(r.minutosTotales, 48 * 60);
});

test('Tipo de descuento desconocido lanza error', () => {
  assert.throws(
    () => aplicarDescuento(1000, { tipo_calculo: 'TIPO_INVENTADO', valor: 10 }),
    /desconocido/,
  );
});

// ─── Resumen ─────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Resultado: ${passed} pasados, ${failed} fallidos`);
if (failed > 0) {
  console.error('❌ Hay tests fallando. Revisar la lógica antes de continuar.');
  process.exit(1);
} else {
  console.log('✅ Todos los tests pasaron.\n');
}
