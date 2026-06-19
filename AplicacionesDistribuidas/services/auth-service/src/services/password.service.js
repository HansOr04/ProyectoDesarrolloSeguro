const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

/**
 * Hash a password
 */
async function hashPassword(password) {
    return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare password with hash
 */
async function comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
}

/**
 * Validate password strength
 */
function validatePasswordStrength(password) {
    const errors = [];

    if (password.length < 8) {
        errors.push('Password must be at least 8 characters long');
    }
    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

module.exports = {
    hashPassword,
    comparePassword,
    validatePasswordStrength
};
