const Redis = require('ioredis');

let redisClient = null;

async function connectRedis() {
    if (redisClient) return redisClient;

    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 100,
        retryStrategy(times) {
            if (times > 10) {
                return null;
            }
            return Math.min(times * 100, 3000);
        }
    });

    redisClient.on('connect', () => {
        console.log('[Redis] Connected successfully');
    });

    redisClient.on('error', (err) => {
        console.error('[Redis] Connection error:', err);
    });

    return redisClient;
}

function getRedisClient() {
    return redisClient;
}

// Cache triage result
async function cacheTriageResult(patientId, result, ttl = 3600) {
    if (!redisClient) return;

    const key = `triage:${patientId}`;
    await redisClient.set(key, JSON.stringify(result), 'EX', ttl);
}

// Get cached triage result
async function getCachedTriageResult(patientId) {
    if (!redisClient) return null;

    const key = `triage:${patientId}`;
    const cached = await redisClient.get(key);
    return cached ? JSON.parse(cached) : null;
}

// Invalidate cache
async function invalidateTriageCache(patientId) {
    if (!redisClient) return;

    const key = `triage:${patientId}`;
    await redisClient.del(key);
}

module.exports = {
    connectRedis,
    getRedisClient,
    cacheTriageResult,
    getCachedTriageResult,
    invalidateTriageCache
};
