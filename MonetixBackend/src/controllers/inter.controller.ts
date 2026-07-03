import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { decryptTriagePayload } from '../services/vault.service';
import { Category } from '../models/Category.model';
import { Transaction } from '../models/Transaction.model';
import { User } from '../models/User.model';

interface TriageReportPayload {
    patientId: string;
    patientEmail: string | null;
    consultaRef: string;
    clasificacion: 'ROJO' | 'AMARILLO' | 'VERDE';
    doctorId: string | null;
    fecha: string;
    descripcion: string;
    monto: number;
    auditSub: string;
}

const HEALTH_CATEGORY_NAME = 'Salud';

/**
 * Busca la categoría "Salud" del sistema, o la crea si no existe.
 * Las categorías del sistema tienen userId=null e isDefault=true.
 */
async function getOrCreateHealthCategory() {
    let category = await Category.findOne({
        name: HEALTH_CATEGORY_NAME,
        isDefault: true,
    });

    if (!category) {
        category = await Category.create({
            name: HEALTH_CATEGORY_NAME,
            type: 'expense',
            icon: '🏥',
            color: '#EF4444',
            description: 'Gastos de salud y consultas médicas',
            isDefault: true,
        });
    }

    return category;
}

/**
 * Resuelve el userId de Monetix al que se debe atribuir el gasto.
 * El email del paciente (mismo correo con el que inició sesión vía Keycloak)
 * es la clave de enlace entre Triage y Monetix: si el paciente ya tiene
 * cuenta aquí (local o creada al iniciar sesión SSO) se reutiliza; si no,
 * se crea un registro mínimo para poder asociar la transacción.
 * Si no hay email disponible, se recurre a un admin como fallback.
 */
async function resolveUserId(patientEmail: string | null) {
    if (patientEmail) {
        let user = await User.findOne({ email: patientEmail }).select('_id');
        if (!user) {
            user = await User.create({
                email: patientEmail,
                name: patientEmail,
                role: 'user',
                password: crypto.randomBytes(32).toString('hex'),
            });
        }
        return user._id;
    }

    const adminUser = await User.findOne({ role: 'admin' }).select('_id');
    if (adminUser) return adminUser._id;
    const anyUser = await User.findOne({}).select('_id');
    return anyUser?._id ?? null;
}

/**
 * POST /api/inter/triage-report
 *
 * Recibe un payload cifrado con Vault Transit desde triage-service,
 * lo descifra y registra la consulta como una transacción en Monetix.
 *
 * Autenticación: X-Service-Token validado por requireService middleware.
 */
export const receiveTiageReport = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { payload } = req.body as { payload?: string };

        if (!payload || typeof payload !== 'string') {
            res.status(400).json({
                success: false,
                message: 'Campo "payload" requerido (ciphertext de Vault Transit)',
            });
            return;
        }

        // Descifrar con Vault Transit
        let data: TriageReportPayload;
        try {
            data = await decryptTriagePayload<TriageReportPayload>(payload);
        } catch (err) {
            process.stderr.write(`[inter] Error descifrando payload Vault: ${(err as Error).message}\n`);
            res.status(422).json({
                success: false,
                message: 'No se pudo descifrar el payload — verifica que Vault esté operativo',
            });
            return;
        }

        // Validar campos mínimos del payload descifrado
        if (!data.patientId || !data.consultaRef || !data.monto) {
            res.status(422).json({
                success: false,
                message: 'Payload descifrado incompleto: faltan patientId, consultaRef o monto',
            });
            return;
        }

        const category = await getOrCreateHealthCategory();
        const userId = await resolveUserId(data.patientEmail || null);

        if (!userId) {
            res.status(503).json({
                success: false,
                message: 'No hay usuarios en Monetix para asociar la transacción',
            });
            return;
        }

        const transaction = await Transaction.create({
            userId,
            categoryId: category._id,
            amount: Math.abs(data.monto),
            type: 'expense',
            description: data.descripcion || `Consulta triage ${data.clasificacion} — ref ${data.consultaRef}`,
            date: data.fecha ? new Date(data.fecha) : new Date(),
        });

        process.stdout.write(
            `[inter] Transacción creada (id=${transaction._id}) para triage ${data.consultaRef} — ${data.clasificacion}\n`
        );

        res.status(201).json({
            success: true,
            message: 'Reporte de consulta procesado y registrado en Monetix',
            data: {
                transactionId: transaction._id,
                consultaRef: data.consultaRef,
                clasificacion: data.clasificacion,
                monto: transaction.amount,
                categoria: category.name,
            },
        });
    } catch (err) {
        next(err);
    }
};
