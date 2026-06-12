import { UserSettings, DEFAULT_SETTINGS } from '@/types/budget';

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
