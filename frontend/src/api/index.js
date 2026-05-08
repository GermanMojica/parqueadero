// src/api/auth.api.js
import api from './axios.config';
export const authApi = {
  login:  (data)   => api.post('/auth/login', data).then(r => r.data.data),
};

export const espaciosApi = {
  getAll:       ()   => api.get('/espacios').then(r => r.data.data),
  getResumen:   ()   => api.get('/espacios/resumen').then(r => r.data.data),
  updateEstado: (id, estado) => api.patch(`/espacios/${id}/estado`, { estado }).then(r => r.data.data),
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
  getListado:      (q) => api.get('/reportes/listado', { params: q }).then(r => r.data.data),
  getResumen:      (q) => api.get('/reportes/resumen', { params: q }).then(r => r.data.data),
  getOcupacionHora: (q) => api.get('/reportes/ocupacion-hora', { params: q }).then(r => r.data.data),
  getKpisHoy:      ()  => api.get('/reportes/kpis').then(r => r.data.data),
  getAlertas:      (h) => api.get('/reportes/alertas', { params: { horas: h } }).then(r => r.data.data),
  getPlacasFrecuentes: (n) => api.get('/reportes/placas-frecuentes', { params: { limite: n } }).then(r => r.data.data),
};

export const descuentosApi = {
  getTipos:  ()               => api.get('/descuentos').then(r => r.data.data),
  aplicar:   (rid, data)      => api.post(`/descuentos/registro/${rid}`, data).then(r => r.data.data),
};

export const reservasApi = {
  crear:      (data)           => api.post('/reservas', data).then(r => r.data.data),
  listar:     (params)         => api.get('/reservas', { params }).then(r => r.data.data),
  cancelar:   (id)             => api.patch(`/reservas/${id}/cancelar`).then(r => r.data.data),
  convertir:  (codigo)         => api.post(`/reservas/${codigo}/convertir`).then(r => r.data.data),
};

export const notificacionesApi = {
  suscribirPush:      (data) => api.post('/notificaciones/suscribir', data).then(r => r.data.data),
  getPreferencias:    ()     => api.get('/notificaciones/preferencias').then(r => r.data.data),
  updatePreferencias: (data) => api.put('/notificaciones/preferencias', data).then(r => r.data.data),
};

export const sedesApi = {
  getAll: () => api.get('/sedes').then(r => r.data.data),
};

export const fidelizacionApi = {
  getReglas:    ()      => api.get('/fidelizacion/reglas').then(r => r.data.data),
  crearTarjeta: (placa) => api.post('/fidelizacion/tarjetas', { placa }).then(r => r.data.data),
  getTarjeta:   (id)    => api.get(`/fidelizacion/tarjetas/${id}`).then(r => r.data.data),
  canjear:      (data)  => api.post('/fidelizacion/canjear', data).then(r => r.data.data),
  getDashboard: ()      => api.get('/fidelizacion/dashboard').then(r => r.data.data),
};


