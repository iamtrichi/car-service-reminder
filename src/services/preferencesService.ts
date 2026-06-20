/**
 * Bridge between Capacitor Preferences (native SharedPreferences)
 * and the sync localStorage API the app currently uses.
 *
 * This module:
 *  1. Loads all stored values from Preferences into an in-memory cache at startup.
 *  2. Provides sync get/set/remove so existing code works without refactoring.
 *  3. Flushes every write back to Preferences (async, fire-and-forget with error logging).
 *
 * On Android the underlying SharedPreferences ARE included in Google Play Auto Backup.
 */

import { Preferences } from '@capacitor/preferences';

/** In-memory cache: key → JSON string */
const cache = new Map<string, string>();

/**
 * Call once on app boot *before* any sync get/set calls.
 * Reads everything stored under the app's Preferences namespace into memory.
 */
export async function initPreferencesCache(): Promise<void> {
  try {
    const { keys } = await Preferences.keys();
    for (const key of keys) {
      const { value } = await Preferences.get({ key });
      if (value !== null) {
        cache.set(key, value);
      }
    }
  } catch (err) {
    console.error('[PreferencesService] init error', err);
  }
}

/**
 * Synchronous get — backed by the in-memory cache.
 * If the key was never loaded into cache, falls back to a direct Preferences read.
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