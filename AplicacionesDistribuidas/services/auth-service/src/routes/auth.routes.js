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
router.post('/login', validateLogin, authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/verify-token', authController.verifyTokenEndpoint);

// Protected routes
router.get('/profile', authenticate, authController.getProfile);
router.put('/profile', authenticate, authController.updateProfile);
router.post('/change-password', authenticate, authController.changePassword);

// Public route for getting doctors (used by appointment service)
router.get('/doctors', authController.getDoctors);

// Admin routes
router.get('/users', authenticate, authorize('ADMIN'), authController.getAllUsers);

module.exports = router;
