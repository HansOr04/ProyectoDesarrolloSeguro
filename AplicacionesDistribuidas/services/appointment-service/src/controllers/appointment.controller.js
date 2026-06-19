const Appointment = require('../models/Appointment');
const { createVideoRoom } = require('../services/jitsi.service');
const { publishMessage, EXCHANGES, ROUTING_KEYS } = require('../../../../shared/config/rabbitmq');
const { NotFoundError, ValidationError, ConflictError } = require('../../../../shared/utils/errorHandler');
const { Op } = require('sequelize');

/**
 * Create a new appointment
 */
async function createAppointment(req, res, next) {
    try {
        const { patient_id, doctor_id, triage_id, scheduled_date, scheduled_time, duration_minutes, reason } = req.body;

        // Check for scheduling conflicts
        const conflict = await Appointment.findOne({
            where: {
                doctor_id,
                scheduled_date,
                scheduled_time,
                status: { [Op.notIn]: ['CANCELADA', 'NO_ASISTIO'] }
            }
        });

        if (conflict) {
            throw new ConflictError('Doctor already has an appointment at this time');
        }

        // Create video room
        const videoRoom = await createVideoRoom(
            `temp-${Date.now()}`,
            'Patient',
            'Doctor'
        );

        const appointment = await Appointment.create({
            patient_id,
            doctor_id,
            triage_id,
            scheduled_date,
            scheduled_time,
            duration_minutes: duration_minutes || 30,
            reason,
            meeting_url: videoRoom.meeting_url,
            meeting_room_name: videoRoom.room_name,
            status: 'AGENDADA'
        });

        // Update with correct room name
        const updatedRoom = await createVideoRoom(
            appointment.id,
            'Patient',
            'Doctor'
        );
        await appointment.update({
            meeting_url: updatedRoom.meeting_url,
            meeting_room_name: updatedRoom.room_name
        });

        // Publish event
        await publishMessage(EXCHANGES.EVENTS, ROUTING_KEYS.APPOINTMENT_CREATED, {
            appointment_id: appointment.id,
            patient_id,
            doctor_id,
            scheduled_date,
            scheduled_time,
            meeting_url: updatedRoom.meeting_url
        });

        // Send notification
        await publishMessage(EXCHANGES.NOTIFICATIONS, ROUTING_KEYS.SMS, {
            type: 'APPOINTMENT_CONFIRMED',
            patient_id,
            appointment_id: appointment.id,
            scheduled_date,
            scheduled_time,
            meeting_url: updatedRoom.meeting_url
        });

        res.status(201).json({
            success: true,
            message: 'Appointment created successfully',
            data: appointment
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get all appointments
 */
async function getAllAppointments(req, res, next) {
    try {
        const { patient_id, doctor_id, status, date, page = 1, limit = 20 } = req.query;
        const where = {};
        const offset = (page - 1) * limit;

        if (patient_id) where.patient_id = patient_id;
        if (doctor_id) where.doctor_id = doctor_id;
        if (status) where.status = status;
        if (date) where.scheduled_date = date;

        const { count, rows } = await Appointment.findAndCountAll({
            where,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['scheduled_date', 'ASC'], ['scheduled_time', 'ASC']]
        });

        res.json({
            success: true,
            data: {
                appointments: rows,
                pagination: {
                    total: count,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(count / limit)
                }
            }
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get appointment by ID
 */
async function getAppointmentById(req, res, next) {
    try {
        const { id } = req.params;
        const appointment = await Appointment.findByPk(id);

        if (!appointment) {
            throw new NotFoundError('Appointment');
        }

        res.json({
            success: true,
            data: appointment
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Update appointment status
 */
async function updateAppointmentStatus(req, res, next) {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;

        const appointment = await Appointment.findByPk(id);
        if (!appointment) {
            throw new NotFoundError('Appointment');
        }

        const updateData = { status };
        if (notes) updateData.notes = notes;

        if (status === 'EN_CURSO') {
            updateData.started_at = new Date();
        } else if (status === 'COMPLETADA') {
            updateData.ended_at = new Date();

            // Publish completion event
            await publishMessage(EXCHANGES.EVENTS, ROUTING_KEYS.APPOINTMENT_COMPLETED, {
                appointment_id: id,
                patient_id: appointment.patient_id,
                doctor_id: appointment.doctor_id
            });
        } else if (status === 'CANCELADA') {
            await publishMessage(EXCHANGES.EVENTS, ROUTING_KEYS.APPOINTMENT_CANCELLED, {
                appointment_id: id,
                patient_id: appointment.patient_id,
                doctor_id: appointment.doctor_id
            });
        }

        await appointment.update(updateData);

        res.json({
            success: true,
            message: 'Appointment status updated',
            data: appointment
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get available time slots for a doctor
 */
async function getAvailableSlots(req, res, next) {
    try {
        const { doctor_id, date } = req.query;

        if (!doctor_id || !date) {
            throw new ValidationError('Doctor ID and date required');
        }

        // Get existing appointments for that day
        const existingAppointments = await Appointment.findAll({
            where: {
                doctor_id,
                scheduled_date: date,
                status: { [Op.notIn]: ['CANCELADA', 'NO_ASISTIO'] }
            },
            attributes: ['scheduled_time', 'duration_minutes']
        });

        const bookedTimes = existingAppointments.map(a => a.scheduled_time);

        // Generate slots (8:00 to 17:00, every 30 minutes)
        const slots = [];
        for (let hour = 8; hour < 17; hour++) {
            for (let minute = 0; minute < 60; minute += 30) {
                const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
                if (!bookedTimes.includes(time)) {
                    slots.push({
                        time: time.substring(0, 5),
                        available: true
                    });
                }
            }
        }

        res.json({
            success: true,
            data: {
                date,
                doctor_id,
                available_slots: slots
            }
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get today's appointments for a doctor
 */
async function getTodayAppointments(req, res, next) {
    try {
        const { doctor_id } = req.params;
        const today = new Date().toISOString().split('T')[0];

        const appointments = await Appointment.findAll({
            where: {
                doctor_id,
                scheduled_date: today,
                status: { [Op.notIn]: ['CANCELADA'] }
            },
            order: [['scheduled_time', 'ASC']]
        });

        res.json({
            success: true,
            data: appointments
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    createAppointment,
    getAllAppointments,
    getAppointmentById,
    updateAppointmentStatus,
    getAvailableSlots,
    getTodayAppointments
};
