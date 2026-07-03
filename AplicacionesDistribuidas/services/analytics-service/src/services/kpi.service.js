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

/**
 * Calculate KPIs for a date range
 */
async function calculateKPIs(startDate, endDate) {
    try {
        const hasRange = Boolean(startDate && endDate);
        const replacements = hasRange ? { startDate, endDate } : {};
        const dateFilter = hasRange ?
            ` WHERE created_at BETWEEN :startDate AND :endDate` : '';
        const classifiedAtFilter = hasRange ?
            ` WHERE classified_at BETWEEN :startDate AND :endDate` : '';

        // Total patients
        const [patientsResult] = await connections.patient.query(
            `SELECT COUNT(*) as count FROM patients${dateFilter}`,
            { replacements }
        );
        const totalPatients = parseInt(patientsResult[0]?.count || 0);

        // Triages by level
        const [triagesResult] = await connections.triage.query(
            `SELECT classification, COUNT(*) as count FROM triages${classifiedAtFilter || ' WHERE 1=1'} GROUP BY classification`,
            { replacements }
        );
        const triagesByLevel = {
            ROJO: 0, AMARILLO: 0, VERDE: 0
        };
        triagesResult.forEach(row => {
            triagesByLevel[row.classification] = parseInt(row.count);
        });
        const totalTriages = triagesByLevel.ROJO + triagesByLevel.AMARILLO + triagesByLevel.VERDE;

        // Teleconsults
        const appointmentFilter = hasRange ?
            ` WHERE updated_at BETWEEN :startDate AND :endDate` : '';

        const [appointmentsResult] = await connections.appointment.query(
            `SELECT status, COUNT(*) as count FROM appointments${appointmentFilter || ' WHERE 1=1'} GROUP BY status`,
            { replacements }
        );
        const appointmentStats = {};
        appointmentsResult.forEach(row => {
            appointmentStats[row.status] = parseInt(row.count);
        });
        const teleconsultsCompleted = appointmentStats.COMPLETADA || 0;
        const teleconsultsCancelled = appointmentStats.CANCELADA || 0;

        // In-person visits avoided (87% of VERDE cases)
        const inPersonVisitsAvoided = Math.round(triagesByLevel.VERDE * 0.87);

        // Follow-up response rate
        let followupResponseRate = 0;
        try {
            const followupFilter = hasRange ?
                ` WHERE sent_at BETWEEN :startDate AND :endDate` : '';

            const [followupResult] = await connections.followup.query(
                `SELECT COUNT(*) as total, COUNT(completed_at) as completed FROM followups${followupFilter || ' WHERE sent_at IS NOT NULL'}`,
                { replacements }
            );
            const total = parseInt(followupResult[0]?.total || 0);
            const completed = parseInt(followupResult[0]?.completed || 0);
            followupResponseRate = total > 0 ? parseFloat((completed / total).toFixed(2)) : 0;
        } catch (e) {
            console.warn('Could not get followup stats:', e.message);
        }

        // Prescriptions issued
        let prescriptionsIssued = 0;
        try {
            const prescriptionFilter = hasRange ?
                ` WHERE issued_at BETWEEN :startDate AND :endDate` : '';

            const [prescriptionsResult] = await connections.appointment.query(
                `SELECT COUNT(*) as count FROM prescriptions${prescriptionFilter}`,
                { replacements }
            );
            prescriptionsIssued = parseInt(prescriptionsResult[0]?.count || 0);
        } catch (e) {
            console.warn('Could not get prescription stats:', e.message);
        }

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
                    ROJO: totalTriages > 0 ? parseFloat(((triagesByLevel.ROJO / totalTriages) * 100).toFixed(1)) : 0,
                    AMARILLO: totalTriages > 0 ? parseFloat(((triagesByLevel.AMARILLO / totalTriages) * 100).toFixed(1)) : 0,
                    VERDE: totalTriages > 0 ? parseFloat(((triagesByLevel.VERDE / totalTriages) * 100).toFixed(1)) : 0
                },
                consultation_completion_rate: (teleconsultsCompleted + teleconsultsCancelled) > 0 ?
                    parseFloat((teleconsultsCompleted / (teleconsultsCompleted + teleconsultsCancelled) * 100).toFixed(1)) : 0
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
