// Budget item categories matching user's mental model
export type BudgetCategory = 'necessity' | 'cost' | 'savings';

// Frequency of expenses/income
export type Frequency = 'weekly' | 'fortnightly' | 'monthly' | 'yearly';

// Budget line item - the core unit of the budget
export interface BudgetItem {
  id: string;
  name: string;
  amount: number; // Amount in the specified frequency (ignored if isAutoCalculated)
  frequency: Frequency;
  category: BudgetCategory;
  parentId?: string; // For sub-items; parents auto-sum their children
  linkedToId?: string; // Links to investment/savings bucket ID (auto-synced)
  linkedToType?: 'investment' | 'savings_bucket' | 'housing' | 'mortgage' | 'housing_expense'; // Type of linked item
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

// Savings bucket - for tracking specific savings goals
export interface SavingsBucket {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number; // Manually updated
  currentAmountUpdatedAt: number; // When currentAmount was last updated
  weeklyContribution: number;
  expectedReturnRate?: number; // Annual % for interest-bearing accounts
  budgetItemId?: string; // Links to budget item (auto-created)
  targetDate?: number; // Optional deadline
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

// Investment tracking for DCA/ETF/KiwiSaver
export interface Investment {
  id: string;
  name: string;
  type: 'etf' | 'kiwisaver' | 'other';
  currentValue: number; // Manually updated periodically
  currentValueUpdatedAt: number; // When currentValue was last updated
  weeklyContribution: number; // Your own contribution (this is what hits the budget)
  expectedReturnRate: number; // Annual % (e.g., 7 for 7%)
  feeRate?: number; // Annual % fees
  // KiwiSaver extras — counted in projections, not in your weekly budget
  employerWeeklyContribution?: number;
  includeGovtContribution?: boolean; // Adds the annual government contribution
  budgetItemId?: string; // Links to budget item (auto-created)
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

// Mortgage tracking
export interface Mortgage {
  id: string;
  name: string;
  principal: number; // Current principal
  principalUpdatedAt: number; // When principal was last updated
  originalPrincipal: number;
  propertyValue?: number; // Current property value (CV)
  interestRate: number; // Annual %
  weeklyPayment: number;
  extraWeeklyPayment: number; // Additional payments
  startDate: number; // When mortgage was first drawn down (timestamp)
  termYears: number;
  fixedTermEndDate?: number; // When the current fixed rate expires (timestamp)
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

// House expense item for shared housing
export interface HouseExpense {
  id: string;
  name: string;
  amount: number;
  frequency: Frequency;
  category: 'mortgage' | 'rates' | 'body_corporate' | 'utilities' | 'insurance' | 'food' | 'other';
  notes?: string;
}

// Shared housing configuration
export interface SharedHousing {
  enabled: boolean;
  partnerName: string;
  partnerWeeklyIncome: number;
  expenses: HouseExpense[];
  // Calculated: what % of combined income goes to housing
  // Your share = (yourIncome / totalIncome) * totalExpenses
  createdAt: number;
  updatedAt: number;
}

// Goal types
export type GoalType = 'emergency_fund' | 'wealth' | 'time_specific' | 'debt_free';

// Goals
export interface Goal {
  id: string;
  name: string;
  type: GoalType;
  targetAmount: number;
  currentAmount: number;
  currentAmountUpdatedAt?: number; // When currentAmount was last updated
  targetDate?: number; // For time-specific goals
  monthsOfExpenses?: number; // For emergency fund (e.g., 6 months)
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

// Pay frequency for payday feature
export type PayFrequency = 'weekly' | 'fortnightly' | 'monthly';

// User settings
export interface UserSettings {
  age?: number;              // Deprecated. Use dateOfBirth. Kept for migration only.
  dateOfBirth?: string;      // ISO date string YYYY-MM-DD. Primary source for current age.
  retirementAge: number;
  lifeExpectancy: number;    // Used for retirement drawdown projection. Default 90.
  afterTaxWeeklyIncome: number;
  currency: string;
  inflationRate: number;     // Annual % assumption (e.g., 2.5)
  safeWithdrawalRate: number; // Annual % real, used for drawdown calc. Default 4.0.
  payFrequency?: PayFrequency;

  // NZ Superannuation modelling (off by default — it's not certain)
  includeNzSuper: boolean;
  nzSuperWeeklyAmount: number;   // Combined weekly amount in today's dollars (real)
  nzSuperEligibilityAge: number; // Default 65

  // Reality-check benchmarks (Massey & median net worth)
  showBenchmarks: boolean;
  // User-overridable Massey weekly expenditure figures (real, today's $)
  masseyTwoPersonNoFrills: number;
  masseyTwoPersonChoices: number;

  createdAt: number;
  updatedAt: number;
}

// Point-in-time record of net worth, appended whenever a balance changes
// (at most one per day). Powers the actual-history chart.
export interface NetWorthSnapshot {
  at: number;
  investments: number;
  propertyValue: number;
  mortgageBalance: number;
  netWorth: number; // investments + propertyValue - mortgageBalance
}

// Main data store shape
export interface BudgetStore {
  settings: UserSettings;
  budgetItems: BudgetItem[];
  savingsBuckets: SavingsBucket[];
  investments: Investment[];
  mortgages: Mortgage[];
  goals: Goal[];
  sharedHousing?: SharedHousing;
  netWorthHistory: NetWorthSnapshot[];
}

// Default settings for new users
export const DEFAULT_SETTINGS: UserSettings = {
  dateOfBirth: undefined,
  retirementAge: 67,
  lifeExpectancy: 90,
  afterTaxWeeklyIncome: 0,
  currency: 'NZD',
  inflationRate: 2.5,
  safeWithdrawalRate: 4.0,
  includeNzSuper: false,
  nzSuperWeeklyAmount: 804,        // 2024 couple, both qualifying, after tax @ M (combined)
  nzSuperEligibilityAge: 65,
  showBenchmarks: true,
  masseyTwoPersonNoFrills: 902,    // Massey REG 2023 figures, urban two-person
  masseyTwoPersonChoices: 1533,    // Massey REG 2023 figures, urban two-person
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

// Initial empty store
export const INITIAL_STORE: BudgetStore = {
  settings: DEFAULT_SETTINGS,
  budgetItems: [],
  savingsBuckets: [],
  investments: [],
  mortgages: [],
  goals: [],
  sharedHousing: undefined,
  netWorthHistory: [],
};
