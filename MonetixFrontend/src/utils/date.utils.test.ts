import { describe, it, expect, beforeAll } from 'vitest';
import { getDateRange } from './date.utils';

describe('getDateRange', () => {
  let now: Date;

  beforeAll(() => {
    now = new Date();
  });

  it('returns strings in YYYY-MM-DD format for month', () => {
    const { startDate, endDate } = getDateRange('month');
    expect(startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('month startDate is the first day of current month', () => {
    const { startDate } = getDateRange('month');
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    expect(startDate).toBe(expected);
  });

  it('month endDate is not before startDate', () => {
    const { startDate, endDate } = getDateRange('month');
    expect(endDate >= startDate).toBe(true);
  });

  it('quarter startDate is the first day of current quarter', () => {
    const { startDate } = getDateRange('quarter');
    const quarter = Math.floor(now.getMonth() / 3);
    const expectedMonth = String(quarter * 3 + 1).padStart(2, '0');
    expect(startDate).toMatch(new RegExp(`^${now.getFullYear()}-${expectedMonth}-01$`));
  });

  it('quarter endDate is not before startDate', () => {
    const { startDate, endDate } = getDateRange('quarter');
    expect(endDate >= startDate).toBe(true);
  });

  it('year startDate is January 1st of current year', () => {
    const { startDate } = getDateRange('year');
    expect(startDate).toBe(`${now.getFullYear()}-01-01`);
  });

  it('year endDate is December 31st of current year', () => {
    const { endDate } = getDateRange('year');
    expect(endDate).toBe(`${now.getFullYear()}-12-31`);
  });

  it('year endDate is after startDate', () => {
    const { startDate, endDate } = getDateRange('year');
    expect(endDate > startDate).toBe(true);
  });
});
