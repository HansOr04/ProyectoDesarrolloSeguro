const Patient = require('../models/Patient');
const { ValidationError, NotFoundError, ConflictError } = require('../../../../shared/utils/errorHandler');

/**
 * Create a new patient
 */
async function createPatient(req, res, next) {
    try {
        const patientData = req.body;

        // Check if cedula already exists
        const existingPatient = await Patient.findOne({ where: { cedula: patientData.cedula } });
        if (existingPatient) {
            throw new ConflictError('Cédula already registered');
        }

        // Check if email already exists
        const existingEmail = await Patient.findOne({ where: { email: patientData.email } });
        if (existingEmail) {
            throw new ConflictError('Email already registered');
        }

        const patient = await Patient.create(patientData);

        res.status(201).json({
            success: true,
            message: 'Patient created successfully',
            data: patient
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get all patients
 */
async function getAllPatients(req, res, next) {
    try {
        const { page = 1, limit = 10, search } = req.query;
        const offset = (page - 1) * limit;

        const where = {};
        if (search) {
            const { Op } = require('sequelize');
            where[Op.or] = [
                { cedula: { [Op.iLike]: `%${search}%` } },
                { nombres: { [Op.iLike]: `%${search}%` } },
                { apellidos: { [Op.iLike]: `%${search}%` } },
                { email: { [Op.iLike]: `%${search}%` } }
            ];
        }

        const { count, rows } = await Patient.findAndCountAll({
            where,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['created_at', 'DESC']]
        });

        res.json({
            success: true,
            data: {
                patients: rows,
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
 * Get patient by ID
 */
async function getPatientById(req, res, next) {
    try {
        const { id } = req.params;

        const patient = await Patient.findByPk(id);
        if (!patient) {
            throw new NotFoundError('Patient');
        }

        res.json({
            success: true,
            data: patient
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get patient by user ID
 */
async function getPatientByUserId(req, res, next) {
    try {
        const { userId } = req.params;

        const patient = await Patient.findOne({ where: { user_id: userId } });
        if (!patient) {
            throw new NotFoundError('Patient');
        }

        res.json({
            success: true,
            data: patient
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get patient by cedula
 */
async function getPatientByCedula(req, res, next) {
    try {
        const { cedula } = req.params;

        const patient = await Patient.findOne({ where: { cedula } });
        if (!patient) {
            throw new NotFoundError('Patient');
        }

        res.json({
            success: true,
            data: patient
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Update patient
 */
async function updatePatient(req, res, next) {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const patient = await Patient.findByPk(id);
        if (!patient) {
            throw new NotFoundError('Patient');
        }

        // Check for duplicate cedula if updating
        if (updateData.cedula && updateData.cedula !== patient.cedula) {
            const existing = await Patient.findOne({ where: { cedula: updateData.cedula } });
            if (existing) {
                throw new ConflictError('Cédula already in use');
            }
        }

        await patient.update(updateData);

        res.json({
            success: true,
            message: 'Patient updated successfully',
            data: patient
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Delete patient
 */
async function deletePatient(req, res, next) {
    try {
        const { id } = req.params;

        const patient = await Patient.findByPk(id);
        if (!patient) {
            throw new NotFoundError('Patient');
        }

        await patient.destroy();

        res.json({
            success: true,
            message: 'Patient deleted successfully'
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get patient medical history
 */
async function getMedicalHistory(req, res, next) {
    try {
        const { id } = req.params;

        const patient = await Patient.findByPk(id, {
            attributes: ['id', 'nombres', 'apellidos', 'enfermedades_cronicas', 'alergias', 'medicamentos_actuales']
        });

        if (!patient) {
            throw new NotFoundError('Patient');
        }

        res.json({
            success: true,
            data: {
                patient_id: patient.id,
                patient_name: `${patient.nombres} ${patient.apellidos}`,
                chronic_diseases: patient.enfermedades_cronicas,
                allergies: patient.alergias,
                current_medications: patient.medicamentos_actuales
            }
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    createPatient,
    getAllPatients,
    getPatientById,
    getPatientByUserId,
    getPatientByCedula,
    updatePatient,
    deletePatient,
    getMedicalHistory
};
