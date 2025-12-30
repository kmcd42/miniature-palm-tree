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
  isAutoCalculated?: boolean; // If true, amount is sum of children
  isSubscription?: boolean; // For regular expenses tracking
  parentId?: string; // For sub-items
  linkedToId?: string; // Links to investment/savings bucket ID (auto-synced)
  linkedToType?: 'investment' | 'savings_bucket' | 'housing' | 'mortgage' | 'housing_expense'; // Type of linked item
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
  weeklyContribution: number;
  expectedReturnRate: number; // Annual % (e.g., 7 for 7%)
  feeRate?: number; // Annual % fees
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
  startDate: number;
  termYears: number;
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
  linkedBudgetItemIds?: string[]; // Items that contribute to this goal
  createdAt: number;
  updatedAt: number;
}

// Pay frequency for payday feature
export type PayFrequency = 'weekly' | 'fortnightly' | 'monthly';

// User settings
export interface UserSettings {
  age: number;
  retirementAge: number;
  afterTaxWeeklyIncome: number;
  currency: string;
  inflationRate: number; // Annual % assumption (e.g., 2.5)
  payFrequency?: PayFrequency; // How often user gets paid (default: fortnightly)
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
  sharedHousing?: SharedHousing;
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
  sharedHousing: undefined,
};
