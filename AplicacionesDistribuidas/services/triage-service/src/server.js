require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { sequelize } = require('./config/database');
const { connectRedis } = require('./config/redis');
const triageRoutes = require('./routes/triage.routes');
const { errorHandler } = require('../../../shared/utils/errorHandler');
const { createLogger } = require('../../../shared/utils/logger');
const { connect: connectRabbitMQ, consumeQueue, QUEUES } = require('../../../shared/config/rabbitmq');
const classificationService = require('./services/classification.service');

const app = express();
const PORT = process.env.PORT || 5003;
const logger = createLogger('triage-service');

app.locals.logger = logger;

// Middleware
app.use(helmet());
// app.use(cors()); // CORS handled by API Gateway
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', {
    stream: { write: (message) => logger.info(message.trim()) }
}));

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'triage-service',
        timestamp: new Date().toISOString()
    });
});

// Routes
app.use('/', triageRoutes);

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

        await connectRedis();
        logger.info('Redis connection established successfully');

        await connectRabbitMQ();
        logger.info('RabbitMQ connection established successfully');

        // Cuando el médico finaliza una teleconsulta (appointment-service publica
        // appointment.completed), se marca el triage asociado como ATENDIDO —
        // esto a su vez dispara la notificación cifrada hacia Monetix.
        await consumeQueue(QUEUES.TRIAGE_APPOINTMENT_COMPLETION, async (message) => {
            const { triage_id, doctor_id } = message;
            if (!triage_id) return;
            await classificationService.updateTriageStatus(triage_id, 'ATENDIDO', doctor_id || null);
            logger.info(`Triage ${triage_id} marcado ATENDIDO por finalización de cita`);
        });

        // Tables are created by SQL init scripts
        // await sequelize.sync({ alter: true });
        logger.info('Using pre-created database schema');

        app.listen(PORT, () => {
            logger.info(`Triage Service running on port ${PORT}`);
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
