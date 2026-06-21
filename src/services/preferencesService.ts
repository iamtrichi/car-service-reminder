/**
 * Bridge between Capacitor Preferences (native SharedPreferences)
 * and the sync localStorage API the app currently uses.
 *
 * This module:
 *  1. Loads all stored values from Preferences into an in-memory cache at startup.
 *  2. Provides sync get/set/remove so existing code works without refactoring.
 *  3. Flushes every write back to Preferences (async, fire-and-forget with error logging).
 *  4. On first run after upgrade, **migrates existing localStorage data** into Preferences
 *     so long-time users don't lose their vehicles, intervals, records, or settings.
 *
 * On Android the underlying SharedPreferences ARE included in Google Play Auto Backup.
 */

import { Preferences } from '@capacitor/preferences';

/** In-memory cache: key → JSON string */
const cache = new Map<string, string>();

/** Key used to mark that localStorage → Preferences migration is done */
const MIGRATION_DONE_KEY = 'csr_migration_v1_done';

/** All known keys that may be in localStorage */
const KNOWN_KEYS = [
  'csr_vehicles',
  'csr_service_intervals',
  'csr_service_records',
  'csr_notifications_enabled',
  'csr_notification_interval',
  'csr_notification_hour',
  'csr_notification_minute',
  'csr_permission_prompt_shown',
  'csr_ad_consent',
];

/**
 * Call once on app boot *before* any sync get/set calls.
 * Reads everything stored under the app's Preferences namespace into memory.
 * If the migration flag is not set, attempts a one-time migration from localStorage.
 */
export async function initPreferencesCache(): Promise<void> {
  try {
    // Check if migration has already been done
    const { value: migrationDone } = await Preferences.get({ key: MIGRATION_DONE_KEY });

    if (!migrationDone) {
      // Migration not done yet — try to copy old localStorage data into Preferences
      await migrateFromLocalStorage();
    }

    // Load ALL Preferences keys into the in-memory cache (including migrated data)
    const { keys } = await Preferences.keys();
    for (const key of keys) {
      const { value } = await Preferences.get({ key });
      if (value !== null) {
        cache.set(key, value);
      }
    }
  } catch (err) {
    console.error('[PreferencesService] init error', err);
    // If Preferences fails (e.g. running in browser), fall back to localStorage
    fallbackToLocalStorage();
  }
}

/**
 * One-time migration: reads every known key from localStorage,
 * writes it to Preferences, then marks the migration as done.
 */
async function migrateFromLocalStorage(): Promise<void> {
  try {
    if (typeof localStorage === 'undefined') return;

    let migratedCount = 0;

    for (const key of KNOWN_KEYS) {
      try {
        const value = localStorage.getItem(key);
        if (value !== null) {
          await Preferences.set({ key, value });
          migratedCount++;
        }
      } catch {
        // Skip this key if localStorage access fails
      }
    }

    if (migratedCount > 0) {
      console.log(`[PreferencesService] Migrated ${migratedCount} keys from localStorage`);
    }

    // Mark migration as done so we don't attempt again on next launch
    await Preferences.set({ key: MIGRATION_DONE_KEY, value: 'true' });
  } catch (err) {
    console.error('[PreferencesService] localStorage migration error', err);
  }
}

/**
 * Fallback: if Preferences API is unavailable, try to load from localStorage directly.
 * This ensures the app still works in browsers during development.
 */
function fallbackToLocalStorage(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    for (const key of KNOWN_KEYS) {
      try {
        const value = localStorage.getItem(key);
        if (value !== null) {
          cache.set(key, value);
        }
      } catch {
        // skip
      }
    }
    console.log('[PreferencesService] Fallback: loaded from localStorage');
  } catch {
    // give up
  }
}

/**
 * Synchronous get — backed by the in-memory cache.
 */
export function getItem<T>(key: string): T | null {
  if (cache.has(key)) {
    const raw = cache.get(key);
    if (raw === undefined) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return raw as unknown as T;
    }
  }
  return null;
}

/**
 * Synchronous get returning a string, or null if not found.
 */
export function getString(key: string): string | null {
  return cache.get(key) ?? null;
}

/**
 * Synchronous set — updates cache + writes to Preferences async.
 */
export function setItem(key: string, value: unknown): void {
  const json = typeof value === 'string' ? value : JSON.stringify(value);
  cache.set(key, json);
  // Fire-and-forget write to native storage
  Preferences.set({ key, value: json }).catch(err =>
    console.error(`[PreferencesService] set(${key}) failed`, err)
  );
}

/**
 * Synchronous remove — updates cache + removes from Preferences async.
 */
export function removeItem(key: string): void {
  cache.delete(key);
  Preferences.remove({ key }).catch(err =>
    console.error(`[PreferencesService] remove(${key}) failed`, err)
  );
}

/**
 * Check whether a key exists.
 */
export function hasKey(key: string): boolean {
  return cache.has(key);
}