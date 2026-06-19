const User = require('../models/User');
const { generateTokenPair, verifyToken } = require('../services/jwt.service');
const { validatePasswordStrength, hashPassword } = require('../services/password.service');
const { ValidationError, NotFoundError, ConflictError, UnauthorizedError } = require('../../../../shared/utils/errorHandler');

/**
 * Register a new user
 */
async function register(req, res, next) {
    try {
        const { email, password, role, nombre, apellido, specialty, telefono, registration_number } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            throw new ConflictError('Email already registered');
        }

        // Validate password strength
        const passwordValidation = validatePasswordStrength(password);
        if (!passwordValidation.isValid) {
            throw new ValidationError('Invalid password', passwordValidation.errors);
        }

        // Create user
        const user = await User.create({
            email,
            password_hash: password, // Will be hashed by hook
            role: role || 'PATIENT',
            nombre,
            apellido,
            specialty,
            telefono,
            registration_number
        });

        // Generate tokens
        const tokens = generateTokenPair(user);

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                user: user.toSafeObject(),
                ...tokens
            }
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Login user
 */
async function login(req, res, next) {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ where: { email } });
        if (!user) {
            throw new UnauthorizedError('Invalid email or password');
        }

        // Check if active
        if (!user.is_active) {
            throw new UnauthorizedError('Account is inactive');
        }

        // Validate password
        const isValidPassword = await user.validatePassword(password);
        if (!isValidPassword) {
            throw new UnauthorizedError('Invalid email or password');
        }

        // Update last login
        await user.update({ last_login: new Date() });

        // Generate tokens
        const tokens = generateTokenPair(user);

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: user.toSafeObject(),
                ...tokens
            }
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Refresh access token
 */
async function refreshToken(req, res, next) {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            throw new ValidationError('Refresh token required');
        }

        // Verify refresh token
        const decoded = verifyToken(refreshToken);

        // Find user
        const user = await User.findByPk(decoded.id);
        if (!user || !user.is_active) {
            throw new UnauthorizedError('User not found or inactive');
        }

        // Generate new tokens
        const tokens = generateTokenPair(user);

        res.json({
            success: true,
            data: tokens
        });
    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            next(new UnauthorizedError('Invalid or expired refresh token'));
        } else {
            next(error);
        }
    }
}

/**
 * Get current user profile
 */
async function getProfile(req, res, next) {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user) {
            throw new NotFoundError('User');
        }

        res.json({
            success: true,
            data: user.toSafeObject()
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Update user profile
 */
async function updateProfile(req, res, next) {
    try {
        const { nombre, apellido, telefono, specialty } = req.body;

        const user = await User.findByPk(req.user.id);
        if (!user) {
            throw new NotFoundError('User');
        }

        await user.update({
            nombre: nombre || user.nombre,
            apellido: apellido || user.apellido,
            telefono: telefono || user.telefono,
            specialty: specialty || user.specialty
        });

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: user.toSafeObject()
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Change password
 */
async function changePassword(req, res, next) {
    try {
        const { currentPassword, newPassword } = req.body;

        const user = await User.findByPk(req.user.id);
        if (!user) {
            throw new NotFoundError('User');
        }

        // Validate current password
        const isValid = await user.validatePassword(currentPassword);
        if (!isValid) {
            throw new UnauthorizedError('Current password is incorrect');
        }

        // Validate new password strength
        const passwordValidation = validatePasswordStrength(newPassword);
        if (!passwordValidation.isValid) {
            throw new ValidationError('Invalid new password', passwordValidation.errors);
        }

        // Update password
        await user.update({ password_hash: await hashPassword(newPassword) });

        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Verify token (for other services)
 */
async function verifyTokenEndpoint(req, res, next) {
    try {
        const { token } = req.body;

        if (!token) {
            throw new ValidationError('Token required');
        }

        const decoded = verifyToken(token);

        const user = await User.findByPk(decoded.id);
        if (!user || !user.is_active) {
            throw new UnauthorizedError('User not found or inactive');
        }

        res.json({
            success: true,
            data: {
                valid: true,
                user: user.toSafeObject()
            }
        });
    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            res.json({
                success: true,
                data: {
                    valid: false,
                    error: error.message
                }
            });
        } else {
            next(error);
        }
    }
}

/**
 * Get all users (admin only)
 */
async function getAllUsers(req, res, next) {
    try {
        const { role, is_active } = req.query;
        const where = {};

        if (role) where.role = role;
        if (is_active !== undefined) where.is_active = is_active === 'true';

        const users = await User.findAll({
            where,
            attributes: { exclude: ['password_hash'] },
            order: [['created_at', 'DESC']]
        });

        res.json({
            success: true,
            data: users
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get doctors (for appointment scheduling)
 */
async function getDoctors(req, res, next) {
    try {
        const { specialty } = req.query;
        const where = {
            role: 'DOCTOR',
            is_active: true
        };

        if (specialty) where.specialty = specialty;

        const doctors = await User.findAll({
            where,
            attributes: { exclude: ['password_hash'] }
        });

        res.json({
            success: true,
            data: doctors
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    register,
    login,
    refreshToken,
    getProfile,
    updateProfile,
    changePassword,
    verifyTokenEndpoint,
    getAllUsers,
    getDoctors
};
