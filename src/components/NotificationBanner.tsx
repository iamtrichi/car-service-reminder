import React, { useEffect, useState, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { IonToggle, IonIcon } from '@ionic/react';
import { notifications } from 'ionicons/icons';
import {
  getNotificationPermissionStatus,
  requestNotificationPermission,
  scheduleMileageReminders,
  cancelMileageReminders,
  getNotificationPreference,
  setNotificationPreference,
} from '../services/notificationService';
import { useVehicleStore } from '../store/vehicleStore';
import { NotificationContext } from '../App';

interface NotificationBannerProps {
  alwaysShow?: boolean;
}

const NotificationBanner: React.FC<NotificationBannerProps> = ({ alwaysShow = false }) => {
  const { t } = useTranslation();
  const vehicles = useVehicleStore(s => s.vehicles);
  const { isEnabled, setIsEnabled } = useContext(NotificationContext);
  const [isLoading, setIsLoading] = useState(false);

  const showBanner = React.useMemo(() => {
    if (alwaysShow) {
      return vehicles.length > 0;
    }
    return !isEnabled && vehicles.length > 0;
  }, [vehicles.length, alwaysShow, isEnabled]);

  useEffect(() => {
    const checkPermission = async () => {
      try {
        const status = await getNotificationPermissionStatus();
        const permGranted = status.display === 'granted';
        const userPreference = getNotificationPreference();
        // Only consider granted if both permission is granted AND user hasn't disabled it
        const isEnabledNow = permGranted && userPreference;
        setIsEnabled(isEnabledNow);
      } catch {
        setIsEnabled(false);
      }
    };
    checkPermission();
  }, [vehicles, setIsEnabled]);

  // Re-check when window regains focus (user might have granted via Settings or preference changed on another page)
  useEffect(() => {
    const handleFocus = () => {
      getNotificationPermissionStatus().then(status => {
        const permGranted = status.display === 'granted';
        const userPreference = getNotificationPreference();
        const isEnabledNow = permGranted && userPreference;
        setIsEnabled(isEnabledNow);
      });
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [vehicles, setIsEnabled]);

  // Re-check permission when page becomes visible (handles in-app navigation)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        getNotificationPermissionStatus().then(status => {
          const permGranted = status.display === 'granted';
          const userPreference = getNotificationPreference();
          const isEnabledNow = permGranted && userPreference;
          setIsEnabled(isEnabledNow);
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [vehicles, setIsEnabled]);

  const handleToggle = async () => {
    setIsLoading(true);
    try {
      const status = await getNotificationPermissionStatus();
      const permGranted = status.display === 'granted';
      const userPreference = getNotificationPreference();
      const currentlyEnabled = permGranted && userPreference;

      if (currentlyEnabled) {
        // Toggle off: save preference and cancel all reminders
        setNotificationPreference(false);
        await cancelMileageReminders();
        setIsEnabled(false);
      } else {
        // Toggle on: check if we need to request permission
        if (!permGranted) {
          // Request permission
          const result = await requestNotificationPermission();
          if (result.display !== 'granted') {
            setIsEnabled(false);
            setIsLoading(false);
            return;
          }
        }
        // Permission granted (either already had it or just got it)
        // Save preference and schedule
        setNotificationPreference(true);
        await scheduleMileageReminders(vehicles);
        setIsEnabled(true);
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!showBanner) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 14px',
        margin: '8px 12px',
        borderRadius: '10px',
        background: '#e8f0fe',
        border: '1px solid #c5d9f5',
        width: 'calc(100% - 24px)'
      }}
    >
      <IonIcon
        icon={notifications}
        style={{
          fontSize: '22px',
          color: 'var(--ion-color-warning)',
          flexShrink: 0,
        }}
      />
      <IonToggle
          checked={isEnabled}
          className={`${isEnabled ? 'ion-valid' : ''} ${isEnabled === false ? 'ion-invalid' : ''} ${
            isEnabled ? 'ion-touched' : ''
          }`}
          disabled={isLoading}
          helperText={t('notificationBanner.text')}
          errorText={t('notificationToggle.errorText')}
          onIonChange={() => handleToggle()}
          style={{ flexShrink: 0, width: 'calc(100% - 32px)' }}
          justify={'space-between'}
        >{t('notificationToggle.label')}</IonToggle>
    </div>
  );
};

export default NotificationBanner;