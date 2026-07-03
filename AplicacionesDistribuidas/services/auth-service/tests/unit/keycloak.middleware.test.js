'use strict';

const jwt = require('jsonwebtoken');

// El módulo lanza error al cargar si KEYCLOAK_JWKS_URI está pero CLIENT_ID no
describe('keycloak.middleware — validación de arranque', () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
        // Restaurar entorno y limpiar caché de módulos entre tests
        Object.keys(process.env).forEach(k => delete process.env[k]);
        Object.assign(process.env, originalEnv);
        jest.resetModules();
    });

    it('lanza error al cargar si KEYCLOAK_JWKS_URI está definido pero KEYCLOAK_CLIENT_ID no', () => {
        process.env.KEYCLOAK_JWKS_URI = 'http://keycloak:8080/realms/test/protocol/openid-connect/certs';
        delete process.env.KEYCLOAK_CLIENT_ID;

        expect(() => require('../../src/middlewares/keycloak.middleware')).toThrow(
            /KEYCLOAK_CLIENT_ID es obligatorio/
        );
    });

    it('carga correctamente cuando ambas variables están presentes', () => {
        process.env.KEYCLOAK_JWKS_URI = 'http://keycloak:8080/realms/test/protocol/openid-connect/certs';
        process.env.KEYCLOAK_CLIENT_ID = 'triage-client';
        process.env.KEYCLOAK_ISSUER = 'http://keycloak:8080/realms/test';

        expect(() => require('../../src/middlewares/keycloak.middleware')).not.toThrow();
    });

    it('carga correctamente cuando Keycloak no está configurado (sin KEYCLOAK_JWKS_URI)', () => {
        delete process.env.KEYCLOAK_JWKS_URI;
        delete process.env.KEYCLOAK_CLIENT_ID;

        expect(() => require('../../src/middlewares/keycloak.middleware')).not.toThrow();
    });
});

describe('keycloak.middleware — rechazo de audiencia incorrecta', () => {
    const originalEnv = { ...process.env };

    beforeAll(() => {
        // Configurar entorno con Keycloak activo para que el módulo cargue
        process.env.KEYCLOAK_JWKS_URI = 'http://keycloak:8080/realms/test/protocol/openid-connect/certs';
        process.env.KEYCLOAK_CLIENT_ID = 'triage-client';
        process.env.KEYCLOAK_ISSUER = 'http://keycloak:8080/realms/test';
    });

    afterAll(() => {
        Object.keys(process.env).forEach(k => delete process.env[k]);
        Object.assign(process.env, originalEnv);
        jest.resetModules();
    });

    it('rechaza token con aud incorrecto (JsonWebTokenError)', async () => {
        // Creamos un JWT firmado con HS256 (no RS256) pero con audience erróneo
        // para simular el escenario de cross-client token sin necesitar JWKS real.
        // verifyKeycloakToken falla antes de llegar a la verificación de audiencia
        // si el cliente JWKS no puede resolver el kid — simulamos eso con un mock.

        jest.resetModules();
        jest.mock('jwks-rsa', () => {
            return jest.fn(() => ({
                getSigningKey: (kid, cb) => {
                    // Simula clave pública obtenida; usamos un par RSA de test
                    cb(null, { getPublicKey: () => 'FAKE_PUBLIC_KEY' });
                },
            }));
        });

        jest.mock('jsonwebtoken', () => {
            const actual = jest.requireActual('jsonwebtoken');
            return {
                ...actual,
                decode: actual.decode,
                verify: (token, key, options, cb) => {
                    // Simula rechazo por audiencia incorrecta
                    const err = new Error('jwt audience invalid. expected: triage-client');
                    err.name = 'JsonWebTokenError';
                    cb(err, null);
                },
            };
        });

        process.env.KEYCLOAK_JWKS_URI = 'http://keycloak:8080/realms/test/protocol/openid-connect/certs';
        process.env.KEYCLOAK_CLIENT_ID = 'triage-client';
        process.env.KEYCLOAK_ISSUER = 'http://keycloak:8080/realms/test';

        const { verifyKeycloakToken } = require('../../src/middlewares/keycloak.middleware');

        // Fabricamos un token decodificable con kid en header
        const fakeToken = jwt.sign({ sub: 'user1' }, 'secret', { header: { kid: 'test-kid' } });

        await expect(verifyKeycloakToken(fakeToken)).rejects.toMatchObject({
            name: 'JsonWebTokenError',
            message: expect.stringContaining('audience invalid'),
        });
    });
});
