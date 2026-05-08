// src/modules/reportes/reportes.controller.js
const service = require('./reportes.service');
const { ok }  = require('../../utils/response.helper');
const { pool } = require('../../config/db');

async function getListado(req, res, next) {
  try {
    // Inject sedeId from middleware
    const params = { ...req.query, sedeId: req.sedeId };
    ok(res, await service.getListado(params));
  } catch (e) { next(e); }
}

async function getResumen(req, res, next) {
  try { ok(res, await service.getResumenFinanciero({ ...req.query, sedeId: req.sedeId })); } catch (e) { next(e); }
}

async function getOcupacion(req, res, next) {
  try { ok(res, await service.getOcupacionPorHora(req.sedeId, req.query.fechaDesde, req.query.fechaHasta)); } catch (e) { next(e); }
}

async function getKpisHoy(req, res, next) {
  try { ok(res, await service.getKpisHoy(req.sedeId)); } catch (e) { next(e); }
}

async function getAlertas(req, res, next) {
  try { ok(res, await service.getAlertas(req.sedeId, Number(req.query.horas))); } catch (e) { next(e); }
}

async function getPlacasFrecuentes(req, res, next) {
  try { ok(res, await service.getPlacasFrecuentes(req.sedeId, Number(req.query.limite))); } catch (e) { next(e); }
}

/** 
 * Exportación vía streams de Node.js
 * GET /api/reportes/exportar?formato=csv&fechaDesde=X&fechaHasta=Y
 */
async function exportarReporte(req, res, next) {
  try {
    const { fechaDesde, fechaHasta } = req.query;
    const sedeId = req.sedeId;

    let sql = 'SELECT id, placa, hora_entrada, hora_salida, estado, total_cobrado FROM registros WHERE sede_id = ?';
    const params = [sedeId];

    if (fechaDesde) {
      sql += ' AND DATE(hora_entrada) >= ?';
      params.push(fechaDesde);
    }
    if (fechaHasta) {
      sql += ' AND DATE(hora_entrada) <= ?';
      params.push(fechaHasta);
    }
    sql += ' ORDER BY id DESC';

    // Set headers para descarga
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=reporte_${fechaDesde || 'todo'}_${fechaHasta || 'todo'}.csv`);
    
    // Escribir cabeceras
    res.write('ID,Placa,Entrada,Salida,Estado,Total Cobrado\n');

    // Crear stream desde mysql2 (requiere usar pool.getConnection para streams puros si no es wrapper)
    const conn = await pool.getConnection();
    const queryStream = conn.query(sql, params).stream();

    queryStream.on('data', (row) => {
      // Escribir cada fila como CSV
      const csvRow = `${row.id},${row.placa},${row.hora_entrada},${row.hora_salida || ''},${row.estado},${row.total_cobrado || 0}\n`;
      res.write(csvRow);
    });

    queryStream.on('end', () => {
      conn.release();
      res.end();
    });

    queryStream.on('error', (err) => {
      conn.release();
      next(err);
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { 
  getListado, getResumen, getOcupacion, getKpisHoy, getAlertas, getPlacasFrecuentes, exportarReporte
};
