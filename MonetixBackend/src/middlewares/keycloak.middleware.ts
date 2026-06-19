import jwt from 'jsonwebtoken';
import jwksRsa, { JwksClient } from 'jwks-rsa';

const KEYCLOAK_ISSUER = process.env.KEYCLOAK_ISSUER;
const KEYCLOAK_JWKS_URI = process.env.KEYCLOAK_JWKS_URI;

let jwksClient: JwksClient | null = null;

function getJwksClient(): JwksClient | null {
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

export interface KeycloakTokenPayload {
  sub: string;
  email?: string;
  preferred_username?: string;
  given_name?: string;
  family_name?: string;
  roles?: string[];
  iss?: string;
}

/**
 * Verifica un token JWT de Keycloak usando JWKS.
 */
export function verifyKeycloakToken(token: string): Promise<KeycloakTokenPayload> {
  return new Promise((resolve, reject) => {
    const client = getJwksClient();
    if (!client) {
      return reject(new Error('Keycloak no configurado (KEYCLOAK_JWKS_URI faltante)'));
    }

    const decoded = jwt.decode(token, { complete: true }) as {
      header: { kid?: string };
    } | null;

    if (!decoded?.header?.kid) {
      return reject(new Error('Token sin kid en header'));
    }

    client.getSigningKey(decoded.header.kid, (err, key) => {
      if (err || !key) {
        return reject(new Error(`Error obteniendo signing key: ${err?.message}`));
      }

      const signingKey = key.getPublicKey();

      jwt.verify(
        token,
        signingKey,
        { algorithms: ['RS256'], issuer: KEYCLOAK_ISSUER },
        (verifyErr, payload) => {
          if (verifyErr) return reject(verifyErr);
          resolve(payload as KeycloakTokenPayload);
        }
      );
    });
  });
}

/**
 * Determina si el token fue emitido por Keycloak (por el claim iss).
 */
export function isKeycloakToken(token: string): boolean {
  if (!KEYCLOAK_ISSUER) return false;
  try {
    const decoded = jwt.decode(token) as { iss?: string } | null;
    return decoded?.iss === KEYCLOAK_ISSUER;
  } catch {
    return false;
  }
}

/**
 * Mapea el payload de Keycloak al formato IUser que usa req.user en Monetix.
 * Roles de Keycloak → roles de Monetix: monetix-admin→admin, resto→user.
 */
export function mapKeycloakPayload(payload: KeycloakTokenPayload) {
  const roles = payload.roles ?? [];
  const role: 'user' | 'admin' = roles.includes('monetix-admin') || roles.includes('admin')
    ? 'admin'
    : 'user';

  return {
    _id: payload.sub as unknown as import('mongoose').Types.ObjectId,
    email: payload.email ?? '',
    name: payload.given_name
      ? `${payload.given_name} ${payload.family_name ?? ''}`.trim()
      : (payload.preferred_username ?? payload.sub),
    role,
    password: '',           // campo requerido por la interfaz, vacío para usuarios IdP
    createdAt: new Date(),
    updateAt: new Date(),
    comparePassword: async () => false,
    isKeycloakUser: true,
  };
}
