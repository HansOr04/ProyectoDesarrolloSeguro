const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const patientController = require('../controllers/patient.controller');

// Validation middleware
const validatePatient = [
    body('cedula').isLength({ min: 10, max: 10 }).withMessage('Cédula must be 10 digits'),
    body('nombres').trim().isLength({ min: 2 }).withMessage('Names required'),
    body('apellidos').trim().isLength({ min: 2 }).withMessage('Last names required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('telefono').optional().isMobilePhone('any').withMessage('Valid phone required'),
    body('sexo').optional().isIn(['M', 'F', 'Otro']).withMessage('Invalid sex value')
];

const validateId = [
    param('id').isUUID().withMessage('Valid UUID required')
];

// Routes
router.post('/', validatePatient, patientController.createPatient);
router.get('/', patientController.getAllPatients);
router.get('/:id', validateId, patientController.getPatientById);
router.get('/user/:userId', patientController.getPatientByUserId);
router.get('/cedula/:cedula', patientController.getPatientByCedula);
router.put('/:id', validateId, patientController.updatePatient);
router.delete('/:id', validateId, patientController.deletePatient);
router.get('/:id/medical-history', validateId, patientController.getMedicalHistory);

module.exports = router;
