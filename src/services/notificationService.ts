import { LocalNotifications, PermissionStatus, ScheduleEvery } from '@capacitor/local-notifications';
import { Vehicle } from '../types';
import i18n from '../i18n';

const MILEAGE_REMINDER_BASE_ID = 1000;
const PERMISSION_PROMPT_KEY = 'csr_permission_prompt_shown';
const NOTIFICATION_PREFERENCE_KEY = 'csr_notifications_enabled';
const NOTIFICATION_INTERVAL_KEY = 'csr_notification_interval';
const NOTIFICATION_HOUR_KEY = 'csr_notification_hour';
const NOTIFICATION_MINUTE_KEY = 'csr_notification_minute';

const VALID_INTERVALS: ScheduleEvery[] = ['day', 'year', 'month', 'two-weeks', 'week', 'hour'];
const DEFAULT_INTERVAL: ScheduleEvery = 'day';
const DEFAULT_HOUR = 10;
const DEFAULT_MINUTE = 0;
const MINUTE_OPTIONS = [0, 15, 30, 45] as const;

/**
 * Check if the permission prompt has been shown before.
 */
export function hasPermissionPromptBeenShown(): boolean {
  try {
    return localStorage.getItem(PERMISSION_PROMPT_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Mark that the permission prompt has been shown.
 */
export function markPermissionPromptAsShown(): void {
  try {
    localStorage.setItem(PERMISSION_PROMPT_KEY, 'true');
  } catch {
    // localStorage may not be available
  }
}

/**
 * Request notification permission from the user (shows native Android dialog on API 33+).
 */
export async function requestNotificationPermission(): Promise<PermissionStatus> {
  return LocalNotifications.requestPermissions();
}

/**
 * Get the current notification permission status.
 */
export async function getNotificationPermissionStatus(): Promise<PermissionStatus> {
  try {
    return await LocalNotifications.checkPermissions();
  } catch {
    return { display: 'denied' };
  }
}

/**
 * Schedule a weekly recurring notification at 10:00 AM for each vehicle
 * reminding the user to update the mileage.
 */
export async function scheduleMileageReminders(vehicles: Vehicle[]): Promise<void> {
  if (vehicles.length === 0) return;

  try {
    const permStatus = await getNotificationPermissionStatus();
    if (permStatus.display !== 'granted') return;

    // Cancel all existing reminders first to avoid duplicates
    await cancelMileageReminders();

    // Read the user-configured schedule (interval, hour, minute).
    const interval = getNotificationInterval();
    const hour = getNotificationHour();
    const minute = getNotificationMinute();

    // Compute the first fire time. For `every: 'hour'` we anchor on the next
    // hour boundary (rounded up to the next :00 minute mark). For other
    // intervals we anchor on the next occurrence of `<hour>:<minute>:00` in
    // the device's local timezone; the plugin repeats at the same time-of-day
    // for day/week/two-weeks/month/year.
    const now = new Date();
    let firstFire: Date;
    if (interval === 'hour') {
      firstFire = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0, 0, 0);
    } else {
      firstFire = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0);
      if (firstFire.getTime() <= now.getTime()) {
        firstFire.setDate(firstFire.getDate() + 1);
      }
    }

    // Schedule one notification per vehicle
    const notifications = vehicles.map((vehicle, index) => ({
      id: MILEAGE_REMINDER_BASE_ID + index,
      title: i18n.t('notification.mileageTitle'),
      body: i18n.t('notification.mileageBody', { vehicleName: `${vehicle.make} ${vehicle.model}` }),
      schedule: {
        at: firstFire,
        every: interval,
        repeats: true,
        allowWhileIdle: true,
      },
      // For testing - fires 5 seconds from now:
      /*schedule: {
        at: new Date(Date.now() + 5000),
      },*/
      extra: {
        vehicleId: vehicle.id,
      },
      actionTypeId: 'open-vehicle',
      // Use the small icon configured in capacitor.config.ts
      smallIcon: 'ic_stat_icon',
      iconColor: '#1b4f89',
    }));

    await LocalNotifications.schedule({ notifications });
  } catch (error) {
    console.error('Failed to schedule mileage reminders:', error);
  }
}

/**
 * Cancel all scheduled mileage reminder notifications.
 */
export async function cancelMileageReminders(): Promise<void> {
  try {
    const pending = await LocalNotifications.getPending();
    const mileageReminders = pending.notifications.filter(
      n => n.id >= MILEAGE_REMINDER_BASE_ID && n.id < MILEAGE_REMINDER_BASE_ID + 1000
    );
    if (mileageReminders.length > 0) {
      await LocalNotifications.cancel({
        notifications: mileageReminders.map(n => ({ id: n.id })),
      });
    }
  } catch (error) {
    console.error('Failed to cancel mileage reminders:', error);
  }
}

/**
 * Check if any mileage reminder notifications are currently scheduled.
 */
export async function hasMileageRemindersScheduled(): Promise<boolean> {
  try {
    const pending = await LocalNotifications.getPending();
    return pending.notifications.some(
      n => n.id >= MILEAGE_REMINDER_BASE_ID && n.id < MILEAGE_REMINDER_BASE_ID + 1000
    );
  } catch {
    return false;
  }
}

/**
 * Given a vehicleId, find the corresponding notification ID from pending notifications.
 */
export async function getNotificationIdByVehicleId(vehicleId: string): Promise<number | null> {
  try {
    const pending = await LocalNotifications.getPending();
    for (const n of pending.notifications) {
      if (n.extra?.vehicleId === vehicleId) {
        return n.id;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Get the user's notification preference from localStorage.
 * Defaults to true if not set.
 */
export function getNotificationPreference(): boolean {
  try {
    return localStorage.getItem(NOTIFICATION_PREFERENCE_KEY) !== 'false';
  } catch {
    return true; // Default to enabled
  }
}

/**
 * Save the user's notification preference to localStorage.
 */
export function setNotificationPreference(enabled: boolean): void {
  try {
    localStorage.setItem(NOTIFICATION_PREFERENCE_KEY, enabled ? 'true' : 'false');
  } catch {
    // localStorage may not be available
  }
}

/**
 * Allowed minute options exposed in the UI (stepped 0/15/30/45).
 */
export const NOTIFICATION_MINUTE_OPTIONS = MINUTE_OPTIONS;

/**
 * Get the user's configured repeat interval for mileage reminders.
 * Defaults to 'day' if not set or invalid.
 */
export function getNotificationInterval(): ScheduleEvery {
  try {
    const raw = localStorage.getItem(NOTIFICATION_INTERVAL_KEY);
    if (raw && (VALID_INTERVALS as string[]).includes(raw)) {
      return raw as ScheduleEvery;
    }
  } catch {
    // localStorage may not be available
  }
  return DEFAULT_INTERVAL;
}

/**
 * Save the user's configured repeat interval.
 */
export function setNotificationInterval(interval: ScheduleEvery): void {
  try {
    localStorage.setItem(NOTIFICATION_INTERVAL_KEY, interval);
  } catch {
    // localStorage may not be available
  }
}

/**
 * Get the user's configured hour-of-day (0-23) for mileage reminders.
 * Defaults to 10 if not set or invalid.
 */
export function getNotificationHour(): number {
  try {
    const raw = localStorage.getItem(NOTIFICATION_HOUR_KEY);
    if (raw !== null) {
      const n = parseInt(raw, 10);
      if (!isNaN(n) && n >= 0 && n <= 23) {
        return n;
      }
    }
  } catch {
    // localStorage may not be available
  }
  return DEFAULT_HOUR;
}

/**
 * Save the user's configured hour-of-day (0-23). Out-of-range values are clamped.
 */
export function setNotificationHour(hour: number): void {
  const clamped = Math.max(0, Math.min(23, Math.floor(hour)));
  try {
    localStorage.setItem(NOTIFICATION_HOUR_KEY, String(clamped));
  } catch {
    // localStorage may not be available
  }
}

/**
 * Get the user's configured minute (0-59) for mileage reminders.
 * Defaults to 0 if not set or invalid.
 */
export function getNotificationMinute(): number {
  try {
    const raw = localStorage.getItem(NOTIFICATION_MINUTE_KEY);
    if (raw !== null) {
      const n = parseInt(raw, 10);
      if (!isNaN(n) && n >= 0 && n <= 59) {
        return n;
      }
    }
  } catch {
    // localStorage may not be available
  }
  return DEFAULT_MINUTE;
}

/**
 * Save the user's configured minute (0-59). Out-of-range values are clamped.
 */
export function setNotificationMinute(minute: number): void {
  const clamped = Math.max(0, Math.min(59, Math.floor(minute)));
  try {
    localStorage.setItem(NOTIFICATION_MINUTE_KEY, String(clamped));
  } catch {
    // localStorage may not be available
  }
}
