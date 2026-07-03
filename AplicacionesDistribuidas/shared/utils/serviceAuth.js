'use strict';

const jwt = require('jsonwebtoken');

const INTERNAL_SERVICE_SECRET = process.env.INTERNAL_SERVICE_SECRET;

if (!INTERNAL_SERVICE_SECRET) {
    process.stderr.write('[serviceAuth] WARN: INTERNAL_SERVICE_SECRET no definido — comunicación inter-servicio sin firma\n');
}

/**
 * Genera un JWT de corta duración (30s) para llamadas entre microservicios.
 * El servicio receptor valida con verifyServiceToken().
 * @param {string} callerName  nombre del servicio que llama, p.ej. 'appointment-service'
 * @returns {string}  token a enviar en la cabecera X-Service-Token
 */
function signServiceRequest(callerName) {
    if (!INTERNAL_SERVICE_SECRET) {
        throw new Error('FATAL: INTERNAL_SERVICE_SECRET no definido. Define INTERNAL_SERVICE_SECRET en .env');
    }
    return jwt.sign(
        { sub: callerName, type: 'service-token' },
        INTERNAL_SERVICE_SECRET,
        { expiresIn: '30s', issuer: 'internal-bus' }
    );
}

/**
 * Verifica un X-Service-Token recibido de otro microservicio.
 * Lanza error si el token es inválido, expirado o no es de tipo service-token.
 * @param {string} token
 * @returns {{ sub: string, type: string, iat: number, exp: number }}
 */
function verifyServiceToken(token) {
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
    return payload;
}

module.exports = { signServiceRequest, verifyServiceToken };
