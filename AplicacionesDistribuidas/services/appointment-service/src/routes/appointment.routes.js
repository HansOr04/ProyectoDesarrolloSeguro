const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();
const appointmentController = require('../controllers/appointment.controller');

// Validation middleware
const validateAppointment = [
    body('patient_id').isUUID().withMessage('Valid patient ID required'),
    body('doctor_id').isUUID().withMessage('Valid doctor ID required'),
    body('scheduled_date').isDate().withMessage('Valid date required'),
    body('scheduled_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]/).withMessage('Valid time required')
];

const validateId = [
    param('id').isUUID().withMessage('Valid UUID required')
];

const validateStatusUpdate = [
    body('status').isIn(['AGENDADA', 'CONFIRMADA', 'EN_CURSO', 'COMPLETADA', 'CANCELADA', 'NO_ASISTIO']).withMessage('Invalid status')
];

// Routes
router.post('/', validateAppointment, appointmentController.createAppointment);
router.get('/', appointmentController.getAllAppointments);
router.get('/available-slots', appointmentController.getAvailableSlots);
router.get('/doctor/:doctor_id/today', appointmentController.getTodayAppointments);
router.get('/:id', validateId, appointmentController.getAppointmentById);
router.patch('/:id/status', validateId, validateStatusUpdate, appointmentController.updateAppointmentStatus);

module.exports = router;
