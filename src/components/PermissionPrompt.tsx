import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonText,
  IonIcon,
} from '@ionic/react';
import { notifications } from 'ionicons/icons';
import {
  requestNotificationPermission,
  markPermissionPromptAsShown,
  scheduleMileageReminders,
} from '../services/notificationService';
import { Vehicle } from '../types';

interface PermissionPromptProps {
  isOpen: boolean;
  onDismiss: () => void;
  vehicles: Vehicle[];
}

const PermissionPrompt: React.FC<PermissionPromptProps> = ({ isOpen, onDismiss, vehicles }) => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);

  const handleAllow = async () => {
    setIsLoading(true);
    try {
      const result = await requestNotificationPermission();
      markPermissionPromptAsShown();
      if (result.display === 'granted') {
        // Schedule the reminders now that permission is granted
        await scheduleMileageReminders(vehicles);
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    } finally {
      setIsLoading(false);
      onDismiss();
    }
  };

  const handleNotNow = () => {
    markPermissionPromptAsShown();
    onDismiss();
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={handleNotNow} backdropDismiss={false}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{t('permissionPrompt.title')}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            padding: '32px 16px',
            gap: '24px',
          }}
        >
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '40px',
              background: 'var(--ion-color-primary-tint)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IonIcon
              icon={notifications}
              style={{
                fontSize: '40px',
                color: 'var(--ion-color-primary)',
              }}
            />
          </div>

          <IonText>
            <h2 style={{ fontWeight: 600, margin: 0 }}>{t('permissionPrompt.heading')}</h2>
          </IonText>

          <IonText color="medium">
            <p style={{ margin: 0, lineHeight: 1.5 }}>{t('permissionPrompt.description')}</p>
          </IonText>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              width: '100%',
              marginTop: '16px',
            }}
          >
            <IonButton
              expand="block"
              onClick={handleAllow}
              disabled={isLoading}
            >
              {isLoading ? t('common.loading') : t('permissionPrompt.allow')}
            </IonButton>
            <IonButton
              expand="block"
              fill="outline"
              onClick={handleNotNow}
              disabled={isLoading}
            >
              {t('permissionPrompt.notNow')}
            </IonButton>
          </div>
        </div>
      </IonContent>
    </IonModal>
  );
};

export default PermissionPrompt;