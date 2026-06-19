const classificationService = require('../services/classification.service');
const { getQuestions } = require('../services/decisionTree.service');
const { NotFoundError, ValidationError } = require('../../../../shared/utils/errorHandler');

/**
 * Get triage questionnaire
 */
async function getQuestionnaire(req, res, next) {
    try {
        const questions = getQuestions();

        res.json({
            success: true,
            data: {
                total_questions: questions.length,
                questions
            }
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Submit questionnaire and get classification
 */
async function submitQuestionnaire(req, res, next) {
    try {
        const { patient_id, responses } = req.body;

        if (!patient_id) {
            throw new ValidationError('Patient ID required');
        }

        if (!responses || !Array.isArray(responses) || responses.length === 0) {
            throw new ValidationError('Responses required');
        }

        const result = await classificationService.processQuestionnaire(patient_id, responses);

        res.status(201).json({
            success: true,
            message: 'Triage classification completed',
            data: result
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get triage by ID
 */
async function getTriageById(req, res, next) {
    try {
        const { id } = req.params;

        const triage = await classificationService.getTriageById(id);
        if (!triage) {
            throw new NotFoundError('Triage');
        }

        res.json({
            success: true,
            data: triage
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get triages by patient
 */
async function getTriagesByPatient(req, res, next) {
    try {
        const { patientId } = req.params;

        const triages = await classificationService.getTriagesByPatient(patientId);

        res.json({
            success: true,
            data: triages
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get latest triage for patient
 */
async function getLatestTriage(req, res, next) {
    try {
        const { patientId } = req.params;

        const triage = await classificationService.getLatestTriage(patientId);
        if (!triage) {
            throw new NotFoundError('Triage');
        }

        res.json({
            success: true,
            data: triage
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Update triage status (doctor review)
 */
async function updateTriageStatus(req, res, next) {
    try {
        const { id } = req.params;
        const { status, doctor_id, notes } = req.body;

        const triage = await classificationService.updateTriageStatus(id, status, doctor_id, notes);
        if (!triage) {
            throw new NotFoundError('Triage');
        }

        res.json({
            success: true,
            message: 'Triage status updated',
            data: triage
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get pending triages (admin dashboard)
 */
async function getPendingTriages(req, res, next) {
    try {
        const { classification } = req.query;

        const triages = await classificationService.getPendingTriages({ classification });

        res.json({
            success: true,
            data: {
                total: triages.length,
                triages
            }
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get triage statistics
 */
async function getTriageStats(req, res, next) {
    try {
        const { start_date, end_date } = req.query;

        const stats = await classificationService.getTriageStats(start_date, end_date);

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    getQuestionnaire,
    submitQuestionnaire,
    getTriageById,
    getTriagesByPatient,
    getLatestTriage,
    updateTriageStatus,
    getPendingTriages,
    getTriageStats
};
