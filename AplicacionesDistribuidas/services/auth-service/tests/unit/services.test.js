const { generateAccessToken, generateRefreshToken, verifyToken } = require('../src/services/jwt.service');
const { hashPassword, comparePasswords, validatePasswordStrength } = require('../src/services/password.service');

describe('JWT Service', () => {
    const mockUser = { id: 'test-uuid-123', email: 'test@test.com', role: 'PATIENT' };

    describe('generateAccessToken', () => {
        it('should generate a valid access token', () => {
            const token = generateAccessToken(mockUser);
            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
            expect(token.split('.')).toHaveLength(3); // JWT format
        });
    });

    describe('generateRefreshToken', () => {
        it('should generate a valid refresh token', () => {
            const token = generateRefreshToken(mockUser);
            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
        });
    });

    describe('verifyToken', () => {
        it('should verify a valid access token', () => {
            const token = generateAccessToken(mockUser);
            const decoded = verifyToken(token, 'access');
            expect(decoded).toBeDefined();
            expect(decoded.userId).toBe(mockUser.id);
            expect(decoded.role).toBe(mockUser.role);
        });

        it('should return null for invalid token', () => {
            const decoded = verifyToken('invalid-token', 'access');
            expect(decoded).toBeNull();
        });
    });
});

describe('Password Service', () => {
    describe('hashPassword', () => {
        it('should hash a password', async () => {
            const hash = await hashPassword('password123');
            expect(hash).toBeDefined();
            expect(hash).not.toBe('password123');
            expect(hash.startsWith('$2')).toBe(true); // bcrypt format
        });
    });

    describe('comparePasswords', () => {
        it('should return true for matching passwords', async () => {
            const hash = await hashPassword('mypassword');
            const match = await comparePasswords('mypassword', hash);
            expect(match).toBe(true);
        });

        it('should return false for non-matching passwords', async () => {
            const hash = await hashPassword('mypassword');
            const match = await comparePasswords('wrongpassword', hash);
            expect(match).toBe(false);
        });
    });

    describe('validatePasswordStrength', () => {
        it('should accept strong passwords', () => {
            const result = validatePasswordStrength('StrongPass123!');
            expect(result.isValid).toBe(true);
        });

        it('should reject weak passwords', () => {
            const result = validatePasswordStrength('weak');
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });
    });
});
