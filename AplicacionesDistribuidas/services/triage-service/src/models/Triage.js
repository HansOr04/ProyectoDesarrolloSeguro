const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Triage = sequelize.define('Triage', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    patient_id: {
        type: DataTypes.UUID,
        allowNull: false
    },
    classification: {
        type: DataTypes.ENUM('ROJO', 'AMARILLO', 'VERDE'),
        allowNull: false
    },
    score: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    symptoms_detected: {
        type: DataTypes.JSONB,
        defaultValue: []
    },
    critical_flags: {
        type: DataTypes.ARRAY(DataTypes.TEXT),
        defaultValue: []
    },
    decision_log: {
        type: DataTypes.JSONB,
        defaultValue: {}
    },
    recommendation: {
        type: DataTypes.TEXT
    },
    classified_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    reviewed_by_doctor: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    doctor_id: {
        type: DataTypes.UUID
    },
    doctor_notes: {
        type: DataTypes.TEXT
    },
    reviewed_at: {
        type: DataTypes.DATE
    },
    status: {
        type: DataTypes.ENUM('PENDIENTE', 'EN_ATENCION', 'ATENDIDO', 'DERIVADO'),
        defaultValue: 'PENDIENTE'
    }
}, {
    tableName: 'triages',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Triage;
