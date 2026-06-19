const express = require('express');
const router = express.Router();
const { getJoinUrl, getEmbedConfig } = require('../services/jitsi.service');
const Appointment = require('../models/Appointment');
const { NotFoundError } = require('../../../../shared/utils/errorHandler');

/**
 * Get teleconsult room info for an appointment
 */
router.get('/:appointmentId/room', async (req, res, next) => {
    try {
        const { appointmentId } = req.params;
        const appointment = await Appointment.findByPk(appointmentId);

        if (!appointment) {
            throw new NotFoundError('Appointment');
        }

        if (!appointment.meeting_room_name) {
            throw new NotFoundError('Meeting room not configured');
        }

        res.json({
            success: true,
            data: {
                room_name: appointment.meeting_room_name,
                meeting_url: appointment.meeting_url,
                embed_config: getEmbedConfig(appointment.meeting_room_name, 'User', false)
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * Get patient join URL
 */
router.get('/:appointmentId/join/patient', async (req, res, next) => {
    try {
        const { appointmentId } = req.params;
        const { name } = req.query;

        const appointment = await Appointment.findByPk(appointmentId);
        if (!appointment) {
            throw new NotFoundError('Appointment');
        }

        const joinUrl = getJoinUrl(appointment.meeting_room_name, name || 'Paciente', false);

        res.json({
            success: true,
            data: {
                join_url: joinUrl,
                room_name: appointment.meeting_room_name
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * Get doctor join URL (moderator)
 */
router.get('/:appointmentId/join/doctor', async (req, res, next) => {
    try {
        const { appointmentId } = req.params;
        const { name } = req.query;

        const appointment = await Appointment.findByPk(appointmentId);
        if (!appointment) {
            throw new NotFoundError('Appointment');
        }

        const joinUrl = getJoinUrl(appointment.meeting_room_name, name || 'Doctor', true);

        res.json({
            success: true,
            data: {
                join_url: joinUrl,
                room_name: appointment.meeting_room_name,
                is_moderator: true
            }
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
