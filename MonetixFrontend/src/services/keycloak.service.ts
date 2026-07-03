import Keycloak from 'keycloak-js';
import { User } from '@/types/user.types';

const KEYCLOAK_URL    = import.meta.env.VITE_KEYCLOAK_URL    || 'http://localhost:8180';
const KEYCLOAK_REALM  = import.meta.env.VITE_KEYCLOAK_REALM  || 'universidad';
const KEYCLOAK_CLIENT = import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'monetix-frontend';

const keycloak = new Keycloak({
  url:      KEYCLOAK_URL,
  realm:    KEYCLOAK_REALM,
  clientId: KEYCLOAK_CLIENT,
});

let _initialized = false;

/**
 * Inicializa Keycloak en modo silencioso (no redirige si no hay sesión).
 */
export async function initKeycloak(): Promise<Keycloak> {
  if (_initialized) return keycloak;

  await keycloak.init({
    onLoad: 'check-sso',
    pkceMethod: 'S256',
    silentCheckSsoRedirectUri: `${globalThis.location.origin}/silent-check-sso.html`,
    checkLoginIframe: true,
    checkLoginIframeInterval: 5,
  });

  _initialized = true;

  keycloak.onTokenExpired = () => {
    keycloak.updateToken(60).catch(() => {
      console.warn('[Keycloak] Sesión expirada, no se pudo renovar el token');
      keycloak.logout({ redirectUri: `${globalThis.location.origin}/login` });
    });
  };

  keycloak.onAuthLogout = () => {
    globalThis.location.href = `${globalThis.location.origin}/login`;
  };

  return keycloak;
}

/**
 * Redirige al login de Keycloak.
 */
export function loginWithSSO(): void {
  keycloak.login({ redirectUri: `${globalThis.location.origin}/` });
}

/**
 * Cierra sesión en Keycloak.
 */
export function logoutSSO(): void {
  keycloak.logout({ redirectUri: `${globalThis.location.origin}/login` });
}

export function isKeycloakAuthenticated(): boolean {
  return !!keycloak.authenticated;
}

export function getKeycloakToken(): string | null {
  return keycloak.token ?? null;
}

/**
 * Mapea el token de Keycloak al tipo User que usa Monetix.
 */
export function getKeycloakUser(): User | null {
  if (!keycloak.authenticated || !keycloak.tokenParsed) return null;

  const p = keycloak.tokenParsed as {
    sub?: string;
    email?: string;
    preferred_username?: string;
    given_name?: string;
    family_name?: string;
    roles?: string[];
  };

  const roles = p.roles ?? [];

  // Solo cuentas con un rol de Monetix pueden entrar a este sistema. Sin este
  // chequeo, cualquier usuario SSO del realm "universidad" (p.ej. uno creado
  // solo para Triage) quedaba autenticado igual.
  const monetixRoles = ['monetix-user', 'monetix-admin'];
  if (!roles.some((r) => monetixRoles.includes(r))) return null;

  const role: 'user' | 'admin' =
    roles.includes('monetix-admin') || roles.includes('admin') ? 'admin' : 'user';

  return {
    _id:   p.sub ?? '',
    email: p.email ?? '',
    name:  p.given_name
      ? `${p.given_name} ${p.family_name ?? ''}`.trim()
      : (p.preferred_username ?? p.sub ?? ''),
    role,
  };
}

export default keycloak;
