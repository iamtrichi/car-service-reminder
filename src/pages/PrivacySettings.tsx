import React from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonButton,
  IonText,
  IonToast,
} from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { shieldCheckmark, pricetag, eye, documentText } from 'ionicons/icons';
import { resetConsentInfo, requestUMPConsent } from '../services/admobUtilits';

const PrivacySettings: React.FC = () => {
  const { t } = useTranslation();
  const [showToast, setShowToast] = React.useState(false);
  const [toastMsg, setToastMsg] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleChangeConsent = async () => {
    setLoading(true);
    try {
      await resetConsentInfo();
      await requestUMPConsent();
      setToastMsg(t('adConsent.toastUpdated'));
      setShowToast(true);
    } catch (error) {
      console.error('PrivacySettings: Error changing consent:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrivacyPolicy = () => {
    window.open('https://iamtrichi.github.io/PP/car-service-reminder/privacy-policy.html', '_system');
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/dashboard" />
          </IonButtons>
          <IonTitle>{t('adConsent.settingsTitle')}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div style={{ padding: '16px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px', marginTop: '16px' }}>
            <IonIcon
              icon={shieldCheckmark}
              style={{ fontSize: '64px', color: 'var(--ion-color-primary)' }}
            />
            <h2 style={{ fontWeight: 600 }}>{t('adConsent.heading')}</h2>
          </div>

          <IonText>
            <p style={{ color: 'var(--ion-color-medium)', marginBottom: '24px', textAlign: 'center' }}>
              {t('adConsent.settingsDescription')}
            </p>
          </IonText>

          <IonList inset>
            <IonItem>
              <IonIcon icon={eye} slot="start" color="primary" />
              <IonLabel>
                <h3>{t('adConsent.personalized')}</h3>
                <p>{t('adConsent.personalizedDesc')}</p>
              </IonLabel>
            </IonItem>
            <IonItem>
              <IonIcon icon={pricetag} slot="start" color="medium" />
              <IonLabel>
                <h3>{t('adConsent.nonPersonalized')}</h3>
                <p>{t('adConsent.nonPersonalizedDesc')}</p>
              </IonLabel>
            </IonItem>
          </IonList>

          <div style={{ marginBottom: '24px' }}>
            <IonButton
              expand="block"
              onClick={handleChangeConsent}
              disabled={loading}
            >
              {t('adConsent.changeConsent')}
            </IonButton>
          </div>

          <IonButton
            expand="block"
            fill="clear"
            onClick={handlePrivacyPolicy}
          >
            <IonIcon icon={documentText} slot="start" />
            {t('adConsent.privacyPolicy')}
          </IonButton>
        </div>

        <IonToast
          isOpen={showToast}
          message={toastMsg}
          duration={3000}
          position="top"
          onDidDismiss={() => setShowToast(false)}
        />
      </IonContent>
    </IonPage>
  );
};

export default PrivacySettings;