const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const FollowUp = sequelize.define('FollowUp', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    appointment_id: {
        type: DataTypes.UUID,
        allowNull: false
    },
    patient_id: {
        type: DataTypes.UUID,
        allowNull: false
    },
    scheduled_for: {
        type: DataTypes.DATE,
        allowNull: false
    },
    sent_at: {
        type: DataTypes.DATE
    },
    completed_at: {
        type: DataTypes.DATE
    },
    questions_responses: {
        type: DataTypes.JSONB
    },
    improvement_score: {
        type: DataTypes.INTEGER,
        validate: { min: 1, max: 5 }
    },
    symptoms_improved: {
        type: DataTypes.BOOLEAN
    },
    new_symptoms: {
        type: DataTypes.TEXT
    },
    requires_attention: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    doctor_notified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    doctor_notified_at: {
        type: DataTypes.DATE
    },
    followup_type: {
        type: DataTypes.ENUM('24H', '48H', '7D', '30D'),
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('PENDIENTE', 'ENVIADO', 'COMPLETADO', 'EXPIRADO'),
        defaultValue: 'PENDIENTE'
    }
}, {
    tableName: 'followups',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
});

module.exports = FollowUp;
