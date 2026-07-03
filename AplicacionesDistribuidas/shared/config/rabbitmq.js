const amqp = require('amqplib');

let connection = null;
let channel = null;

const EXCHANGES = {
    NOTIFICATIONS: 'notifications',
    EVENTS: 'events',
    DEAD_LETTER: 'dead_letter'
};

const QUEUES = {
    SMS: 'sms_queue',
    EMAIL: 'email_queue',
    FOLLOWUP: 'followup_queue',
    TRIAGE_EVENTS: 'triage_events_queue',
    APPOINTMENT_EVENTS: 'appointment_events_queue',
    TRIAGE_APPOINTMENT_COMPLETION: 'triage_appointment_completion_queue'
};

const ROUTING_KEYS = {
    SMS: 'notification.sms',
    EMAIL: 'notification.email',
    FOLLOWUP: 'followup.reminder',
    TRIAGE_CREATED: 'triage.created',
    TRIAGE_UPDATED: 'triage.updated',
    APPOINTMENT_CREATED: 'appointment.created',
    APPOINTMENT_COMPLETED: 'appointment.completed',
    APPOINTMENT_CANCELLED: 'appointment.cancelled'
};

async function connect() {
    if (connection) return { connection, channel };

    const maxRetries = 10;
    const retryDelay = 5000;

    for (let i = 0; i < maxRetries; i++) {
        try {
            console.log(`[RabbitMQ] Attempting to connect... (attempt ${i + 1}/${maxRetries})`);
            connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost:5672');
            channel = await connection.createChannel();

            // Configure prefetch for fair dispatch
            await channel.prefetch(1);

            // Assert exchanges
            await channel.assertExchange(EXCHANGES.NOTIFICATIONS, 'topic', { durable: true });
            await channel.assertExchange(EXCHANGES.EVENTS, 'topic', { durable: true });
            await channel.assertExchange(EXCHANGES.DEAD_LETTER, 'fanout', { durable: true });

            // Assert queues with dead letter exchange
            const queueOptions = {
                durable: true,
                deadLetterExchange: EXCHANGES.DEAD_LETTER
            };

            await channel.assertQueue(QUEUES.SMS, queueOptions);
            await channel.assertQueue(QUEUES.EMAIL, queueOptions);
            await channel.assertQueue(QUEUES.FOLLOWUP, queueOptions);
            await channel.assertQueue(QUEUES.TRIAGE_EVENTS, queueOptions);
            await channel.assertQueue(QUEUES.APPOINTMENT_EVENTS, queueOptions);
            await channel.assertQueue(QUEUES.TRIAGE_APPOINTMENT_COMPLETION, queueOptions);

            // Bind queues to exchanges with routing keys
            await channel.bindQueue(QUEUES.SMS, EXCHANGES.NOTIFICATIONS, ROUTING_KEYS.SMS);
            await channel.bindQueue(QUEUES.EMAIL, EXCHANGES.NOTIFICATIONS, ROUTING_KEYS.EMAIL);
            await channel.bindQueue(QUEUES.FOLLOWUP, EXCHANGES.NOTIFICATIONS, ROUTING_KEYS.FOLLOWUP);
            await channel.bindQueue(QUEUES.TRIAGE_EVENTS, EXCHANGES.EVENTS, 'triage.*');
            await channel.bindQueue(QUEUES.APPOINTMENT_EVENTS, EXCHANGES.EVENTS, 'appointment.*');
            await channel.bindQueue(QUEUES.TRIAGE_APPOINTMENT_COMPLETION, EXCHANGES.EVENTS, ROUTING_KEYS.APPOINTMENT_COMPLETED);

            // Handle connection events
            connection.on('error', (err) => {
                console.error('[RabbitMQ] Connection error:', err);
                connection = null;
                channel = null;
            });

            connection.on('close', () => {
                console.warn('[RabbitMQ] Connection closed, attempting to reconnect...');
                connection = null;
                channel = null;
                setTimeout(connect, retryDelay);
            });

            console.log('[RabbitMQ] Connected successfully!');
            return { connection, channel };
        } catch (error) {
            console.error(`[RabbitMQ] Connection failed: ${error.message}`);
            if (i < maxRetries - 1) {
                console.log(`[RabbitMQ] Retrying in ${retryDelay / 1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
        }
    }

    throw new Error('[RabbitMQ] Failed to connect after maximum retries');
}

async function publishMessage(exchange, routingKey, message) {
    try {
        if (!channel) await connect();

        const messageBuffer = Buffer.from(JSON.stringify({
            ...message,
            timestamp: new Date().toISOString()
        }));

        channel.publish(exchange, routingKey, messageBuffer, {
            persistent: true,
            contentType: 'application/json'
        });

        console.log(`[RabbitMQ] Published message to ${exchange}/${routingKey}`);
        return true;
    } catch (error) {
        console.error('[RabbitMQ] Failed to publish message:', error);
        throw error;
    }
}

async function consumeQueue(queueName, callback, options = {}) {
    try {
        if (!channel) await connect();

        console.log(`[RabbitMQ] Starting consumer for queue: ${queueName}`);

        await channel.consume(queueName, async (msg) => {
            if (msg) {
                try {
                    const content = JSON.parse(msg.content.toString());
                    console.log(`[RabbitMQ] Received message from ${queueName}:`, content);

                    await callback(content);
                    channel.ack(msg);
                    console.log(`[RabbitMQ] Message processed successfully`);
                } catch (error) {
                    console.error(`[RabbitMQ] Error processing message:`, error);

                    // Reject with requeue based on options
                    if (options.requeue !== false) {
                        channel.nack(msg, false, true);
                    } else {
                        channel.nack(msg, false, false); // Send to dead letter exchange
                    }
                }
            }
        }, { noAck: false });
    } catch (error) {
        console.error('[RabbitMQ] Failed to start consumer:', error);
        throw error;
    }
}

async function closeConnection() {
    try {
        if (channel) await channel.close();
        if (connection) await connection.close();
        console.log('[RabbitMQ] Connection closed gracefully');
    } catch (error) {
        console.error('[RabbitMQ] Error closing connection:', error);
    }
}

module.exports = {
    connect,
    publishMessage,
    consumeQueue,
    closeConnection,
    EXCHANGES,
    QUEUES,
    ROUTING_KEYS
};
