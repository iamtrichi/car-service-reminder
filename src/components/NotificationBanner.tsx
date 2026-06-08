import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IonToggle, IonIcon } from '@ionic/react';
import { notifications } from 'ionicons/icons';
import {
  getNotificationPermissionStatus,
  requestNotificationPermission,
  scheduleMileageReminders,
  cancelMileageReminders,
} from '../services/notificationService';
import { useVehicleStore } from '../store/vehicleStore';

interface NotificationBannerProps {
  alwaysShow?: boolean;
}

const NotificationBanner: React.FC<NotificationBannerProps> = ({ alwaysShow = false }) => {
  const { t } = useTranslation();
  const vehicles = useVehicleStore(s => s.vehicles);
  const [showBanner, setShowBanner] = useState(false);
  const [isGranted, setIsGranted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const checkPermission = async () => {
      try {
        const status = await getNotificationPermissionStatus();
        const granted = status.display === 'granted';
        setIsGranted(granted);

        if (alwaysShow) {
          // On reminders page, always show if there are vehicles
          setShowBanner(vehicles.length > 0);
        } else {
          // On other pages, only show if not granted and has vehicles
          setShowBanner(!granted && vehicles.length > 0);
        }
      } catch {
        setIsGranted(false);
        setShowBanner(vehicles.length > 0);
      }
    };
    checkPermission();
  }, [vehicles, alwaysShow]);

  // Re-check when window regains focus (user might have granted via Settings)
  useEffect(() => {
    const handleFocus = () => {
      getNotificationPermissionStatus().then(status => {
        setIsGranted(status.display === 'granted');
      });
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [vehicles]);

  const handleToggle = async () => {
    setIsLoading(true);
    try {
      const status = await getNotificationPermissionStatus();
      const currentlyGranted = status.display === 'granted';

      if (currentlyGranted) {
        // Toggle off: cancel all reminders
        await cancelMileageReminders();
        setIsGranted(false);
      } else {
        // Toggle on: request permission and schedule
        const result = await requestNotificationPermission();
        if (result.display === 'granted') {
          await scheduleMileageReminders(vehicles);
          setIsGranted(true);
        }
        // Always update to reflect actual status
        setIsGranted(result.display === 'granted');
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
          checked={isGranted}
          className={`${isGranted ? 'ion-valid' : ''} ${isGranted === false ? 'ion-invalid' : ''} ${
            isGranted ? 'ion-touched' : ''
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