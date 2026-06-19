/**
 * Email Service using Nodemailer
 */
const nodemailer = require('nodemailer');

let transporter = null;

const smtpConfig = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
};

if (smtpConfig.auth.user && smtpConfig.auth.pass) {
    transporter = nodemailer.createTransport(smtpConfig);
    console.log('[Email] Transporter configured');
} else {
    console.warn('[Email] SMTP credentials not configured - emails will be simulated');
}

/**
 * Send email
 */
async function sendEmail(to, subject, htmlBody) {
    if (transporter) {
        try {
            const info = await transporter.sendMail({
                from: `"Sistema Triage Remoto" <${smtpConfig.auth.user}>`,
                to,
                subject,
                html: htmlBody
            });

            console.log(`[Email] Sent to ${to}: ${info.messageId}`);
            return {
                success: true,
                messageId: info.messageId,
                to
            };
        } catch (error) {
            console.error(`[Email] Failed to send to ${to}:`, error.message);
            return {
                success: false,
                error: error.message,
                to
            };
        }
    } else {
        // Simulate email for development
        console.log(`[EMAIL SIMULATED] To: ${to}`);
        console.log(`[EMAIL SIMULATED] Subject: ${subject}`);
        console.log(`[EMAIL SIMULATED] Body preview: ${htmlBody.substring(0, 100)}...`);
        return {
            success: true,
            simulated: true,
            to,
            message: 'Email simulated (SMTP not configured)'
        };
    }
}

module.exports = {
    sendEmail
};
