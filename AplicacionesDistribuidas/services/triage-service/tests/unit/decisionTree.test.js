const { clasificarTriage, calculateQuestionScore, detectCriticalFlags, getQuestions, QUESTIONS } = require('../src/services/decisionTree.service');

describe('Triage Decision Tree Service', () => {

    describe('getQuestions', () => {
        it('should return 8 questions', () => {
            const questions = getQuestions();
            expect(questions).toHaveLength(8);
        });

        it('should have valid question structure', () => {
            const questions = getQuestions();
            questions.forEach(q => {
                expect(q.id).toBeDefined();
                expect(q.text).toBeDefined();
                expect(q.type).toBeDefined();
            });
        });
    });

    describe('calculateQuestionScore', () => {
        it('should calculate score for single_choice questions', () => {
            const question = QUESTIONS[0]; // Difficulty breathing
            expect(calculateQuestionScore(question, 'No')).toBe(0);
            expect(calculateQuestionScore(question, 'Un poco')).toBe(5);
            expect(calculateQuestionScore(question, 'Sí, mucha dificultad')).toBe(20);
        });

        it('should calculate score for scale questions', () => {
            const question = QUESTIONS[1]; // Chest pain (0-10)
            expect(calculateQuestionScore(question, '0')).toBe(0);
            expect(calculateQuestionScore(question, '5')).toBe(10); // 5 * 2 = 10
            expect(calculateQuestionScore(question, '10')).toBe(20); // 10 * 2 = 20
        });

        it('should calculate score for boolean questions', () => {
            const question = QUESTIONS[2]; // Loss of consciousness
            expect(calculateQuestionScore(question, 'No')).toBe(0);
            expect(calculateQuestionScore(question, 'Sí')).toBe(25);
        });

        it('should calculate score for multiple_choice questions', () => {
            const question = QUESTIONS[5]; // Chronic diseases
            expect(calculateQuestionScore(question, ['Ninguna'])).toBe(0);
            expect(calculateQuestionScore(question, ['Diabetes'])).toBe(3);
            expect(calculateQuestionScore(question, ['Diabetes', 'Hipertensión'])).toBe(6);
        });
    });

    describe('detectCriticalFlags', () => {
        it('should detect critical flags for severe breathing difficulty', () => {
            const responses = [{ question_id: 1, answer_value: 'Sí, mucha dificultad' }];
            const { criticalFlags } = detectCriticalFlags(responses);
            expect(criticalFlags).toContain('DIFICULTAD_RESPIRATORIA_SEVERA');
        });

        it('should detect critical flags for severe chest pain', () => {
            const responses = [{ question_id: 2, answer_value: '9' }];
            const { criticalFlags } = detectCriticalFlags(responses);
            expect(criticalFlags).toContain('DOLOR_PECHO_SEVERO');
        });

        it('should detect critical flags for loss of consciousness', () => {
            const responses = [{ question_id: 3, answer_value: 'Sí' }];
            const { criticalFlags } = detectCriticalFlags(responses);
            expect(criticalFlags).toContain('PERDIDA_CONCIENCIA');
        });
    });

    describe('clasificarTriage', () => {
        it('should classify as ROJO for critical symptoms', () => {
            const responses = [
                { question_id: 1, answer_value: 'Sí, mucha dificultad' },
                { question_id: 2, answer_value: '8' },
                { question_id: 3, answer_value: 'No' },
                { question_id: 4, answer_value: 'No' },
                { question_id: 5, answer_value: 'Menos de 6 horas' },
                { question_id: 6, answer_value: ['Ninguna'] },
                { question_id: 7, answer_value: 'No' },
                { question_id: 8, answer_value: 'Sí, han empeorado' }
            ];

            const result = clasificarTriage(responses);
            expect(result.classification).toBe('ROJO');
            expect(result.priority).toBe(1);
            expect(result.suggested_action).toBe('EMERGENCY');
        });

        it('should classify as AMARILLO for moderate symptoms', () => {
            const responses = [
                { question_id: 1, answer_value: 'Un poco' },
                { question_id: 2, answer_value: '4' },
                { question_id: 3, answer_value: 'No' },
                { question_id: 4, answer_value: { confirmed: true, temperature: '38.5' } },
                { question_id: 5, answer_value: '6-24 horas' },
                { question_id: 6, answer_value: ['Diabetes'] },
                { question_id: 7, answer_value: 'No' },
                { question_id: 8, answer_value: 'Se mantienen igual' }
            ];

            const result = clasificarTriage(responses);
            expect(result.classification).toBe('AMARILLO');
            expect(result.priority).toBe(2);
        });

        it('should classify as VERDE for mild symptoms', () => {
            const responses = [
                { question_id: 1, answer_value: 'No' },
                { question_id: 2, answer_value: '0' },
                { question_id: 3, answer_value: 'No' },
                { question_id: 4, answer_value: 'No' },
                { question_id: 5, answer_value: 'Más de 3 días' },
                { question_id: 6, answer_value: ['Ninguna'] },
                { question_id: 7, answer_value: 'No' },
                { question_id: 8, answer_value: 'No' }
            ];

            const result = clasificarTriage(responses);
            expect(result.classification).toBe('VERDE');
            expect(result.priority).toBe(3);
            expect(result.suggested_action).toBe('TELECONSULT_72H');
        });

        it('should always return a recommendation', () => {
            const responses = [
                { question_id: 1, answer_value: 'No' },
                { question_id: 2, answer_value: '0' }
            ];

            const result = clasificarTriage(responses);
            expect(result.recommendation).toBeDefined();
            expect(typeof result.recommendation).toBe('string');
        });

        it('should include decision_log with scores per question', () => {
            const responses = [
                { question_id: 1, answer_value: 'No' },
                { question_id: 5, answer_value: '1-3 días' }
            ];

            const result = clasificarTriage(responses);
            expect(result.decision_log).toBeDefined();
            expect(result.decision_log.scores_per_question).toBeDefined();
            expect(result.decision_log.total_score).toBeDefined();
        });
    });
});
