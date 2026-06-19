// MongoDB Initialization Script
// Creates collections and indexes for logs

// Switch to logs database
db = db.getSiblingDB('logs_db');

// Create collections
db.createCollection('api_logs');
db.createCollection('notification_logs');
db.createCollection('audit_logs');
db.createCollection('error_logs');

// Create indexes for api_logs
db.api_logs.createIndex({ "timestamp": -1 });
db.api_logs.createIndex({ "service": 1 });
db.api_logs.createIndex({ "method": 1 });
db.api_logs.createIndex({ "status_code": 1 });
db.api_logs.createIndex({ "user_id": 1 });

// Create indexes for notification_logs
db.notification_logs.createIndex({ "sent_at": -1 });
db.notification_logs.createIndex({ "type": 1 });
db.notification_logs.createIndex({ "status": 1 });
db.notification_logs.createIndex({ "recipient": 1 });

// Create indexes for audit_logs
db.audit_logs.createIndex({ "timestamp": -1 });
db.audit_logs.createIndex({ "user_id": 1 });
db.audit_logs.createIndex({ "action": 1 });
db.audit_logs.createIndex({ "entity": 1 });

// Create indexes for error_logs
db.error_logs.createIndex({ "timestamp": -1 });
db.error_logs.createIndex({ "service": 1 });
db.error_logs.createIndex({ "severity": 1 });

// Insert sample document to verify
db.api_logs.insertOne({
    service: 'init',
    message: 'MongoDB initialized successfully',
    timestamp: new Date()
});

print('MongoDB collections and indexes created successfully!');
