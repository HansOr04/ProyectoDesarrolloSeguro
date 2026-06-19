/**
 * Message Template Service
 */

const SMS_TEMPLATES = {
    APPOINTMENT_CONFIRMED: (data) =>
        `Hola ${data.patientName}, su cita médica ha sido confirmada para el ${data.date} a las ${data.time}. Link de consulta: ${data.meetingUrl}`,

    REMINDER_24H: (data) =>
        `Recordatorio: Su teleconsulta es mañana ${data.date} a las ${data.time}. No olvide ingresar puntualmente. Link: ${data.meetingUrl}`,

    REMINDER_2H: (data) =>
        `Su teleconsulta comienza en 2 horas (${data.time}). Por favor ingrese aquí: ${data.meetingUrl}`,

    DOCTOR_JOINED: (data) =>
        `El Dr./Dra. ${data.doctorName} se ha unido a la sala de espera. Por favor ingrese: ${data.meetingUrl}`,

    PRESCRIPTION_READY: (data) =>
        `Su receta médica está lista. Puede descargarla desde: ${data.downloadUrl}`,

    FOLLOWUP_REMINDER: (data) =>
        `¿Cómo se siente después de su consulta? Complete el cuestionario de seguimiento: ${data.followupUrl}`,

    TRIAGE_URGENT: (data) =>
        `URGENTE: Su clasificación de triage indica que requiere atención inmediata. ${data.message || 'Acuda a la emergencia más cercana.'}`,

    TRIAGE_RESULT: (data) =>
        `Su clasificación de triage es: ${data.classification}. ${data.recommendation}`,

    ALERT: (data) =>
        `Alerta médica: ${data.message}`
};

const EMAIL_TEMPLATES = {
    APPOINTMENT_CONFIRMED: (data) => ({
        subject: 'Confirmación de Cita - Sistema Triage Remoto',
        body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #2563eb; color: white; padding: 20px; text-align: center;">
          <h1>Cita Confirmada</h1>
        </div>
        <div style="padding: 20px;">
          <p>Hola <strong>${data.patientName}</strong>,</p>
          <p>Su cita médica ha sido confirmada con los siguientes detalles:</p>
          <table style="width: 100%; margin: 20px 0;">
            <tr><td style="padding: 10px; background: #f3f4f6;"><strong>Fecha:</strong></td><td style="padding: 10px;">${data.date}</td></tr>
            <tr><td style="padding: 10px; background: #f3f4f6;"><strong>Hora:</strong></td><td style="padding: 10px;">${data.time}</td></tr>
            <tr><td style="padding: 10px; background: #f3f4f6;"><strong>Médico:</strong></td><td style="padding: 10px;">${data.doctorName || 'Por asignar'}</td></tr>
          </table>
          <p style="text-align: center;">
            <a href="${data.meetingUrl}" style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Ingresar a la Teleconsulta
            </a>
          </p>
          <p><small>Este enlace estará disponible a la hora de su cita.</small></p>
        </div>
        <div style="background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px;">
          Sistema de Triage Remoto - Atención Médica Digital
        </div>
      </div>
    `
    }),

    PRESCRIPTION_READY: (data) => ({
        subject: 'Su Receta Médica está Lista - Sistema Triage Remoto',
        body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #10b981; color: white; padding: 20px; text-align: center;">
          <h1>Receta Médica Disponible</h1>
        </div>
        <div style="padding: 20px;">
          <p>Hola <strong>${data.patientName}</strong>,</p>
          <p>Su receta médica digital ha sido generada y está lista para descargar.</p>
          <p style="text-align: center;">
            <a href="${data.downloadUrl}" style="background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Descargar Receta
            </a>
          </p>
          <p><small>Esta receta incluye un código QR para verificar su autenticidad.</small></p>
        </div>
        <div style="background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px;">
          Sistema de Triage Remoto - Atención Médica Digital
        </div>
      </div>
    `
    }),

    FOLLOWUP_REMINDER: (data) => ({
        subject: '¿Cómo se siente? - Seguimiento Post-Consulta',
        body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #8b5cf6; color: white; padding: 20px; text-align: center;">
          <h1>Seguimiento de Salud</h1>
        </div>
        <div style="padding: 20px;">
          <p>Hola <strong>${data.patientName}</strong>,</p>
          <p>Queremos saber cómo se encuentra después de su consulta médica.</p>
          <p>Por favor, complete este breve cuestionario para que podamos darle el mejor seguimiento:</p>
          <p style="text-align: center;">
            <a href="${data.followupUrl}" style="background: #8b5cf6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Completar Cuestionario
            </a>
          </p>
          <p><small>Solo le tomará 2 minutos.</small></p>
        </div>
        <div style="background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px;">
          Sistema de Triage Remoto - Atención Médica Digital
        </div>
      </div>
    `
    })
};

/**
 * Get template for notification type
 */
function getTemplate(type, data) {
    // For SMS, return string directly
    if (SMS_TEMPLATES[type]) {
        return SMS_TEMPLATES[type](data);
    }

    // For Email, return object with subject and body
    if (EMAIL_TEMPLATES[type]) {
        return EMAIL_TEMPLATES[type](data);
    }

    // Default message
    return data.message || `Notificación del Sistema Triage Remoto: ${type}`;
}

module.exports = {
    getTemplate,
    SMS_TEMPLATES,
    EMAIL_TEMPLATES
};
