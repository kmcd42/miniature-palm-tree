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

// ---------- full-store sanitization ----------

import { sanitizeStore } from './validation';
import { INITIAL_STORE } from '@/types/budget';

describe('sanitizeStore', () => {
  const validItem = {
    id: 'b1', name: 'Groceries', amount: 200, frequency: 'weekly',
    category: 'necessity', createdAt: 1, updatedAt: 1,
  };

  it('rejects things that are not a store', () => {
    expect(sanitizeStore(null)).toBeNull();
    expect(sanitizeStore('hello')).toBeNull();
    expect(sanitizeStore({})).toBeNull();
    expect(sanitizeStore({ settings: {}, budgetItems: 'nope' })).toBeNull();
  });

  it('accepts a minimal valid store and fills missing arrays', () => {
    const store = sanitizeStore({ settings: {}, budgetItems: [validItem] });
    expect(store).not.toBeNull();
    expect(store!.budgetItems).toHaveLength(1);
    expect(store!.investments).toEqual([]);
    expect(store!.netWorthHistory).toEqual([]);
  });

  it('drops elements with wrong types instead of importing garbage', () => {
    const store = sanitizeStore({
      settings: {},
      budgetItems: [
        validItem,
        { ...validItem, id: 'b2', amount: 'lots' },        // string amount
        { ...validItem, id: 'b3', amount: NaN },           // NaN amount
        { ...validItem, id: 'b4', frequency: 'daily' },    // bad enum
        { ...validItem, id: 'b5', name: '' },              // empty name
        'not-an-object',
      ],
    });
    expect(store!.budgetItems.map((i) => i.id)).toEqual(['b1']);
  });

  it('clamps out-of-range numbers on investments and mortgages', () => {
    const store = sanitizeStore({
      settings: {},
      budgetItems: [],
      investments: [{
        id: 'i1', name: 'ETF', type: 'etf', currentValue: 5e12,
        weeklyContribution: -50, expectedReturnRate: 400,
        createdAt: 1, updatedAt: 1, currentValueUpdatedAt: 1,
      }],
      mortgages: [{
        id: 'm1', name: 'Loan', principal: 400000, interestRate: 999,
        weeklyPayment: 700, termYears: 500, startDate: 1,
        principalUpdatedAt: 1, createdAt: 1, updatedAt: 1,
      }],
    });
    const inv = store!.investments[0];
    expect(inv.currentValue).toBe(1_000_000_000);
    expect(inv.weeklyContribution).toBe(0);
    expect(inv.expectedReturnRate).toBe(50);
    const m = store!.mortgages[0];
    expect(m.interestRate).toBe(50);
    expect(m.termYears).toBe(50);
  });

  it('drops invalid net worth snapshots and keeps valid ones', () => {
    const store = sanitizeStore({
      ...INITIAL_STORE,
      budgetItems: [],
      netWorthHistory: [
        { at: 1000, investments: 10, propertyValue: 0, mortgageBalance: 0, netWorth: 10 },
        { at: 'yesterday', investments: 10, propertyValue: 0, mortgageBalance: 0, netWorth: 10 },
        { at: 2000, investments: NaN, propertyValue: 0, mortgageBalance: 0, netWorth: 0 },
      ],
    });
    expect(store!.netWorthHistory).toHaveLength(1);
    expect(store!.netWorthHistory[0].at).toBe(1000);
  });

  it('truncates oversized strings', () => {
    const store = sanitizeStore({
      settings: {},
      budgetItems: [{ ...validItem, name: 'x'.repeat(5000), notes: 'y'.repeat(50000) }],
    });
    expect(store!.budgetItems[0].name.length).toBe(200);
    expect(store!.budgetItems[0].notes!.length).toBe(2000);
  });

  it('sanitizes shared housing including its expenses', () => {
    const store = sanitizeStore({
      settings: {},
      budgetItems: [],
      sharedHousing: {
        enabled: true, partnerName: 'H', partnerWeeklyIncome: 900,
        expenses: [
          { id: 'e1', name: 'Power', amount: 50, frequency: 'weekly', category: 'utilities' },
          { id: 'e2', name: 'Bad', amount: 'many', frequency: 'weekly', category: 'utilities' },
        ],
        createdAt: 1, updatedAt: 1,
      },
    });
    expect(store!.sharedHousing!.expenses.map((e) => e.id)).toEqual(['e1']);
  });
});

// ---------- encrypted backups ----------

import { encryptBackup, decryptBackup, isEncryptedBackup } from './storage';

describe('encrypted backups', () => {
  // Real PBKDF2 at 310k iterations is slow but this is the actual code path
  it('round-trips plaintext through encrypt + decrypt', async () => {
    vi.useRealTimers();
    const secret = JSON.stringify({ hello: 'world', n: 42 });
    const encrypted = await encryptBackup(secret, 'correct horse');
    expect(isEncryptedBackup(encrypted)).toBe(true);
    expect(encrypted).not.toContain('world');
    await expect(decryptBackup(encrypted, 'correct horse')).resolves.toBe(secret);
  }, 30000);

  it('rejects a wrong passphrase', async () => {
    vi.useRealTimers();
    const encrypted = await encryptBackup('{"a":1}', 'right');
    await expect(decryptBackup(encrypted, 'wrong')).rejects.toThrow();
  }, 30000);

  it('does not mistake a plain backup for an encrypted one', () => {
    expect(isEncryptedBackup('{"version":3,"data":{}}')).toBe(false);
    expect(isEncryptedBackup('not json')).toBe(false);
  });
});
