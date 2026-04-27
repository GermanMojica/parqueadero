// src/modules/registros/registros.service.js
// ⚠️  CAPA CRÍTICA — Aquí viven las reglas de negocio RN-01 a RN-06
// Toda operación de entrada/salida ocurre dentro de transacciones MySQL.

const { withTransaction, pool } = require('../../config/db');
const registrosRepo        = require('./registros.repository');
const espaciosRepo         = require('../espacios/espacios.repository');
const tarifasRepo          = require('../tarifas/tarifas.repository');
const ticketsRepo          = require('../tickets/tickets.repository');
const auditoriaRepo        = require('../auditoria/auditoria.repository');
const { calcularTarifaConTramos, calcularTarifaPreliminar } = require('../../utils/tarifa.calculator');
const { buildTicketEntrada, buildTicketSalida, generarCodigoTicket } = require('../../utils/ticket.generator');
const AppError             = require('../../utils/AppError');

// Carga tarifas especiales activas (se cachea 5 min para no hacer query en cada operación)
let _tarifasEspecialesCache = null;
let _cacheTs = 0;
async function _getTarifasEspeciales() {
  if (_tarifasEspecialesCache && Date.now() - _cacheTs < 5 * 60_000) return _tarifasEspecialesCache;
  const [rows] = await pool.execute(
    'SELECT * FROM tarifas_especiales WHERE activo = 1',
  );
  _tarifasEspecialesCache = rows;
  _cacheTs = Date.now();
  return rows;
}

// ─── REGISTRAR ENTRADA ────────────────────────────────────────────────────────
async function registrarEntrada({ placa, tipoVehiculoId, usuarioId }) {
  return withTransaction(async (conn) => {

    // RN-02: No puede haber registro abierto con la misma placa
    const registroExistente = await registrosRepo.findAbiertoPorPlaca(placa);
    if (registroExistente) {
      throw new AppError(
        `El vehículo con placa ${placa.toUpperCase()} ya tiene un registro activo (espacio ${registroExistente.espacio_codigo})`,
        409,
      );
    }

    // RN-01: Debe haber cupo disponible — SELECT FOR UPDATE previene race condition
    const espacio = await espaciosRepo.findDisponibleByTipo(tipoVehiculoId, conn);
    if (!espacio) {
      throw new AppError('No hay cupos disponibles para este tipo de vehículo', 409);
    }

    // Marcar espacio como OCUPADO (dentro de la transacción)
    await espaciosRepo.setEstado(espacio.id, 'OCUPADO', conn);

    // Crear el registro de entrada
    const registroId = await registrosRepo.createEntrada(
      { espacioId: espacio.id, placa, tipoVehiculoId, usuarioEntradaId: usuarioId },
      conn,
    );

    // Obtener datos completos del registro recién creado para el ticket
    // Nota: usamos pool directo porque la transacción aún no hizo commit,
    // pero el INSERT ya es visible dentro de la misma conexión
    const [rows] = await conn.execute(
      `SELECT r.*, e.codigo AS espacio_codigo, tv.nombre AS tipo_vehiculo,
              u.nombre AS operador_nombre
       FROM registros r
       JOIN espacios e       ON e.id  = r.espacio_id
       JOIN tipos_vehiculo tv ON tv.id = r.tipo_vehiculo_id
       JOIN usuarios u        ON u.id  = r.usuario_entrada_id
       WHERE r.id = ?`,
      [registroId],
    );
    const registro = rows[0];

    // Generar ticket de entrada (async — genera QR)
    const datosTicket = await buildTicketEntrada({
      registro,
      espacio:      { id: espacio.id, codigo: espacio.codigo },
      tipoVehiculo: { nombre: registro.tipo_vehiculo },
      operador:     { id: usuarioId, nombre: registro.operador_nombre },
    });

    const codigoTicket = generarCodigoTicket(registroId);
    await ticketsRepo.create({
      registroId,
      codigoTicket,
      tipo: 'ENTRADA',
      datosJson: datosTicket,
    }, conn);

    // Log de auditoría (no falla la transacción si falla el log)
    await auditoriaRepo.log({
      usuarioId: usuarioId,
      accion:    'ENTRADA',
      entidad:   'registros',
      entidadId: registroId,
      detalle:   { placa: placa.toUpperCase(), espacio: espacio.codigo, tipoVehiculoId },
    }, conn);

    return { registroId, espacio: espacio.codigo, ticket: datosTicket };
  });
}

// ─── PREVIEW DE SALIDA (sin modificar nada) ───────────────────────────────────
async function previewSalida(placa) {
  const registro = await registrosRepo.findAbiertoPorPlaca(placa);
  if (!registro) {
    throw new AppError(`No hay registro activo para la placa ${placa.toUpperCase()}`, 404);
  }

  // Tarifa vigente actual para preview
  const tarifa = await tarifasRepo.findVigentePorTipo(registro.tipo_vehiculo_id);
  if (!tarifa) {
    throw new AppError('No existe tarifa configurada para este tipo de vehículo', 500);
  }

  const calculo = calcularTarifaPreliminar(
    registro.hora_entrada,
    tarifa.precio_hora,
    tarifa.fraccion_minutos,
  );

  return {
    registro: {
      id:          registro.id,
      placa:       registro.placa,
      espacio:     registro.espacio_codigo,
      tipoVehiculo: registro.tipo_vehiculo,
      horaEntrada: registro.hora_entrada,
    },
    calculo: {
      horaActual:      new Date().toISOString(),
      minutosTotales:  calculo.minutosTotales,
      tarifaHora:      tarifa.precio_hora,
      fraccionMinutos: tarifa.fraccion_minutos,
      totalEstimado:   calculo.total,
    },
  };
}

// ─── REGISTRAR SALIDA ─────────────────────────────────────────────────────────
async function registrarSalida({ placa, usuarioId }) {
  return withTransaction(async (conn) => {

    // Buscar registro activo
    const registro = await registrosRepo.findAbiertoPorPlaca(placa);
    if (!registro) {
      throw new AppError(`No hay registro activo para la placa ${placa.toUpperCase()}`, 404);
    }

    const horaSalida = new Date();

    // RN-06: Tarifa vigente en el MOMENTO del cierre (no la de entrada)
    const tarifa = await tarifasRepo.findVigentePorTipo(registro.tipo_vehiculo_id);
    if (!tarifa) {
      throw new AppError('No existe tarifa configurada para este tipo de vehículo', 500);
    }

    // Cargar tarifas especiales para cálculo por tramos
    const tarifasEspeciales = await _getTarifasEspeciales();
    const teDelTipo = tarifasEspeciales.filter(te => te.tipo_vehiculo_id === registro.tipo_vehiculo_id);

    // Cálculo final de cobro con soporte de tramos horarios
    const calculo = calcularTarifaConTramos({
      horaEntrada:       registro.hora_entrada,
      horaSalida,
      precioHoraBase:    tarifa.precio_hora,
      fraccionMinutos:   tarifa.fraccion_minutos,
      tarifasEspeciales: teDelTipo,
    });

    // RN-04: Cierre atómico — todo o nada
    // 1. Cerrar registro con snapshot de tarifa
    await registrosRepo.cerrarRegistro({
      id:                  registro.id,
      horaSalida,
      minutosTotal:        calculo.minutosTotales,
      tarifaId:            tarifa.id,
      tarifaValorAplicado: tarifa.precio_hora,   // Snapshot del precio/hora
      totalCobrado:        calculo.total,
      usuarioSalidaId:     usuarioId,
    }, conn);

    // 2. Liberar el espacio
    await espaciosRepo.setEstado(registro.espacio_id, 'DISPONIBLE', conn);

    // 3. Generar ticket de salida (async — genera QR)
    const datosTicket = await buildTicketSalida({
      registro: { ...registro, hora_salida: horaSalida },
      espacio:      { id: registro.espacio_id, codigo: registro.espacio_codigo },
      tipoVehiculo: { nombre: registro.tipo_vehiculo },
      operador:     { id: usuarioId, nombre: 'Operador' }, // se mejora con join si se necesita
      calculo,
      tarifa,
    });

    const codigoTicket = generarCodigoTicket(registro.id) + '-S';
    await ticketsRepo.create({
      registroId:  registro.id,
      codigoTicket,
      tipo:        'SALIDA',
      datosJson:   datosTicket,
    }, conn);

    // Log de auditoría
    await auditoriaRepo.log({
      usuarioId,
      accion:    'SALIDA',
      entidad:   'registros',
      entidadId: registro.id,
      detalle: {
        placa:          registro.placa,
        minutos:        calculo.minutosTotales,
        total:          calculo.total,
        tarifaEspecial: calculo.tarifaEspecialAplicada,
      },
    }, conn);

    return {
      registroId: registro.id,
      placa:      registro.placa,
      espacio:    registro.espacio_codigo,
      calculo: {
        horaEntrada:     registro.hora_entrada,
        horaSalida,
        minutosTotales:  calculo.minutosTotales,
        tarifaHora:      tarifa.precio_hora,
        fraccionMinutos: tarifa.fraccion_minutos,
        totalCobrado:    calculo.total,
      },
      ticket: datosTicket,
    };
  });
}

// ─── HISTORIAL ────────────────────────────────────────────────────────────────
async function getHistorial(filtros) {
  const limit  = Math.min(Number(filtros.limit)  || 20, 100);
  const offset = Number(filtros.offset) || 0;
  return registrosRepo.findAll({ ...filtros, limit, offset });
}

async function getById(id) {
  const registro = await registrosRepo.findById(id);
  if (!registro) throw new AppError('Registro no encontrado', 404);
  return registro;
}

// ─── ANULAR REGISTRO (solo admin) ─────────────────────────────────────────────
async function anular(id, { observaciones, usuarioId }) {
  return withTransaction(async (conn) => {
    const registro = await registrosRepo.findById(id);
    if (!registro) throw new AppError('Registro no encontrado', 404);

    if (registro.estado === 'CERRADO') {
      throw new AppError('No se puede anular un registro ya cerrado', 409);
    }
    if (registro.estado === 'ANULADO') {
      throw new AppError('El registro ya está anulado', 409);
    }

    // Liberar el espacio si estaba ocupado
    await espaciosRepo.setEstado(registro.espacio_id, 'DISPONIBLE', conn);
    await registrosRepo.anular(id, observaciones || `Anulado por usuario ID ${usuarioId}`);

    return { message: 'Registro anulado correctamente', registroId: id };
  });
}

module.exports = { registrarEntrada, previewSalida, registrarSalida, getHistorial, getById, anular };
