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

function resolveRole(roles) {
    if (roles.includes('admin'))  return 'ADMIN';
    if (roles.includes('doctor')) return 'DOCTOR';
    return 'PATIENT';
}

function getSigningKey(client, kid) {
    return new Promise((resolve, reject) => {
        client.getSigningKey(kid, (err, k) => {
            if (err) reject(err);
            else resolve(k);
        });
    });
}

function verifyJwt(token, publicKey) {
    return new Promise((resolve, reject) => {
        jwt.verify(token, publicKey, { algorithms: ['RS256'], issuer: KEYCLOAK_ISSUER, audience: KEYCLOAK_CLIENT_ID },
            (err, p) => { if (err) reject(err); else resolve(p); }
        );
    });
}

async function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Token requerido' });
    }

    const client = getJwksClient();
    if (!client) {
        return res.status(503).json({ success: false, message: 'Servicio de autenticación no disponible (KEYCLOAK_JWKS_URI faltante)' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded?.header?.kid) {
        return res.status(401).json({ success: false, message: 'Token inválido' });
    }

    try {
        const key = await getSigningKey(client, decoded.header.kid);
        const payload = await verifyJwt(token, key.getPublicKey());
        req.user = {
            id: payload.sub,
            email: payload.email || '',
            role: resolveRole(payload.roles || []),
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
