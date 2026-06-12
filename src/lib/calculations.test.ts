import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getCurrentAge,
  getCurrentAgeFractional,
  yearsInRetirement,
  toWeekly,
  fromWeekly,
  futureValue,
  futureValueOfContributions,
  totalFutureValue,
  adjustForInflation,
  projectInvestment,
  calculateMortgagePayoff,
  mortgageExtraPaymentImpact,
  weeklyToReachGoal,
  projectWealthAtAge,
  getEffectiveWeeklyAmount,
  calculateWeeklyByCategoryEffective,
  calculateUncommittedIncomeEffective,
  calculateEmergencyFundTargetEffective,
  calculateSharedHousing,
  buildCompleteBudgetItems,
  calculateWeeklyDrawdown,
  weightedAvgRealReturn,
  generateDrawdownProjection,
  partnerSplit,
  formatCurrencyCompact,
  generateInsights,
} from './calculations';
import {
  BudgetItem,
  Investment,
  Mortgage,
  SharedHousing,
  UserSettings,
  BudgetStore,
  DEFAULT_SETTINGS,
  INITIAL_STORE,
} from '@/types/budget';

const NOW = new Date('2026-06-12T12:00:00.000Z');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

// ---------- fixtures ----------

function settings(overrides: Partial<UserSettings> = {}): UserSettings {
  return {
    ...DEFAULT_SETTINGS,
    dateOfBirth: '1990-01-15',
    afterTaxWeeklyIncome: 1500,
    ...overrides,
  };
}

function investment(overrides: Partial<Investment> = {}): Investment {
  return {
    id: 'inv-1',
    name: 'ETF',
    type: 'etf',
    currentValue: 100_000,
    currentValueUpdatedAt: Date.now(),
    weeklyContribution: 200,
    expectedReturnRate: 7,
    feeRate: 0.5,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

// Classic 30-year amortization: $100k @ 6% → monthly payment $599.55
const CLASSIC_MONTHLY = (100_000 * 0.005) / (1 - Math.pow(1.005, -360));

function mortgage(overrides: Partial<Mortgage> = {}): Mortgage {
  return {
    id: 'm-1',
    name: 'Home loan',
    principal: 100_000,
    principalUpdatedAt: Date.now(),
    originalPrincipal: 100_000,
    interestRate: 6,
    weeklyPayment: (CLASSIC_MONTHLY * 12) / 52,
    extraWeeklyPayment: 0,
    startDate: Date.now(),
    termYears: 30,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

function item(overrides: Partial<BudgetItem> = {}): BudgetItem {
  return {
    id: 'b-1',
    name: 'Item',
    amount: 100,
    frequency: 'weekly',
    category: 'necessity',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

// ---------- age / dates ----------

describe('getCurrentAge', () => {
  it('counts a birthday that is today', () => {
    expect(getCurrentAge(settings({ dateOfBirth: '1990-06-12' }))).toBe(36);
  });

  it('does not count a birthday that is tomorrow', () => {
    expect(getCurrentAge(settings({ dateOfBirth: '1990-06-13' }))).toBe(35);
  });

  it('counts a birthday that was yesterday', () => {
    expect(getCurrentAge(settings({ dateOfBirth: '1990-06-11' }))).toBe(36);
  });

  it('falls back to legacy age field without a DOB', () => {
    expect(getCurrentAge(settings({ dateOfBirth: undefined, age: 40 }))).toBe(40);
  });

  it('returns 0 for missing settings', () => {
    expect(getCurrentAge(undefined)).toBe(0);
  });
});

describe('getCurrentAgeFractional / yearsInRetirement', () => {
  it('fractional age is near the whole-year age', () => {
    const frac = getCurrentAgeFractional(settings({ dateOfBirth: '1990-06-12' }));
    expect(frac).toBeGreaterThan(35.9);
    expect(frac).toBeLessThan(36.1);
  });

  it('retirement span is lifeExpectancy − retirementAge, floored at 1', () => {
    expect(yearsInRetirement(settings({ retirementAge: 67, lifeExpectancy: 90 }))).toBe(23);
    expect(yearsInRetirement(settings({ retirementAge: 67, lifeExpectancy: 60 }))).toBe(1);
  });
});

// ---------- frequency conversion ----------

describe('frequency conversion', () => {
  it('converts to weekly', () => {
    expect(toWeekly(100, 'weekly')).toBe(100);
    expect(toWeekly(100, 'fortnightly')).toBe(50);
    expect(toWeekly(520, 'monthly')).toBeCloseTo(120, 10);
    expect(toWeekly(5200, 'yearly')).toBe(100);
  });

  it('converts from weekly', () => {
    expect(fromWeekly(100, 'fortnightly')).toBe(200);
    expect(fromWeekly(120, 'monthly')).toBeCloseTo(520, 10);
    expect(fromWeekly(100, 'yearly')).toBe(5200);
  });

  it('round-trips', () => {
    for (const f of ['weekly', 'fortnightly', 'monthly', 'yearly'] as const) {
      expect(fromWeekly(toWeekly(123.45, f), f)).toBeCloseTo(123.45, 10);
    }
  });
});

// ---------- compound growth ----------

describe('compound growth', () => {
  it('futureValue compounds a lump sum', () => {
    expect(futureValue(1000, 0.07, 10)).toBeCloseTo(1000 * Math.pow(1.07, 10), 8);
  });

  it('futureValueOfContributions matches a week-by-week simulation', () => {
    const weekly = 200;
    const rate = 0.07;
    const years = 10;

    const weeklyRate = Math.pow(1 + rate, 1 / 52) - 1;
    let simulated = 0;
    for (let w = 0; w < years * 52; w++) {
      simulated = simulated * (1 + weeklyRate) + weekly;
    }

    const fv = futureValueOfContributions(weekly, rate, years);
    expect(Math.abs(fv - simulated) / simulated).toBeLessThan(1e-9);
  });

  it('futureValueOfContributions with zero rate is just the deposits', () => {
    expect(futureValueOfContributions(100, 0, 5)).toBe(100 * 52 * 5);
  });

  it('totalFutureValue is the sum of both parts', () => {
    const total = totalFutureValue(50_000, 100, 0.05, 8);
    expect(total).toBeCloseTo(
      futureValue(50_000, 0.05, 8) + futureValueOfContributions(100, 0.05, 8),
      8
    );
  });

  it('adjustForInflation divides by the inflation factor', () => {
    expect(adjustForInflation(1000, 0.025, 10)).toBeCloseTo(1000 / Math.pow(1.025, 10), 8);
  });

  it('projectInvestment nets out fees and inflation', () => {
    const proj = projectInvestment(investment(), 10, 2.5);
    expect(proj.nominal).toBeCloseTo(totalFutureValue(100_000, 200, 0.065, 10), 6);
    expect(proj.real).toBeLessThan(proj.nominal);
  });
});

// ---------- mortgages ----------

describe('calculateMortgagePayoff', () => {
  it('pays off a textbook 30-year mortgage in ~360 months', () => {
    const payoff = calculateMortgagePayoff(mortgage());
    expect(payoff.monthsRemaining).toBeGreaterThanOrEqual(359);
    expect(payoff.monthsRemaining).toBeLessThanOrEqual(361);
    // Standard total interest for this loan is ~$115,838
    expect(Math.abs(payoff.totalInterest - 115_838)).toBeLessThan(300);
  });

  it('reports Infinity when the payment does not cover interest', () => {
    const payoff = calculateMortgagePayoff(mortgage({ weeklyPayment: 50, extraWeeklyPayment: 0 }));
    expect(payoff.monthsRemaining).toBe(Infinity);
    expect(payoff.totalInterest).toBe(Infinity);
  });

  it('extra payments save both months and interest', () => {
    const impact = mortgageExtraPaymentImpact(mortgage(), 50);
    expect(impact.monthsSaved).toBeGreaterThan(0);
    expect(impact.interestSaved).toBeGreaterThan(0);
  });
});

// ---------- goals ----------

describe('weeklyToReachGoal', () => {
  const inOneYear = () => new Date(Date.now() + 52 * 7 * 24 * 60 * 60 * 1000);

  it('divides evenly with no return', () => {
    expect(weeklyToReachGoal(5200, 0, inOneYear(), 0)).toBeCloseTo(100, 8);
  });

  it('returns 0 when already reached', () => {
    expect(weeklyToReachGoal(5000, 10_000, inOneYear(), 0)).toBe(0);
  });

  it('with a return rate, the suggested contribution actually reaches the target', () => {
    const target = 20_000;
    const current = 5_000;
    const rate = 0.05;
    const weekly = weeklyToReachGoal(target, current, inOneYear(), rate);

    const weeklyRate = Math.pow(1 + rate, 1 / 52) - 1;
    let balance = current;
    for (let w = 0; w < 52; w++) {
      balance = balance * (1 + weeklyRate) + weekly;
    }
    expect(Math.abs(balance - target) / target).toBeLessThan(1e-6);
  });
});

// ---------- wealth projection ----------

describe('projectWealthAtAge', () => {
  it('returns current values when target age is now or earlier', () => {
    const result = projectWealthAtAge(40, 40, [investment()], [mortgage()], 2.5);
    expect(result.nominal).toBe(100_000);
    expect(result.mortgageRemaining).toBe(100_000);
    expect(result.netWealth).toBe(0);
  });

  it('clears the mortgage once the payoff horizon has passed', () => {
    const result = projectWealthAtAge(30, 65, [investment()], [mortgage()], 2.5);
    expect(result.mortgageRemaining).toBe(0);
    expect(result.nominal).toBeGreaterThan(100_000);
    expect(result.real).toBeLessThan(result.nominal);
  });
});

// ---------- budget items with parents/children ----------

describe('effective budget calculations', () => {
  const parent = item({ id: 'p', name: 'Parent', amount: 999, category: 'cost' });
  const child1 = item({ id: 'c1', parentId: 'p', amount: 520, frequency: 'monthly', category: 'necessity' });
  const child2 = item({ id: 'c2', parentId: 'p', amount: 30, category: 'savings' });
  const solo = item({ id: 's', amount: 50, category: 'cost' });
  const all = [parent, child1, child2, solo];

  it('a parent sums its children instead of its own amount', () => {
    expect(getEffectiveWeeklyAmount(parent, all)).toBeCloseTo(150, 10);
  });

  it('totals use leaf categories, never the parent amount', () => {
    const totals = calculateWeeklyByCategoryEffective(all);
    expect(totals.necessity).toBeCloseTo(120, 10);
    expect(totals.savings).toBe(30);
    expect(totals.cost).toBe(50); // the parent's 999 never appears
  });

  it('uncommitted income subtracts the effective total', () => {
    expect(calculateUncommittedIncomeEffective(1000, all)).toBeCloseTo(800, 10);
  });

  it('emergency fund target covers necessities and costs', () => {
    const items = [
      item({ id: 'n', amount: 100, category: 'necessity' }),
      item({ id: 'c', amount: 50, category: 'cost' }),
      item({ id: 'sv', amount: 75, category: 'savings' }),
    ];
    expect(calculateEmergencyFundTargetEffective(items, 3)).toBeCloseTo((150 * 52) / 12 * 3, 8);
  });
});

// ---------- shared housing ----------

describe('calculateSharedHousing', () => {
  const housing: SharedHousing = {
    enabled: true,
    partnerName: 'Sam',
    partnerWeeklyIncome: 400,
    expenses: [
      { id: 'e1', name: 'Power', amount: 100, frequency: 'weekly', category: 'utilities' },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  it('splits by income ratio including mortgage payments', () => {
    const m = mortgage({ weeklyPayment: 200, extraWeeklyPayment: 50 });
    const calc = calculateSharedHousing(housing, 600, [m]);
    expect(calc.totalWeeklyExpenses).toBe(350);
    expect(calc.combinedWeeklyIncome).toBe(1000);
    expect(calc.percentageOfIncome).toBe(35);
    expect(calc.yourShare).toBeCloseTo(210, 10);
    expect(calc.partnerShare).toBeCloseTo(140, 10);
  });

  it('defaults to 50/50 with no combined income', () => {
    const calc = calculateSharedHousing({ ...housing, partnerWeeklyIncome: 0 }, 0, []);
    expect(calc.yourShare).toBe(50);
    expect(calc.partnerShare).toBe(50);
  });
});

describe('partnerSplit', () => {
  it('implies the household total from your share and ratio', () => {
    const split = partnerSplit(60, 600, 400);
    expect(split.yourRatio).toBeCloseTo(0.6, 10);
    expect(split.total).toBeCloseTo(100, 10);
    expect(split.partnerShare).toBeCloseTo(40, 10);
  });

  it('treats zero income on both sides as 50/50', () => {
    const split = partnerSplit(60, 0, 0);
    expect(split.total).toBe(120);
    expect(split.partnerShare).toBe(60);
  });

  it('attributes everything to you when your income is zero', () => {
    const split = partnerSplit(60, 0, 1000);
    expect(split.total).toBe(60);
    expect(split.partnerShare).toBe(0);
  });
});

// ---------- linked budget items ----------

describe('buildCompleteBudgetItems', () => {
  it('adds contributing investments as savings lines, excluding KiwiSaver', () => {
    const etf = investment({ id: 'etf' });
    const ks = investment({ id: 'ks', type: 'kiwisaver' });
    const result = buildCompleteBudgetItems([], [etf, ks], [], [], undefined, 1000);
    expect(result.map((i) => i.id)).toEqual(['linked-inv-etf']);
    expect(result[0].category).toBe('savings');
    expect(result[0].amount).toBe(200);
  });

  it('a manual link suppresses the auto-generated line', () => {
    const etf = investment({ id: 'etf' });
    const manual = item({ id: 'mine', linkedToId: 'etf', linkedToType: 'investment' });
    const result = buildCompleteBudgetItems([manual], [etf], [], [], undefined, 1000);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('mine');
  });

  it('adds shared housing as a parent with income-ratio children', () => {
    const housing: SharedHousing = {
      enabled: true,
      partnerName: 'Sam',
      partnerWeeklyIncome: 400,
      expenses: [{ id: 'e1', name: 'Power', amount: 100, frequency: 'weekly', category: 'utilities' }],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const m = mortgage({ weeklyPayment: 250, extraWeeklyPayment: 0 });
    const result = buildCompleteBudgetItems([], [], [], [m], housing, 600);

    const parent = result.find((i) => i.id === 'linked-housing-parent');
    expect(parent).toBeDefined();
    const children = result.filter((i) => i.parentId === 'linked-housing-parent');
    expect(children).toHaveLength(2);
    const mortgageChild = children.find((c) => c.linkedToType === 'mortgage');
    const expenseChild = children.find((c) => c.linkedToType === 'housing_expense');
    expect(mortgageChild?.amount).toBeCloseTo(150, 10); // 250 × 0.6
    expect(expenseChild?.amount).toBeCloseTo(60, 10); // 100 × 0.6
  });
});

// ---------- retirement drawdown ----------

describe('calculateWeeklyDrawdown', () => {
  it('returns 0 for an empty portfolio or horizon', () => {
    expect(calculateWeeklyDrawdown(0, 25, 0.03)).toBe(0);
    expect(calculateWeeklyDrawdown(1_000_000, 0, 0.03)).toBe(0);
  });

  it('divides evenly with zero return', () => {
    expect(calculateWeeklyDrawdown(520_000, 10, 0)).toBeCloseTo(1000, 8);
  });

  it('depletes the portfolio to exactly zero over the horizon', () => {
    const portfolio = 1_000_000;
    const years = 25;
    const rate = 0.03;
    const pmt = calculateWeeklyDrawdown(portfolio, years, rate);

    const weeklyRate = Math.pow(1 + rate, 1 / 52) - 1;
    let balance = portfolio;
    for (let w = 0; w < years * 52; w++) {
      balance = balance * (1 + weeklyRate) - pmt;
    }
    expect(Math.abs(balance)).toBeLessThan(1);
  });
});

describe('weightedAvgRealReturn', () => {
  it('weights by contribution when contributions exist', () => {
    const a = investment({ id: 'a', weeklyContribution: 100, expectedReturnRate: 8, feeRate: 1 });
    const b = investment({ id: 'b', weeklyContribution: 300, expectedReturnRate: 4, feeRate: 0 });
    // 0.25×7 + 0.75×4 = 4.75 nominal, minus 2.5 inflation = 2.25%
    expect(weightedAvgRealReturn([a, b], 2.5, 4)).toBeCloseTo(0.0225, 10);
  });

  it('falls back to the SWR with no investment data', () => {
    expect(weightedAvgRealReturn([], 2.5, 4)).toBeCloseTo(0.04, 10);
  });
});

describe('generateDrawdownProjection', () => {
  const s = settings({ retirementAge: 67, lifeExpectancy: 90, safeWithdrawalRate: 4 });

  it('orders the scenarios and keeps perpetual below deplete', () => {
    const dd = generateDrawdownProjection(s, [investment()], [], 0);
    expect(dd.portfolioAtRetirementReal).toBeGreaterThan(0);
    expect(dd.conservativeWeekly).toBeLessThan(dd.expectedWeekly);
    expect(dd.expectedWeekly).toBeLessThan(dd.optimisticWeekly);
    expect(dd.perpetualWeekly).toBeLessThan(dd.expectedWeekly);
    expect(dd.expectedWeekly).toBeCloseTo((dd.portfolioAtRetirementReal * 0.04) / 52, 6);
    expect(dd.perpetualWeekly).toBeCloseTo((dd.portfolioAtRetirementReal * 0.03) / 52, 6);
  });

  it('includes NZ Super only when eligible at retirement', () => {
    const eligible = generateDrawdownProjection(
      settings({ includeNzSuper: true, retirementAge: 67 }), [investment()], [], 0
    );
    expect(eligible.nzSuperEligible).toBe(true);
    expect(eligible.nzSuperWeekly).toBe(804);

    const early = generateDrawdownProjection(
      settings({ includeNzSuper: true, retirementAge: 60 }), [investment()], [], 0
    );
    expect(early.nzSuperEligible).toBe(false);
    expect(early.nzSuperWeekly).toBe(0);
  });
});

// ---------- formatting ----------

describe('formatCurrencyCompact', () => {
  it('abbreviates by magnitude', () => {
    expect(formatCurrencyCompact(12_345_678)).toBe('$12.3M');
    expect(formatCurrencyCompact(1_234_567)).toBe('$1.23M');
    expect(formatCurrencyCompact(234_567)).toBe('$235K');
    expect(formatCurrencyCompact(23_456)).toBe('$23.5K');
    expect(formatCurrencyCompact(-1_500_000)).toBe('-$1.50M');
  });
});

// ---------- insights ----------

describe('generateInsights', () => {
  function storeWith(overrides: Partial<BudgetStore>): BudgetStore {
    return { ...INITIAL_STORE, ...overrides };
  }

  it('asks for income setup first', () => {
    const insights = generateInsights(storeWith({ settings: settings({ afterTaxWeeklyIncome: 0 }) }));
    expect(insights).toHaveLength(1);
    expect(insights[0].id).toBe('no-income');
  });

  it('flags an overcommitted budget as critical, sorted first', () => {
    const insights = generateInsights(
      storeWith({
        settings: settings({ afterTaxWeeklyIncome: 100 }),
        budgetItems: [item({ amount: 200 })],
      })
    );
    expect(insights[0].id).toBe('overcommitted');
    expect(insights[0].severity).toBe('critical');
  });

  it('celebrates a zero-based budget', () => {
    const insights = generateInsights(
      storeWith({
        settings: settings({ afterTaxWeeklyIncome: 100 }),
        budgetItems: [item({ amount: 100 })],
      })
    );
    expect(insights.some((i) => i.id === 'balanced' && i.severity === 'positive')).toBe(true);
  });
});
