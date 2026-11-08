import { LocalNotifications, PermissionStatus, ScheduleEvery } from '@capacitor/local-notifications';
import { Vehicle, ServiceInterval, FuelRecord, VehicleDocument } from '../types';
import i18n from '../i18n';
import { getString, setItem } from './preferencesService';
import { formatCurrency } from './currencyService';
import { getDocumentStatus } from './documentService';
import { calculateReminderStatus } from './reminderService';

const MILEAGE_REMINDER_BASE_ID = 1000;
const WEEKLY_SPENDING_BASE_ID = 2000;
const DOCUMENT_RENEWAL_BASE_ID = 3000;
const SERVICE_SOON_BASE_ID = 4000;

const PERMISSION_PROMPT_KEY = 'csr_permission_prompt_shown';
const NOTIFICATION_PREFERENCE_KEY = 'csr_notifications_enabled';
const NOTIFICATION_INTERVAL_KEY = 'csr_notification_interval';
const NOTIFICATION_HOUR_KEY = 'csr_notification_hour';
const NOTIFICATION_MINUTE_KEY = 'csr_notification_minute';

// Per-category toggles (default on). Unset => enabled.
const WEEKLY_SPENDING_PREF_KEY = 'csr_notif_weekly_spending';
const DOCUMENT_RENEWAL_PREF_KEY = 'csr_notif_document_renewal';
const SERVICE_SOON_PREF_KEY = 'csr_notif_service_soon';

const VALID_INTERVALS: ScheduleEvery[] = ['day', 'year', 'month', 'two-weeks', 'week', 'hour'];
const DEFAULT_INTERVAL: ScheduleEvery = 'day';
const DEFAULT_HOUR = 10;
const DEFAULT_MINUTE = 0;
const MINUTE_OPTIONS = [0, 15, 30, 45] as const;

/** Notification body/icon colour shared across all categories. */
const NOTIFICATION_ICON_COLOR = '#1b4f89';
const NOTIFICATION_SMALL_ICON = 'ic_stat_icon';

/** Common schedule options: daily at 10:00 AM, repeating, allowed while idle. */
function dailyAtTenAM(firstFire: Date) {
  return {
    at: firstFire,
    every: 'day' as ScheduleEvery,
    repeats: true,
    allowWhileIdle: true,
  };
}

/** Common schedule options: weekly at 10:00 AM, repeating, allowed while idle. */
function weeklyAtTenAM(firstFire: Date) {
  return {
    at: firstFire,
    every: 'week' as ScheduleEvery,
    repeats: true,
    allowWhileIdle: true,
  };
}

/**
 * Permission gate shared by every schedule function.
 * Returns false when native permission is not granted so callers can skip.
 */
async function requirePermission(): Promise<boolean> {
  const permStatus = await getNotificationPermissionStatus();
  return permStatus.display === 'granted';
}

/** Common cancel helper for an ID range [base, base + 1000). */
async function cancelRange(baseId: number): Promise<void> {
  try {
    const pending = await LocalNotifications.getPending();
    const matches = pending.notifications.filter(
      n => n.id >= baseId && n.id < baseId + 1000
    );
    if (matches.length > 0) {
      await LocalNotifications.cancel({
        notifications: matches.map(n => ({ id: n.id })),
      });
    }
  } catch (error) {
    console.error(`Failed to cancel notifications in range ${baseId}:`, error);
  }
}

/**
 * Compute the next occurrence of Sunday 10:00 AM in local time.
 * If today is Sunday and 10 AM has already passed, schedules for the following Sunday.
 */
function nextSundayTenAM(): Date {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0, 0);
  const daysUntilSunday = (7 - day) % 7;
  if (daysUntilSunday === 0) {
    // Today is Sunday. If 10 AM already passed, roll to next week.
    if (d.getTime() <= now.getTime()) {
      d.setDate(d.getDate() + 7);
    }
  } else {
    d.setDate(d.getDate() + daysUntilSunday);
  }
  return d;
}

/**
 * Compute the next occurrence of daily 10:00 AM in local time.
 * If 10 AM already passed today, schedules for tomorrow.
 */
function nextDailyTenAM(): Date {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0, 0);
  if (d.getTime() <= now.getTime()) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

/** Start of "this week" = most recent Sunday 00:00 local time. */
function weekStart(): Date {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  start.setDate(start.getDate() - day);
  return start;
}

/** Check whether a YYYY-MM-DD date falls within the current week (Sun 00:00 -> now). */
function isThisWeek(dateStr: string): boolean {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  const start = weekStart();
  return d.getTime() >= start.getTime() && d.getTime() <= Date.now();
}

/** Sum document costs whose issueDate (current issuance or a renewal) falls this week. */
function documentSpendingThisWeek(documents: VehicleDocument[]): number {
  let total = 0;
  for (const doc of documents) {
    const docCost = doc.cost ?? 0;
    if (docCost > 0 && doc.issueDate && isThisWeek(doc.issueDate)) {
      total += docCost;
    }
    for (const r of doc.renewals || []) {
      const rCost = r.cost ?? 0;
      if (rCost > 0 && r.issueDate && isThisWeek(r.issueDate)) {
        total += rCost;
      }
    }
  }
  return total;
}

/**
 * Total amount spent this week (Sunday 00:00 to now) across fuel, services,
 * and documents (current issuances + archived renewals).
 */
export function getWeeklySpendingTotal(
  serviceRecords: { cost?: number; performedAtDate?: string }[],
  fuelRecords: FuelRecord[],
  vehicleDocuments: VehicleDocument[]
): number {
  const serviceSpent = serviceRecords
    .filter(r => r.performedAtDate && isThisWeek(r.performedAtDate!))
    .reduce((s, r) => s + (r.cost || 0), 0);
  const fuelSpent = fuelRecords
    .filter(f => f.date && isThisWeek(f.date))
    .reduce((s, f) => s + (f.cost || 0), 0);
  const documentSpent = documentSpendingThisWeek(vehicleDocuments);
  return serviceSpent + fuelSpent + documentSpent;
}

/**
 * Check if the permission prompt has been shown before.
 */
export function hasPermissionPromptBeenShown(): boolean {
  return getString(PERMISSION_PROMPT_KEY) === 'true';
}

/**
 * Mark that the permission prompt has been shown.
 */
export function markPermissionPromptAsShown(): void {
  setItem(PERMISSION_PROMPT_KEY, 'true');
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
    const granted = await requirePermission();
    if (!granted) return;

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
      extra: {
        vehicleId: vehicle.id,
      },
      actionTypeId: 'open-vehicle',
      smallIcon: NOTIFICATION_SMALL_ICON,
      iconColor: NOTIFICATION_ICON_COLOR,
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
  await cancelRange(MILEAGE_REMINDER_BASE_ID);
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

/** ========================================================================
 *  Weekly spending notification (Sunday 10:00 AM)
 *  ======================================================================== */

/** Get the user's weekly-spending notification preference. Defaults to true. */
export function getWeeklySpendingPreference(): boolean {
  return getString(WEEKLY_SPENDING_PREF_KEY) !== 'false';
}

/** Save the user's weekly-spending notification preference. */
export function setWeeklySpendingPreference(enabled: boolean): void {
  setItem(WEEKLY_SPENDING_PREF_KEY, enabled ? 'true' : 'false');
}

/**
 * Schedule a single weekly notification (Sunday 10:00 AM) summarising how much
 * the user spent this week (fuel + services + documents).
 */
export async function scheduleWeeklySpendingNotification({
  vehicles,
  serviceRecords,
  fuelRecords,
  vehicleDocuments,
}: {
  vehicles: Vehicle[];
  serviceRecords: { cost?: number; performedAtDate?: string }[];
  fuelRecords: FuelRecord[];
  vehicleDocuments: VehicleDocument[];
}): Promise<void> {
  if (vehicles.length === 0) return;

  try {
    const granted = await requirePermission();
    if (!granted) return;

    await cancelWeeklySpendingNotifications();

    const total = getWeeklySpendingTotal(serviceRecords, fuelRecords, vehicleDocuments);
    const firstFire = nextSundayTenAM();

    await LocalNotifications.schedule({
      notifications: [
        {
          id: WEEKLY_SPENDING_BASE_ID,
          title: i18n.t('notification.weeklySpendingTitle'),
          body: i18n.t('notification.weeklySpendingBody', {
            amount: formatCurrency(total),
          }),
          schedule: weeklyAtTenAM(firstFire),
          extra: { type: 'weekly_spending' },
          actionTypeId: 'open-statistics',
          smallIcon: NOTIFICATION_SMALL_ICON,
          iconColor: NOTIFICATION_ICON_COLOR,
        },
      ],
    });
  } catch (error) {
    console.error('Failed to schedule weekly spending notification:', error);
  }
}

/** Cancel all scheduled weekly spending notifications. */
export async function cancelWeeklySpendingNotifications(): Promise<void> {
  await cancelRange(WEEKLY_SPENDING_BASE_ID);
}

/** ========================================================================
 *  Document renewal notifications (daily 10:00 AM)
 *  ======================================================================== */

/** Get the user's document-renewal notification preference. Defaults to true. */
export function getDocumentRenewalPreference(): boolean {
  return getString(DOCUMENT_RENEWAL_PREF_KEY) !== 'false';
}

/** Save the user's document-renewal notification preference. */
export function setDocumentRenewalPreference(enabled: boolean): void {
  setItem(DOCUMENT_RENEWAL_PREF_KEY, enabled ? 'true' : 'false');
}

/**
 * Schedule a single daily notification (10:00 AM) listing documents that are
 * expired or expiring within 30 days.
 */
export async function scheduleDocumentRenewalNotifications({
  vehicleDocuments,
}: {
  vehicleDocuments: VehicleDocument[];
}): Promise<void> {
  try {
    const granted = await requirePermission();
    if (!granted) return;

    await cancelDocumentRenewalNotifications();

    const today = new Date();
    const expiring: VehicleDocument[] = [];
    for (const doc of vehicleDocuments) {
      const status = getDocumentStatus(doc.expiryDate ?? null, today);
      if (status.status === 'expired' || status.status === 'expiring_soon') {
        expiring.push(doc);
      }
    }

    if (expiring.length === 0) return;

    const firstFire = nextDailyTenAM();
    const names = expiring
      .map(d => d.name || d.documentType)
      .slice(0, 5)
      .join(', ');
    const more = expiring.length > 5 ? ` +${expiring.length - 5}` : '';

    await LocalNotifications.schedule({
      notifications: [
        {
          id: DOCUMENT_RENEWAL_BASE_ID,
          title: i18n.t('notification.documentRenewalTitle', {
            count: expiring.length,
          }),
          body: i18n.t('notification.documentRenewalBody', {
            count: expiring.length,
            names,
            more,
          }),
          schedule: dailyAtTenAM(firstFire),
          extra: { type: 'document_renewal' },
          actionTypeId: 'open-reminders',
          smallIcon: NOTIFICATION_SMALL_ICON,
          iconColor: NOTIFICATION_ICON_COLOR,
        },
      ],
    });
  } catch (error) {
    console.error('Failed to schedule document renewal notifications:', error);
  }
}

/** Cancel all scheduled document renewal notifications. */
export async function cancelDocumentRenewalNotifications(): Promise<void> {
  await cancelRange(DOCUMENT_RENEWAL_BASE_ID);
}

/** ========================================================================
 *  Service coming soon notifications (daily 10:00 AM)
 *  ======================================================================== */

/** Get the user's service-soon notification preference. Defaults to true. */
export function getServiceSoonPreference(): boolean {
  return getString(SERVICE_SOON_PREF_KEY) !== 'false';
}

/** Save the user's service-soon notification preference. */
export function setServiceSoonPreference(enabled: boolean): void {
  setItem(SERVICE_SOON_PREF_KEY, enabled ? 'true' : 'false');
}

/**
 * Schedule a single daily notification (10:00 AM) listing services that are
 * due within the next 30 days or within 1,000 km.
 */
export async function scheduleServiceComingSoonNotifications({
  intervals,
  vehicles,
}: {
  intervals: ServiceInterval[];
  vehicles: Vehicle[];
}): Promise<void> {
  try {
    const granted = await requirePermission();
    if (!granted) return;

    await cancelServiceComingSoonNotifications();

    const soon: { vehicle: Vehicle; interval: ServiceInterval }[] = [];
    for (const interval of intervals) {
      const vehicle = vehicles.find(v => v.id === interval.vehicleId);
      if (!vehicle) continue;
      const status = calculateReminderStatus(interval, vehicle, 1000, 30);
      if (status.status === 'due_soon') {
        soon.push({ vehicle, interval });
      }
    }

    if (soon.length === 0) return;

    const firstFire = nextDailyTenAM();
    const names = soon
      .map(s => s.interval.name)
      .slice(0, 5)
      .join(', ');
    const more = soon.length > 5 ? ` +${soon.length - 5}` : '';

    await LocalNotifications.schedule({
      notifications: [
        {
          id: SERVICE_SOON_BASE_ID,
          title: i18n.t('notification.serviceSoonTitle', {
            count: soon.length,
          }),
          body: i18n.t('notification.serviceSoonBody', {
            count: soon.length,
            names,
            more,
          }),
          schedule: dailyAtTenAM(firstFire),
          extra: { type: 'service_soon' },
          actionTypeId: 'open-reminders',
          smallIcon: NOTIFICATION_SMALL_ICON,
          iconColor: NOTIFICATION_ICON_COLOR,
        },
      ],
    });
  } catch (error) {
    console.error('Failed to schedule service coming soon notifications:', error);
  }
}

/** Cancel all scheduled service coming soon notifications. */
export async function cancelServiceComingSoonNotifications(): Promise<void> {
  await cancelRange(SERVICE_SOON_BASE_ID);
}

/** ========================================================================
 *  Preference getters / setters (mileage)
 *  ======================================================================== */

/**
 * Get the user's notification preference.
 * Defaults to true if not set.
 */
export function getNotificationPreference(): boolean {
  return getString(NOTIFICATION_PREFERENCE_KEY) !== 'false';
}

/** Save the user's notification preference. */
export function setNotificationPreference(enabled: boolean): void {
  setItem(NOTIFICATION_PREFERENCE_KEY, enabled ? 'true' : 'false');
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
  const raw = getString(NOTIFICATION_INTERVAL_KEY);
  if (raw && (VALID_INTERVALS as string[]).includes(raw)) {
    return raw as ScheduleEvery;
  }
  return DEFAULT_INTERVAL;
}

/**
 * Save the user's configured repeat interval.
 */
export function setNotificationInterval(interval: ScheduleEvery): void {
  setItem(NOTIFICATION_INTERVAL_KEY, interval);
}

/**
 * Get the user's configured hour-of-day (0-23) for mileage reminders.
 * Defaults to 10 if not set or invalid.
 */
export function getNotificationHour(): number {
  const raw = getString(NOTIFICATION_HOUR_KEY);
  if (raw !== null) {
    const n = parseInt(raw, 10);
    if (!isNaN(n) && n >= 0 && n <= 23) {
      return n;
    }
  }
  return DEFAULT_HOUR;
}

/**
 * Save the user's configured hour-of-day (0-23). Out-of-range values are clamped.
 */
export function setNotificationHour(hour: number): void {
  const clamped = Math.max(0, Math.min(23, Math.floor(hour)));
  setItem(NOTIFICATION_HOUR_KEY, String(clamped));
}

/**
 * Get the user's configured minute (0-59) for mileage reminders.
 * Defaults to 0 if not set or invalid.
 */
export function getNotificationMinute(): number {
  const raw = getString(NOTIFICATION_MINUTE_KEY);
  if (raw !== null) {
    const n = parseInt(raw, 10);
    if (!isNaN(n) && n >= 0 && n <= 59) {
      return n;
    }
  }
  return DEFAULT_MINUTE;
}

/**
 * Save the user's configured minute (0-59). Out-of-range values are clamped.
 */
export function setNotificationMinute(minute: number): void {
  const clamped = Math.max(0, Math.min(59, Math.floor(minute)));
  setItem(NOTIFICATION_MINUTE_KEY, String(clamped));
}
