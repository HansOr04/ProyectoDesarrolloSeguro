const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const triageController = require('../controllers/triage.controller');

// Validation middleware
const validateSubmission = [
    body('patient_id').isUUID().withMessage('Valid patient ID required'),
    body('responses').isArray({ min: 1 }).withMessage('Responses required')
];

const validateId = [
    param('id').isUUID().withMessage('Valid UUID required')
];

const validateStatusUpdate = [
    body('status').isIn(['PENDIENTE', 'EN_ATENCION', 'ATENDIDO', 'DERIVADO']).withMessage('Invalid status')
];

// Routes
router.get('/questionnaire', triageController.getQuestionnaire);
router.post('/classify', validateSubmission, triageController.submitQuestionnaire);
router.get('/pending', triageController.getPendingTriages);
router.get('/stats', triageController.getTriageStats);
router.get('/:id', validateId, triageController.getTriageById);
router.get('/patient/:patientId', triageController.getTriagesByPatient);
router.get('/patient/:patientId/latest', triageController.getLatestTriage);
router.patch('/:id/status', validateId, validateStatusUpdate, triageController.updateTriageStatus);

module.exports = router;
