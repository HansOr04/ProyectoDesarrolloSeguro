const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Appointment = sequelize.define('Appointment', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    patient_id: {
        type: DataTypes.UUID,
        allowNull: false
    },
    doctor_id: {
        type: DataTypes.UUID,
        allowNull: false
    },
    triage_id: {
        type: DataTypes.UUID
    },
    scheduled_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    scheduled_time: {
        type: DataTypes.TIME,
        allowNull: false
    },
    duration_minutes: {
        type: DataTypes.INTEGER,
        defaultValue: 30
    },
    status: {
        type: DataTypes.ENUM('AGENDADA', 'CONFIRMADA', 'EN_CURSO', 'COMPLETADA', 'CANCELADA', 'NO_ASISTIO'),
        defaultValue: 'AGENDADA'
    },
    meeting_url: {
        type: DataTypes.STRING(255)
    },
    meeting_room_name: {
        type: DataTypes.STRING(100)
    },
    reason: {
        type: DataTypes.TEXT
    },
    notes: {
        type: DataTypes.TEXT
    },
    started_at: {
        type: DataTypes.DATE
    },
    ended_at: {
        type: DataTypes.DATE
    }
}, {
    tableName: 'appointments',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Appointment;
