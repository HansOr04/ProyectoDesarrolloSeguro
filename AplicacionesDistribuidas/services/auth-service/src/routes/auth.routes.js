const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// Validation middleware
const validateRegister = [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('role').optional().isIn(['PATIENT', 'DOCTOR', 'ADMIN']).withMessage('Invalid role'),
    body('nombre').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    body('apellido').optional().trim().isLength({ min: 2 }).withMessage('Last name must be at least 2 characters')
];

const validateLogin = [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required')
];

// Public routes
router.post('/register', validateRegister, authController.register);
router.post('/register-keycloak', [
    body('email').isEmail().normalizeEmail().withMessage('Email válido requerido'),
    body('password').isLength({ min: 8 }).withMessage('Contraseña mínimo 8 caracteres'),
    body('nombre').optional().trim(),
    body('apellido').optional().trim(),
], authController.registerKeycloak);
router.post('/login', validateLogin, authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/verify-token', authController.verifyTokenEndpoint);

// Protected routes
router.get('/profile', authenticate, authController.getProfile);
router.put('/profile', authenticate, authController.updateProfile);
router.post('/change-password', authenticate, authController.changePassword);

// Lista de doctores — requiere sesión activa (cualquier rol); no es dato público
router.get('/doctors', authenticate, authController.getDoctors);

// Admin routes
router.get('/users', authenticate, authorize('ADMIN'), authController.getAllUsers);

module.exports = router;
