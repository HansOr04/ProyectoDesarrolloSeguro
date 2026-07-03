'use strict';

process.env.INTERNAL_SERVICE_SECRET = 'test-secret-for-unit-tests-min32chars!!';

const { signServiceRequest, verifyServiceToken } = require('../../../../shared/utils/serviceAuth');

function makeRedis(store = new Map()) {
    return {
        get: async (key) => store.get(key) ?? null,
        set: async (key, value) => { store.set(key, value); },
    };
}

describe('serviceAuth — signServiceRequest', () => {
    it('genera un token con sub, type y jti', () => {
        const token = signServiceRequest('test-service');
        const [, payloadB64] = token.split('.');
        const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
        expect(payload.sub).toBe('test-service');
        expect(payload.type).toBe('service-token');
        expect(typeof payload.jti).toBe('string');
        expect(payload.jti).toHaveLength(36); // UUID v4
    });

    it('genera jti distintos en cada llamada', () => {
        const t1 = signServiceRequest('svc');
        const t2 = signServiceRequest('svc');
        const jti1 = JSON.parse(Buffer.from(t1.split('.')[1], 'base64url').toString()).jti;
        const jti2 = JSON.parse(Buffer.from(t2.split('.')[1], 'base64url').toString()).jti;
        expect(jti1).not.toBe(jti2);
    });
});

describe('serviceAuth — verifyServiceToken (anti-replay)', () => {
    it('acepta un token válido la primera vez', async () => {
        const redis = makeRedis();
        const token = signServiceRequest('svc-a');
        const payload = await verifyServiceToken(token, redis);
        expect(payload.sub).toBe('svc-a');
        expect(payload.type).toBe('service-token');
    });

    it('rechaza el mismo token usado dos veces (replay)', async () => {
        const redis = makeRedis();
        const token = signServiceRequest('svc-b');
        await verifyServiceToken(token, redis);
        await expect(verifyServiceToken(token, redis)).rejects.toMatchObject({
            code: 'SERVICE_TOKEN_REPLAYED',
        });
    });

    it('acepta tokens distintos generados para el mismo servicio', async () => {
        const redis = makeRedis();
        const t1 = signServiceRequest('svc-c');
        const t2 = signServiceRequest('svc-c');
        await expect(verifyServiceToken(t1, redis)).resolves.toBeDefined();
        await expect(verifyServiceToken(t2, redis)).resolves.toBeDefined();
    });

    it('falla cerrado si Redis lanza error de conexión', async () => {
        const brokenRedis = {
            get: async () => { throw new Error('ECONNREFUSED'); },
            set: async () => { throw new Error('ECONNREFUSED'); },
        };
        const token = signServiceRequest('svc-d');
        await expect(verifyServiceToken(token, brokenRedis)).rejects.toMatchObject({
            code: 'SERVICE_REPLAY_CHECK_FAILED',
        });
    });

    it('rechaza token sin jti (versión antigua)', async () => {
        const jwt = require('jsonwebtoken');
        const oldToken = jwt.sign(
            { sub: 'old-svc', type: 'service-token' },
            process.env.INTERNAL_SERVICE_SECRET,
            { expiresIn: '30s', issuer: 'internal-bus' }
        );
        const redis = makeRedis();
        await expect(verifyServiceToken(oldToken, redis)).rejects.toThrow(/sin jti/);
    });
});
