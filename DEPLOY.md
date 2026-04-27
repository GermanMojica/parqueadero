# 🚀 Guía de Despliegue — Sistema de Parqueadero

## Stack de producción recomendado

| Capa       | Servicio            | Alternativa gratuita |
|------------|---------------------|----------------------|
| Frontend   | Vercel              | Netlify              |
| Backend    | Railway / Render    | Fly.io               |
| Base datos | Railway MySQL       | PlanetScale (MySQL)  |
| Logs       | Railway Logs        | Papertrail (free)    |

---

## 1. Preparar la Base de Datos

```bash
# En tu servidor MySQL (o panel de Railway/PlanetScale):
mysql -u root -p < parqueadero_db.sql
mysql -u root -p < parqueadero_fase6.sql

# Verificar
mysql -u root -p parqueadero_db -e "SELECT * FROM v_disponibilidad;"
```

---

## 2. Variables de entorno — Backend

Crea el archivo `.env` en `backend/` con estos valores reales:

```env
NODE_ENV=production
PORT=3000

DB_HOST=tu-host-mysql.railway.app
DB_PORT=3306
DB_USER=root
DB_PASSWORD=password_seguro_largo
DB_NAME=parqueadero_db
DB_POOL_LIMIT=10

JWT_SECRET=genera_con_openssl_rand_hex_32_minimo_64_chars
JWT_EXPIRES_IN=8h

CORS_ORIGIN=https://tu-app.vercel.app

LOG_LEVEL=warn
```

> **Generar JWT_SECRET seguro:**
> ```bash
> openssl rand -hex 32
> # o en Node.js:
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

---

## 3. Crear usuario admin inicial

```bash
# Solo ejecutar UNA vez, después del primer deploy
cd backend
node scripts/seed.admin.js

# Cambiar la contraseña en el primer login desde la UI
```

---

## 4. Despliegue del Backend en Railway

```bash
# 1. Instalar Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Crear proyecto
railway init

# 4. Agregar MySQL como servicio en el dashboard de Railway

# 5. Configurar variables de entorno en Railway Dashboard
#    (copiar todas las del .env)

# 6. Deploy
cd backend
railway up
```

**`Procfile` para Railway/Heroku** (crear en `backend/`):
```
web: node server.js
```

**`railway.json`** (crear en `backend/`):
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": { "builder": "NIXPACKS" },
  "deploy": {
    "startCommand": "node server.js",
    "healthcheckPath": "/api/health",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

---

## 5. Despliegue del Frontend en Vercel

```bash
# 1. Instalar Vercel CLI
npm install -g vercel

# 2. Ir al directorio frontend
cd frontend

# 3. Crear archivo de configuración
# (ver vercel.json abajo)

# 4. Deploy
vercel --prod
```

**`vercel.json`** (crear en `frontend/`):
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "env": {
    "VITE_API_URL": "https://tu-backend.railway.app"
  }
}
```

**`.env.production`** (crear en `frontend/`):
```env
VITE_API_URL=https://tu-backend.railway.app
```

Actualizar `frontend/src/api/axios.config.js` para usar la variable:
```js
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  // ...
});
```

---

## 6. Configuración de CORS en producción

En el backend, `CORS_ORIGIN` debe apuntar exactamente al dominio de Vercel:

```env
# ✅ Correcto
CORS_ORIGIN=https://parqueadero.vercel.app

# ❌ Incorrecto — el * es un riesgo de seguridad en producción
CORS_ORIGIN=*
```

---

## 7. Checklist pre-producción

### Seguridad
- [ ] `JWT_SECRET` tiene mínimo 32 caracteres aleatorios
- [ ] `NODE_ENV=production` está configurado
- [ ] No hay `console.log` con datos sensibles en el código
- [ ] La contraseña del admin inicial fue cambiada
- [ ] `DB_PASSWORD` es fuerte y único
- [ ] CORS solo permite el dominio del frontend real

### Base de datos
- [ ] Se ejecutaron ambos SQL (`parqueadero_db.sql` + `parqueadero_fase6.sql`)
- [ ] `SELECT COUNT(*) FROM espacios;` retorna 45
- [ ] `SELECT * FROM v_disponibilidad;` muestra datos correctos
- [ ] Usuario admin creado con `seed.admin.js`

### Funcional
- [ ] Login funciona con admin@parqueadero.com
- [ ] Se puede registrar una entrada
- [ ] Se puede registrar una salida con cobro
- [ ] El dashboard muestra cupos en tiempo real
- [ ] `/api/health` responde `{ "status": "ok" }`

---

## 8. Monitoreo básico post-deploy

```bash
# Verificar que el backend responde
curl https://tu-backend.railway.app/api/health

# Ver logs en tiempo real (Railway)
railway logs --follow

# Ver alertas de vehículos con permanencia excesiva
curl -H "Authorization: Bearer TOKEN" \
  https://tu-backend.railway.app/api/reportes/alertas?horas=12
```

---

## 9. Recomendaciones de mejora futura

### Corto plazo (próximas semanas)
- **WebSockets** con Socket.io para reemplazar el polling de 30s — actualizaciones instantáneas
- **Impresión de tickets** con `react-to-print` o generación de PDF con `pdfkit` en el backend
- **Backup automático** de la DB — Railway lo incluye en planes pagos

### Mediano plazo
- **Refresh token** — las sesiones de 8h se cortan en jornadas largas; implementar rotación
- **Rate limiting** con `express-rate-limit` — protege la API de abuso
- **Módulo de festivos** — integrar con API de festivos colombianos para tarifas especiales automáticas

### Largo plazo
- **PWA** — para que el operador lo use como app en tablet sin instalación
- **Multi-sede** — agregar tabla `sedes` y asociar espacios y usuarios por sede
- **Pagos en línea** — integrar Wompi o PayU para pagos sin efectivo
- **QR en tickets** — el cliente escanea y ve estado de su vehículo

---

## 10. Scripts útiles de mantenimiento

```bash
# Cerrar forzadamente un registro abierto por más de 24h (solo admin)
PATCH /api/registros/:id/anular
{ "observaciones": "Cierre administrativo por permanencia > 24h" }

# Ver todos los vehículos actualmente dentro
GET /api/registros?estado=ABIERTO

# Reporte financiero del último mes
GET /api/reportes/financiero?fechaDesde=2024-06-01&fechaHasta=2024-06-30

# Alertas de vehículos fantasma (> 12h)
GET /api/reportes/alertas?horas=12
```
