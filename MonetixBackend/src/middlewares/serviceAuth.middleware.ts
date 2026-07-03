import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { cacheService } from '../services/cache.service';

const INTERNAL_SERVICE_SECRET = process.env.INTERNAL_SERVICE_SECRET;

interface ServiceTokenPayload {
    sub: string;
    type: string;
    jti?: string;
}

/**
 * Genera un JWT de 30 s con jti único para llamadas inter-servicio hacia MonetixBackend.
 * Equivalente TS de shared/utils/serviceAuth.js::signServiceRequest().
 */
export function signServiceRequest(callerName: string): string {
    if (!INTERNAL_SERVICE_SECRET) {
        throw new Error('FATAL: INTERNAL_SERVICE_SECRET no definido');
    }
    return jwt.sign(
        { sub: callerName, type: 'service-token', jti: randomUUID() },
        INTERNAL_SERVICE_SECRET,
        { expiresIn: '30s', issuer: 'internal-bus' }
    );
}

/**
 * Verifica el header X-Service-Token firmado con INTERNAL_SERVICE_SECRET (HMAC-HS256, 30 s).
 * Incluye protección anti-replay via CacheService en memoria (MonetixBackend es instancia
 * única — el in-memory store es suficiente; en un despliegue multi-instancia sustituir
 * por un cliente Redis compartido, igual que en shared/utils/serviceAuth.js).
 *
 * Decisión de seguridad: falla cerrado — si el check anti-replay no puede ejecutarse,
 * se rechaza la request en lugar de permitir paso sin verificación.
 */
export function requireService(req: Request, res: Response, next: NextFunction): void {
    const token = req.headers['x-service-token'] as string | undefined;

    if (!token) {
        res.status(401).json({
            success: false,
            error: { code: 'SERVICE_TOKEN_MISSING', message: 'Token inter-servicio requerido (X-Service-Token)' },
        });
        return;
    }

    if (!INTERNAL_SERVICE_SECRET) {
        res.status(503).json({
            success: false,
            error: { code: 'SERVICE_AUTH_MISCONFIGURED', message: 'INTERNAL_SERVICE_SECRET no definido en el servidor' },
        });
        return;
    }

    try {
        const payload = jwt.verify(token, INTERNAL_SERVICE_SECRET, {
            issuer: 'internal-bus',
            algorithms: ['HS256'],
        }) as ServiceTokenPayload;

        if (payload.type !== 'service-token') {
            throw new Error('Token type inválido');
        }

        const jti = payload.jti;
        if (!jti) {
            res.status(401).json({
                success: false,
                error: { code: 'SERVICE_TOKEN_INVALID', message: 'Token sin jti — versión antigua sin anti-replay' },
            });
            return;
        }

        const replayKey = `service-token-used:${jti}`;
        if (cacheService.get(replayKey)) {
            res.status(401).json({
                success: false,
                error: { code: 'SERVICE_TOKEN_REPLAYED', message: 'Token ya utilizado (replay detectado)' },
            });
            return;
        }

        // TTL 35 s: ventana ligeramente mayor que el expiresIn del token (30 s)
        cacheService.set(replayKey, '1', 35);

        (req as Request & { callerService: string }).callerService = payload.sub;
        next();
    } catch {
        res.status(401).json({
            success: false,
            error: { code: 'SERVICE_TOKEN_INVALID', message: 'Token inter-servicio inválido o expirado' },
        });
    }
}
