const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const prescriptionController = require('../controllers/prescription.controller');

// Validation
const validatePrescription = [
    body('doctor_id').isUUID().withMessage('Valid doctor ID required'),
    body('patient_id').isUUID().withMessage('Valid patient ID required'),
    body('diagnosis').notEmpty().withMessage('Diagnosis required'),
    body('medications').isArray({ min: 1 }).withMessage('At least one medication required')
];

// Routes
router.post('/', validatePrescription, prescriptionController.createPrescription);
router.get('/verify/:code', prescriptionController.verifyPrescription);
router.get('/:id', prescriptionController.getPrescriptionById);
router.get('/patient/:patientId', prescriptionController.getPatientPrescriptions);

module.exports = router;
