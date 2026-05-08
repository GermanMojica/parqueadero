// src/utils/query.builder.js

/**
 * Genera cláusulas WHERE parametrizadas
 * @param {Object} params Objeto con clave-valor
 * @param {Object} fieldMapping Mapeo de campos a sus nombres en BD ej: { estado: 'r.estado' }
 * @returns { { sql: string, params: any[] } }
 */
function buildFilters(params, fieldMapping = {}) {
  const conditions = [];
  const sqlParams = [];

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    
    const column = fieldMapping[key] || key;
    
    if (key === 'fechaDesde') {
      conditions.push(`${column} >= ?`);
      sqlParams.push(value);
    } else if (key === 'fechaHasta') {
      conditions.push(`${column} <= ?`);
      sqlParams.push(value);
    } else if (key.endsWith('Like')) {
      const actualCol = fieldMapping[key.replace('Like', '')] || key.replace('Like', '');
      conditions.push(`${actualCol} LIKE ?`);
      sqlParams.push(`%${value}%`);
    } else if (key === 'cursor') {
      // Cursor pagination rule
      conditions.push(`${column} < ?`);
      sqlParams.push(value);
    } else {
      conditions.push(`${column} = ?`);
      sqlParams.push(value);
    }
  }

  return {
    sql: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    params: sqlParams
  };
}

/**
 * Genera string LIMIT/OFFSET (aunque para cursor el offset es 0)
 */
function buildPagination(page, limit) {
  const parsedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const parsedPage = Math.max(Number(page) || 1, 1);
  const offset = (parsedPage - 1) * parsedLimit;
  
  return { limit: parsedLimit, offset, sql: `LIMIT ${parsedLimit} OFFSET ${offset}` };
}

/**
 * Genera cursor paginated LIMIT
 */
function buildCursorPagination(limit) {
  const parsedLimit = Math.min(Math.max(Number(limit) || 25, 1), 100);
  // Requerimos un elemento extra para saber si hay "hasMore"
  return { limit: parsedLimit, queryLimit: parsedLimit + 1, sql: `LIMIT ${parsedLimit + 1}` };
}

/**
 * Genera ORDER BY seguro usando whitelist
 */
function buildSort(sortBy, sortDir, allowedColumns) {
  if (!sortBy || !allowedColumns.includes(sortBy)) {
    return '';
  }
  const dir = String(sortDir).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  return `ORDER BY ${sortBy} ${dir}`;
}

module.exports = {
  buildFilters,
  buildPagination,
  buildCursorPagination,
  buildSort
};
