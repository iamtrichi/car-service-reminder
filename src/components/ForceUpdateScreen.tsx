import React from 'react';
import {
  IonContent,
  IonPage,
  IonButton,
  IonIcon,
  IonText,
} from '@ionic/react';
import { openPlayStore } from '../services/appUpdateService';
import { cloudDownload } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';

interface ForceUpdateScreenProps {
  minimumVersion: string;
}

const ForceUpdateScreen: React.FC<ForceUpdateScreenProps> = ({ minimumVersion }) => {
  const { t } = useTranslation();

  return (
    <IonPage>
      <IonContent
        className="ion-padding"
        style={{
          '--background': '#f8f9fa',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        } as any}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            textAlign: 'center',
            padding: '32px',
            gap: '16px',
          }}
        >
          <IonIcon
            icon={cloudDownload}
            style={{ fontSize: '80px', color: 'var(--ion-color-primary)' }}
          />

          <h2 style={{ margin: 0, fontWeight: 600 }}>
            {t('update.forceTitle', 'Update Required')}
          </h2>

          <IonText color="medium">
            <p style={{ margin: 0, lineHeight: 1.5 }}>
              {t(
                'update.forceMessage',
                'This version is no longer supported. Please update to the latest version to continue using the app.'
              )}
            </p>
          </IonText>

          <IonButton
            expand="block"
            size="large"
            onClick={openPlayStore}
            style={{ marginTop: '16px' }}
          >
            <IonIcon icon={cloudDownload} slot="start" />
            {t('update.updateNow', 'Update Now')}
          </IonButton>

          <IonText color="medium" style={{ fontSize: '12px' }}>
            <p style={{ margin: 0 }}>
              {t('update.minimumVersionRequired', 'Minimum required version: {{version}}', {
                version: minimumVersion,
              })}
            </p>
          </IonText>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default ForceUpdateScreen;