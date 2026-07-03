'use strict';

const { verifyServiceToken } = require('../utils/serviceAuth');

const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET;
const IS_DEV = process.env.NODE_ENV === 'development';

/**
 * Valida que la solicitud llegó a través del API Gateway (nginx).
 * nginx inyecta X-Gateway-Token en cada request que proxea.
 *
 * En desarrollo permite el paso pero registra un aviso, para que los servicios
 * sigan siendo alcanzables directamente durante el desarrollo local.
 * En producción (NODE_ENV != development) rechaza cualquier request sin token.
 */
function requireGateway(req, res, next) {
    const token = req.headers['x-gateway-token'];

    if (!INTERNAL_API_SECRET) {
        process.stderr.write('[gatewayAuth] WARN: INTERNAL_API_SECRET no definido, omitiendo validación de gateway\n');
        return next();
    }

    if (token === INTERNAL_API_SECRET) {
        return next();
    }

    if (IS_DEV) {
        process.stderr.write(
            `[gatewayAuth] WARN: acceso directo al servicio sin gateway token desde ${req.ip} — ${req.method} ${req.path}\n`
        );
        return next();
    }

    return res.status(403).json({
        success: false,
        error: {
            code: 'DIRECT_ACCESS_FORBIDDEN',
            message: 'El acceso directo a los microservicios no está permitido. Usa el API Gateway.',
        },
    });
}

/**
 * Valida X-Service-Token en endpoints de comunicación inter-servicio.
 * Úsalo en rutas que solo deben ser llamadas por otros microservicios, no por usuarios finales.
 */
function requireService(req, res, next) {
    const token = req.headers['x-service-token'];

    if (!token) {
        return res.status(401).json({
            success: false,
            error: { code: 'SERVICE_TOKEN_MISSING', message: 'Token inter-servicio requerido (X-Service-Token)' },
        });
    }

    try {
        const payload = verifyServiceToken(token);
        req.callerService = payload.sub;
        next();
    } catch {
        return res.status(401).json({
            success: false,
            error: { code: 'SERVICE_TOKEN_INVALID', message: 'Token inter-servicio inválido o expirado' },
        });
    }
}

module.exports = { requireGateway, requireService };
