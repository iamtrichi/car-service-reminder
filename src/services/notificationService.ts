import { LocalNotifications, PermissionStatus, ScheduleEvery } from '@capacitor/local-notifications';
import { Vehicle } from '../types';
import i18n from '../i18n';

const MILEAGE_REMINDER_BASE_ID = 1000;
const PERMISSION_PROMPT_KEY = 'csr_permission_prompt_shown';

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

    // Schedule one notification per vehicle
    const notifications = vehicles.map((vehicle, index) => ({
      id: MILEAGE_REMINDER_BASE_ID + index,
      title: i18n.t('notification.mileageTitle'),
      body: i18n.t('notification.mileageBody', { vehicleName: `${vehicle.make} ${vehicle.model}` }),
      schedule: {
        every: 'day' as ScheduleEvery,
        on: { hour: 10, minute: 0 },
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