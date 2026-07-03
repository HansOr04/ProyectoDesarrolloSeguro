// Shared module exports
module.exports = {
    logger: require('./utils/logger'),
    errorHandler: require('./utils/errorHandler'),
    constants: require('./config/constants'),
    rabbitmq: require('./config/rabbitmq'),
    serviceAuth: require('./utils/serviceAuth'),
    gatewayAuth: require('./middlewares/gatewayAuth.middleware'),
};
