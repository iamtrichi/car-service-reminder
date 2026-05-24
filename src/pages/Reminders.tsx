import React, { useMemo } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonChip,
  IonText,
  IonMenuButton,
} from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { notifications, arrowForward } from 'ionicons/icons';
import { useVehicleStore } from '../store/vehicleStore';
import { getAllReminders } from '../services/reminderService';

const Reminders: React.FC = () => {
  const history = useHistory();
  const { t } = useTranslation();
  const vehicles = useVehicleStore(s => s.vehicles);
  const serviceIntervals = useVehicleStore(s => s.serviceIntervals);
  const loading = useVehicleStore(s => s.loading);

  const reminders = useMemo(() => {
    return getAllReminders(serviceIntervals, vehicles);
  }, [serviceIntervals, vehicles]);

  const overdueReminders = reminders.filter(r => r.status === 'overdue');
  const dueSoonReminders = reminders.filter(r => r.status === 'due_soon');
  const okReminders = reminders.filter(r => r.status === 'ok');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'overdue': return 'danger';
      case 'due_soon': return 'warning';
      default: return 'success';
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>{t('reminders.title')}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {loading ? (
          <div className="ion-padding ion-text-center">
            <p>{t('common.loading')}</p>
          </div>
        ) : reminders.length === 0 ? (
          <div className="ion-padding ion-text-center" style={{ marginTop: '30%' }}>
            <IonIcon icon={notifications} style={{ fontSize: '64px', color: 'var(--ion-color-medium)' }} />
            <h3>{t('reminders.noReminders')}</h3>
            <p style={{ color: 'var(--ion-color-medium)' }}>
              {t('reminders.noRemindersDesc')}
            </p>
            <IonButton onClick={() => history.push('/dashboard')}>
              {t('reminders.goToDashboard')}
            </IonButton>
          </div>
        ) : (
          <>
            {/* Overdue Section */}
            {overdueReminders.length > 0 && (
              <>
                <div style={{ padding: '12px 12px 4px' }}>
                  <IonText color="danger">
                    <h4 style={{ margin: 0 }}>
                      {t('reminders.overdue', { count: overdueReminders.length })}
                    </h4>
                  </IonText>
                </div>
                <IonList>
                  {overdueReminders.map((reminder, idx) => (
                    <IonItem
                      key={`overdue_${idx}`}
                      button
                      onClick={() => history.push(`/vehicle/${reminder.vehicle.id}`)}
                    >
                      <IonChip slot="start" color="danger" style={{ height: '10px', width: '10px', margin: '0 8px 0 0', padding: 0 }} />
                      <IonLabel>
                        <h3>{reminder.interval.name}</h3>
                        <p>{reminder.vehicle.name} - {reminder.vehicle.make} {reminder.vehicle.model}</p>
                        <p style={{ color: 'var(--ion-color-danger)' }}>
                          {reminder.remainingKm !== null && t('reminders.overdueKm', { km: Math.abs(reminder.remainingKm).toLocaleString() })}
                          {reminder.remainingKm !== null && reminder.remainingDays !== null && ' • '}
                          {reminder.remainingDays !== null && t('reminders.overdueDays', { days: Math.abs(reminder.remainingDays) })}
                        </p>
                      </IonLabel>
                      <IonIcon icon={arrowForward} slot="end" color="medium" />
                    </IonItem>
                  ))}
                </IonList>
              </>
            )}

            {/* Due Soon Section */}
            {dueSoonReminders.length > 0 && (
              <>
                <div style={{ padding: '12px 12px 4px' }}>
                  <IonText color="warning">
                    <h4 style={{ margin: 0 }}>
                      {t('reminders.dueSoon', { count: dueSoonReminders.length })}
                    </h4>
                  </IonText>
                </div>
                <IonList>
                  {dueSoonReminders.map((reminder, idx) => (
                    <IonItem
                      key={`due_${idx}`}
                      button
                      onClick={() => history.push(`/vehicle/${reminder.vehicle.id}`)}
                    >
                      <IonChip slot="start" color="warning" style={{ height: '10px', width: '10px', margin: '0 8px 0 0', padding: 0 }} />
                      <IonLabel>
                        <h3>{reminder.interval.name}</h3>
                        <p>{reminder.vehicle.name} - {reminder.vehicle.make} {reminder.vehicle.model}</p>
                        <p style={{ color: 'var(--ion-color-warning)' }}>
                          {reminder.remainingKm !== null ? t('reminders.dueInKm', { km: reminder.remainingKm.toLocaleString() }) : ''}
                          {reminder.remainingKm !== null && reminder.remainingDays !== null ? ' / ' : ''}
                          {reminder.remainingDays !== null ? t('reminders.dueInDays', { days: reminder.remainingDays }) : ''}
                        </p>
                      </IonLabel>
                      <IonIcon icon={arrowForward} slot="end" color="medium" />
                    </IonItem>
                  ))}
                </IonList>
              </>
            )}

            {/* OK Section */}
            {okReminders.length > 0 && (
              <>
                <div style={{ padding: '12px 12px 4px' }}>
                  <IonText color="success">
                    <h4 style={{ margin: 0 }}>
                      {t('reminders.ok', { count: okReminders.length })}
                    </h4>
                  </IonText>
                </div>
                <IonList>
                  {okReminders.map((reminder, idx) => (
                    <IonItem
                      key={`ok_${idx}`}
                      button
                      onClick={() => history.push(`/vehicle/${reminder.vehicle.id}`)}
                    >
                      <IonChip slot="start" color="success" style={{ height: '10px', width: '10px', margin: '0 8px 0 0', padding: 0 }} />
                      <IonLabel>
                        <h3>{reminder.interval.name}</h3>
                        <p>{reminder.vehicle.name} - {reminder.vehicle.make} {reminder.vehicle.model}</p>
                      </IonLabel>
                      <IonIcon icon={arrowForward} slot="end" color="medium" />
                    </IonItem>
                  ))}
                </IonList>
              </>
            )}
          </>
        )}
      </IonContent>
    </IonPage>
  );
};

export default Reminders;