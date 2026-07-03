'use strict';

const jwt = require('jsonwebtoken');
const crypto = require('node:crypto');

const INTERNAL_SERVICE_SECRET = process.env.INTERNAL_SERVICE_SECRET;

if (!INTERNAL_SERVICE_SECRET) {
    process.stderr.write('[serviceAuth] WARN: INTERNAL_SERVICE_SECRET no definido — comunicación inter-servicio sin firma\n');
}

/**
 * Genera un JWT de corta duración (30s) para llamadas entre microservicios.
 * Incluye un claim `jti` único para protección anti-replay.
 * El servicio receptor valida con verifyServiceToken().
 * @param {string} callerName  nombre del servicio que llama, p.ej. 'appointment-service'
 * @returns {string}  token a enviar en la cabecera X-Service-Token
 */
function signServiceRequest(callerName) {
    if (!INTERNAL_SERVICE_SECRET) {
        throw new Error('FATAL: INTERNAL_SERVICE_SECRET no definido. Define INTERNAL_SERVICE_SECRET en .env');
    }
    return jwt.sign(
        { sub: callerName, type: 'service-token', jti: crypto.randomUUID() },
        INTERNAL_SERVICE_SECRET,
        { expiresIn: '30s', issuer: 'internal-bus' }
    );
}

/**
 * Verifica un X-Service-Token recibido de otro microservicio.
 * Comprueba firma, tipo y unicidad del jti en Redis (anti-replay).
 *
 * Decisión de seguridad: si Redis no está disponible, se FALLA CERRADO
 * (se rechaza la request) en lugar de fallar abierto. Un token interceptado
 * dentro de la ventana de 30 s podría reenviarse si ignoramos el replay check.
 *
 * @param {string} token
 * @param {import('ioredis').Redis} redisClient  cliente Redis activo
 * @returns {Promise<{ sub: string, type: string, jti: string, iat: number, exp: number }>}
 */
async function verifyServiceToken(token, redisClient) {
    if (!INTERNAL_SERVICE_SECRET) {
        throw new Error('FATAL: INTERNAL_SERVICE_SECRET no definido');
    }

    const payload = jwt.verify(token, INTERNAL_SERVICE_SECRET, {
        issuer: 'internal-bus',
        algorithms: ['HS256'],
    });

    if (payload.type !== 'service-token') {
        throw new Error('Token type inválido — se esperaba service-token');
    }

    const jti = payload.jti;
    if (!jti) {
        throw new Error('Token sin jti — posible token antiguo sin protección anti-replay');
    }

    const redisKey = `service-token-used:${jti}`;

    // Anti-replay: falla cerrado si Redis no está disponible
    try {
        const already = await redisClient.get(redisKey);
        if (already) {
            const err = new Error('Token ya utilizado (replay detectado)');
            err.code = 'SERVICE_TOKEN_REPLAYED';
            throw err;
        }
        // TTL de 35 s: un poco más que el expiresIn del token (30 s)
        await redisClient.set(redisKey, '1', 'EX', 35);
    } catch (redisErr) {
        if (redisErr.code === 'SERVICE_TOKEN_REPLAYED') throw redisErr;
        // Error de conexión a Redis → falla cerrado
        const err = new Error('Anti-replay check no disponible (Redis unreachable) — request rechazada');
        err.code = 'SERVICE_REPLAY_CHECK_FAILED';
        throw err;
    }

    return payload;
}

module.exports = { signServiceRequest, verifyServiceToken };
