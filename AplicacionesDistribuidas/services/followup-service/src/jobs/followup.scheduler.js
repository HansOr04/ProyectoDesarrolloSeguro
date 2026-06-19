/**
 * Follow-up Scheduler using node-cron
 */
const cron = require('node-cron');
const { Op } = require('sequelize');
const FollowUp = require('../models/FollowUp');
const { publishMessage, EXCHANGES, ROUTING_KEYS } = require('../../../../shared/config/rabbitmq');

/**
 * Process pending follow-ups
 */
async function processPendingFollowUps() {
    console.log('[Scheduler] Checking for pending follow-ups...');

    const now = new Date();

    // Find follow-ups that are due
    const pendingFollowups = await FollowUp.findAll({
        where: {
            scheduled_for: { [Op.lte]: now },
            status: 'PENDIENTE'
        }
    });

    console.log(`[Scheduler] Found ${pendingFollowups.length} pending follow-ups`);

    for (const followup of pendingFollowups) {
        try {
            // Send notification via RabbitMQ
            await publishMessage(EXCHANGES.NOTIFICATIONS, ROUTING_KEYS.FOLLOWUP, {
                type: 'FOLLOWUP_REMINDER',
                followup_id: followup.id,
                patient_id: followup.patient_id,
                followup_type: followup.followup_type,
                followup_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/followup/${followup.id}`
            });

            // Update status
            await followup.update({
                status: 'ENVIADO',
                sent_at: now
            });

            console.log(`[Scheduler] Sent follow-up ${followup.id}`);
        } catch (error) {
            console.error(`[Scheduler] Failed to process follow-up ${followup.id}:`, error);
        }
    }
}

/**
 * Check for expired follow-ups
 */
async function checkExpiredFollowUps() {
    console.log('[Scheduler] Checking for expired follow-ups...');

    const now = new Date();
    const expiryThreshold = new Date(now.getTime() - 48 * 60 * 60 * 1000); // 48 hours after scheduled

    await FollowUp.update(
        { status: 'EXPIRADO' },
        {
            where: {
                status: 'ENVIADO',
                sent_at: { [Op.lte]: expiryThreshold },
                completed_at: null
            }
        }
    );
}

/**
 * Check for patients needing attention
 */
async function checkPatientsNeedingAttention() {
    console.log('[Scheduler] Checking for patients needing attention...');

    const followupsNeedingAttention = await FollowUp.findAll({
        where: {
            requires_attention: true,
            doctor_notified: false
        }
    });

    for (const followup of followupsNeedingAttention) {
        try {
            // Notify doctor
            await publishMessage(EXCHANGES.NOTIFICATIONS, ROUTING_KEYS.SMS, {
                type: 'ALERT',
                doctor_id: followup.doctor_id,
                patient_id: followup.patient_id,
                message: `Paciente requiere atención después de seguimiento ${followup.followup_type}`
            });

            await followup.update({
                doctor_notified: true,
                doctor_notified_at: new Date()
            });
        } catch (error) {
            console.error(`[Scheduler] Failed to notify doctor for follow-up ${followup.id}:`, error);
        }
    }
}

/**
 * Start scheduled jobs
 */
function startScheduler() {
    // Run every hour
    cron.schedule('0 * * * *', async () => {
        try {
            await processPendingFollowUps();
            await checkExpiredFollowUps();
            await checkPatientsNeedingAttention();
        } catch (error) {
            console.error('[Scheduler] Error in scheduled job:', error);
        }
    });

    // Run immediately on start
    setTimeout(async () => {
        try {
            await processPendingFollowUps();
        } catch (error) {
            console.error('[Scheduler] Error in initial run:', error);
        }
    }, 5000);

    console.log('[Scheduler] Follow-up scheduler initialized');
}

module.exports = {
    startScheduler,
    processPendingFollowUps,
    checkExpiredFollowUps,
    checkPatientsNeedingAttention
};
