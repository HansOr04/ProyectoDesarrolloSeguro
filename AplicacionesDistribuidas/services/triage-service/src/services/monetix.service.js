'use strict';
/**
 * Servicio de integración Triage → Monetix.
 * Cifra el resumen de consulta con Vault Transit y lo envía al endpoint
 * POST /api/inter/triage-report de Monetix.
 *
 * Autenticación: X-Service-Token firmado con INTERNAL_SERVICE_SECRET (HMAC-HS256, 30 s).
 * Cifrado:       Vault Transit Engine, clave "triage-monetix-channel".
 */

const { encryptInterServicePayload } = require('../../../../shared/utils/vault');
const { signServiceRequest } = require('../../../../shared/utils/serviceAuth');

const MONETIX_BACKEND_URL = process.env.MONETIX_BACKEND_URL;

/**
 * Notifica a Monetix que una consulta de Triage fue completada.
 * Se llama de forma no-bloqueante: si falla, solo loguea el error.
 *
 * @param {object} opts
 * @param {string} opts.patientId    UUID del paciente en Triage
 * @param {string} opts.triageId     UUID del triage completado
 * @param {string} opts.classification  ROJO | AMARILLO | VERDE
 * @param {string|null} opts.doctorId  UUID del médico revisor (puede ser null)
 * @param {string} opts.keycloakSub  sub del usuario que actualizó el estado (auditoría)
 * @param {string|null} opts.patientEmail  email del paciente (enlace con su cuenta Keycloak/Monetix)
 */
const MONTO_POR_CLASIFICACION = { ROJO: 150, AMARILLO: 80, VERDE: 40 };

async function notifyConsulta({ patientId, triageId, classification, doctorId, keycloakSub, patientEmail }) {
    if (!MONETIX_BACKEND_URL) {
        process.stderr.write('[monetix.service] MONETIX_BACKEND_URL no definida — notificación omitida\n');
        return;
    }

    const payload = {
        patientId,
        patientEmail: patientEmail || null,
        consultaRef: triageId,
        clasificacion: classification,
        doctorId: doctorId || null,
        fecha: new Date().toISOString(),
        descripcion: `Consulta de triage completada — clasificación ${classification}`,
        // monto referencial para el registro contable de salud
        monto: MONTO_POR_CLASIFICACION[classification] || 40,
        auditSub: keycloakSub || 'system',
    };

    let ciphertext;
    try {
        ciphertext = await encryptInterServicePayload(payload);
    } catch (err) {
        process.stderr.write(`[monetix.service] Error cifrando payload con Vault: ${err.message}\n`);
        return;
    }

    const serviceToken = signServiceRequest('triage-service');

    try {
        const res = await fetch(`${MONETIX_BACKEND_URL}/api/inter/triage-report`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Service-Token': serviceToken,
            },
            body: JSON.stringify({ payload: ciphertext }),
        });

        if (!res.ok) {
            const body = await res.text();
            process.stderr.write(`[monetix.service] Monetix respondió ${res.status}: ${body}\n`);
            return;
        }

        process.stdout.write(`[monetix.service] Reporte de consulta enviado correctamente (triage=${triageId})\n`);
    } catch (err) {
        process.stderr.write(`[monetix.service] Error HTTP hacia Monetix: ${err.message}\n`);
    }
}

module.exports = { notifyConsulta };
