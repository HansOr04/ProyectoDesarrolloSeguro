const winston = require('winston');

const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
        return `${timestamp} [${service || 'app'}] ${level}: ${message} ${metaStr}`;
    })
);

const createLogger = (serviceName) => {
    return winston.createLogger({
        level: process.env.LOG_LEVEL || 'info',
        defaultMeta: { service: serviceName },
        format: logFormat,
        transports: [
            new winston.transports.Console({
                format: consoleFormat
            }),
            new winston.transports.File({
                filename: 'logs/error.log',
                level: 'error'
            }),
            new winston.transports.File({
                filename: 'logs/combined.log'
            })
        ]
    });
};

module.exports = { createLogger };
