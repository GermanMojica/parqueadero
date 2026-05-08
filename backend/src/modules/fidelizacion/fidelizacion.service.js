const repo = require('./fidelizacion.repository');
const AppError = require('../../utils/AppError');
const crypto = require('crypto');

function generarCodigoTarjeta() {
  return crypto.randomBytes(6).toString('hex').toUpperCase(); // 12 chars
}

async function getReglas() {
  return repo.findAllReglas();
}

async function determinarNivel(puntos, reglas) {
  // Las reglas vienen ordenadas por puntos_minimo_canje ASC (BRONCE, PLATA, ORO, PLATINO)
  let nivelAsignado = 'BRONCE';
  for (const regla of reglas) {
    if (puntos >= regla.puntos_minimo_canje) {
      nivelAsignado = regla.nivel;
    }
  }
  return nivelAsignado;
}

async function crearTarjeta(placa) {
  const p = placa.toUpperCase();
  const existente = await repo.findTarjetaByPlaca(p);
  if (existente) throw new AppError('Ya existe una tarjeta para esta placa', 400);

  const codigo = generarCodigoTarjeta();
  const id = await repo.createTarjeta(codigo, p);
  return { id, codigo, placa: p, nivel: 'BRONCE', puntos_acumulados: 0 };
}

async function consultarPorCodigoOPlaca(idOrPlaca) {
  const val = idOrPlaca.toUpperCase();
  let tarjeta = await repo.findTarjetaByCodigo(val);
  if (!tarjeta) tarjeta = await repo.findTarjetaByPlaca(val);
  if (!tarjeta) throw new AppError('Tarjeta no encontrada', 404);
  return tarjeta;
}

async function calcularPuntosGanados(horasFacturadas, nivelActual) {
  const reglas = await repo.findAllReglas();
  const regla = reglas.find(r => r.nivel === nivelActual);
  if (!regla) return 0;
  return horasFacturadas * regla.puntos_por_hora;
}

// Se llama desde registros.service.js en registrarSalida()
async function procesarSalida(placa, horasFacturadas, registroId, conn) {
  const tarjeta = await repo.findTarjetaByPlaca(placa);
  if (!tarjeta) return null; // No es cliente fidelizado

  const reglas = await repo.findAllReglas();
  const reglaActual = reglas.find(r => r.nivel === tarjeta.nivel);
  
  if (reglaActual && reglaActual.puntos_por_hora > 0 && horasFacturadas > 0) {
    const puntosGanados = horasFacturadas * reglaActual.puntos_por_hora;
    const nuevosPuntos = tarjeta.puntos_acumulados + puntosGanados;
    const nuevoNivel = await determinarNivel(nuevosPuntos, reglas);

    await repo.updateTarjetaNivelYPuntos(tarjeta.id, nuevosPuntos, nuevoNivel, conn);
    await repo.createMovimiento({
      tarjetaId: tarjeta.id,
      registroId,
      puntos: puntosGanados,
      tipo: 'ACUMULO',
      descripcion: `Acumulados por ${horasFacturadas} horas`
    }, conn);

    return {
      puntosGanados,
      nuevosPuntos,
      nuevoNivel,
      subioDeNivel: nuevoNivel !== tarjeta.nivel
    };
  }
  return null;
}

async function aplicarCanje(placa, puntosACanjear, registroId, conn) {
  const tarjeta = await repo.findTarjetaByPlaca(placa);
  if (!tarjeta) throw new AppError('Tarjeta no encontrada', 404);
  if (tarjeta.puntos_acumulados < puntosACanjear) {
    throw new AppError('Puntos insuficientes', 400);
  }

  const nuevosPuntos = tarjeta.puntos_acumulados - puntosACanjear;
  const reglas = await repo.findAllReglas();
  const nuevoNivel = await determinarNivel(nuevosPuntos, reglas);

  await repo.updateTarjetaNivelYPuntos(tarjeta.id, nuevosPuntos, nuevoNivel, conn);
  await repo.createMovimiento({
    tarjetaId: tarjeta.id,
    registroId,
    puntos: puntosACanjear,
    tipo: 'CANJE',
    descripcion: 'Canje de puntos por descuento'
  }, conn);

  return { puntosRestantes: nuevosPuntos, nivel: nuevoNivel };
}

async function getDashboardData() {
  const reglas = await repo.findAllReglas();
  const topClientes = await repo.findTopClientes(10);
  const tarjetas = await repo.findAllTarjetas();
  return { reglas, topClientes, tarjetas };
}

module.exports = {
  getReglas,
  crearTarjeta,
  consultarPorCodigoOPlaca,
  calcularPuntosGanados,
  procesarSalida,
  aplicarCanje,
  getDashboardData
};
