// src/api/auth.api.js
import api from './axios.config';
export const authApi = {
  login:  (data)   => api.post('/auth/login', data).then(r => r.data.data),
};

export const espaciosApi = {
  getAll:     ()   => api.get('/espacios').then(r => r.data.data),
  getResumen: ()   => api.get('/espacios/resumen').then(r => r.data.data),
};

export const registrosApi = {
  registrarEntrada: (data)   => api.post('/registros/entrada', data).then(r => r.data.data),
  previewSalida:    (placa)  => api.get(`/registros/activo/${placa}`).then(r => r.data.data),
  registrarSalida:  (data)   => api.post('/registros/salida', data).then(r => r.data.data),
  getHistorial:     (params) => api.get('/registros', { params }).then(r => r.data.data),
  getPublicMovimientos: ()   => api.get('/registros/public-movimientos').then(r => r.data.data),
  getById:          (id)     => api.get(`/registros/${id}`).then(r => r.data.data),
  anular:           (id, d)  => api.patch(`/registros/${id}/anular`, d).then(r => r.data.data),
};

export const tarifasApi = {
  getAll:     ()      => api.get('/tarifas').then(r => r.data.data),
  create:     (data)  => api.post('/tarifas', data).then(r => r.data.data),
  update:     (id, data) => api.patch(`/tarifas/${id}`, data).then(r => r.data.data),
  deactivate: (id)    => api.delete(`/tarifas/${id}`).then(r => r.data.data),
};

export const usuariosApi = {
  getAll:          ()         => api.get('/usuarios').then(r => r.data.data),
  create:          (data)     => api.post('/usuarios', data).then(r => r.data.data),
  update:          (id, data) => api.put(`/usuarios/${id}`, data).then(r => r.data.data),
  delete:          (id)       => api.delete(`/usuarios/${id}`).then(r => r.data.data),
  cambiarPassword: (id, data) => api.patch(`/usuarios/${id}/password`, data).then(r => r.data.data),
};

export const ticketsApi = {
  getByRegistro: (id)        => api.get(`/tickets/registro/${id}`).then(r => r.data.data),
  getQR:         (id, tipo)  => api.get(`/tickets/registro/${id}/qr`, { params: { tipo } }).then(r => r.data.data),
  getByCodigo:   (codigo)    => api.get(`/tickets/codigo/${codigo}`).then(r => r.data.data),
};

export const reportesApi = {
  getResumen:      (q) => api.get('/reportes/financiero', { params: q }).then(r => r.data.data),
  getPorDia:       (q) => api.get('/reportes/por-dia', { params: q }).then(r => r.data.data),
  getHorasPico:    ()  => api.get('/reportes/horas-pico').then(r => r.data.data),
  getPorTipo:      ()  => api.get('/reportes/por-tipo').then(r => r.data.data),
  getResumenPeriodo: (q) => api.get('/reportes/resumen-periodo', { params: q }).then(r => r.data.data),
  getKpisHoy:          ()  => api.get('/reportes/kpis-hoy').then(r => r.data.data),
  getAlertas:          (h) => api.get('/reportes/alertas', { params: { horas: h } }).then(r => r.data.data),
  getPlacasFrecuentes: (n) => api.get('/reportes/placas-frecuentes', { params: { limite: n } }).then(r => r.data.data),
};

export const descuentosApi = {
  getTipos:  ()               => api.get('/descuentos').then(r => r.data.data),
  aplicar:   (rid, data)      => api.post(`/descuentos/registro/${rid}`, data).then(r => r.data.data),
};

