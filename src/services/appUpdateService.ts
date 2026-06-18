import { Plugins } from '@capacitor/core';

/**
 * Result from the native AppUpdate plugin's checkForUpdate method.
 */
export interface AppUpdateCheckResult {
  /** Whether an update is available on the Play Store */
  updateAvailable: boolean;
  /** The version code of the available update (only if updateAvailable) */
  availableVersionCode?: number;
  /** The priority of the update (only if updateAvailable) */
  updatePriority?: number;
  /** Whether immediate update is allowed (only if updateAvailable) */
  isUpdateTypeAllowed?: boolean;
}

/**
 * Check if a new version of the app is available on the Google Play Store.
 * Uses the Play Core In-App Updates API via a custom Capacitor plugin.
 *
 * @returns The update check result from the native side.
 */
export async function checkForAppUpdate(): Promise<AppUpdateCheckResult | null> {
  try {
    const { AppUpdate } = Plugins;

    if (!AppUpdate || typeof (AppUpdate as any).checkForUpdate !== 'function') {
      console.warn('AppUpdate plugin not available (not on Android or plugin not registered)');
      return null;
    }

    const result = await (AppUpdate as any).checkForUpdate();
    return result as AppUpdateCheckResult;
  } catch (error) {
    console.warn('Failed to check for app update:', error);
    return null;
  }
}

/**
 * Start an immediate in-app update flow.
 * This shows a blocking full-screen UI managed by Google Play Services.
 * The user must update to continue using the app.
 *
 * @returns True if the update flow was started successfully.
 */
export async function startImmediateUpdate(): Promise<boolean> {
  try {
    const { AppUpdate } = Plugins;

    if (!AppUpdate || typeof (AppUpdate as any).startImmediateUpdate !== 'function') {
      console.warn('AppUpdate plugin not available');
      return false;
    }

    await (AppUpdate as any).startImmediateUpdate();
    return true;
  } catch (error) {
    console.warn('Failed to start immediate update:', error);
    return false;
  }
}