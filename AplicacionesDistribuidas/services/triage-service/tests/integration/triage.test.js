const request = require('supertest');
const express = require('express');

// Mock Triage API
const createTestApp = () => {
    const app = express();
    app.use(express.json());

    // Import actual decision tree for testing
    const { clasificarTriage, getQuestions } = require('../../src/services/decisionTree.service');

    app.get('/questionnaire', (req, res) => {
        const questions = getQuestions();
        res.json({
            success: true,
            data: { total_questions: questions.length, questions }
        });
    });

    app.post('/classify', (req, res) => {
        const { patient_id, responses } = req.body;

        if (!patient_id || !responses) {
            return res.status(400).json({ success: false, error: { message: 'Missing required fields' } });
        }

        const result = clasificarTriage(responses);
        res.status(201).json({
            success: true,
            data: {
                triage_id: 'mock-triage-id',
                patient_id,
                ...result
            }
        });
    });

    app.get('/health', (req, res) => {
        res.json({ status: 'ok', service: 'triage-service' });
    });

    return app;
};

describe('Triage API Integration Tests', () => {
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

    describe('GET /questionnaire', () => {
        it('should return 8 questions', async () => {
            const res = await request(app).get('/questionnaire');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.total_questions).toBe(8);
            expect(res.body.data.questions).toHaveLength(8);
        });
    });

    describe('POST /classify', () => {
        it('should classify with valid responses (VERDE case)', async () => {
            const res = await request(app)
                .post('/classify')
                .send({
                    patient_id: 'patient-123',
                    responses: [
                        { question_id: 1, answer_value: 'No' },
                        { question_id: 2, answer_value: '0' },
                        { question_id: 3, answer_value: 'No' },
                        { question_id: 4, answer_value: 'No' },
                        { question_id: 5, answer_value: 'Más de 3 días' },
                        { question_id: 6, answer_value: ['Ninguna'] },
                        { question_id: 7, answer_value: 'No' },
                        { question_id: 8, answer_value: 'No' }
                    ]
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.classification).toBe('VERDE');
        });

        it('should classify with critical symptoms (ROJO case)', async () => {
            const res = await request(app)
                .post('/classify')
                .send({
                    patient_id: 'patient-456',
                    responses: [
                        { question_id: 1, answer_value: 'Sí, mucha dificultad' },
                        { question_id: 3, answer_value: 'Sí' }
                    ]
                });

            expect(res.status).toBe(201);
            expect(res.body.data.classification).toBe('ROJO');
            expect(res.body.data.critical_flags.length).toBeGreaterThan(0);
        });

        it('should reject requests without patient_id', async () => {
            const res = await request(app)
                .post('/classify')
                .send({ responses: [] });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });
    });
});
