import { BudgetStore, INITIAL_STORE, UserSettings, DEFAULT_SETTINGS } from '@/types/budget';
import { sanitizeStore } from './validation';

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

    // Sanitize on every load so a corrupted or tampered store can't feed
    // NaN/strings into the calculation layer
    const clean = sanitizeStore(migrated);
    if (!clean) {
      console.error('Stored budget data is not a valid store; starting fresh');
      return INITIAL_STORE;
    }

    // If we migrated, persist immediately so it sticks
    if (version !== STORAGE_VERSION) {
      const newWrapper: StorageWrapper = {
        version: STORAGE_VERSION,
        data: clean,
        lastUpdated: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newWrapper));
    }

    return clean;
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

// =========================================================================
// ENCRYPTED BACKUPS (optional passphrase)
//
// AES-256-GCM with a PBKDF2-SHA256 derived key. The backup file is the
// artifact most likely to end up in email/cloud storage, so it gets the
// option of real encryption.
// =========================================================================

const ENCRYPTED_FORMAT = 'compound-encrypted-v1';
const PBKDF2_ITERATIONS = 310_000;

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptBackup(plaintext: string, passphrase: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    new TextEncoder().encode(plaintext)
  );
  return JSON.stringify({
    format: ENCRYPTED_FORMAT,
    kdf: 'PBKDF2-SHA256',
    iterations: PBKDF2_ITERATIONS,
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ciphertext)),
  }, null, 2);
}

// Throws on a wrong passphrase or tampered file (GCM auth failure)
export async function decryptBackup(jsonString: string, passphrase: string): Promise<string> {
  const parsed = JSON.parse(jsonString);
  if (parsed.format !== ENCRYPTED_FORMAT) throw new Error('Not an encrypted backup');
  const iterations = typeof parsed.iterations === 'number' ? parsed.iterations : PBKDF2_ITERATIONS;
  const salt = fromBase64(parsed.salt);
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(parsed.iv) as BufferSource },
    key,
    fromBase64(parsed.ciphertext) as BufferSource
  );
  return new TextDecoder().decode(plaintext);
}

export function isEncryptedBackup(jsonString: string): boolean {
  try {
    return JSON.parse(jsonString)?.format === ENCRYPTED_FORMAT;
  } catch {
    return false;
  }
}

// Trigger a JSON backup download and record the export time.
// With a passphrase the file is AES-GCM encrypted.
export async function downloadExport(passphrase?: string): Promise<void> {
  const content = passphrase ? await encryptBackup(exportData(), passphrase) : exportData();
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `compound-backup-${new Date().toISOString().split('T')[0]}${passphrase ? '.encrypted' : ''}.json`;
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

// Import data from JSON backup. Every field is validated and clamped;
// an unrecognizable file is rejected without touching stored data.
export function importData(jsonString: string): BudgetStore | null {
  try {
    const parsed = JSON.parse(jsonString);

    if (!parsed.data || typeof parsed.data !== 'object') {
      throw new Error('Invalid data structure');
    }

    const incomingVersion = typeof parsed.version === 'number' ? parsed.version : 1;
    const migrated = migrateStore(parsed.data as BudgetStore, incomingVersion);

    const store = sanitizeStore(migrated);
    if (!store) {
      throw new Error('Not a valid backup file');
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
