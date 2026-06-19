const Triage = require('../models/Triage');
const QuestionnaireResponse = require('../models/QuestionnaireResponse');
const { clasificarTriage, getQuestions } = require('./decisionTree.service');
const { cacheTriageResult, getCachedTriageResult, invalidateTriageCache } = require('../config/redis');
const { publishMessage, EXCHANGES, ROUTING_KEYS } = require('../../../../shared/config/rabbitmq');

/**
 * Process triage questionnaire and return classification
 */
async function processQuestionnaire(patientId, responses) {
    // Run classification algorithm
    const classificationResult = clasificarTriage(responses);

    // Create triage record
    const triage = await Triage.create({
        patient_id: patientId,
        classification: classificationResult.classification,
        score: classificationResult.score,
        symptoms_detected: classificationResult.symptoms_detected,
        critical_flags: classificationResult.critical_flags,
        decision_log: classificationResult.decision_log,
        recommendation: classificationResult.recommendation,
        status: 'PENDIENTE'
    });

    // Save individual responses
    const questions = getQuestions();
    for (const response of responses) {
        const question = questions.find(q => q.id === response.question_id);
        if (question) {
            await QuestionnaireResponse.create({
                triage_id: triage.id,
                question_id: response.question_id,
                question_text: question.text,
                question_type: question.type,
                answer_value: response.answer_value,
                score_contribution: classificationResult.decision_log.scores_per_question
                    .find(s => s.question_id === response.question_id)?.score_contribution || 0
            });
        }
    }

    // Cache result
    await cacheTriageResult(patientId, {
        triage_id: triage.id,
        classification: classificationResult.classification,
        score: classificationResult.score,
        cached_at: new Date().toISOString()
    });

    // Publish event to RabbitMQ
    await publishMessage(EXCHANGES.EVENTS, ROUTING_KEYS.TRIAGE_CREATED, {
        triage_id: triage.id,
        patient_id: patientId,
        classification: classificationResult.classification,
        score: classificationResult.score,
        critical_flags: classificationResult.critical_flags,
        suggested_action: classificationResult.suggested_action
    });

    // If ROJO, send urgent notification
    if (classificationResult.classification === 'ROJO') {
        await publishMessage(EXCHANGES.NOTIFICATIONS, ROUTING_KEYS.SMS, {
            type: 'TRIAGE_URGENT',
            patient_id: patientId,
            triage_id: triage.id,
            message: classificationResult.recommendation
        });
    }

    return {
        triage_id: triage.id,
        ...classificationResult
    };
}

/**
 * Get triage by ID with responses
 */
async function getTriageById(triageId) {
    const triage = await Triage.findByPk(triageId);
    if (!triage) return null;

    const responses = await QuestionnaireResponse.findAll({
        where: { triage_id: triageId },
        order: [['question_id', 'ASC']]
    });

    return {
        ...triage.toJSON(),
        responses
    };
}

/**
 * Get all triages for a patient
 */
async function getTriagesByPatient(patientId) {
    return await Triage.findAll({
        where: { patient_id: patientId },
        order: [['classified_at', 'DESC']]
    });
}

/**
 * Get latest triage for a patient
 */
async function getLatestTriage(patientId) {
    // Check cache first
    const cached = await getCachedTriageResult(patientId);
    if (cached) {
        const triage = await Triage.findByPk(cached.triage_id);
        if (triage) return triage;
    }

    return await Triage.findOne({
        where: { patient_id: patientId },
        order: [['classified_at', 'DESC']]
    });
}

/**
 * Update triage status
 */
async function updateTriageStatus(triageId, status, doctorId = null, notes = null) {
    const triage = await Triage.findByPk(triageId);
    if (!triage) return null;

    const updateData = { status };

    if (doctorId) {
        updateData.doctor_id = doctorId;
        updateData.reviewed_by_doctor = true;
        updateData.reviewed_at = new Date();
    }

    if (notes) {
        updateData.doctor_notes = notes;
    }

    await triage.update(updateData);

    // Invalidate cache
    await invalidateTriageCache(triage.patient_id);

    // Publish status update event
    await publishMessage(EXCHANGES.EVENTS, ROUTING_KEYS.TRIAGE_UPDATED, {
        triage_id: triageId,
        patient_id: triage.patient_id,
        old_status: triage.status,
        new_status: status,
        doctor_id: doctorId
    });

    return triage;
}

/**
 * Get pending triages (for admin dashboard)
 */
async function getPendingTriages(filter = {}) {
    const { Op } = require('sequelize');
    const where = { status: 'PENDIENTE' };

    if (filter.classification) {
        where.classification = filter.classification;
    }

    return await Triage.findAll({
        where,
        order: [
            ['classification', 'ASC'], // ROJO first
            ['classified_at', 'ASC']   // Oldest first
        ]
    });
}

/**
 * Get triage statistics
 */
async function getTriageStats(startDate, endDate) {
    const { Op, fn, col } = require('sequelize');

    const where = {};
    if (startDate && endDate) {
        where.classified_at = {
            [Op.between]: [startDate, endDate]
        };
    }

    const stats = await Triage.findAll({
        where,
        attributes: [
            'classification',
            [fn('COUNT', col('id')), 'count']
        ],
        group: ['classification']
    });

    return stats.reduce((acc, stat) => {
        acc[stat.classification] = parseInt(stat.get('count'));
        return acc;
    }, { ROJO: 0, AMARILLO: 0, VERDE: 0 });
}

module.exports = {
    processQuestionnaire,
    getTriageById,
    getTriagesByPatient,
    getLatestTriage,
    updateTriageStatus,
    getPendingTriages,
    getTriageStats
};
