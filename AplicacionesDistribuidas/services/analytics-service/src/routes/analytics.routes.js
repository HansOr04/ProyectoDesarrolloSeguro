const express = require('express');
const router = express.Router();
const { calculateKPIs, getDashboardSummary } = require('../services/kpi.service');

// Get KPIs for date range
router.get('/kpis', async (req, res, next) => {
    try {
        const { start_date, end_date } = req.query;
        const kpis = await calculateKPIs(start_date, end_date);
        res.json({ success: true, data: kpis });
    } catch (error) {
        next(error);
    }
});

// Get real-time dashboard summary
router.get('/dashboard', async (req, res, next) => {
    try {
        const summary = await getDashboardSummary();
        res.json({ success: true, data: summary });
    } catch (error) {
        next(error);
    }
});

// Export data (placeholder)
router.get('/export', async (req, res, next) => {
    try {
        const { format = 'json', start_date, end_date } = req.query;
        const kpis = await calculateKPIs(start_date, end_date);

        if (format === 'json') {
            res.json({ success: true, data: kpis });
        } else {
            res.status(501).json({ success: false, message: 'Export format not implemented' });
        }
    } catch (error) {
        next(error);
    }
});

module.exports = router;
