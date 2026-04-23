// src/modules/espacios/espacios.service.js
const repo = require('./espacios.repository');

async function getAll()     { return repo.findAll(); }
async function getResumen() { return repo.countDisponibles(); }

module.exports = { getAll, getResumen };
