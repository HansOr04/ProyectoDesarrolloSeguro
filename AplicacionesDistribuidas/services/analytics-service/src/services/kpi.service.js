/**
 * KPI Calculation Service
 * Queries multiple databases to calculate system-wide KPIs
 */
const { Sequelize } = require('sequelize');

// Connection pools for each database
const connections = {
    patient: null,
    triage: null,
    appointment: null,
    followup: null
};

async function initConnections() {
    const baseUrl = process.env.DATABASE_URL?.replace('/analytics_db', '') || '';

    connections.patient = new Sequelize(process.env.PATIENT_DB_URL || baseUrl + '/patient_db', { logging: false });
    connections.triage = new Sequelize(process.env.TRIAGE_DB_URL || baseUrl + '/triage_db', { logging: false });
    connections.appointment = new Sequelize(process.env.APPOINTMENT_DB_URL || baseUrl + '/appointment_db', { logging: false });
    connections.followup = new Sequelize(process.env.FOLLOWUP_DB_URL || baseUrl + '/followup_db', { logging: false });
}

// Initialize on module load
initConnections().catch(console.error);

function buildFilter(column, hasRange) {
    return hasRange ? ` WHERE ${column} BETWEEN :startDate AND :endDate` : '';
}

function pct(part, total) {
    return total > 0 ? parseFloat(((part / total) * 100).toFixed(1)) : 0;
}

async function queryPatients(replacements, hasRange) {
    const filter = buildFilter('created_at', hasRange);
    const [rows] = await connections.patient.query(
        `SELECT COUNT(*) as count FROM patients${filter}`,
        { replacements }
    );
    return parseInt(rows[0]?.count || 0);
}

async function queryTriages(replacements, hasRange) {
    const filter = buildFilter('classified_at', hasRange) || ' WHERE 1=1';
    const [rows] = await connections.triage.query(
        `SELECT classification, COUNT(*) as count FROM triages${filter} GROUP BY classification`,
        { replacements }
    );
    const byLevel = { ROJO: 0, AMARILLO: 0, VERDE: 0 };
    rows.forEach(row => { byLevel[row.classification] = parseInt(row.count); });
    return byLevel;
}

async function queryAppointments(replacements, hasRange) {
    const filter = buildFilter('updated_at', hasRange) || ' WHERE 1=1';
    const [rows] = await connections.appointment.query(
        `SELECT status, COUNT(*) as count FROM appointments${filter} GROUP BY status`,
        { replacements }
    );
    const stats = {};
    rows.forEach(row => { stats[row.status] = parseInt(row.count); });
    return stats;
}

async function queryFollowupRate(replacements, hasRange) {
    try {
        const filter = buildFilter('sent_at', hasRange) || ' WHERE sent_at IS NOT NULL';
        const [rows] = await connections.followup.query(
            `SELECT COUNT(*) as total, COUNT(completed_at) as completed FROM followups${filter}`,
            { replacements }
        );
        const total = parseInt(rows[0]?.total || 0);
        const completed = parseInt(rows[0]?.completed || 0);
        return total > 0 ? parseFloat((completed / total).toFixed(2)) : 0;
    } catch (e) {
        console.warn('Could not get followup stats:', e.message);
        return 0;
    }
}

async function queryPrescriptions(replacements, hasRange) {
    try {
        const filter = buildFilter('issued_at', hasRange);
        const [rows] = await connections.appointment.query(
            `SELECT COUNT(*) as count FROM prescriptions${filter}`,
            { replacements }
        );
        return parseInt(rows[0]?.count || 0);
    } catch (e) {
        console.warn('Could not get prescription stats:', e.message);
        return 0;
    }
}

/**
 * Calculate KPIs for a date range
 */
async function calculateKPIs(startDate, endDate) {
    try {
        const hasRange = Boolean(startDate && endDate);
        const replacements = hasRange ? { startDate, endDate } : {};

        const totalPatients   = await queryPatients(replacements, hasRange);
        const triagesByLevel  = await queryTriages(replacements, hasRange);
        const appointmentStats = await queryAppointments(replacements, hasRange);
        const followupResponseRate = await queryFollowupRate(replacements, hasRange);
        const prescriptionsIssued  = await queryPrescriptions(replacements, hasRange);

        const totalTriages = triagesByLevel.ROJO + triagesByLevel.AMARILLO + triagesByLevel.VERDE;
        const teleconsultsCompleted = appointmentStats.COMPLETADA || 0;
        const teleconsultsCancelled = appointmentStats.CANCELADA || 0;
        const inPersonVisitsAvoided = Math.round(triagesByLevel.VERDE * 0.87);
        const closedConsults = teleconsultsCompleted + teleconsultsCancelled;

        return {
            period: { start_date: startDate, end_date: endDate },
            total_patients: totalPatients,
            total_triages: totalTriages,
            triages_by_level: triagesByLevel,
            teleconsults: {
                scheduled: appointmentStats.AGENDADA || 0,
                confirmed: appointmentStats.CONFIRMADA || 0,
                completed: teleconsultsCompleted,
                cancelled: teleconsultsCancelled
            },
            in_person_visits_avoided: inPersonVisitsAvoided,
            followup_response_rate: followupResponseRate,
            prescriptions_issued: prescriptionsIssued,
            efficiency_metrics: {
                triage_distribution_pct: {
                    ROJO:     pct(triagesByLevel.ROJO,     totalTriages),
                    AMARILLO: pct(triagesByLevel.AMARILLO, totalTriages),
                    VERDE:    pct(triagesByLevel.VERDE,    totalTriages),
                },
                consultation_completion_rate: closedConsults > 0
                    ? parseFloat((teleconsultsCompleted / closedConsults * 100).toFixed(1))
                    : 0,
            },
            generated_at: new Date().toISOString()
        };
    } catch (error) {
        console.error('Error calculating KPIs:', error);
        throw error;
    }
}

/**
 * Get dashboard summary (real-time counts)
 */
async function getDashboardSummary() {
    try {
        // Today's date
        const today = new Date().toISOString().split('T')[0];

        // Today's triages
        const [todayTriages] = await connections.triage.query(
            `SELECT classification, COUNT(*) as count FROM triages WHERE DATE(classified_at) = :today GROUP BY classification`,
            { replacements: { today } }
        );
        const todayStats = { ROJO: 0, AMARILLO: 0, VERDE: 0 };
        todayTriages.forEach(row => {
            todayStats[row.classification] = parseInt(row.count);
        });

        // Pending triages
        const [pendingTriages] = await connections.triage.query(
            `SELECT COUNT(*) as count FROM triages WHERE status = 'PENDIENTE'`
        );

        // Today's appointments
        const [todayAppointments] = await connections.appointment.query(
            `SELECT status, COUNT(*) as count FROM appointments WHERE scheduled_date = :today GROUP BY status`,
            { replacements: { today } }
        );
        const appointmentStats = { total: 0, completed: 0, in_progress: 0, pending: 0 };
        todayAppointments.forEach(row => {
            appointmentStats.total += parseInt(row.count);
            if (row.status === 'COMPLETADA') appointmentStats.completed = parseInt(row.count);
            if (row.status === 'EN_CURSO') appointmentStats.in_progress = parseInt(row.count);
            if (['AGENDADA', 'CONFIRMADA'].includes(row.status)) appointmentStats.pending += parseInt(row.count);
        });

        return {
            date: today,
            triages_today: todayStats,
            triages_pending: parseInt(pendingTriages[0]?.count || 0),
            appointments_today: appointmentStats,
            last_updated: new Date().toISOString()
        };
    } catch (error) {
        console.error('Error getting dashboard summary:', error);
        throw error;
    }
}

module.exports = {
    calculateKPIs,
    getDashboardSummary
};
