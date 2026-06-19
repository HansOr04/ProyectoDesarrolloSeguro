const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const QuestionnaireResponse = sequelize.define('QuestionnaireResponse', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    triage_id: {
        type: DataTypes.UUID,
        allowNull: false
    },
    question_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    question_text: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    question_type: {
        type: DataTypes.STRING(30),
        allowNull: false
    },
    answer_value: {
        type: DataTypes.JSONB,
        allowNull: false
    },
    score_contribution: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    answered_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'questionnaire_responses',
    timestamps: false
});

module.exports = QuestionnaireResponse;
