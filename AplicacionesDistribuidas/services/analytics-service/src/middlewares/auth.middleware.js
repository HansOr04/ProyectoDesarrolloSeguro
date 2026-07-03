const jwksRsa = require('jwks-rsa');
const jwt = require('jsonwebtoken');

const KEYCLOAK_ISSUER = process.env.KEYCLOAK_ISSUER;
const KEYCLOAK_JWKS_URI = process.env.KEYCLOAK_JWKS_URI;
const KEYCLOAK_CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID;

if (KEYCLOAK_JWKS_URI && !KEYCLOAK_CLIENT_ID) {
    throw new Error(
        '[auth.middleware] KEYCLOAK_CLIENT_ID es obligatorio cuando KEYCLOAK_JWKS_URI ' +
        'está configurado. Agrega KEYCLOAK_CLIENT_ID al entorno y reinicia el servicio.'
    );
}

let jwksClient = null;

function getJwksClient() {
    if (!jwksClient && KEYCLOAK_JWKS_URI) {
        jwksClient = jwksRsa({
            jwksUri: KEYCLOAK_JWKS_URI,
            cache: true,
            cacheMaxEntries: 5,
            cacheMaxAge: 10 * 60 * 1000,
            rateLimit: true,
        });
    }
    return jwksClient;
}

async function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Token requerido' });
    }

    const token = authHeader.split(' ')[1];
    const client = getJwksClient();

    if (!client) {
        return res.status(503).json({ success: false, message: 'Servicio de autenticación no disponible (KEYCLOAK_JWKS_URI faltante)' });
    }

    try {
        const decoded = jwt.decode(token, { complete: true });
        if (!decoded?.header?.kid) {
            return res.status(401).json({ success: false, message: 'Token inválido' });
        }

        const key = await new Promise((resolve, reject) => {
            client.getSigningKey(decoded.header.kid, (err, k) => {
                if (err) reject(err);
                else resolve(k);
            });
        });

        const payload = await new Promise((resolve, reject) => {
            jwt.verify(
                token,
                key.getPublicKey(),
                {
                    algorithms: ['RS256'],
                    issuer: KEYCLOAK_ISSUER,
                    audience: KEYCLOAK_CLIENT_ID,
                },
                (err, p) => {
                    if (err) reject(err);
                    else resolve(p);
                }
            );
        });

        const roles = payload.roles || [];
        let role = 'PATIENT';
        if (roles.includes('admin'))       role = 'ADMIN';
        else if (roles.includes('doctor')) role = 'DOCTOR';

        req.user = {
            id: payload.sub,
            email: payload.email || '',
            role,
            isKeycloakUser: true,
        };

        next();
    } catch {
        return res.status(401).json({ success: false, message: 'Token inválido o expirado' });
    }
}

function authorize(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'No autenticado' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Sin permisos suficientes' });
        }
        next();
    };
}

module.exports = { authenticate, authorize };
