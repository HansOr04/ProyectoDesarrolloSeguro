require('dotenv').config();

const express = require('express');
// CORS is handled by API Gateway (nginx)
// const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { sequelize } = require('./config/database');
const patientRoutes = require('./routes/patient.routes');
const { errorHandler } = require('../../../shared/utils/errorHandler');
const { createLogger } = require('../../../shared/utils/logger');

const app = express();
const PORT = process.env.PORT || 5002;
const logger = createLogger('patient-service');

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
        service: 'patient-service',
        timestamp: new Date().toISOString()
    });
});

// Routes
app.use('/', patientRoutes);

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

        // Tables are created by SQL init scripts
        // await sequelize.sync({ alter: true });
        logger.info('Using pre-created database schema');

        app.listen(PORT, () => {
            logger.info(`Patient Service running on port ${PORT}`);
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
