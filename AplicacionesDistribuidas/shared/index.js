// Shared module exports
module.exports = {
    logger: require('./utils/logger'),
    errorHandler: require('./utils/errorHandler'),
    constants: require('./config/constants'),
    rabbitmq: require('./config/rabbitmq')
};
