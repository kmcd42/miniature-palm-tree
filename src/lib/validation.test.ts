import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { sanitizeSettings, sanitizeSettingsUpdate } from './validation';
import { DEFAULT_SETTINGS, UserSettings } from '@/types/budget';

const NOW = new Date('2026-06-12T12:00:00.000Z');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

const current: UserSettings = { ...DEFAULT_SETTINGS, afterTaxWeeklyIncome: 1500 };

describe('sanitizeSettingsUpdate', () => {
  it('clamps out-of-range numbers', () => {
    expect(sanitizeSettingsUpdate(current, { retirementAge: 150 }).retirementAge).toBe(100);
    expect(sanitizeSettingsUpdate(current, { retirementAge: 5 }).retirementAge).toBe(18);
    expect(sanitizeSettingsUpdate(current, { inflationRate: -3 }).inflationRate).toBe(0);
    expect(sanitizeSettingsUpdate(current, { safeWithdrawalRate: 150 }).safeWithdrawalRate).toBe(10);
    expect(sanitizeSettingsUpdate(current, { afterTaxWeeklyIncome: -50 }).afterTaxWeeklyIncome).toBe(0);
  });

  it('rounds integer fields', () => {
    expect(sanitizeSettingsUpdate(current, { retirementAge: 67.7 }).retirementAge).toBe(68);
  });

  it('drops non-finite and wrongly-typed values so the current value wins', () => {
    expect('retirementAge' in sanitizeSettingsUpdate(current, { retirementAge: NaN })).toBe(false);
    expect('inflationRate' in sanitizeSettingsUpdate(current, { inflationRate: Infinity })).toBe(false);
    const bad = sanitizeSettingsUpdate(current, { afterTaxWeeklyIncome: '900' as unknown as number });
    expect('afterTaxWeeklyIncome' in bad).toBe(false);
  });

  it('passes valid values through untouched', () => {
    const result = sanitizeSettingsUpdate(current, { afterTaxWeeklyIncome: 1234.56, inflationRate: 2.7 });
    expect(result.afterTaxWeeklyIncome).toBe(1234.56);
    expect(result.inflationRate).toBe(2.7);
  });

  it('rejects a future or unparseable date of birth, allows clearing it', () => {
    expect('dateOfBirth' in sanitizeSettingsUpdate(current, { dateOfBirth: '2030-01-01' })).toBe(false);
    expect('dateOfBirth' in sanitizeSettingsUpdate(current, { dateOfBirth: 'not-a-date' })).toBe(false);
    expect(sanitizeSettingsUpdate(current, { dateOfBirth: '1990-06-12' }).dateOfBirth).toBe('1990-06-12');

    const cleared = sanitizeSettingsUpdate(current, { dateOfBirth: undefined });
    expect('dateOfBirth' in cleared).toBe(true);
    expect(cleared.dateOfBirth).toBeUndefined();
  });

  it('keeps the drawdown horizon at least one year', () => {
    expect(sanitizeSettingsUpdate(current, { retirementAge: 80, lifeExpectancy: 70 }).lifeExpectancy).toBe(81);
    // raising retirementAge alone past the current lifeExpectancy also bumps it
    const result = sanitizeSettingsUpdate({ ...current, lifeExpectancy: 70 }, { retirementAge: 75 });
    expect(result.lifeExpectancy).toBe(76);
  });
});

describe('sanitizeSettings', () => {
  it('replaces invalid fields with defaults and keeps valid ones', () => {
    const garbage = {
      ...current,
      retirementAge: NaN,
      inflationRate: 'lots' as unknown as number,
      afterTaxWeeklyIncome: 2000,
      dateOfBirth: '2099-01-01',
    };
    const result = sanitizeSettings(garbage);
    expect(result.retirementAge).toBe(DEFAULT_SETTINGS.retirementAge);
    expect(result.inflationRate).toBe(DEFAULT_SETTINGS.inflationRate);
    expect(result.afterTaxWeeklyIncome).toBe(2000);
    expect(result.dateOfBirth).toBeUndefined();
  });
});
