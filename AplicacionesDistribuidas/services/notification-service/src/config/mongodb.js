const { MongoClient } = require('mongodb');

let client = null;
let db = null;

async function connectMongoDB() {
    if (db) return db;

    const url = process.env.MONGODB_URL || 'mongodb://localhost:27017';
    const dbName = 'logs_db';

    client = new MongoClient(url);
    await client.connect();
    db = client.db(dbName);

    console.log('[MongoDB] Connected successfully');
    return db;
}

function getDB() {
    return db;
}

async function closeConnection() {
    if (client) {
        await client.close();
        console.log('[MongoDB] Connection closed');
    }
}

module.exports = {
    connectMongoDB,
    getDB,
    closeConnection
};
