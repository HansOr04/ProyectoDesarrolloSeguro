// Offline Storage using IndexedDB for Triage PWA

const DB_NAME = 'TriageOfflineDB';
const DB_VERSION = 1;
const STORES = {
    PENDING_TRIAGES: 'pendingTriages',
    CACHED_PATIENTS: 'cachedPatients',
    SYNC_QUEUE: 'syncQueue'
};

let db = null;

/**
 * Initialize IndexedDB
 */
export async function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = event.target.result;

            // Store for pending triages (offline submissions)
            if (!database.objectStoreNames.contains(STORES.PENDING_TRIAGES)) {
                const triageStore = database.createObjectStore(STORES.PENDING_TRIAGES, {
                    keyPath: 'localId',
                    autoIncrement: true
                });
                triageStore.createIndex('patientId', 'patientId', { unique: false });
                triageStore.createIndex('createdAt', 'createdAt', { unique: false });
            }

            // Store for cached patients
            if (!database.objectStoreNames.contains(STORES.CACHED_PATIENTS)) {
                database.createObjectStore(STORES.CACHED_PATIENTS, { keyPath: 'id' });
            }

            // Store for sync queue
            if (!database.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
                const syncStore = database.createObjectStore(STORES.SYNC_QUEUE, {
                    keyPath: 'id',
                    autoIncrement: true
                });
                syncStore.createIndex('type', 'type', { unique: false });
                syncStore.createIndex('status', 'status', { unique: false });
            }
        };
    });
}

/**
 * Get database instance
 */
async function getDB() {
    if (!db) {
        await initDB();
    }
    return db;
}

/**
 * Save a triage for offline sync
 */
export async function savePendingTriage(patientId, responses) {
    const database = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORES.PENDING_TRIAGES], 'readwrite');
        const store = transaction.objectStore(STORES.PENDING_TRIAGES);

        const triage = {
            patientId,
            responses,
            createdAt: new Date().toISOString(),
            synced: false
        };

        const request = store.add(triage);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Get all pending triages
 */
export async function getPendingTriages() {
    const database = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORES.PENDING_TRIAGES], 'readonly');
        const store = transaction.objectStore(STORES.PENDING_TRIAGES);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Remove a synced triage
 */
export async function removePendingTriage(localId) {
    const database = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORES.PENDING_TRIAGES], 'readwrite');
        const store = transaction.objectStore(STORES.PENDING_TRIAGES);
        const request = store.delete(localId);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

/**
 * Cache a patient for offline use
 */
export async function cachePatient(patient) {
    const database = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORES.CACHED_PATIENTS], 'readwrite');
        const store = transaction.objectStore(STORES.CACHED_PATIENTS);
        const request = store.put(patient);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

/**
 * Get cached patient by ID
 */
export async function getCachedPatient(patientId) {
    const database = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORES.CACHED_PATIENTS], 'readonly');
        const store = transaction.objectStore(STORES.CACHED_PATIENTS);
        const request = store.get(patientId);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Get all cached patients
 */
export async function getAllCachedPatients() {
    const database = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORES.CACHED_PATIENTS], 'readonly');
        const store = transaction.objectStore(STORES.CACHED_PATIENTS);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Check if online
 */
export function isOnline() {
    return navigator.onLine;
}

/**
 * Add online/offline event listeners
 */
export function onOnlineStatusChange(callback) {
    window.addEventListener('online', () => callback(true));
    window.addEventListener('offline', () => callback(false));

    // Return cleanup function
    return () => {
        window.removeEventListener('online', () => callback(true));
        window.removeEventListener('offline', () => callback(false));
    };
}

/**
 * Sync all pending triages when online
 */
export async function syncPendingTriages(submitFn) {
    if (!isOnline()) {
        console.log('[Sync] Offline, skipping sync');
        return { synced: 0, failed: 0 };
    }

    const pending = await getPendingTriages();
    let synced = 0;
    let failed = 0;

    for (const triage of pending) {
        try {
            await submitFn(triage.patientId, triage.responses);
            await removePendingTriage(triage.localId);
            synced++;
            console.log(`[Sync] Synced triage ${triage.localId}`);
        } catch (error) {
            failed++;
            console.error(`[Sync] Failed to sync triage ${triage.localId}:`, error);
        }
    }

    return { synced, failed };
}
