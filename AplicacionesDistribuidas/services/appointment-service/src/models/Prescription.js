const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Prescription = sequelize.define('Prescription', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    prescription_code: {
        type: DataTypes.STRING(20),
        unique: true,
        allowNull: false
    },
    appointment_id: {
        type: DataTypes.UUID
    },
    doctor_id: {
        type: DataTypes.UUID,
        allowNull: false
    },
    patient_id: {
        type: DataTypes.UUID,
        allowNull: false
    },
    diagnosis: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    medications: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: []
    },
    additional_instructions: {
        type: DataTypes.TEXT
    },
    digital_signature: {
        type: DataTypes.TEXT
    },
    qr_code: {
        type: DataTypes.TEXT
    },
    pdf_url: {
        type: DataTypes.STRING(255)
    },
    valid_until: {
        type: DataTypes.DATEONLY
    },
    issued_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'prescriptions',
    timestamps: false
});

module.exports = Prescription;
