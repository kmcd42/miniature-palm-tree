import { BudgetStore, INITIAL_STORE, UserSettings, DEFAULT_SETTINGS } from '@/types/budget';
import { sanitizeSettings } from './validation';

const STORAGE_KEY = 'compound-data';
const LEGACY_STORAGE_KEY = 'budget-clarity-data';
const LAST_EXPORT_KEY = 'compound-last-export';
const EXPORT_SNOOZE_KEY = 'compound-export-snooze';
const STORAGE_VERSION = 3;

const EXPORT_STALE_MS = 30 * 24 * 60 * 60 * 1000; // remind after 30 days
const EXPORT_SNOOZE_MS = 14 * 24 * 60 * 60 * 1000; // "later" hides for 14 days

interface StorageWrapper {
  version: number;
  data: BudgetStore;
  lastUpdated: number;
}

// Migrate a settings object that may be from v1 (age-based) to v2 (DOB-based)
function migrateSettings(raw: Partial<UserSettings> & { age?: number }): UserSettings {
  const merged: UserSettings = {
    ...DEFAULT_SETTINGS,
    ...raw,
  };

  // If we have age but no dateOfBirth, derive a plausible DOB from age.
  // We don't know their birthday, so set it to today's date that many years ago.
  if (!merged.dateOfBirth && typeof raw.age === 'number' && raw.age > 0) {
    const today = new Date();
    const year = today.getFullYear() - raw.age;
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    merged.dateOfBirth = `${year}-${month}-${day}`;
  }

  // Fill defaults for new fields if missing
  if (typeof merged.lifeExpectancy !== 'number') merged.lifeExpectancy = 90;
  if (typeof merged.safeWithdrawalRate !== 'number') merged.safeWithdrawalRate = 4.0;
  if (typeof merged.retirementAge !== 'number') merged.retirementAge = 67;

  // v2 additions
  if (typeof merged.includeNzSuper !== 'boolean') merged.includeNzSuper = false;
  if (typeof merged.nzSuperWeeklyAmount !== 'number') merged.nzSuperWeeklyAmount = 804;
  if (typeof merged.nzSuperEligibilityAge !== 'number') merged.nzSuperEligibilityAge = 65;
  if (typeof merged.showBenchmarks !== 'boolean') merged.showBenchmarks = true;
  if (typeof merged.masseyTwoPersonNoFrills !== 'number') merged.masseyTwoPersonNoFrills = 902;
  if (typeof merged.masseyTwoPersonChoices !== 'number') merged.masseyTwoPersonChoices = 1533;

  return merged;
}

function migrateStore(rawStore: BudgetStore, fromVersion: number): BudgetStore {
  let migrated: BudgetStore = { ...rawStore };

  if (fromVersion < 2) {
    migrated = {
      ...migrated,
      settings: migrateSettings(migrated.settings as Partial<UserSettings> & { age?: number }),
    };
  }

  if (fromVersion < 3) {
    // v3: net worth history added; regularExpenses (never surfaced in UI) removed
    delete (migrated as unknown as Record<string, unknown>).regularExpenses;
  }

  if (!Array.isArray(migrated.netWorthHistory)) {
    migrated = { ...migrated, netWorthHistory: [] };
  }

  return migrated;
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
        localStorage.setItem(STORAGE_KEY, raw);
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      }
    }

    if (!raw) {
      return INITIAL_STORE;
    }

    const wrapper: StorageWrapper = JSON.parse(raw);
    const version = typeof wrapper.version === 'number' ? wrapper.version : 1;

    const migrated = migrateStore(wrapper.data, version);

    // If we migrated, persist immediately so it sticks
    if (version !== STORAGE_VERSION) {
      const newWrapper: StorageWrapper = {
        version: STORAGE_VERSION,
        data: migrated,
        lastUpdated: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newWrapper));
    }

    return migrated;
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

// Trigger a JSON backup download and record the export time
export function downloadExport(): void {
  const blob = new Blob([exportData()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `compound-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  localStorage.setItem(LAST_EXPORT_KEY, String(Date.now()));
}

export function getLastExportedAt(): number | null {
  if (typeof window === 'undefined') return null;
  const raw = Number(localStorage.getItem(LAST_EXPORT_KEY));
  return raw > 0 ? raw : null;
}

export function snoozeExportReminder(): void {
  localStorage.setItem(EXPORT_SNOOZE_KEY, String(Date.now()));
}

// Whether to nudge the user to back up: data exists, the reminder isn't
// snoozed, and the last export is missing or older than the stale window.
export function shouldRemindExport(hasData: boolean): boolean {
  if (typeof window === 'undefined' || !hasData) return false;
  const now = Date.now();
  const snoozedAt = Number(localStorage.getItem(EXPORT_SNOOZE_KEY)) || 0;
  if (now - snoozedAt < EXPORT_SNOOZE_MS) return false;
  const lastExport = getLastExportedAt() ?? 0;
  return now - lastExport > EXPORT_STALE_MS;
}

// Import data from JSON backup
export function importData(jsonString: string): BudgetStore | null {
  try {
    const parsed = JSON.parse(jsonString);

    if (!parsed.data || typeof parsed.data !== 'object') {
      throw new Error('Invalid data structure');
    }

    const incomingVersion = typeof parsed.version === 'number' ? parsed.version : 1;
    const store = migrateStore(parsed.data as BudgetStore, incomingVersion);

    if (!store.settings || !Array.isArray(store.budgetItems)) {
      throw new Error('Missing required fields');
    }

    store.settings = sanitizeSettings(store.settings);

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

// Clear everything the app owns (store + export-reminder state)
export function clearAllAppData(): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
  localStorage.removeItem(LAST_EXPORT_KEY);
  localStorage.removeItem(EXPORT_SNOOZE_KEY);
}
