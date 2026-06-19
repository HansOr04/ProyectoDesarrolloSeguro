/**
 * Prescription PDF Generation Service
 */
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, '../../uploads/prescriptions');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * Generate prescription code
 */
function generatePrescriptionCode() {
    return crypto.randomBytes(8).toString('hex').toUpperCase();
}

/**
 * Generate prescription PDF with QR code
 */
async function generatePrescriptionPDF(prescriptionData) {
    const {
        id,
        prescription_code,
        patient,
        doctor,
        diagnosis,
        medications,
        additional_instructions,
        issued_at,
        valid_until
    } = prescriptionData;

    const code = prescription_code || generatePrescriptionCode();
    const filename = `receta-${code}.pdf`;
    const filepath = path.join(UPLOADS_DIR, filename);

    // Generate QR Code
    const verificationUrl = `https://triage-remoto.com/verify/${code}`;
    const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
        width: 100,
        margin: 1
    });

    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'A4',
                margin: 50,
                info: {
                    Title: `Receta Médica - ${code}`,
                    Author: `Dr./Dra. ${doctor.nombre} ${doctor.apellido}`,
                    Subject: 'Receta Médica Digital'
                }
            });

            const stream = fs.createWriteStream(filepath);
            doc.pipe(stream);

            // Colors
            const primaryColor = '#2563eb';
            const textColor = '#1f2937';
            const lightGray = '#f3f4f6';

            // Header with logo area
            doc.rect(0, 0, doc.page.width, 100).fill(primaryColor);
            doc.fillColor('white')
                .fontSize(24)
                .font('Helvetica-Bold')
                .text('RECETA MÉDICA DIGITAL', 50, 35, { align: 'center' });
            doc.fontSize(12)
                .font('Helvetica')
                .text('Sistema de Triage Remoto', 50, 65, { align: 'center' });

            // Prescription code and date
            doc.fillColor(textColor)
                .fontSize(10)
                .text(`Código: ${code}`, doc.page.width - 200, 120, { width: 150, align: 'right' })
                .text(`Fecha: ${new Date(issued_at).toLocaleDateString('es-EC')}`, doc.page.width - 200, 135, { width: 150, align: 'right' });

            let yPos = 160;

            // Patient Information Box
            doc.rect(50, yPos, doc.page.width - 100, 80).fill(lightGray);
            doc.fillColor(primaryColor)
                .fontSize(12)
                .font('Helvetica-Bold')
                .text('DATOS DEL PACIENTE', 60, yPos + 10);

            doc.fillColor(textColor)
                .fontSize(10)
                .font('Helvetica')
                .text(`Nombre: ${patient.nombres} ${patient.apellidos}`, 60, yPos + 30)
                .text(`Cédula: ${patient.cedula}`, 60, yPos + 45)
                .text(`Edad: ${patient.edad || 'N/A'} años`, 60, yPos + 60);

            if (patient.telefono) {
                doc.text(`Teléfono: ${patient.telefono}`, 300, yPos + 30);
            }

            yPos += 100;

            // Doctor Information Box
            doc.rect(50, yPos, doc.page.width - 100, 70).fill(lightGray);
            doc.fillColor(primaryColor)
                .fontSize(12)
                .font('Helvetica-Bold')
                .text('MÉDICO TRATANTE', 60, yPos + 10);

            doc.fillColor(textColor)
                .fontSize(10)
                .font('Helvetica')
                .text(`Dr./Dra. ${doctor.nombre} ${doctor.apellido}`, 60, yPos + 30)
                .text(`Especialidad: ${doctor.specialty || 'Medicina General'}`, 60, yPos + 45);

            if (doctor.registration_number) {
                doc.text(`Registro: ${doctor.registration_number}`, 300, yPos + 30);
            }

            yPos += 90;

            // Diagnosis
            doc.fillColor(primaryColor)
                .fontSize(12)
                .font('Helvetica-Bold')
                .text('DIAGNÓSTICO', 50, yPos);

            yPos += 20;
            doc.fillColor(textColor)
                .fontSize(10)
                .font('Helvetica')
                .text(diagnosis, 50, yPos, { width: doc.page.width - 100 });

            yPos += doc.heightOfString(diagnosis, { width: doc.page.width - 100 }) + 20;

            // Medications
            doc.fillColor(primaryColor)
                .fontSize(12)
                .font('Helvetica-Bold')
                .text('PRESCRIPCIÓN', 50, yPos);

            yPos += 25;

            medications.forEach((med, index) => {
                // Medication box
                doc.rect(50, yPos - 5, doc.page.width - 100, 60).stroke(primaryColor);

                doc.fillColor(primaryColor)
                    .fontSize(11)
                    .font('Helvetica-Bold')
                    .text(`${index + 1}. ${med.nombre}`, 60, yPos);

                doc.fillColor(textColor)
                    .fontSize(10)
                    .font('Helvetica')
                    .text(`Dosis: ${med.dosis}`, 70, yPos + 15)
                    .text(`Frecuencia: ${med.frecuencia}`, 70, yPos + 30)
                    .text(`Duración: ${med.duracion_dias} días`, 70, yPos + 45);

                if (med.instrucciones) {
                    doc.text(`Notas: ${med.instrucciones}`, 250, yPos + 15, { width: 200 });
                }

                yPos += 70;
            });

            // Additional Instructions
            if (additional_instructions) {
                yPos += 10;
                doc.fillColor(primaryColor)
                    .fontSize(12)
                    .font('Helvetica-Bold')
                    .text('INDICACIONES ADICIONALES', 50, yPos);

                yPos += 20;
                doc.fillColor(textColor)
                    .fontSize(10)
                    .font('Helvetica')
                    .text(additional_instructions, 50, yPos, { width: doc.page.width - 100 });

                yPos += doc.heightOfString(additional_instructions, { width: doc.page.width - 100 }) + 20;
            }

            // Footer with QR Code and signature
            const footerY = doc.page.height - 150;

            // QR Code (bottom right)
            const qrBuffer = Buffer.from(qrCodeDataUrl.split(',')[1], 'base64');
            doc.image(qrBuffer, doc.page.width - 150, footerY, { width: 80 });
            doc.fontSize(8)
                .fillColor(textColor)
                .text('Escanea para verificar', doc.page.width - 160, footerY + 85, { width: 100, align: 'center' });

            // Signature line (bottom left)
            doc.moveTo(50, footerY + 60)
                .lineTo(250, footerY + 60)
                .stroke(textColor);

            doc.fillColor(textColor)
                .fontSize(10)
                .text(`Dr./Dra. ${doctor.nombre} ${doctor.apellido}`, 50, footerY + 65)
                .fontSize(8)
                .text('Firma Digital Verificada', 50, footerY + 80);

            // Validity notice
            doc.fontSize(8)
                .fillColor('#6b7280')
                .text(
                    `Este documento es válido hasta ${new Date(valid_until || Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('es-EC')}`,
                    50,
                    doc.page.height - 30,
                    { align: 'center', width: doc.page.width - 100 }
                );

            doc.end();

            stream.on('finish', () => {
                resolve({
                    prescription_code: code,
                    filename,
                    filepath,
                    pdf_url: `/uploads/prescriptions/${filename}`,
                    qr_code_url: verificationUrl
                });
            });

            stream.on('error', reject);
        } catch (error) {
            reject(error);
        }
    });
}

module.exports = {
    generatePrescriptionPDF,
    generatePrescriptionCode
};
