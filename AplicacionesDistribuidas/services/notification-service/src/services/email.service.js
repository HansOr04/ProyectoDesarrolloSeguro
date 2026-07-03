/**
 * Email Service usando Nodemailer.
 * Crea el transporter cuando SMTP_HOST está configurado.
 * Compatible con MailHog (sin auth) y SMTP real (con auth).
 */
const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '1025', 10);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';

let transporter = null;

if (SMTP_HOST) {
    const transportConfig = {
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465,
        // Auth solo si se proporcionan credenciales (MailHog no las necesita)
        ...(SMTP_USER && SMTP_PASS
            ? { auth: { user: SMTP_USER, pass: SMTP_PASS } }
            : {}),
        tls: { rejectUnauthorized: false }
    };

    transporter = nodemailer.createTransport(transportConfig);
    console.log(`[Email] Transporter configurado: ${SMTP_HOST}:${SMTP_PORT}`);
} else {
    console.warn('[Email] SMTP_HOST no configurado — los emails se simularán');
}

/**
 * Envía un email. Si no hay transporter, simula el envío en consola.
 */
async function sendEmail(to, subject, htmlBody) {
    if (transporter) {
        try {
            const from = SMTP_USER
                ? `"Sistema Triage Remoto" <${SMTP_USER}>`
                : '"Sistema Triage Remoto" <noreply@triage.local>';

            const info = await transporter.sendMail({ from, to, subject, html: htmlBody });
            console.log(`[Email] Enviado a ${to}: ${info.messageId}`);
            return { success: true, messageId: info.messageId, to };
        } catch (error) {
            console.error(`[Email] Fallo al enviar a ${to}:`, error.message);
            return { success: false, error: error.message, to };
        }
    }

    // Simulación para cuando no hay SMTP configurado
    console.log(`[EMAIL SIMULADO] Para: ${to}`);
    console.log(`[EMAIL SIMULADO] Asunto: ${subject}`);
    console.log(`[EMAIL SIMULADO] Cuerpo: ${htmlBody.substring(0, 100)}...`);
    return { success: true, simulated: true, to, message: 'Email simulado (SMTP_HOST no configurado)' };
}

module.exports = { sendEmail };
