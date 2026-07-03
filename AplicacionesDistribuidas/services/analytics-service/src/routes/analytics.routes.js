const express = require('express');
const ExcelJS = require('exceljs');
const router = express.Router();
const { calculateKPIs, getDashboardSummary } = require('../services/kpi.service');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// Get KPIs for date range
router.get('/kpis', authenticate, authorize('ADMIN', 'DOCTOR'), async (req, res, next) => {
    try {
        const { start_date, end_date } = req.query;
        const kpis = await calculateKPIs(start_date, end_date);
        res.json({ success: true, data: kpis });
    } catch (error) {
        next(error);
    }
});

// Get real-time dashboard summary
router.get('/dashboard', authenticate, authorize('ADMIN', 'DOCTOR'), async (req, res, next) => {
    try {
        const summary = await getDashboardSummary();
        res.json({ success: true, data: summary });
    } catch (error) {
        next(error);
    }
});

function buildKpiRows(kpis) {
    return [
        ['Período inicio', kpis.period.start_date || 'Todo'],
        ['Período fin', kpis.period.end_date || 'Todo'],
        ['Total pacientes', kpis.total_patients],
        ['Total triajes', kpis.total_triages],
        ['Triajes ROJO', kpis.triages_by_level.ROJO],
        ['Triajes AMARILLO', kpis.triages_by_level.AMARILLO],
        ['Triajes VERDE', kpis.triages_by_level.VERDE],
        ['% Triajes ROJO', kpis.efficiency_metrics.triage_distribution_pct.ROJO],
        ['% Triajes AMARILLO', kpis.efficiency_metrics.triage_distribution_pct.AMARILLO],
        ['% Triajes VERDE', kpis.efficiency_metrics.triage_distribution_pct.VERDE],
        ['Teleconsultas agendadas', kpis.teleconsults.scheduled],
        ['Teleconsultas confirmadas', kpis.teleconsults.confirmed],
        ['Teleconsultas completadas', kpis.teleconsults.completed],
        ['Teleconsultas canceladas', kpis.teleconsults.cancelled],
        ['Tasa de completitud (%)', kpis.efficiency_metrics.consultation_completion_rate],
        ['Visitas presenciales evitadas', kpis.in_person_visits_avoided],
        ['Tasa de respuesta seguimientos', kpis.followup_response_rate],
        ['Recetas emitidas', kpis.prescriptions_issued],
        ['Generado en', kpis.generated_at],
    ];
}

function sendCsv(res, rows, start_date, end_date) {
    const csv = rows.map(([label, value]) =>
        `"${String(label).replace(/"/g, '""')}","${String(value ?? '').replace(/"/g, '""')}"`
    ).join('\r\n');
    const filename = `kpis_${start_date || 'all'}_${end_date || 'all'}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send('﻿' + csv);
}

async function sendExcel(res, rows, start_date, end_date) {
    const SECTIONS = { 0: 'PERÍODO', 2: 'PACIENTES Y TRIAJES', 7: 'DISTRIBUCIÓN TRIAJES (%)', 10: 'TELECONSULTAS', 15: 'EFICIENCIA', 18: 'METADATOS' };
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Triage Remoto - Analytics';
    workbook.created = new Date();
    const sheet = workbook.addWorksheet('KPIs');
    sheet.columns = [{ header: 'Indicador', key: 'label', width: 40 }, { header: 'Valor', key: 'value', width: 25 }];
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };

    rows.forEach(([label, value], idx) => {
        if (SECTIONS[idx] !== undefined) {
            const sr = sheet.addRow([SECTIONS[idx], '']);
            sr.font = { bold: true, italic: true, color: { argb: 'FF1E3A5F' } };
            sr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F0FE' } };
        }
        const row = sheet.addRow([label, value]);
        row.getCell(1).font = { color: { argb: 'FF374151' } };
        if (idx % 2 === 0) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
    });

    sheet.eachRow(row => row.eachCell(cell => {
        cell.border = { top: { style: 'thin', color: { argb: 'FFE5E7EB' } }, left: { style: 'thin', color: { argb: 'FFE5E7EB' } }, bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } }, right: { style: 'thin', color: { argb: 'FFE5E7EB' } } };
    }));

    const filename = `kpis_${start_date || 'all'}_${end_date || 'all'}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await workbook.xlsx.write(res);
    return res.end();
}

// Export KPIs as JSON, CSV or Excel
router.get('/export', authenticate, authorize('ADMIN', 'DOCTOR'), async (req, res, next) => {
    try {
        const { format = 'json', start_date, end_date } = req.query;
        const kpis = await calculateKPIs(start_date, end_date);

        if (format === 'json') return res.json({ success: true, data: kpis });

        const rows = buildKpiRows(kpis);
        if (format === 'csv')   return sendCsv(res, rows, start_date, end_date);
        if (format === 'excel') return sendExcel(res, rows, start_date, end_date);

        res.status(400).json({ success: false, message: 'Formato no soportado. Use: json, csv, excel' });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
