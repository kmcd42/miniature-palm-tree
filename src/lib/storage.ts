import { BudgetStore, INITIAL_STORE } from '@/types/budget';

const STORAGE_KEY = 'compound-data';
const LEGACY_STORAGE_KEY = 'budget-clarity-data';
const STORAGE_VERSION = 1;

interface StorageWrapper {
  version: number;
  data: BudgetStore;
  lastUpdated: number;
}

// Load data from localStorage
export function loadStore(): BudgetStore {
  if (typeof window === 'undefined') {
    return INITIAL_STORE;
  }

  try {
    // Try new storage key first
    let raw = localStorage.getItem(STORAGE_KEY);

    // Migrate from legacy key if new key doesn't exist
    if (!raw) {
      raw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (raw) {
        // Migrate to new key
        localStorage.setItem(STORAGE_KEY, raw);
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      }
    }

    if (!raw) {
      return INITIAL_STORE;
    }

    const wrapper: StorageWrapper = JSON.parse(raw);

    // Handle version migrations here if needed
    if (wrapper.version !== STORAGE_VERSION) {
      // Future: migrate data between versions
      console.log('Storage version mismatch, using stored data as-is');
    }

    return wrapper.data;
  } catch (error) {
    console.error('Failed to load budget data:', error);
    return INITIAL_STORE;
  }
}

// Save data to localStorage
export function saveStore(store: BudgetStore): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const wrapper: StorageWrapper = {
      version: STORAGE_VERSION,
      data: store,
      lastUpdated: Date.now(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(wrapper));
    return true;
  } catch (error) {
    console.error('Failed to save budget data:', error);
    return false;
  }
}

// Export data as JSON for backup
export function exportData(): string {
  const store = loadStore();
  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    version: STORAGE_VERSION,
    data: store,
  }, null, 2);
}

// Import data from JSON backup
export function importData(jsonString: string): BudgetStore | null {
  try {
    const parsed = JSON.parse(jsonString);

    // Validate structure
    if (!parsed.data || typeof parsed.data !== 'object') {
      throw new Error('Invalid data structure');
    }

    const store = parsed.data as BudgetStore;

    // Validate required fields exist
    if (!store.settings || !Array.isArray(store.budgetItems)) {
      throw new Error('Missing required fields');
    }

    saveStore(store);
    return store;
  } catch (error) {
    console.error('Failed to import data:', error);
    return null;
  }
}

// Clear all data
export function clearStore(): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.removeItem(STORAGE_KEY);
}
