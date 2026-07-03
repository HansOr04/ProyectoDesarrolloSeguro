import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const INTERNAL_SERVICE_SECRET = process.env.INTERNAL_SERVICE_SECRET;

interface ServiceTokenPayload {
    sub: string;
    type: string;
}

/**
 * Verifica el header X-Service-Token firmado con INTERNAL_SERVICE_SECRET (HMAC-HS256, 30 s).
 * Equivalente TypeScript de shared/middlewares/gatewayAuth.middleware.js::requireService.
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

        (req as Request & { callerService: string }).callerService = payload.sub;
        next();
    } catch {
        res.status(401).json({
            success: false,
            error: { code: 'SERVICE_TOKEN_INVALID', message: 'Token inter-servicio inválido o expirado' },
        });
    }
}
