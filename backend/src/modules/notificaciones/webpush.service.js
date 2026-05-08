// src/modules/notificaciones/webpush.service.js
const webpush = require('web-push');
const { env } = require('../../config/env');
const logger  = require('../../utils/logger');

// Configuración de VAPID
// Nota: en un entorno real, no debe usarse un par por defecto.
const publicVapidKey = env.VAPID_PUBLIC_KEY || 'BM_Cq_dJz8L8YI4-Zt_9K6wH_e1r9qYxR-W9v2T_H9w1r0_mD_oE_mN9p_yG_xV_sQ_cZ_oB_mL_fF_bM_vH_gP_yE_iC_jX_kA_x';
const privateVapidKey = env.VAPID_PRIVATE_KEY || 'rA_zX_cD_fF_gH_jK_lL_zX_cV_bN_mM_qW_eR_tY_uI_oP_aS_dF_gH_jK';
const subject = env.VAPID_SUBJECT || 'mailto:admin@parqueadero.com';

try {
  webpush.setVapidDetails(subject, publicVapidKey, privateVapidKey);
} catch (e) {
  logger.warn('⚠️ No se pudieron configurar las claves VAPID para Web Push. Notificaciones push desactivadas.');
}

async function enviarPush(suscripcionInfo, payloadJson) {
  if (!env.VAPID_PUBLIC_KEY && !publicVapidKey) return;
  
  const pushSubscription = {
    endpoint: suscripcionInfo.endpoint,
    keys: {
      p256dh: suscripcionInfo.keys_p256dh,
      auth: suscripcionInfo.keys_auth
    }
  };

  try {
    await webpush.sendNotification(pushSubscription, JSON.stringify(payloadJson));
  } catch (error) {
    if (error.statusCode === 410 || error.statusCode === 404) {
      // 410 Gone / 404 Not Found: La suscripción ya no es válida (el usuario deshabilitó notificaciones)
      // Debe manejarse en el servicio que lo llama para eliminarlo de la DB
      throw { name: 'SuscripcionInvalida', endpoint: suscripcionInfo.endpoint };
    } else {
      logger.error('Error enviando notificación push:', { error: error.message });
    }
  }
}

module.exports = { enviarPush };
