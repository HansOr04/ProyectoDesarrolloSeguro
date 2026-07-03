import { DataPreprocessor, DataPoint } from '../../src/core/utils/dataPreprocessor';

const d = (isoDate: string, value: number): DataPoint => ({
  date: new Date(isoDate),
  value,
});

describe('DataPreprocessor', () => {
  describe('cleanData', () => {
    it('removes points with NaN date', () => {
      const data = [d('2024-01-01', 100), { date: new Date('invalid'), value: 50 }];
      expect(DataPreprocessor.cleanData(data)).toHaveLength(1);
    });

    it('removes points with NaN value', () => {
      const data = [d('2024-01-01', 100), { date: new Date('2024-01-02'), value: NaN }];
      expect(DataPreprocessor.cleanData(data)).toHaveLength(1);
    });

    it('removes points with Infinity value', () => {
      const data = [d('2024-01-01', 100), d('2024-01-02', Infinity)];
      expect(DataPreprocessor.cleanData(data)).toHaveLength(1);
    });

    it('removes points with negative values', () => {
      const data = [d('2024-01-01', 100), d('2024-01-02', -10)];
      expect(DataPreprocessor.cleanData(data)).toHaveLength(1);
    });

    it('keeps valid points', () => {
      const data = [d('2024-01-01', 0), d('2024-01-02', 100)];
      expect(DataPreprocessor.cleanData(data)).toHaveLength(2);
    });
  });

  describe('normalizeData', () => {
    it('normalizes values to [0, 1] range', () => {
      const { normalized } = DataPreprocessor.normalizeData([0, 50, 100]);
      expect(normalized[0]).toBeCloseTo(0);
      expect(normalized[1]).toBeCloseTo(0.5);
      expect(normalized[2]).toBeCloseTo(1);
    });

    it('returns 0.5 for all values when range is 0', () => {
      const { normalized, min, max } = DataPreprocessor.normalizeData([5, 5, 5]);
      expect(normalized).toEqual([0.5, 0.5, 0.5]);
      expect(min).toBe(5);
      expect(max).toBe(5);
    });

    it('returns correct min and max', () => {
      const { min, max } = DataPreprocessor.normalizeData([10, 20, 30]);
      expect(min).toBe(10);
      expect(max).toBe(30);
    });
  });

  describe('denormalize', () => {
    it('reverses normalization correctly', () => {
      const values = [100, 200, 300];
      const { normalized, min, max } = DataPreprocessor.normalizeData(values);
      const restored = DataPreprocessor.denormalize(normalized, min, max);
      expect(restored[0]).toBeCloseTo(100);
      expect(restored[1]).toBeCloseTo(200);
      expect(restored[2]).toBeCloseTo(300);
    });
  });

  describe('detectOutliers', () => {
    it('returns empty array for fewer than 4 values', () => {
      expect(DataPreprocessor.detectOutliers([1, 2, 3])).toEqual([]);
    });

    it('detects obvious outlier index', () => {
      const values = [10, 11, 12, 10, 11, 12, 1000];
      const indices = DataPreprocessor.detectOutliers(values);
      expect(indices).toContain(6);
    });

    it('returns empty array when no outliers', () => {
      const values = [10, 11, 12, 13, 14, 15, 16];
      const indices = DataPreprocessor.detectOutliers(values);
      expect(indices).toHaveLength(0);
    });
  });

  describe('removeOutliers', () => {
    it('removes data points at outlier indices', () => {
      const data = [
        d('2024-01-01', 10),
        d('2024-01-02', 11),
        d('2024-01-03', 12),
        d('2024-01-04', 10),
        d('2024-01-05', 11),
        d('2024-01-06', 12),
        d('2024-01-07', 1000),
      ];
      const cleaned = DataPreprocessor.removeOutliers(data);
      expect(cleaned.every(p => p.value !== 1000)).toBe(true);
    });
  });

  describe('validateMinimumData', () => {
    it('returns true when data meets minimum', () => {
      const data = Array.from({ length: 30 }, (_, i) => d(`2024-01-${String(i + 1).padStart(2, '0')}`, i));
      expect(DataPreprocessor.validateMinimumData(data)).toBe(true);
    });

    it('returns false when data is below minimum', () => {
      const data = [d('2024-01-01', 1), d('2024-01-02', 2)];
      expect(DataPreprocessor.validateMinimumData(data)).toBe(false);
    });

    it('accepts custom minimum', () => {
      const data = [d('2024-01-01', 1), d('2024-01-02', 2)];
      expect(DataPreprocessor.validateMinimumData(data, 2)).toBe(true);
    });
  });

  describe('fillMissingDates', () => {
    it('returns empty array for empty input', () => {
      expect(DataPreprocessor.fillMissingDates([])).toEqual([]);
    });

    it('interpolates missing days between data points', () => {
      const data = [d('2024-01-01', 100), d('2024-01-03', 200)];
      const filled = DataPreprocessor.fillMissingDates(data);
      expect(filled).toHaveLength(3);
      expect(filled[1].value).toBe(150);
    });

    it('leaves consecutive days unchanged', () => {
      const data = [d('2024-01-01', 100), d('2024-01-02', 200)];
      expect(DataPreprocessor.fillMissingDates(data)).toHaveLength(2);
    });
  });

  describe('aggregateByPeriod', () => {
    it('returns empty array for empty input', () => {
      expect(DataPreprocessor.aggregateByPeriod([], 'day')).toEqual([]);
    });

    it('aggregates by day', () => {
      const data = [
        d('2024-01-01', 100),
        d('2024-01-01', 200),
        d('2024-01-02', 300),
      ];
      const result = DataPreprocessor.aggregateByPeriod(data, 'day');
      expect(result).toHaveLength(2);
      expect(result[0].value).toBe(150);
    });

    it('aggregates by month', () => {
      const data = [
        d('2024-01-01', 100),
        d('2024-01-15', 200),
        d('2024-02-01', 400),
      ];
      const result = DataPreprocessor.aggregateByPeriod(data, 'month');
      expect(result).toHaveLength(2);
    });

    it('aggregates by week', () => {
      const data = [
        d('2024-01-01', 100),
        d('2024-01-02', 200),
        d('2024-01-15', 400),
      ];
      const result = DataPreprocessor.aggregateByPeriod(data, 'week');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('toTimeSeries', () => {
    it('converts DataPoint array to TimeSeriesData', () => {
      const data = [d('2024-01-02', 200), d('2024-01-01', 100)];
      const ts = DataPreprocessor.toTimeSeries(data);
      expect(ts.dates).toHaveLength(2);
      expect(ts.values).toHaveLength(2);
      expect(ts.values[0]).toBe(100);
      expect(ts.values[1]).toBe(200);
    });
  });
});
