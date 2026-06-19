const { verifyToken } = require('../services/jwt.service');
const User = require('../models/User');
const { UnauthorizedError, ForbiddenError } = require('../../../../shared/utils/errorHandler');
const { isKeycloakToken, verifyKeycloakToken, mapKeycloakPayload } = require('./keycloak.middleware');

/**
 * Verify JWT token middleware.
 * Soporta tokens propios (HMAC/HS256) y tokens de Keycloak (RSA/RS256).
 * La detección es automática por el claim "iss".
 */
async function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader?.startsWith('Bearer ')) {
            throw new UnauthorizedError('No token provided');
        }

        const token = authHeader.split(' ')[1];

        if (isKeycloakToken(token)) {
            // --- Ruta Keycloak: validar via JWKS ---
            const payload = await verifyKeycloakToken(token);
            req.user = mapKeycloakPayload(payload);
            // Los usuarios de Keycloak no están en la DB local; se confía en el IdP
            return next();
        }

        // --- Ruta JWT propio: lógica original sin modificar ---
        const decoded = verifyToken(token);

        const user = await User.findByPk(decoded.id);

        if (!user?.is_active) {
            throw new UnauthorizedError('User not found or inactive');
        }

        req.user = decoded;
        req.fullUser = user;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            next(new UnauthorizedError('Invalid token'));
        } else if (error.name === 'TokenExpiredError') {
            next(new UnauthorizedError('Token expired'));
        } else {
            next(error);
        }
    }
}

/**
 * Check if user has required role
 */
function authorize(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return next(new UnauthorizedError('Not authenticated'));
        }

        if (!roles.includes(req.user.role)) {
            return next(new ForbiddenError('Insufficient permissions'));
        }

        next();
    };
}

/**
 * Optional authentication - doesn't fail if no token
 */
async function optionalAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];

            if (isKeycloakToken(token)) {
                const payload = await verifyKeycloakToken(token);
                req.user = mapKeycloakPayload(payload);
            } else {
                const decoded = verifyToken(token);
                req.user = decoded;
            }
        }

        next();
    } catch (error) {
        // optionalAuth no falla: token inválido se trata como "sin sesión"
        console.debug('optionalAuth: token ignorado —', error.message);
        next();
    }
}

module.exports = {
    authenticate,
    authorize,
    optionalAuth
};
