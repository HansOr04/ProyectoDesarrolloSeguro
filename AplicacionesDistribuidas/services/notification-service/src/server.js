require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { connectMongoDB, getDB } = require('./config/mongodb');
const { connect: connectRabbitMQ, consumeQueue, QUEUES } = require('../../../shared/config/rabbitmq');
const { sendSMS } = require('./services/sms.service');
const { sendEmail } = require('./services/email.service');
const { getTemplate } = require('./services/template.service');
const { errorHandler } = require('../../../shared/utils/errorHandler');
const { createLogger } = require('../../../shared/utils/logger');

const app = express();
const PORT = process.env.PORT || 5005;
const logger = createLogger('notification-service');

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
        service: 'notification-service',
        timestamp: new Date().toISOString()
    });
});

// Manual notification endpoint (for testing)
app.post('/send', async (req, res, next) => {
    try {
        const { type, channel, recipient, data } = req.body;

        if (channel === 'sms') {
            const message = getTemplate(type, data);
            const result = await sendSMS(recipient, message);
            return res.json({ success: true, result });
        } else if (channel === 'email') {
            const template = getTemplate(type, data);
            const result = await sendEmail(recipient, template.subject, template.body);
            return res.json({ success: true, result });
        }

        res.status(400).json({ success: false, error: 'Invalid channel' });
    } catch (error) {
        next(error);
    }
});

// Get notification logs
app.get('/logs', async (req, res, next) => {
    try {
        const { type, status, limit = 50 } = req.query;
        const db = getDB();

        const query = {};
        if (type) query.type = type;
        if (status) query.status = status;

        const logs = await db.collection('notification_logs')
            .find(query)
            .sort({ sent_at: -1 })
            .limit(parseInt(limit))
            .toArray();

        res.json({ success: true, data: logs });
    } catch (error) {
        next(error);
    }
});

// Error handler
app.use(errorHandler);

/**
 * Process SMS queue messages
 */
async function processSMSMessage(message) {
    const db = getDB();
    const log = {
        type: message.type,
        channel: 'SMS',
        recipient: message.phone || message.recipient,
        message_data: message,
        status: 'PENDING',
        created_at: new Date()
    };

    try {
        // Get template and send SMS
        const templateData = {
            patientName: message.patient_name || 'Paciente',
            date: message.scheduled_date,
            time: message.scheduled_time,
            meetingUrl: message.meeting_url,
            downloadUrl: message.download_url,
            doctorName: message.doctor_name
        };

        const smsMessage = getTemplate(message.type, templateData);

        if (message.phone || message.recipient) {
            const result = await sendSMS(message.phone || message.recipient, smsMessage);
            log.status = result.success ? 'SENT' : 'FAILED';
            log.result = result;
        } else {
            log.status = 'SKIPPED';
            log.error = 'No phone number provided';
        }
    } catch (error) {
        log.status = 'FAILED';
        log.error = error.message;
        logger.error('SMS sending failed:', error);
    }

    log.sent_at = new Date();
    await db.collection('notification_logs').insertOne(log);
}

/**
 * Process Email queue messages
 */
async function processEmailMessage(message) {
    const db = getDB();
    const log = {
        type: message.type,
        channel: 'EMAIL',
        recipient: message.email || message.recipient,
        message_data: message,
        status: 'PENDING',
        created_at: new Date()
    };

    try {
        const template = getTemplate(message.type, message);

        if (message.email || message.recipient) {
            const result = await sendEmail(message.email || message.recipient, template.subject, template.body);
            log.status = result.success ? 'SENT' : 'FAILED';
            log.result = result;
        } else {
            log.status = 'SKIPPED';
            log.error = 'No email provided';
        }
    } catch (error) {
        log.status = 'FAILED';
        log.error = error.message;
        logger.error('Email sending failed:', error);
    }

    log.sent_at = new Date();
    await db.collection('notification_logs').insertOne(log);
}

async function startServer() {
    try {
        await connectMongoDB();
        logger.info('MongoDB connection established successfully');

        await connectRabbitMQ();
        logger.info('RabbitMQ connection established successfully');

        // Start consuming queues
        await consumeQueue(QUEUES.SMS, processSMSMessage);
        logger.info('Started SMS queue consumer');

        await consumeQueue(QUEUES.EMAIL, processEmailMessage);
        logger.info('Started Email queue consumer');

        app.listen(PORT, () => {
            logger.info(`Notification Service running on port ${PORT}`);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    process.exit(0);
});
