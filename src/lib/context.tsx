'use client';

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  BudgetStore,
  BudgetItem,
  RegularExpense,
  SavingsBucket,
  Investment,
  Mortgage,
  Goal,
  UserSettings,
  SharedHousing,
  HouseExpense,
  INITIAL_STORE,
} from '@/types/budget';
import { loadStore, saveStore } from './storage';

// Action types
type Action =
  | { type: 'LOAD_STORE'; payload: BudgetStore }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<UserSettings> }
  | { type: 'ADD_BUDGET_ITEM'; payload: Omit<BudgetItem, 'id' | 'createdAt' | 'updatedAt'> }
  | { type: 'UPDATE_BUDGET_ITEM'; payload: { id: string; updates: Partial<BudgetItem> } }
  | { type: 'DELETE_BUDGET_ITEM'; payload: string }
  | { type: 'ADD_REGULAR_EXPENSE'; payload: Omit<RegularExpense, 'id' | 'createdAt' | 'updatedAt'> }
  | { type: 'UPDATE_REGULAR_EXPENSE'; payload: { id: string; updates: Partial<RegularExpense> } }
  | { type: 'DELETE_REGULAR_EXPENSE'; payload: string }
  | { type: 'ADD_SAVINGS_BUCKET'; payload: Omit<SavingsBucket, 'id' | 'createdAt' | 'updatedAt' | 'currentAmountUpdatedAt'> }
  | { type: 'UPDATE_SAVINGS_BUCKET'; payload: { id: string; updates: Partial<SavingsBucket> } }
  | { type: 'DELETE_SAVINGS_BUCKET'; payload: string }
  | { type: 'ADD_INVESTMENT'; payload: Omit<Investment, 'id' | 'createdAt' | 'updatedAt' | 'currentValueUpdatedAt'> }
  | { type: 'UPDATE_INVESTMENT'; payload: { id: string; updates: Partial<Investment> } }
  | { type: 'DELETE_INVESTMENT'; payload: string }
  | { type: 'ADD_MORTGAGE'; payload: Omit<Mortgage, 'id' | 'createdAt' | 'updatedAt' | 'principalUpdatedAt'> }
  | { type: 'UPDATE_MORTGAGE'; payload: { id: string; updates: Partial<Mortgage> } }
  | { type: 'DELETE_MORTGAGE'; payload: string }
  | { type: 'ADD_GOAL'; payload: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'> }
  | { type: 'UPDATE_GOAL'; payload: { id: string; updates: Partial<Goal> } }
  | { type: 'DELETE_GOAL'; payload: string }
  | { type: 'UPDATE_SHARED_HOUSING'; payload: Partial<SharedHousing> }
  | { type: 'ADD_HOUSE_EXPENSE'; payload: Omit<HouseExpense, 'id'> }
  | { type: 'UPDATE_HOUSE_EXPENSE'; payload: { id: string; updates: Partial<HouseExpense> } }
  | { type: 'DELETE_HOUSE_EXPENSE'; payload: string }
  | { type: 'IMPORT_DATA'; payload: BudgetStore };

function reducer(state: BudgetStore, action: Action): BudgetStore {
  const now = Date.now();

  switch (action.type) {
    case 'LOAD_STORE':
      return action.payload;

    case 'IMPORT_DATA':
      return action.payload;

    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: {
          ...state.settings,
          ...action.payload,
          updatedAt: now,
        },
      };

    case 'ADD_BUDGET_ITEM':
      return {
        ...state,
        budgetItems: [
          ...state.budgetItems,
          {
            ...action.payload,
            id: uuidv4(),
            createdAt: now,
            updatedAt: now,
          },
        ],
      };

    case 'UPDATE_BUDGET_ITEM':
      return {
        ...state,
        budgetItems: state.budgetItems.map((item) =>
          item.id === action.payload.id
            ? { ...item, ...action.payload.updates, updatedAt: now }
            : item
        ),
      };

    case 'DELETE_BUDGET_ITEM':
      // Also delete any child items
      return {
        ...state,
        budgetItems: state.budgetItems.filter(
          (item) => item.id !== action.payload && item.parentId !== action.payload
        ),
      };

    case 'ADD_REGULAR_EXPENSE':
      return {
        ...state,
        regularExpenses: [
          ...state.regularExpenses,
          {
            ...action.payload,
            id: uuidv4(),
            createdAt: now,
            updatedAt: now,
          },
        ],
      };

    case 'UPDATE_REGULAR_EXPENSE':
      return {
        ...state,
        regularExpenses: state.regularExpenses.map((item) =>
          item.id === action.payload.id
            ? { ...item, ...action.payload.updates, updatedAt: now }
            : item
        ),
      };

    case 'DELETE_REGULAR_EXPENSE':
      return {
        ...state,
        regularExpenses: state.regularExpenses.filter((item) => item.id !== action.payload),
      };

    case 'ADD_SAVINGS_BUCKET':
      return {
        ...state,
        savingsBuckets: [
          ...state.savingsBuckets,
          {
            ...action.payload,
            id: uuidv4(),
            currentAmountUpdatedAt: now,
            createdAt: now,
            updatedAt: now,
          },
        ],
      };

    case 'UPDATE_SAVINGS_BUCKET': {
      const updates = action.payload.updates;
      // If currentAmount is being updated, also update the timestamp
      const hasAmountUpdate = 'currentAmount' in updates;
      return {
        ...state,
        savingsBuckets: state.savingsBuckets.map((item) =>
          item.id === action.payload.id
            ? {
                ...item,
                ...updates,
                ...(hasAmountUpdate ? { currentAmountUpdatedAt: now } : {}),
                updatedAt: now,
              }
            : item
        ),
      };
    }

    case 'DELETE_SAVINGS_BUCKET':
      return {
        ...state,
        savingsBuckets: state.savingsBuckets.filter((item) => item.id !== action.payload),
        // Also remove any linked budget items
        budgetItems: state.budgetItems.filter(
          (item) => !(item.linkedToId === action.payload && item.linkedToType === 'savings_bucket')
        ),
      };

    case 'ADD_INVESTMENT':
      return {
        ...state,
        investments: [
          ...state.investments,
          {
            ...action.payload,
            id: uuidv4(),
            currentValueUpdatedAt: now,
            createdAt: now,
            updatedAt: now,
          },
        ],
      };

    case 'UPDATE_INVESTMENT': {
      const updates = action.payload.updates;
      // If currentValue is being updated, also update the timestamp
      const hasValueUpdate = 'currentValue' in updates;
      return {
        ...state,
        investments: state.investments.map((item) =>
          item.id === action.payload.id
            ? {
                ...item,
                ...updates,
                ...(hasValueUpdate ? { currentValueUpdatedAt: now } : {}),
                updatedAt: now,
              }
            : item
        ),
      };
    }

    case 'DELETE_INVESTMENT':
      return {
        ...state,
        investments: state.investments.filter((item) => item.id !== action.payload),
        // Also remove any linked budget items
        budgetItems: state.budgetItems.filter(
          (item) => !(item.linkedToId === action.payload && item.linkedToType === 'investment')
        ),
      };

    case 'ADD_MORTGAGE':
      return {
        ...state,
        mortgages: [
          ...state.mortgages,
          {
            ...action.payload,
            id: uuidv4(),
            principalUpdatedAt: now,
            createdAt: now,
            updatedAt: now,
          },
        ],
      };

    case 'UPDATE_MORTGAGE': {
      const updates = action.payload.updates;
      // If principal is being updated, also update the timestamp
      const hasPrincipalUpdate = 'principal' in updates;
      return {
        ...state,
        mortgages: state.mortgages.map((item) =>
          item.id === action.payload.id
            ? {
                ...item,
                ...updates,
                ...(hasPrincipalUpdate ? { principalUpdatedAt: now } : {}),
                updatedAt: now,
              }
            : item
        ),
      };
    }

    case 'DELETE_MORTGAGE':
      return {
        ...state,
        mortgages: state.mortgages.filter((item) => item.id !== action.payload),
      };

    case 'ADD_GOAL':
      return {
        ...state,
        goals: [
          ...state.goals,
          {
            ...action.payload,
            id: uuidv4(),
            currentAmountUpdatedAt: now,
            createdAt: now,
            updatedAt: now,
          },
        ],
      };

    case 'UPDATE_GOAL': {
      const updates = action.payload.updates;
      const hasAmountUpdate = 'currentAmount' in updates;
      return {
        ...state,
        goals: state.goals.map((item) =>
          item.id === action.payload.id
            ? {
                ...item,
                ...updates,
                ...(hasAmountUpdate ? { currentAmountUpdatedAt: now } : {}),
                updatedAt: now,
              }
            : item
        ),
      };
    }

    case 'DELETE_GOAL':
      return {
        ...state,
        goals: state.goals.filter((item) => item.id !== action.payload),
      };

    case 'UPDATE_SHARED_HOUSING': {
      const currentHousing = state.sharedHousing || {
        enabled: false,
        partnerName: '',
        partnerWeeklyIncome: 0,
        expenses: [],
        createdAt: now,
        updatedAt: now,
      };
      return {
        ...state,
        sharedHousing: {
          ...currentHousing,
          ...action.payload,
          updatedAt: now,
        },
      };
    }

    case 'ADD_HOUSE_EXPENSE': {
      const currentHousing = state.sharedHousing || {
        enabled: true,
        partnerName: '',
        partnerWeeklyIncome: 0,
        expenses: [],
        createdAt: now,
        updatedAt: now,
      };
      return {
        ...state,
        sharedHousing: {
          ...currentHousing,
          expenses: [
            ...currentHousing.expenses,
            {
              ...action.payload,
              id: uuidv4(),
            },
          ],
          updatedAt: now,
        },
      };
    }

    case 'UPDATE_HOUSE_EXPENSE': {
      if (!state.sharedHousing) return state;
      return {
        ...state,
        sharedHousing: {
          ...state.sharedHousing,
          expenses: state.sharedHousing.expenses.map((exp) =>
            exp.id === action.payload.id
              ? { ...exp, ...action.payload.updates }
              : exp
          ),
          updatedAt: now,
        },
      };
    }

    case 'DELETE_HOUSE_EXPENSE': {
      if (!state.sharedHousing) return state;
      return {
        ...state,
        sharedHousing: {
          ...state.sharedHousing,
          expenses: state.sharedHousing.expenses.filter((exp) => exp.id !== action.payload),
          updatedAt: now,
        },
      };
    }

    default:
      return state;
  }
}

interface BudgetContextType {
  store: BudgetStore;
  dispatch: React.Dispatch<Action>;
  isLoaded: boolean;
}

const BudgetContext = createContext<BudgetContextType | null>(null);

export function BudgetProvider({ children }: { children: ReactNode }) {
  const [store, dispatch] = useReducer(reducer, INITIAL_STORE);
  const [isLoaded, setIsLoaded] = React.useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const savedStore = loadStore();
    dispatch({ type: 'LOAD_STORE', payload: savedStore });
    setIsLoaded(true);
  }, []);

  // Save to localStorage on changes (after initial load)
  useEffect(() => {
    if (isLoaded) {
      saveStore(store);
    }
  }, [store, isLoaded]);

  return (
    <BudgetContext.Provider value={{ store, dispatch, isLoaded }}>
      {children}
    </BudgetContext.Provider>
  );
}

export function useBudget() {
  const context = useContext(BudgetContext);
  if (!context) {
    throw new Error('useBudget must be used within a BudgetProvider');
  }
  return context;
}
