const request = require('supertest');
const express = require('express');

// Mock app for integration tests
const createTestApp = () => {
    const app = express();
    app.use(express.json());

    // Mock auth routes
    app.post('/register', (req, res) => {
        const { email, password, role } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, error: { message: 'Email and password required' } });
        }
        res.status(201).json({
            success: true,
            data: { id: 'test-id', email, role: role || 'PATIENT' }
        });
    });

    app.post('/login', (req, res) => {
        const { email, password } = req.body;
        if (email === 'test@test.com' && password === 'password123') {
            return res.json({
                success: true,
                data: {
                    user: { id: 'test-id', email, role: 'PATIENT' },
                    accessToken: 'mock-access-token',
                    refreshToken: 'mock-refresh-token'
                }
            });
        }
        res.status(401).json({ success: false, error: { message: 'Invalid credentials' } });
    });

    app.get('/health', (req, res) => {
        res.json({ status: 'ok', service: 'auth-service' });
    });

    return app;
};

describe('Auth API Integration Tests', () => {
    let app;

    beforeAll(() => {
        app = createTestApp();
    });

    describe('GET /health', () => {
        it('should return health status', async () => {
            const res = await request(app).get('/health');
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('ok');
        });
    });

    describe('POST /register', () => {
        it('should register a new user', async () => {
            const res = await request(app)
                .post('/register')
                .send({ email: 'new@test.com', password: 'password123', role: 'PATIENT' });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.email).toBe('new@test.com');
        });

        it('should fail with missing email', async () => {
            const res = await request(app)
                .post('/register')
                .send({ password: 'password123' });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });
    });

    describe('POST /login', () => {
        it('should login with valid credentials', async () => {
            const res = await request(app)
                .post('/login')
                .send({ email: 'test@test.com', password: 'password123' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.accessToken).toBeDefined();
            expect(res.body.data.refreshToken).toBeDefined();
        });

        it('should fail with invalid credentials', async () => {
            const res = await request(app)
                .post('/login')
                .send({ email: 'test@test.com', password: 'wrongpassword' });

            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
        });
    });
});
