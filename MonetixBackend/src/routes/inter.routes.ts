import { Router } from 'express';
import { requireService } from '../middlewares/serviceAuth.middleware';
import { receiveTiageReport } from '../controllers/inter.controller';

const router = Router();

/**
 * POST /api/inter/triage-report
 *
 * Endpoint receptor de reportes cifrados desde triage-service (Sistema A).
 * Flujo:
 *   1. requireService  → valida X-Service-Token (HMAC-HS256, 30 s)
 *   2. inter.controller → descifra con Vault Transit, registra transacción
 *
 * Solo accesible entre servicios internos; no expuesto en el API Gateway público.
 */
router.post('/triage-report', requireService, receiveTiageReport);

export default router;
