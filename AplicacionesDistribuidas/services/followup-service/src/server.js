require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { sequelize } = require('./config/database');
const followupRoutes = require('./routes/followup.routes');
const { startScheduler } = require('./jobs/followup.scheduler');
const { errorHandler } = require('../../../shared/utils/errorHandler');
const { createLogger } = require('../../../shared/utils/logger');
const { connect: connectRabbitMQ, consumeQueue, QUEUES } = require('../../../shared/config/rabbitmq');

const app = express();
const PORT = process.env.PORT || 5006;
const logger = createLogger('followup-service');

app.locals.logger = logger;

// Middleware
app.use(helmet());
// app.use(cors()); // CORS handled by API Gateway
app.use(express.json());
app.use(morgan('combined', {
    stream: { write: (message) => logger.info(message.trim()) }
}));

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'followup-service',
        timestamp: new Date().toISOString()
    });
});

// Routes
app.use('/', followupRoutes);

// Error handler
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Endpoint not found' }
    });
});

// Handle appointment completed events to create follow-ups
async function handleAppointmentCompleted(message) {
    const FollowUp = require('./models/FollowUp');
    const { appointment_id, patient_id } = message;

    logger.info(`Creating follow-ups for appointment ${appointment_id}`);

    const now = new Date();

    // Create 24h follow-up
    await FollowUp.create({
        appointment_id,
        patient_id,
        scheduled_for: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        followup_type: '24H'
    });

    // Create 48h follow-up
    await FollowUp.create({
        appointment_id,
        patient_id,
        scheduled_for: new Date(now.getTime() + 48 * 60 * 60 * 1000),
        followup_type: '48H'
    });

    // Create 7d follow-up
    await FollowUp.create({
        appointment_id,
        patient_id,
        scheduled_for: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        followup_type: '7D'
    });

    logger.info(`Created follow-ups for appointment ${appointment_id}`);
}

async function startServer() {
    try {
        await sequelize.authenticate();
        logger.info('Database connection established successfully');

        await connectRabbitMQ();
        logger.info('RabbitMQ connection established successfully');

        // Consume appointment events
        await consumeQueue(QUEUES.APPOINTMENT_EVENTS, async (message) => {
            if (message.type === 'appointment.completed' || message.routingKey?.includes('completed')) {
                await handleAppointmentCompleted(message);
            }
        });

        // Tables are created by SQL init scripts
        // await sequelize.sync({ alter: true });
        logger.info('Using pre-created database schema');

        // Start scheduled jobs
        startScheduler();
        logger.info('Follow-up scheduler started');

        app.listen(PORT, () => {
            logger.info(`FollowUp Service running on port ${PORT}`);
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
