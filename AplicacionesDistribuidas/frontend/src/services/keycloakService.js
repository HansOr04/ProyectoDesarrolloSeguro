import Keycloak from 'keycloak-js'

const KEYCLOAK_URL    = import.meta.env.VITE_KEYCLOAK_URL    || 'http://localhost:8180'
const KEYCLOAK_REALM  = import.meta.env.VITE_KEYCLOAK_REALM  || 'universidad'
const KEYCLOAK_CLIENT = import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'triage-frontend'

const keycloak = new Keycloak({
    url:      KEYCLOAK_URL,
    realm:    KEYCLOAK_REALM,
    clientId: KEYCLOAK_CLIENT,
})

let _initialized = false

/**
 * Inicializa Keycloak en modo silencioso para detectar sesiones SSO previas.
 * No redirige al usuario si no hay sesión activa.
 */
async function init() {
    if (_initialized) return keycloak

    await keycloak.init({
        onLoad: 'check-sso',
        pkceMethod: 'S256',
        silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
        checkLoginIframe: true,
        checkLoginIframeInterval: 5,
    })

    _initialized = true

    keycloak.onTokenExpired = () => {
        keycloak.updateToken(60).catch(() => {
            console.warn('[Keycloak] No se pudo renovar el token, sesión expirada')
            keycloak.logout({ redirectUri: window.location.origin + '/' })
        })
    }

    keycloak.onAuthLogout = () => {
        window.location.href = window.location.origin + '/'
    }

    return keycloak
}

/**
 * Redirige al usuario a la página de login de Keycloak.
 */
function loginWithSSO() {
    keycloak.login({ redirectUri: window.location.origin + '/dashboard' })
}

/**
 * Cierra la sesión en Keycloak y redirige al login.
 */
function logoutSSO() {
    keycloak.logout({ redirectUri: window.location.origin + '/' })
}

/**
 * Retorna true si hay una sesión Keycloak activa.
 */
function isAuthenticated() {
    return !!keycloak.authenticated
}

/**
 * Retorna el access token actual de Keycloak (o null).
 */
function getToken() {
    return keycloak.token ?? null
}

/**
 * Mapea la sesión Keycloak al formato de usuario que usa el AuthContext de Triage.
 */
function getUser() {
    if (!keycloak.authenticated || !keycloak.tokenParsed) return null

    const p = keycloak.tokenParsed
    const roles = p.roles || []

    const triageRoles = ['admin', 'doctor', 'patient']
    if (!roles.some(r => triageRoles.includes(r))) return null

    let role = 'PATIENT'
    if (roles.includes('admin'))        role = 'ADMIN'
    else if (roles.includes('doctor'))  role = 'DOCTOR'

    return {
        id:       p.sub,
        email:    p.email || '',
        nombre:   p.given_name || p.preferred_username || '',
        apellido: p.family_name || '',
        role,
        isKeycloakUser: true,
    }
}

export default {
    init,
    loginWithSSO,
    logoutSSO,
    isAuthenticated,
    getToken,
    getUser,
    instance: keycloak,
}
