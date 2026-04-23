// src/utils/response.helper.js
// Garantiza formato consistente en todas las respuestas de la API.

const ok = (res, data, statusCode = 200) => {
  return res.status(statusCode).json({ success: true, data });
};

const created = (res, data) => ok(res, data, 201);

const noContent = (res) => res.status(204).send();

module.exports = { ok, created, noContent };
