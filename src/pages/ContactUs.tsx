import React, { useState } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonButton,
  IonBackButton,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonToast,
  IonIcon,
} from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { mail } from 'ionicons/icons';

const ContactUs: React.FC = () => {
  const { t } = useTranslation();
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [engine, setEngine] = useState('');
  const [year, setYear] = useState('');
  const [message, setMessage] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [showToast, setShowToast] = useState(false);

  const handleSend = () => {
    if (!make.trim() || !model.trim()) {
      setToastMsg(t('addVehicle.validationMake') + ' / ' + t('addVehicle.validationModel'));
      setShowToast(true);
      return;
    }

    const body = [
      `Car Make: ${make.trim()}`,
      `Car Model: ${model.trim()}`,
      engine.trim() ? `Engine: ${engine.trim()}` : null,
      year.trim() ? `Year: ${year.trim()}` : null,
      '',
      message.trim() ? `Message: ${message.trim()}` : '',
    ].filter(line => line !== null).join('\n');

    const subject = encodeURIComponent(t('contactUs.emailSubject'));
    const encodedBody = encodeURIComponent(body);
    window.open(`mailto:car.services.reminders@gmail.com?subject=${subject}&body=${encodedBody}`, '_system');
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/dashboard" />
          </IonButtons>
          <IonTitle>{t('contactUs.title')}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonItem>
          <IonLabel position="stacked">{t('contactUs.make')} *</IonLabel>
          <IonInput
            value={make}
            placeholder={t('contactUs.makePlaceholder')}
            onIonChange={e => setMake(e.detail.value || '')}
          />
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">{t('contactUs.model')} *</IonLabel>
          <IonInput
            value={model}
            placeholder={t('contactUs.modelPlaceholder')}
            onIonChange={e => setModel(e.detail.value || '')}
          />
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">{t('contactUs.engine')}</IonLabel>
          <IonInput
            value={engine}
            placeholder={t('contactUs.enginePlaceholder')}
            onIonChange={e => setEngine(e.detail.value || '')}
          />
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">{t('contactUs.year')}</IonLabel>
          <IonInput
            type="number"
            value={year}
            placeholder={t('contactUs.yearPlaceholder')}
            max={new Date().getFullYear()}
            onIonChange={e => setYear(e.detail.value || '')}
          />
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">{t('contactUs.message')}</IonLabel>
          <IonTextarea
            value={message}
            placeholder={t('contactUs.messagePlaceholder')}
            rows={4}
            onIonInput={e => setMessage((e.target as unknown as HTMLTextAreaElement).value || '')}
          />
        </IonItem>
        <div style={{ padding: '16px' }}>
          <IonButton expand="block" onClick={handleSend}>
            <IonIcon icon={mail} slot="start" />
            {t('contactUs.send')}
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

export default ContactUs;