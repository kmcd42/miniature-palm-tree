// Budget item categories matching user's mental model
export type BudgetCategory = 'necessity' | 'cost' | 'savings';

// Frequency of expenses/income
export type Frequency = 'weekly' | 'fortnightly' | 'monthly' | 'yearly';

// Budget line item - the core unit of the budget
export interface BudgetItem {
  id: string;
  name: string;
  amount: number; // Amount in the specified frequency
  frequency: Frequency;
  category: BudgetCategory;
  isSubscription?: boolean; // For regular expenses tracking
  parentId?: string; // For sub-items
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

// Regular expense (subscription) with yearly/monthly cost converted to weekly
export interface RegularExpense {
  id: string;
  name: string;
  amount: number;
  frequency: 'monthly' | 'yearly';
  budgetItemId?: string; // Links to parent budget item
  createdAt: number;
  updatedAt: number;
}

// Savings bucket - for tracking specific savings goals
export interface SavingsBucket {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number; // Manually updated
  weeklyContribution: number;
  budgetItemId?: string; // Links to budget item
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
  weeklyContribution: number;
  expectedReturnRate: number; // Annual % (e.g., 7 for 7%)
  feeRate?: number; // Annual % fees
  budgetItemId?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

// Mortgage tracking
export interface Mortgage {
  id: string;
  name: string;
  principal: number; // Current principal
  originalPrincipal: number;
  interestRate: number; // Annual %
  weeklyPayment: number;
  extraWeeklyPayment: number; // Additional payments
  startDate: number;
  termYears: number;
  notes?: string;
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
  targetDate?: number; // For time-specific goals
  monthsOfExpenses?: number; // For emergency fund (e.g., 6 months)
  notes?: string;
  linkedBudgetItemIds?: string[]; // Items that contribute to this goal
  createdAt: number;
  updatedAt: number;
}

// User settings
export interface UserSettings {
  age: number;
  retirementAge: number;
  afterTaxWeeklyIncome: number;
  currency: string;
  inflationRate: number; // Annual % assumption (e.g., 2.5)
  createdAt: number;
  updatedAt: number;
}

// Main data store shape
export interface BudgetStore {
  settings: UserSettings;
  budgetItems: BudgetItem[];
  regularExpenses: RegularExpense[];
  savingsBuckets: SavingsBucket[];
  investments: Investment[];
  mortgages: Mortgage[];
  goals: Goal[];
}

// Default settings for new users
export const DEFAULT_SETTINGS: UserSettings = {
  age: 28,
  retirementAge: 70,
  afterTaxWeeklyIncome: 0,
  currency: 'NZD',
  inflationRate: 2.5,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

// Initial empty store
export const INITIAL_STORE: BudgetStore = {
  settings: DEFAULT_SETTINGS,
  budgetItems: [],
  regularExpenses: [],
  savingsBuckets: [],
  investments: [],
  mortgages: [],
  goals: [],
};
