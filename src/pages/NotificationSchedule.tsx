import React from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
} from '@ionic/react';
import { useTranslation } from 'react-i18next';
import NotificationScheduleSettings from '../components/NotificationScheduleSettings';

const NotificationSchedule: React.FC = () => {
  const { t } = useTranslation();

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/dashboard" />
          </IonButtons>
          <IonTitle>{t('notificationSchedule.title')}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <NotificationScheduleSettings />
      </IonContent>
    </IonPage>
  );
};

export default NotificationSchedule;
