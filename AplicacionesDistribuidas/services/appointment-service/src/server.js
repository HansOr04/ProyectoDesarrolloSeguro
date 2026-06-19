require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const { sequelize } = require('./config/database');
const appointmentRoutes = require('./routes/appointment.routes');
const teleconsultRoutes = require('./routes/teleconsult.routes');
const prescriptionRoutes = require('./routes/prescription.routes');
const referralRoutes = require('./routes/referral.routes');
const { errorHandler } = require('../../../shared/utils/errorHandler');
const { createLogger } = require('../../../shared/utils/logger');
const { connect: connectRabbitMQ } = require('../../../shared/config/rabbitmq');

const app = express();
const PORT = process.env.PORT || 5004;
const logger = createLogger('appointment-service');

app.locals.logger = logger;

// Middleware
app.use(helmet());
// app.use(cors()); // CORS handled by API Gateway
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', {
    stream: { write: (message) => logger.info(message.trim()) }
}));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'appointment-service',
        timestamp: new Date().toISOString()
    });
});

// Routes
app.use('/', appointmentRoutes);
app.use('/teleconsult', teleconsultRoutes);
app.use('/prescriptions', prescriptionRoutes);
app.use('/referrals', referralRoutes);

// Error handler
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Endpoint not found' }
    });
});

async function startServer() {
    try {
        await sequelize.authenticate();
        logger.info('Database connection established successfully');

        await connectRabbitMQ();
        logger.info('RabbitMQ connection established successfully');

        // Tables are created by SQL init scripts
        // await sequelize.sync({ alter: true });
        logger.info('Using pre-created database schema');

        app.listen(PORT, () => {
            logger.info(`Appointment Service running on port ${PORT}`);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully');
    await sequelize.close();
    process.exit(0);
});
