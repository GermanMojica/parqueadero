// src/api/auth.api.js
import api from './axios.config';
export const authApi = {
  login:  (data)   => api.post('/auth/login', data).then(r => r.data.data),
};

// src/api/espacios.api.js — se exporta desde este mismo archivo por conveniencia
export const espaciosApi = {
  getAll:     ()   => api.get('/espacios').then(r => r.data.data),
  getResumen: ()   => api.get('/espacios/resumen').then(r => r.data.data),
};

// src/api/registros.api.js
export const registrosApi = {
  registrarEntrada: (data)  => api.post('/registros/entrada', data).then(r => r.data.data),
  previewSalida:    (placa) => api.get(`/registros/activo/${placa}`).then(r => r.data.data),
  registrarSalida:  (data)  => api.post('/registros/salida', data).then(r => r.data.data),
  getHistorial:     (params)=> api.get('/registros', { params }).then(r => r.data.data),
  getById:          (id)    => api.get(`/registros/${id}`).then(r => r.data.data),
  anular:           (id, data) => api.patch(`/registros/${id}/anular`, data).then(r => r.data.data),
};

// src/api/tarifas.api.js
export const tarifasApi = {
  getAll:      ()      => api.get('/tarifas').then(r => r.data.data),
  create:      (data)  => api.post('/tarifas', data).then(r => r.data.data),
  deactivate:  (id)    => api.delete(`/tarifas/${id}`).then(r => r.data.data),
};

// src/api/usuarios.api.js
export const usuariosApi = {
  getAll:          ()          => api.get('/usuarios').then(r => r.data.data),
  create:          (data)      => api.post('/usuarios', data).then(r => r.data.data),
  update:          (id, data)  => api.put(`/usuarios/${id}`, data).then(r => r.data.data),
  cambiarPassword: (id, data)  => api.patch(`/usuarios/${id}/password`, data).then(r => r.data.data),
};
