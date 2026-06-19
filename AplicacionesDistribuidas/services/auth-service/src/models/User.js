const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    password_hash: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    role: {
        type: DataTypes.ENUM('PATIENT', 'DOCTOR', 'ADMIN'),
        allowNull: false
    },
    nombre: {
        type: DataTypes.STRING(100)
    },
    apellido: {
        type: DataTypes.STRING(100)
    },
    specialty: {
        type: DataTypes.STRING(50)
    },
    registration_number: {
        type: DataTypes.STRING(50)
    },
    telefono: {
        type: DataTypes.STRING(15)
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    last_login: {
        type: DataTypes.DATE
    }
}, {
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    hooks: {
        beforeCreate: async (user) => {
            if (user.password_hash) {
                user.password_hash = await bcrypt.hash(user.password_hash, 10);
            }
        },
        beforeUpdate: async (user) => {
            if (user.changed('password_hash')) {
                user.password_hash = await bcrypt.hash(user.password_hash, 10);
            }
        }
    }
});

// Instance method to check password
User.prototype.validatePassword = async function (password) {
    return bcrypt.compare(password, this.password_hash);
};

// Instance method to get safe user data (without password)
User.prototype.toSafeObject = function () {
    const { password_hash, ...safeUser } = this.toJSON();
    return safeUser;
};

module.exports = User;
