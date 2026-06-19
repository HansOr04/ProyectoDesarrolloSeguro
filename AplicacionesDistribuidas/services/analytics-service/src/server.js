require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const analyticsRoutes = require('./routes/analytics.routes');
const { errorHandler } = require('../../../shared/utils/errorHandler');
const { createLogger } = require('../../../shared/utils/logger');

const app = express();
const PORT = process.env.PORT || 5007;
const logger = createLogger('analytics-service');

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
        service: 'analytics-service',
        timestamp: new Date().toISOString()
    });
});

// Routes
app.use('/', analyticsRoutes);

// Error handler
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Endpoint not found' }
    });
});

app.listen(PORT, () => {
    logger.info(`Analytics Service running on port ${PORT}`);
});
