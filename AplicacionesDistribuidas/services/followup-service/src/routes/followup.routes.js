const express = require('express');
const router = express.Router();
const FollowUp = require('../models/FollowUp');
const { NotFoundError, ValidationError } = require('../../../../shared/utils/errorHandler');
const { publishMessage, EXCHANGES, ROUTING_KEYS } = require('../../../../shared/config/rabbitmq');

// Get all follow-ups for a patient
router.get('/patient/:patientId', async (req, res, next) => {
    try {
        const followups = await FollowUp.findAll({
            where: { patient_id: req.params.patientId },
            order: [['scheduled_for', 'DESC']]
        });
        res.json({ success: true, data: followups });
    } catch (error) {
        next(error);
    }
});

// Get follow-up by ID
router.get('/:id', async (req, res, next) => {
    try {
        const followup = await FollowUp.findByPk(req.params.id);
        if (!followup) throw new NotFoundError('FollowUp');
        res.json({ success: true, data: followup });
    } catch (error) {
        next(error);
    }
});

// Submit follow-up response
router.post('/:id/response', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { improvement_score, symptoms_improved, new_symptoms, questions_responses } = req.body;

        const followup = await FollowUp.findByPk(id);
        if (!followup) throw new NotFoundError('FollowUp');

        // Determine if requires attention
        const requiresAttention = improvement_score <= 2 || symptoms_improved === false || (new_symptoms && new_symptoms.length > 0);

        await followup.update({
            improvement_score,
            symptoms_improved,
            new_symptoms,
            questions_responses,
            completed_at: new Date(),
            status: 'COMPLETADO',
            requires_attention: requiresAttention
        });

        // If requires attention, send alert
        if (requiresAttention) {
            await publishMessage(EXCHANGES.NOTIFICATIONS, ROUTING_KEYS.SMS, {
                type: 'ALERT',
                patient_id: followup.patient_id,
                followup_id: followup.id,
                message: 'Paciente reporta empeoramiento o nuevos síntomas'
            });
        }

        res.json({
            success: true,
            message: 'Follow-up response recorded',
            data: followup
        });
    } catch (error) {
        next(error);
    }
});

// Get pending follow-ups (admin)
router.get('/admin/pending', async (req, res, next) => {
    try {
        const { Op } = require('sequelize');
        const followups = await FollowUp.findAll({
            where: {
                status: { [Op.in]: ['PENDIENTE', 'ENVIADO'] },
                requires_attention: false
            },
            order: [['scheduled_for', 'ASC']]
        });
        res.json({ success: true, data: followups });
    } catch (error) {
        next(error);
    }
});

// Get follow-ups requiring attention
router.get('/admin/attention', async (req, res, next) => {
    try {
        const followups = await FollowUp.findAll({
            where: { requires_attention: true, doctor_notified: false },
            order: [['completed_at', 'ASC']]
        });
        res.json({ success: true, data: followups });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
