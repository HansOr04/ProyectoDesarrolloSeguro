/**
 * Decision Tree Service for Triage Classification
 * Implements the 8-question triage questionnaire with scoring algorithm
 */

const QUESTIONS = [
    {
        id: 1,
        text: '¿Presenta dificultad para respirar?',
        type: 'single_choice',
        options: ['No', 'Un poco', 'Sí, mucha dificultad'],
        weight: { 'No': 0, 'Un poco': 5, 'Sí, mucha dificultad': 20 },
        critical_value: 'Sí, mucha dificultad',
        critical_flag: 'DIFICULTAD_RESPIRATORIA_SEVERA'
    },
    {
        id: 2,
        text: '¿Tiene dolor en el pecho?',
        type: 'scale',
        min: 0,
        max: 10,
        label: 'Nivel de dolor (0 = ninguno, 10 = insoportable)',
        weight_multiplier: 2,
        critical_threshold: 8,
        critical_flag: 'DOLOR_PECHO_SEVERO'
    },
    {
        id: 3,
        text: '¿Ha perdido el conocimiento recientemente?',
        type: 'boolean',
        options: ['Sí', 'No'],
        weight: { 'Sí': 25, 'No': 0 },
        critical_value: 'Sí',
        critical_flag: 'PERDIDA_CONCIENCIA'
    },
    {
        id: 4,
        text: '¿Presenta fiebre?',
        type: 'conditional',
        options: ['No', 'Sí'],
        conditional_question: '¿Cuántos grados?',
        conditional_type: 'number',
        conditional_min: 35,
        conditional_max: 42,
        weight: (answer) => {
            if (answer === 'No' || !answer.confirmed) return 0;
            const temp = parseFloat(answer.temperature);
            if (isNaN(temp)) return 0;
            if (temp < 38) return 2;
            if (temp < 39) return 5;
            if (temp < 39.5) return 8;
            return 15;
        },
        critical_check: (answer) => {
            if (answer === 'No' || !answer.confirmed) return null;
            const temp = parseFloat(answer.temperature);
            return temp >= 40 ? 'FIEBRE_MUY_ALTA' : null;
        }
    },
    {
        id: 5,
        text: '¿Cuánto tiempo lleva con los síntomas?',
        type: 'single_choice',
        options: ['Menos de 6 horas', '6-24 horas', '1-3 días', 'Más de 3 días'],
        weight: {
            'Menos de 6 horas': 8,
            '6-24 horas': 5,
            '1-3 días': 3,
            'Más de 3 días': 1
        }
    },
    {
        id: 6,
        text: '¿Tiene antecedentes de enfermedades crónicas?',
        type: 'multiple_choice',
        options: ['Diabetes', 'Hipertensión', 'Enf. cardíaca', 'Asma', 'Ninguna', 'Otra'],
        weight: {
            'Diabetes': 3,
            'Hipertensión': 3,
            'Enf. cardíaca': 5,
            'Asma': 4,
            'Ninguna': 0,
            'Otra': 2
        }
    },
    {
        id: 7,
        text: '¿Está tomando medicación actualmente?',
        type: 'conditional',
        options: ['No', 'Sí'],
        conditional_question: '¿Cuál medicación?',
        conditional_type: 'text',
        weight: { 'No': 0, 'Sí': 1 }
    },
    {
        id: 8,
        text: '¿Los síntomas han empeorado en las últimas horas?',
        type: 'single_choice',
        options: ['No', 'Se mantienen igual', 'Sí, han empeorado'],
        weight: {
            'No': 0,
            'Se mantienen igual': 2,
            'Sí, han empeorado': 10
        },
        critical_value: 'Sí, han empeorado',
        critical_flag: 'EMPEORAMIENTO_RECIENTE'
    }
];

/**
 * Calculate score for a single question
 */
function calculateQuestionScore(question, answerValue) {
    switch (question.type) {
        case 'single_choice':
            return question.weight[answerValue] || 0;

        case 'scale':
            const scaleValue = parseInt(answerValue);
            return isNaN(scaleValue) ? 0 : scaleValue * question.weight_multiplier;

        case 'boolean':
            return question.weight[answerValue] || 0;

        case 'conditional':
            if (typeof question.weight === 'function') {
                return question.weight(answerValue);
            }
            // For simple conditional like medication
            if (typeof answerValue === 'object') {
                return question.weight[answerValue.confirmed ? 'Sí' : 'No'] || 0;
            }
            return question.weight[answerValue] || 0;

        case 'multiple_choice':
            const answers = Array.isArray(answerValue) ? answerValue : [answerValue];
            return answers.reduce((sum, ans) => sum + (question.weight[ans] || 0), 0);

        default:
            return 0;
    }
}

/**
 * Detect critical flags from responses
 */
function detectCriticalFlags(responses) {
    const criticalFlags = [];
    const symptoms = [];

    responses.forEach(response => {
        const question = QUESTIONS.find(q => q.id === response.question_id);
        if (!question) return;

        // Check for direct critical values
        if (question.critical_value && response.answer_value === question.critical_value) {
            criticalFlags.push(question.critical_flag);
        }

        // Check for scale critical thresholds
        if (question.type === 'scale' && question.critical_threshold) {
            const value = parseInt(response.answer_value);
            if (!isNaN(value) && value >= question.critical_threshold) {
                criticalFlags.push(question.critical_flag);
            }
        }

        // Check for conditional critical checks
        if (question.critical_check) {
            const flag = question.critical_check(response.answer_value);
            if (flag) criticalFlags.push(flag);
        }

        // Collect symptoms for reporting
        if (question.id === 1 && response.answer_value !== 'No') {
            symptoms.push('Dificultad respiratoria');
        }
        if (question.id === 2 && parseInt(response.answer_value) > 0) {
            symptoms.push('Dolor en el pecho');
        }
        if (question.id === 3 && response.answer_value === 'Sí') {
            symptoms.push('Pérdida de conciencia reciente');
        }
        if (question.id === 4) {
            const temp = typeof response.answer_value === 'object'
                ? response.answer_value.temperature
                : null;
            if (temp && parseFloat(temp) >= 38) {
                symptoms.push(`Fiebre (${temp}°C)`);
            }
        }
    });

    return { criticalFlags, symptoms };
}

/**
 * Main classification function
 */
function clasificarTriage(responses) {
    let totalScore = 0;
    const decisionLog = {
        scores_per_question: [],
        timestamp: new Date().toISOString()
    };

    // Calculate total score
    responses.forEach(response => {
        const question = QUESTIONS.find(q => q.id === response.question_id);
        if (!question) return;

        const score = calculateQuestionScore(question, response.answer_value);
        totalScore += score;

        decisionLog.scores_per_question.push({
            question_id: response.question_id,
            question_text: question.text,
            answer: response.answer_value,
            score_contribution: score
        });
    });

    // Detect critical flags
    const { criticalFlags, symptoms } = detectCriticalFlags(responses);

    decisionLog.total_score = totalScore;
    decisionLog.critical_flags = criticalFlags;

    // CLASSIFICATION RULES

    // ROJO: Urgencia Alta - Atención Inmediata
    if (criticalFlags.length > 0 || totalScore >= 40) {
        return {
            classification: 'ROJO',
            score: totalScore,
            critical_flags: criticalFlags,
            symptoms_detected: symptoms,
            recommendation: 'Requiere atención de emergencia INMEDIATA. Dirigirse al hospital más cercano o llamar al 911.',
            priority: 1,
            suggested_action: 'EMERGENCY',
            max_wait_time_hours: 0,
            decision_log: decisionLog
        };
    }

    // AMARILLO: Urgencia Moderada - Teleconsulta en 24h
    if (totalScore >= 20 && totalScore < 40) {
        return {
            classification: 'AMARILLO',
            score: totalScore,
            critical_flags: criticalFlags,
            symptoms_detected: symptoms,
            recommendation: 'Se recomienda teleconsulta con médico en las próximas 24 horas. Monitorear síntomas.',
            priority: 2,
            suggested_action: 'TELECONSULT_24H',
            max_wait_time_hours: 24,
            decision_log: decisionLog
        };
    }

    // VERDE: Urgencia Baja - Teleconsulta en 48-72h
    return {
        classification: 'VERDE',
        score: totalScore,
        critical_flags: criticalFlags,
        symptoms_detected: symptoms,
        recommendation: 'Puede agendar teleconsulta en los próximos 2-3 días. Monitorear síntomas y reportar si empeoran.',
        priority: 3,
        suggested_action: 'TELECONSULT_72H',
        max_wait_time_hours: 72,
        decision_log: decisionLog
    };
}

/**
 * Get questions for the questionnaire
 */
function getQuestions() {
    return QUESTIONS.map(q => ({
        id: q.id,
        text: q.text,
        type: q.type,
        options: q.options,
        min: q.min,
        max: q.max,
        label: q.label,
        conditional_question: q.conditional_question,
        conditional_type: q.conditional_type,
        conditional_min: q.conditional_min,
        conditional_max: q.conditional_max
    }));
}

module.exports = {
    QUESTIONS,
    clasificarTriage,
    calculateQuestionScore,
    detectCriticalFlags,
    getQuestions
};
