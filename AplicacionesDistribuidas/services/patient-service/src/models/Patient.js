const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Patient = sequelize.define('Patient', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: true
    },
    cedula: {
        type: DataTypes.STRING(10),
        allowNull: false,
        unique: true
    },
    nombres: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    apellidos: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    fecha_nacimiento: {
        type: DataTypes.DATEONLY
    },
    edad: {
        type: DataTypes.INTEGER
    },
    sexo: {
        type: DataTypes.ENUM('M', 'F', 'Otro')
    },
    telefono: {
        type: DataTypes.STRING(15)
    },
    email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    direccion: {
        type: DataTypes.TEXT
    },
    ciudad: {
        type: DataTypes.STRING(100)
    },
    provincia: {
        type: DataTypes.STRING(100)
    },
    enfermedades_cronicas: {
        type: DataTypes.ARRAY(DataTypes.TEXT),
        defaultValue: []
    },
    alergias: {
        type: DataTypes.ARRAY(DataTypes.TEXT),
        defaultValue: []
    },
    medicamentos_actuales: {
        type: DataTypes.ARRAY(DataTypes.TEXT),
        defaultValue: []
    },
    contacto_emergencia_nombre: {
        type: DataTypes.STRING(100)
    },
    contacto_emergencia_telefono: {
        type: DataTypes.STRING(15)
    }
}, {
    tableName: 'patients',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    hooks: {
        beforeCreate: (patient) => {
            if (patient.fecha_nacimiento) {
                patient.edad = calculateAge(patient.fecha_nacimiento);
            }
        },
        beforeUpdate: (patient) => {
            if (patient.changed('fecha_nacimiento')) {
                patient.edad = calculateAge(patient.fecha_nacimiento);
            }
        }
    }
});

function calculateAge(birthDate) {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
}

module.exports = Patient;
