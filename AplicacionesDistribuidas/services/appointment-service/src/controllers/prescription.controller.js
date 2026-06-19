const Prescription = require('../models/Prescription');
const { generatePrescriptionPDF, generatePrescriptionCode } = require('../services/prescription.service');
const { publishMessage, EXCHANGES, ROUTING_KEYS } = require('../../../../shared/config/rabbitmq');
const { NotFoundError, ValidationError } = require('../../../../shared/utils/errorHandler');

/**
 * Create a new prescription
 */
async function createPrescription(req, res, next) {
    try {
        const {
            appointment_id,
            doctor_id,
            patient_id,
            diagnosis,
            medications,
            additional_instructions,
            valid_days = 30,
            patient_data,
            doctor_data
        } = req.body;

        if (!medications || !Array.isArray(medications) || medications.length === 0) {
            throw new ValidationError('Medications required');
        }

        const prescription_code = generatePrescriptionCode();
        const valid_until = new Date();
        valid_until.setDate(valid_until.getDate() + valid_days);

        // Create prescription record first
        const prescription = await Prescription.create({
            prescription_code,
            appointment_id,
            doctor_id,
            patient_id,
            diagnosis,
            medications,
            additional_instructions,
            valid_until,
            issued_at: new Date()
        });

        // Generate PDF
        try {
            const pdfResult = await generatePrescriptionPDF({
                id: prescription.id,
                prescription_code,
                patient: patient_data,
                doctor: doctor_data,
                diagnosis,
                medications,
                additional_instructions,
                issued_at: prescription.issued_at,
                valid_until
            });

            // Update prescription with PDF URL
            await prescription.update({
                pdf_url: pdfResult.pdf_url,
                qr_code: pdfResult.qr_code_url
            });
        } catch (pdfError) {
            console.error('PDF generation failed:', pdfError);
            // Continue without PDF
        }

        // Send notification
        await publishMessage(EXCHANGES.NOTIFICATIONS, ROUTING_KEYS.SMS, {
            type: 'PRESCRIPTION_READY',
            patient_id,
            prescription_id: prescription.id,
            download_url: prescription.pdf_url
        });

        res.status(201).json({
            success: true,
            message: 'Prescription created successfully',
            data: prescription
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get prescription by ID
 */
async function getPrescriptionById(req, res, next) {
    try {
        const { id } = req.params;
        const prescription = await Prescription.findByPk(id);

        if (!prescription) {
            throw new NotFoundError('Prescription');
        }

        res.json({
            success: true,
            data: prescription
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get prescriptions by patient
 */
async function getPatientPrescriptions(req, res, next) {
    try {
        const { patientId } = req.params;

        const prescriptions = await Prescription.findAll({
            where: { patient_id: patientId },
            order: [['issued_at', 'DESC']]
        });

        res.json({
            success: true,
            data: prescriptions
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Verify prescription by code
 */
async function verifyPrescription(req, res, next) {
    try {
        const { code } = req.params;

        const prescription = await Prescription.findOne({
            where: { prescription_code: code }
        });

        if (!prescription) {
            return res.json({
                success: true,
                data: {
                    valid: false,
                    message: 'Prescription not found'
                }
            });
        }

        const isExpired = new Date() > new Date(prescription.valid_until);

        res.json({
            success: true,
            data: {
                valid: !isExpired,
                expired: isExpired,
                prescription_code: prescription.prescription_code,
                issued_at: prescription.issued_at,
                valid_until: prescription.valid_until,
                diagnosis: prescription.diagnosis,
                medications: prescription.medications
            }
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    createPrescription,
    getPrescriptionById,
    getPatientPrescriptions,
    verifyPrescription
};
