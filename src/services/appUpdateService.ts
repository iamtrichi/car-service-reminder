import { App } from '@capacitor/app';

export interface RemoteVersionInfo {
  minimumVersion: string;
  latestVersion: string;
  forceUpdate: boolean;
}

export type VersionCheckResult =
  | { type: 'force-update'; minimumVersion: string }
  | { type: 'optional-update'; latestVersion: string }
  | { type: 'up-to-date' }
  | { type: 'error'; message: string };

const VERSION_JSON_URL = 'https://iamtrichi.github.io/PP/car-service-reminder/version.json';
const FETCH_TIMEOUT_MS = 4_000;
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.carservice.reminder';

/**
 * Compare two version strings in "x.yy" or "x.y" format.
 * Works because versions have the same length/padding pattern.
 * Returns -1 if a < b, 0 if a === b, 1 if a > b.
 */
function compareVersions(a: string, b: string): number {
  const aParts = a.split('.').map(Number);
  const bParts = b.split('.').map(Number);
  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aVal = aParts[i] ?? 0;
    const bVal = bParts[i] ?? 0;
    if (aVal < bVal) return -1;
    if (aVal > bVal) return 1;
  }
  return 0;
}

/**
 * Fetch the remote version.json with a timeout.
 */
async function fetchWithTimeout(url: string, timeoutMs: number): Promise<RemoteVersionInfo> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json() as RemoteVersionInfo;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Open the Play Store page for the app.
 */
export function openPlayStore(): void {
  window.open(PLAY_STORE_URL, '_system');
}

/**
 * Check the current app version against the remote version.json.
 * Blocks content with a 4s timeout — if the fetch fails, returns 'error'
 * so the app can fall through to normal usage.
 */
export async function checkRemoteVersion(): Promise<VersionCheckResult> {
  try {
    const appInfo = await App.getInfo();
    const currentVersion = appInfo.version;

    console.log(`[VersionCheck] Current app version: ${currentVersion}`);

    const remote = await fetchWithTimeout(VERSION_JSON_URL, FETCH_TIMEOUT_MS);
    console.log(`[VersionCheck] Remote: minimumVersion=${remote.minimumVersion}, latestVersion=${remote.latestVersion}`);

    if (compareVersions(currentVersion, remote.minimumVersion) < 0) {
      console.log(`[VersionCheck] Force update required (${currentVersion} < ${remote.minimumVersion})`);
      return { type: 'force-update', minimumVersion: remote.minimumVersion };
    }

    if (compareVersions(currentVersion, remote.latestVersion) < 0) {
      console.log(`[VersionCheck] Optional update available (${currentVersion} < ${remote.latestVersion})`);
      return { type: 'optional-update', latestVersion: remote.latestVersion };
    }

    console.log('[VersionCheck] App is up to date');
    return { type: 'up-to-date' };
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      console.warn('[VersionCheck] Request timed out — letting user in');
      return { type: 'error', message: 'Request timed out' };
    }
    console.warn('[VersionCheck] Failed to check version:', error);
    return { type: 'error', message: error?.message ?? 'Unknown error' };
  }
}