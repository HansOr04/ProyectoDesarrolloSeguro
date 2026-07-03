const jwksRsa = require('jwks-rsa');
const jwt = require('jsonwebtoken');

const KEYCLOAK_ISSUER = process.env.KEYCLOAK_ISSUER;
const KEYCLOAK_JWKS_URI = process.env.KEYCLOAK_JWKS_URI;
const KEYCLOAK_CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID;

// Lazy-initialized JWKS client (solo si Keycloak está configurado)
let jwksClient = null;

function getJwksClient() {
    if (!jwksClient && KEYCLOAK_JWKS_URI) {
        jwksClient = jwksRsa({
            jwksUri: KEYCLOAK_JWKS_URI,
            cache: true,
            cacheMaxEntries: 5,
            cacheMaxAge: 10 * 60 * 1000, // 10 min
            rateLimit: true,
        });
    }
    return jwksClient;
}

/**
 * Verifica un token JWT emitido por Keycloak usando su JWKS endpoint.
 * Resuelve con el payload decodificado o rechaza con error.
 */
function verifyKeycloakToken(token) {
    return new Promise((resolve, reject) => {
        const client = getJwksClient();
        if (!client) {
            return reject(new Error('Keycloak no configurado (KEYCLOAK_JWKS_URI faltante)'));
        }

        // Decodificar header para obtener el kid antes de verificar firma
        const decoded = jwt.decode(token, { complete: true });
        if (!decoded?.header?.kid) {
            return reject(new Error('Token sin kid en header'));
        }

        client.getSigningKey(decoded.header.kid, (err, key) => {
            if (err) {
                return reject(new Error(`Error obteniendo signing key: ${err.message}`));
            }

            const signingKey = key.getPublicKey();

            jwt.verify(
                token,
                signingKey,
                {
                    algorithms: ['RS256'],
                    issuer: KEYCLOAK_ISSUER,
                    ...(KEYCLOAK_CLIENT_ID ? { audience: KEYCLOAK_CLIENT_ID } : {}),
                },
                (verifyErr, payload) => {
                    if (verifyErr) return reject(verifyErr);
                    resolve(payload);
                }
            );
        });
    });
}

/**
 * Determina si un token (ya decodificado sin verificar) fue emitido por Keycloak.
 * Evita intentar validar tokens locales contra JWKS.
 */
function isKeycloakToken(token) {
    if (!KEYCLOAK_ISSUER) return false;
    try {
        const decoded = jwt.decode(token);
        return decoded?.iss === KEYCLOAK_ISSUER;
    } catch {
        return false;
    }
}

/**
 * Mapea el payload de Keycloak al mismo formato que usa req.user en el sistema actual.
 * Keycloak pone los roles en payload.roles (mapeado en el realm JSON).
 */
function mapKeycloakPayload(payload) {
    const roles = payload.roles || [];

    // Mapea roles de Keycloak a los roles del sistema Triage
    let role = 'PATIENT';
    if (roles.includes('admin'))        role = 'ADMIN';
    else if (roles.includes('doctor'))  role = 'DOCTOR';

    return {
        id: payload.sub,           // sub = Keycloak user UUID
        email: payload.email || '',
        role,
        nombre: payload.given_name || payload.preferred_username || '',
        apellido: payload.family_name || '',
        keycloakSub: payload.sub,  // guardamos el sub original para referencias cruzadas
        isKeycloakUser: true,
    };
}

module.exports = {
    isKeycloakToken,
    verifyKeycloakToken,
    mapKeycloakPayload,
};
