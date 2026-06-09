import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonIcon,
  IonNote,
  IonList,
  IonDatetime,
} from '@ionic/react';
import { notificationsOutline, timeOutline } from 'ionicons/icons';
import type { ScheduleEvery } from '@capacitor/local-notifications';
import {
  getNotificationInterval,
  setNotificationInterval,
  getNotificationHour,
  setNotificationHour,
  getNotificationMinute,
  setNotificationMinute,
  scheduleMileageReminders,
  getNotificationPermissionStatus,
} from '../services/notificationService';
import { useVehicleStore } from '../store/vehicleStore';

const INTERVAL_KEYS: ScheduleEvery[] = [
  'day',
  'two-weeks',
  'week',
  'month',
  'year',
  'hour',
];

const pad2 = (n: number) => n.toString().padStart(2, '0');

const NotificationScheduleSettings: React.FC = () => {
  const { t } = useTranslation();
  const vehicles = useVehicleStore(s => s.vehicles);

  // IonDatetime expects an ISO-like string in the device's local timezone.
  // For a time-only picker we use a date of 1970-01-01 (no real-world
  // significance) and only the HH:MM portion is used.
  const [interval, setIntervalState] = useState<ScheduleEvery>(() => getNotificationInterval());
  const [time, setTime] = useState<string>(
    () => `1970-01-01T${pad2(getNotificationHour())}:${pad2(getNotificationMinute())}:00`
  );
  const [permitted, setPermitted] = useState<boolean | null>(null);

  // Re-read the permission status so the helper text can reflect reality
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const status = await getNotificationPermissionStatus();
        if (!cancelled) setPermitted(status.display === 'granted');
      } catch {
        if (!cancelled) setPermitted(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vehicles.length]);

  // Re-schedule on any change. Only does anything if permission is granted
  // (scheduleMileageReminders short-circuits otherwise, but we still save
  // the preference so it'll be used next time the user enables notifications).
  const applyChange = async (
    next: { interval?: ScheduleEvery; time?: string }
  ) => {
    if (next.interval !== undefined) {
      setNotificationInterval(next.interval);
      setIntervalState(next.interval);
    }
    if (next.time !== undefined) {
      setTime(next.time);
      // IonDatetime returns either an ISO string ("1970-01-01T10:00:00")
      // or just a time string ("10:00") depending on the `presentation`.
      // We support both for safety.
      const match = next.time.match(/T?(\d{2}):(\d{2})/);
      if (match) {
        const hh = Math.max(0, Math.min(23, parseInt(match[1], 10)));
        const mm = Math.max(0, Math.min(59, parseInt(match[2], 10)));
        setNotificationHour(hh);
        setNotificationMinute(mm);
      }
    }

    if (vehicles.length === 0) return;
    try {
      await scheduleMileageReminders(vehicles);
    } catch (error) {
      // Silently ignore - helper text below will hint that notifications
      // need to be enabled.
      console.error('Failed to re-apply notification schedule:', error);
    }
  };

  return (
    <IonList>
      <IonItem lines="full">
        <IonIcon icon={notificationsOutline} slot="start" color="medium" />
        <IonLabel>{t('reminderSettings.intervalLabel')}</IonLabel>
        <IonSelect
          value={interval}
          placeholder={t('reminderSettings.intervalLabel')}
          onIonChange={(e) => applyChange({ interval: e.detail.value as ScheduleEvery })}
          interface="popover"
        >
          {INTERVAL_KEYS.map((key) => (
            <IonSelectOption key={key} value={key}>
              {t(`reminderSettings.every_${key}`)}
            </IonSelectOption>
          ))}
        </IonSelect>
      </IonItem>

      <IonItem lines="none">
        <IonIcon icon={timeOutline} slot="start" color="medium" />
        <IonLabel>{t('reminderSettings.timeLabel')}</IonLabel>
        <IonDatetime
          presentation="time"
          value={time}
          onIonChange={(e) => {
            const v = (e.detail.value ?? '') as string;
            if (v) applyChange({ time: v });
          }}
        />
      </IonItem>

      {permitted === false && (
        <IonNote style={{ display: 'block', padding: '8px 16px 12px', fontSize: '0.8rem' }}>
          {t('reminderSettings.permissionHint')}
        </IonNote>
      )}
    </IonList>
  );
};

export default NotificationScheduleSettings;
