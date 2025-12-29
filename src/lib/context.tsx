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
  | { type: 'ADD_SAVINGS_BUCKET'; payload: Omit<SavingsBucket, 'id' | 'createdAt' | 'updatedAt'> }
  | { type: 'UPDATE_SAVINGS_BUCKET'; payload: { id: string; updates: Partial<SavingsBucket> } }
  | { type: 'DELETE_SAVINGS_BUCKET'; payload: string }
  | { type: 'ADD_INVESTMENT'; payload: Omit<Investment, 'id' | 'createdAt' | 'updatedAt'> }
  | { type: 'UPDATE_INVESTMENT'; payload: { id: string; updates: Partial<Investment> } }
  | { type: 'DELETE_INVESTMENT'; payload: string }
  | { type: 'ADD_MORTGAGE'; payload: Omit<Mortgage, 'id' | 'createdAt' | 'updatedAt'> }
  | { type: 'UPDATE_MORTGAGE'; payload: { id: string; updates: Partial<Mortgage> } }
  | { type: 'DELETE_MORTGAGE'; payload: string }
  | { type: 'ADD_GOAL'; payload: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'> }
  | { type: 'UPDATE_GOAL'; payload: { id: string; updates: Partial<Goal> } }
  | { type: 'DELETE_GOAL'; payload: string }
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
      return {
        ...state,
        budgetItems: state.budgetItems.filter((item) => item.id !== action.payload),
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
            createdAt: now,
            updatedAt: now,
          },
        ],
      };

    case 'UPDATE_SAVINGS_BUCKET':
      return {
        ...state,
        savingsBuckets: state.savingsBuckets.map((item) =>
          item.id === action.payload.id
            ? { ...item, ...action.payload.updates, updatedAt: now }
            : item
        ),
      };

    case 'DELETE_SAVINGS_BUCKET':
      return {
        ...state,
        savingsBuckets: state.savingsBuckets.filter((item) => item.id !== action.payload),
      };

    case 'ADD_INVESTMENT':
      return {
        ...state,
        investments: [
          ...state.investments,
          {
            ...action.payload,
            id: uuidv4(),
            createdAt: now,
            updatedAt: now,
          },
        ],
      };

    case 'UPDATE_INVESTMENT':
      return {
        ...state,
        investments: state.investments.map((item) =>
          item.id === action.payload.id
            ? { ...item, ...action.payload.updates, updatedAt: now }
            : item
        ),
      };

    case 'DELETE_INVESTMENT':
      return {
        ...state,
        investments: state.investments.filter((item) => item.id !== action.payload),
      };

    case 'ADD_MORTGAGE':
      return {
        ...state,
        mortgages: [
          ...state.mortgages,
          {
            ...action.payload,
            id: uuidv4(),
            createdAt: now,
            updatedAt: now,
          },
        ],
      };

    case 'UPDATE_MORTGAGE':
      return {
        ...state,
        mortgages: state.mortgages.map((item) =>
          item.id === action.payload.id
            ? { ...item, ...action.payload.updates, updatedAt: now }
            : item
        ),
      };

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
            createdAt: now,
            updatedAt: now,
          },
        ],
      };

    case 'UPDATE_GOAL':
      return {
        ...state,
        goals: state.goals.map((item) =>
          item.id === action.payload.id
            ? { ...item, ...action.payload.updates, updatedAt: now }
            : item
        ),
      };

    case 'DELETE_GOAL':
      return {
        ...state,
        goals: state.goals.filter((item) => item.id !== action.payload),
      };

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
