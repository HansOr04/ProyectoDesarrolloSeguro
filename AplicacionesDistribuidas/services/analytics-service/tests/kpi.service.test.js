'use strict';

// Mock must be declared before require() so Jest hoists it before module load
const mockQuery = jest.fn();

jest.mock('sequelize', () => ({
    Sequelize: jest.fn(() => ({ query: mockQuery })),
}));

const { calculateKPIs, getDashboardSummary } = require('../src/services/kpi.service');

// Helper that sets up query responses in call order
function setupMockQueries(responses) {
    mockQuery.mockReset();
    responses.forEach(res => mockQuery.mockResolvedValueOnce(res));
}

describe('kpi.service — calculateKPIs', () => {
    const patients  = [[{ count: '10' }]];
    const triages   = [[
        { classification: 'ROJO',     count: '3' },
        { classification: 'AMARILLO', count: '5' },
        { classification: 'VERDE',    count: '12' },
    ]];
    const appts = [[
        { status: 'COMPLETADA', count: '8' },
        { status: 'CANCELADA',  count: '2' },
        { status: 'AGENDADA',   count: '4' },
        { status: 'CONFIRMADA', count: '1' },
    ]];
    const followups     = [[{ total: '20', completed: '16' }]];
    const prescriptions = [[{ count: '5' }]];

    beforeEach(() => {
        setupMockQueries([patients, triages, appts, followups, prescriptions]);
    });

    it('returns correct patient count', async () => {
        const result = await calculateKPIs();
        expect(result.total_patients).toBe(10);
    });

    it('returns correct triage totals', async () => {
        const result = await calculateKPIs();
        expect(result.total_triages).toBe(20);
        expect(result.triages_by_level).toEqual({ ROJO: 3, AMARILLO: 5, VERDE: 12 });
    });

    it('calculates in-person visits avoided as 87% of VERDE', async () => {
        const result = await calculateKPIs();
        expect(result.in_person_visits_avoided).toBe(Math.round(12 * 0.87));
    });

    it('returns teleconsult counts', async () => {
        const result = await calculateKPIs();
        expect(result.teleconsults.completed).toBe(8);
        expect(result.teleconsults.cancelled).toBe(2);
        expect(result.teleconsults.scheduled).toBe(4);
        expect(result.teleconsults.confirmed).toBe(1);
    });

    it('calculates followup response rate', async () => {
        const result = await calculateKPIs();
        expect(result.followup_response_rate).toBeCloseTo(0.80, 2);
    });

    it('returns prescription count', async () => {
        const result = await calculateKPIs();
        expect(result.prescriptions_issued).toBe(5);
    });

    it('calculates triage distribution percentages', async () => {
        const result = await calculateKPIs();
        expect(result.efficiency_metrics.triage_distribution_pct.ROJO).toBe(15.0);
        expect(result.efficiency_metrics.triage_distribution_pct.AMARILLO).toBe(25.0);
        expect(result.efficiency_metrics.triage_distribution_pct.VERDE).toBe(60.0);
    });

    it('calculates consultation completion rate', async () => {
        const result = await calculateKPIs();
        // 8 completadas / (8+2) cerradas * 100 = 80%
        expect(result.efficiency_metrics.consultation_completion_rate).toBe(80.0);
    });

    it('includes generated_at timestamp', async () => {
        const result = await calculateKPIs();
        expect(result.generated_at).toBeDefined();
        expect(new Date(result.generated_at)).toBeInstanceOf(Date);
    });

    it('handles date range parameters', async () => {
        setupMockQueries([patients, triages, appts, followups, prescriptions]);
        const result = await calculateKPIs('2024-01-01', '2024-03-31');
        expect(result.period.start_date).toBe('2024-01-01');
        expect(result.period.end_date).toBe('2024-03-31');
        expect(result.total_patients).toBe(10);
    });

    it('returns zero distribution percentages when no triages', async () => {
        setupMockQueries([
            [[{ count: '0' }]],
            [[]],
            [[]],
            [[{ total: '0', completed: '0' }]],
            [[{ count: '0' }]],
        ]);
        const result = await calculateKPIs();
        expect(result.efficiency_metrics.triage_distribution_pct.ROJO).toBe(0);
        expect(result.efficiency_metrics.consultation_completion_rate).toBe(0);
    });

    it('handles followup query failure gracefully', async () => {
        mockQuery.mockReset();
        mockQuery
            .mockResolvedValueOnce(patients)
            .mockResolvedValueOnce(triages)
            .mockResolvedValueOnce(appts)
            .mockRejectedValueOnce(new Error('followup table missing'))
            .mockResolvedValueOnce(prescriptions);
        const result = await calculateKPIs();
        expect(result.followup_response_rate).toBe(0);
    });

    it('handles prescriptions query failure gracefully', async () => {
        mockQuery.mockReset();
        mockQuery
            .mockResolvedValueOnce(patients)
            .mockResolvedValueOnce(triages)
            .mockResolvedValueOnce(appts)
            .mockResolvedValueOnce(followups)
            .mockRejectedValueOnce(new Error('prescriptions table missing'));
        const result = await calculateKPIs();
        expect(result.prescriptions_issued).toBe(0);
    });
});

describe('kpi.service — SQL injection regression', () => {
    const SQL_INJECTION = "'; DROP TABLE patients; --";

    it('pasa el payload de inyección como parámetro, nunca interpolado en el SQL', async () => {
        setupMockQueries([
            [[{ count: '5' }]],
            [[{ classification: 'VERDE', count: '2' }]],
            [[{ status: 'COMPLETADA', count: '1' }]],
            [[{ total: '0', completed: '0' }]],
            [[{ count: '0' }]],
        ]);

        await calculateKPIs(SQL_INJECTION, '2024-12-31');

        // Todas las llamadas a query() deben usar replacements, nunca interpolar el payload
        expect(mockQuery).toHaveBeenCalled();
        for (const call of mockQuery.mock.calls) {
            const [sql, options] = call;
            // El SQL nunca debe contener el payload directamente
            expect(sql).not.toContain(SQL_INJECTION);
            // El payload debe llegar como valor en replacements (tratado como literal)
            if (options?.replacements?.startDate !== undefined) {
                expect(options.replacements.startDate).toBe(SQL_INJECTION);
            }
        }
    });

    it('funciona sin errores y devuelve estructura válida con payload de inyección', async () => {
        setupMockQueries([
            [[{ count: '0' }]],
            [[]],
            [[]],
            [[{ total: '0', completed: '0' }]],
            [[{ count: '0' }]],
        ]);

        const result = await calculateKPIs(SQL_INJECTION, '2024-12-31');
        // La respuesta es la estructura KPI normal, no un error 500 ni ejecución inesperada
        expect(result).toHaveProperty('total_patients');
        expect(result).toHaveProperty('total_triages');
        expect(result.period.start_date).toBe(SQL_INJECTION);
    });
});

describe('kpi.service — getDashboardSummary', () => {
    it('returns today date and triage stats', async () => {
        mockQuery.mockReset();
        mockQuery
            .mockResolvedValueOnce([[
                { classification: 'ROJO', count: '1' },
                { classification: 'VERDE', count: '3' },
            ]])
            .mockResolvedValueOnce([[{ count: '2' }]])
            .mockResolvedValueOnce([[
                { status: 'COMPLETADA', count: '5' },
                { status: 'EN_CURSO',   count: '1' },
                { status: 'AGENDADA',   count: '2' },
            ]]);

        const result = await getDashboardSummary();
        expect(result.date).toBe(new Date().toISOString().split('T')[0]);
        expect(result.triages_today.ROJO).toBe(1);
        expect(result.triages_today.VERDE).toBe(3);
        expect(result.triages_pending).toBe(2);
        expect(result.appointments_today.completed).toBe(5);
        expect(result.appointments_today.in_progress).toBe(1);
        expect(result.appointments_today.pending).toBe(2);
    });
});
