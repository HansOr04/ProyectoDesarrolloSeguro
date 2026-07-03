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

/**
 * Register user directly in Keycloak — assigns realm role "patient" (Triage-only access)
 */
async function registerKeycloak(req, res, next) {
    try {
        const { email, password, nombre, apellido } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, error: { message: 'Email y contraseña requeridos' } });
        }
        if (password.length < 8) {
            return res.status(400).json({ success: false, error: { message: 'La contraseña debe tener al menos 8 caracteres' } });
        }

        // Derive Keycloak base URL from KEYCLOAK_ISSUER (strips /realms/universidad)
        const issuer = process.env.KEYCLOAK_ISSUER || 'http://keycloak:8080/realms/universidad';
        const kcBase = issuer.replace(/\/realms\/[^/]+$/, '');
        const realm = 'universidad';

        // 1. Admin token via master realm
        const tokenRes = await fetch(`${kcBase}/realms/master/protocol/openid-connect/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: 'admin-cli',
                grant_type: 'password',
                username: process.env.KEYCLOAK_ADMIN || 'admin',
                password: process.env.KEYCLOAK_ADMIN_PASSWORD,
            }),
        });
        if (!tokenRes.ok) throw new Error('No se pudo autenticar con el administrador de Keycloak');
        const { access_token } = await tokenRes.json();

        // 2. Create user
        const createRes = await fetch(`${kcBase}/admin/realms/${realm}/users`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: email.split('@')[0],
                email,
                firstName: nombre || '',
                lastName: apellido || '',
                enabled: true,
                emailVerified: true,
                credentials: [{ type: 'password', value: password, temporary: false }],
            }),
        });

        if (createRes.status === 409) {
            return res.status(409).json({ success: false, error: { message: 'El email ya está registrado en Keycloak' } });
        }
        if (!createRes.ok) {
            const body = await createRes.text();
            throw new Error(`Keycloak rechazó la creación: ${body}`);
        }

        // 3. User ID from Location header
        const userId = createRes.headers.get('location')?.split('/').pop();
        if (!userId) throw new Error('Keycloak no devolvió el ID del usuario creado');

        // 4. Assign realm role "patient" — scope limitado a Triage
        const roleRes = await fetch(`${kcBase}/admin/realms/${realm}/roles/patient`, {
            headers: { 'Authorization': `Bearer ${access_token}` },
        });
        if (!roleRes.ok) throw new Error('No se encontró el rol "patient" en Keycloak');
        const patientRole = await roleRes.json();

        await fetch(`${kcBase}/admin/realms/${realm}/users/${userId}/role-mappings/realm`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify([{ id: patientRole.id, name: patientRole.name }]),
        });

        res.status(201).json({
            success: true,
            message: 'Cuenta creada en Keycloak. Usa "Iniciar sesión con SSO" para entrar.',
            data: { email, username: email.split('@')[0], role: 'patient' },
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
    getDoctors,
    registerKeycloak,
};
