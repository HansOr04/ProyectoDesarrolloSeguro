const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('FATAL: JWT_SECRET no definido. Define TRIAGE_JWT_SECRET en .env');
}
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES_IN = '7d';

/**
 * Generate access token
 */
function generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Generate refresh token
 */
function generateRefreshToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
}

/**
 * Verify token
 */
function verifyToken(token) {
    return jwt.verify(token, JWT_SECRET);
}

/**
 * Decode token without verification
 */
function decodeToken(token) {
    return jwt.decode(token);
}

/**
 * Generate both access and refresh tokens
 */
function generateTokenPair(user) {
    const payload = {
        id: user.id,
        email: user.email,
        role: user.role,
        nombre: user.nombre,
        apellido: user.apellido
    };

    return {
        accessToken: generateToken(payload),
        refreshToken: generateRefreshToken({ id: user.id }),
        expiresIn: JWT_EXPIRES_IN
    };
}

module.exports = {
    generateToken,
    generateRefreshToken,
    verifyToken,
    decodeToken,
    generateTokenPair
};
