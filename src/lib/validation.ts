import {
  UserSettings,
  DEFAULT_SETTINGS,
  BudgetStore,
  BudgetItem,
  Investment,
  Mortgage,
  Goal,
  SavingsBucket,
  SharedHousing,
  HouseExpense,
  NetWorthSnapshot,
  Frequency,
  BudgetCategory,
  GoalType,
} from '@/types/budget';

interface NumericRule {
  min: number;
  max: number;
  integer?: boolean;
}

export const SETTINGS_RULES = {
  afterTaxWeeklyIncome: { min: 0, max: 1_000_000 },
  retirementAge: { min: 18, max: 100, integer: true },
  lifeExpectancy: { min: 30, max: 120, integer: true },
  inflationRate: { min: 0, max: 20 },
  safeWithdrawalRate: { min: 0.5, max: 10 },
  nzSuperWeeklyAmount: { min: 0, max: 10_000 },
  nzSuperEligibilityAge: { min: 50, max: 80, integer: true },
  masseyTwoPersonNoFrills: { min: 0, max: 100_000 },
  masseyTwoPersonChoices: { min: 0, max: 100_000 },
} satisfies Partial<Record<keyof UserSettings, NumericRule>>;

function clampNumber(value: unknown, rule: NumericRule): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  const clamped = Math.min(rule.max, Math.max(rule.min, value));
  return rule.integer ? Math.round(clamped) : clamped;
}

function validDateOfBirth(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value) return undefined;
  const dob = new Date(value);
  if (isNaN(dob.getTime())) return undefined;
  const now = new Date();
  const oldest = new Date(now);
  oldest.setFullYear(now.getFullYear() - 120);
  if (dob > now || dob < oldest) return undefined;
  return value;
}

// Sanitize a partial settings update against the current settings.
// Out-of-range numbers are clamped; non-finite or wrongly-typed values
// are dropped so the current value wins.
export function sanitizeSettingsUpdate(
  current: UserSettings,
  updates: Partial<UserSettings>
): Partial<UserSettings> {
  const result: Partial<UserSettings> = { ...updates };

  for (const key of Object.keys(SETTINGS_RULES) as (keyof typeof SETTINGS_RULES)[]) {
    if (!(key in updates)) continue;
    const clamped = clampNumber(updates[key], SETTINGS_RULES[key]);
    if (clamped === undefined) delete result[key];
    else result[key] = clamped;
  }

  // Clearing the DOB is allowed; an invalid or out-of-range one is dropped
  if ('dateOfBirth' in updates && updates.dateOfBirth !== undefined) {
    const dob = validDateOfBirth(updates.dateOfBirth);
    if (dob === undefined) delete result.dateOfBirth;
    else result.dateOfBirth = dob;
  }

  // The drawdown horizon must be at least one year
  const retirementAge = result.retirementAge ?? current.retirementAge;
  const lifeExpectancy = result.lifeExpectancy ?? current.lifeExpectancy;
  if (
    typeof retirementAge === 'number' &&
    typeof lifeExpectancy === 'number' &&
    lifeExpectancy <= retirementAge
  ) {
    result.lifeExpectancy = Math.min(120, retirementAge + 1);
  }

  return result;
}

// Sanitize a full settings object (e.g. an imported backup). Invalid
// fields fall back to defaults instead of the incoming value.
export function sanitizeSettings(settings: UserSettings): UserSettings {
  const merged = { ...DEFAULT_SETTINGS, ...settings };
  return { ...DEFAULT_SETTINGS, ...sanitizeSettingsUpdate(DEFAULT_SETTINGS, merged) };
}

// =========================================================================
// FULL-STORE SANITIZATION
//
// Backups are hand-editable JSON and the designated recovery path, so this
// is the most defensive code in the app. Every element is validated and
// clamped; invalid elements are dropped rather than failing the whole
// import; a file that isn't recognizably a store is rejected outright.
// =========================================================================

const MAX_MONEY = 1_000_000_000;
const MAX_ITEMS = 2000;
const MAX_ENTITIES = 200;
const MAX_HISTORY = 730;
const MAX_NAME = 200;
const MAX_NOTES = 2000;
const MAX_ID = 128;

function num(v: unknown, min: number, max: number): number | undefined {
  if (typeof v !== 'number' || !Number.isFinite(v)) return undefined;
  return Math.min(max, Math.max(min, v));
}

function str(v: unknown, maxLen: number): string | undefined {
  if (typeof v !== 'string' || v.length === 0) return undefined;
  return v.slice(0, maxLen);
}

function optStr(v: unknown, maxLen: number): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v.slice(0, maxLen) : undefined;
}

function timestamp(v: unknown): number {
  const t = num(v, 0, 8.64e15);
  return t ?? Date.now();
}

function optTimestamp(v: unknown): number | undefined {
  return num(v, 0, 8.64e15);
}

function oneOf<T extends string>(v: unknown, values: readonly T[]): T | undefined {
  return typeof v === 'string' && (values as readonly string[]).includes(v) ? (v as T) : undefined;
}

const FREQUENCIES: readonly Frequency[] = ['weekly', 'fortnightly', 'monthly', 'yearly'];
const CATEGORIES: readonly BudgetCategory[] = ['necessity', 'cost', 'savings'];
const GOAL_TYPES: readonly GoalType[] = ['emergency_fund', 'wealth', 'time_specific', 'debt_free'];
const INVESTMENT_TYPES = ['etf', 'kiwisaver', 'other'] as const;
const LINKED_TYPES = ['investment', 'savings_bucket', 'housing', 'mortgage', 'housing_expense'] as const;
const HOUSE_CATEGORIES = ['mortgage', 'rates', 'body_corporate', 'utilities', 'insurance', 'food', 'other'] as const;

type Raw = Record<string, unknown>;

function isObject(v: unknown): v is Raw {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function sanitizeArray<T>(v: unknown, max: number, fn: (raw: Raw) => T | null): T[] {
  if (!Array.isArray(v)) return [];
  const out: T[] = [];
  for (const el of v.slice(0, max)) {
    if (!isObject(el)) continue;
    const clean = fn(el);
    if (clean) out.push(clean);
  }
  return out;
}

function sanitizeBudgetItem(raw: Raw): BudgetItem | null {
  const id = str(raw.id, MAX_ID);
  const name = str(raw.name, MAX_NAME);
  const amount = num(raw.amount, 0, MAX_MONEY);
  const frequency = oneOf(raw.frequency, FREQUENCIES);
  const category = oneOf(raw.category, CATEGORIES);
  if (!id || !name || amount === undefined || !frequency || !category) return null;
  return {
    id,
    name,
    amount,
    frequency,
    category,
    parentId: optStr(raw.parentId, MAX_ID),
    linkedToId: optStr(raw.linkedToId, MAX_ID),
    linkedToType: oneOf(raw.linkedToType, LINKED_TYPES),
    notes: optStr(raw.notes, MAX_NOTES),
    createdAt: timestamp(raw.createdAt),
    updatedAt: timestamp(raw.updatedAt),
  };
}

function sanitizeInvestment(raw: Raw): Investment | null {
  const id = str(raw.id, MAX_ID);
  const name = str(raw.name, MAX_NAME);
  const type = oneOf(raw.type, INVESTMENT_TYPES);
  const currentValue = num(raw.currentValue, 0, MAX_MONEY);
  if (!id || !name || !type || currentValue === undefined) return null;
  return {
    id,
    name,
    type,
    currentValue,
    currentValueUpdatedAt: timestamp(raw.currentValueUpdatedAt),
    weeklyContribution: num(raw.weeklyContribution, 0, 1_000_000) ?? 0,
    expectedReturnRate: num(raw.expectedReturnRate, -50, 50) ?? 0,
    feeRate: num(raw.feeRate, 0, 20),
    employerWeeklyContribution: num(raw.employerWeeklyContribution, 0, 1_000_000),
    includeGovtContribution: typeof raw.includeGovtContribution === 'boolean' ? raw.includeGovtContribution : undefined,
    notes: optStr(raw.notes, MAX_NOTES),
    createdAt: timestamp(raw.createdAt),
    updatedAt: timestamp(raw.updatedAt),
  };
}

function sanitizeMortgage(raw: Raw): Mortgage | null {
  const id = str(raw.id, MAX_ID);
  const name = str(raw.name, MAX_NAME);
  const principal = num(raw.principal, 0, MAX_MONEY);
  const interestRate = num(raw.interestRate, 0, 50);
  const weeklyPayment = num(raw.weeklyPayment, 0, 1_000_000);
  if (!id || !name || principal === undefined || interestRate === undefined || weeklyPayment === undefined) return null;
  return {
    id,
    name,
    principal,
    principalUpdatedAt: timestamp(raw.principalUpdatedAt),
    originalPrincipal: num(raw.originalPrincipal, 0, MAX_MONEY) ?? principal,
    propertyValue: num(raw.propertyValue, 0, MAX_MONEY),
    interestRate,
    weeklyPayment,
    extraWeeklyPayment: num(raw.extraWeeklyPayment, 0, 1_000_000) ?? 0,
    startDate: timestamp(raw.startDate),
    termYears: Math.round(num(raw.termYears, 1, 50) ?? 30),
    fixedTermEndDate: optTimestamp(raw.fixedTermEndDate),
    notes: optStr(raw.notes, MAX_NOTES),
    createdAt: timestamp(raw.createdAt),
    updatedAt: timestamp(raw.updatedAt),
  };
}

function sanitizeGoal(raw: Raw): Goal | null {
  const id = str(raw.id, MAX_ID);
  const name = str(raw.name, MAX_NAME);
  const type = oneOf(raw.type, GOAL_TYPES);
  if (!id || !name || !type) return null;
  const months = num(raw.monthsOfExpenses, 1, 24);
  return {
    id,
    name,
    type,
    targetAmount: num(raw.targetAmount, 0, MAX_MONEY) ?? 0,
    currentAmount: num(raw.currentAmount, 0, MAX_MONEY) ?? 0,
    currentAmountUpdatedAt: optTimestamp(raw.currentAmountUpdatedAt),
    targetDate: optTimestamp(raw.targetDate),
    monthsOfExpenses: months !== undefined ? Math.round(months) : undefined,
    notes: optStr(raw.notes, MAX_NOTES),
    createdAt: timestamp(raw.createdAt),
    updatedAt: timestamp(raw.updatedAt),
  };
}

function sanitizeBucket(raw: Raw): SavingsBucket | null {
  const id = str(raw.id, MAX_ID);
  const name = str(raw.name, MAX_NAME);
  if (!id || !name) return null;
  return {
    id,
    name,
    targetAmount: num(raw.targetAmount, 0, MAX_MONEY) ?? 0,
    currentAmount: num(raw.currentAmount, 0, MAX_MONEY) ?? 0,
    currentAmountUpdatedAt: timestamp(raw.currentAmountUpdatedAt),
    weeklyContribution: num(raw.weeklyContribution, 0, 1_000_000) ?? 0,
    expectedReturnRate: num(raw.expectedReturnRate, 0, 50),
    targetDate: optTimestamp(raw.targetDate),
    notes: optStr(raw.notes, MAX_NOTES),
    createdAt: timestamp(raw.createdAt),
    updatedAt: timestamp(raw.updatedAt),
  };
}

function sanitizeHouseExpense(raw: Raw): HouseExpense | null {
  const id = str(raw.id, MAX_ID);
  const name = str(raw.name, MAX_NAME);
  const amount = num(raw.amount, 0, MAX_MONEY);
  const frequency = oneOf(raw.frequency, FREQUENCIES);
  const category = oneOf(raw.category, HOUSE_CATEGORIES);
  if (!id || !name || amount === undefined || !frequency || !category) return null;
  return { id, name, amount, frequency, category, notes: optStr(raw.notes, MAX_NOTES) };
}

function sanitizeSharedHousing(raw: unknown): SharedHousing | undefined {
  if (!isObject(raw)) return undefined;
  return {
    enabled: raw.enabled === true,
    partnerName: optStr(raw.partnerName, 100) ?? '',
    partnerWeeklyIncome: num(raw.partnerWeeklyIncome, 0, 1_000_000) ?? 0,
    expenses: sanitizeArray(raw.expenses, MAX_ENTITIES, sanitizeHouseExpense),
    createdAt: timestamp(raw.createdAt),
    updatedAt: timestamp(raw.updatedAt),
  };
}

function sanitizeSnapshot(raw: Raw): NetWorthSnapshot | null {
  const at = optTimestamp(raw.at);
  const investments = num(raw.investments, 0, MAX_MONEY);
  const propertyValue = num(raw.propertyValue, 0, MAX_MONEY);
  const mortgageBalance = num(raw.mortgageBalance, 0, MAX_MONEY);
  const netWorth = num(raw.netWorth, -MAX_MONEY, MAX_MONEY);
  if (at === undefined || investments === undefined || propertyValue === undefined
      || mortgageBalance === undefined || netWorth === undefined) return null;
  return { at, investments, propertyValue, mortgageBalance, netWorth };
}

// Sanitize an entire store (imported backup or loaded localStorage).
// Returns null when the input isn't recognizably a store; otherwise every
// field is validated, clamped, or dropped.
export function sanitizeStore(raw: unknown): BudgetStore | null {
  if (!isObject(raw)) return null;
  if (!isObject(raw.settings)) return null;
  if (!Array.isArray(raw.budgetItems)) return null;

  return {
    settings: sanitizeSettings(raw.settings as unknown as UserSettings),
    budgetItems: sanitizeArray(raw.budgetItems, MAX_ITEMS, sanitizeBudgetItem),
    savingsBuckets: sanitizeArray(raw.savingsBuckets, MAX_ENTITIES, sanitizeBucket),
    investments: sanitizeArray(raw.investments, MAX_ENTITIES, sanitizeInvestment),
    mortgages: sanitizeArray(raw.mortgages, MAX_ENTITIES, sanitizeMortgage),
    goals: sanitizeArray(raw.goals, MAX_ENTITIES, sanitizeGoal),
    sharedHousing: sanitizeSharedHousing(raw.sharedHousing),
    netWorthHistory: sanitizeArray(raw.netWorthHistory, MAX_HISTORY, sanitizeSnapshot),
  };
}
