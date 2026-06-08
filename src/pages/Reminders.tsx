import React, { useEffect, useMemo, useState } from 'react';
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
import { notifications, arrowForward, arrowBack } from 'ionicons/icons';
import { useVehicleStore } from '../store/vehicleStore';
import { getAllReminders, ReminderStatus } from '../services/reminderService';
import ServiceCard from '../components/ServiceCard';

const Reminders: React.FC = () => {
  const history = useHistory();
  const { t } = useTranslation();
  const vehicles = useVehicleStore(s => s.vehicles);
  const serviceIntervals = useVehicleStore(s => s.serviceIntervals);
  const loading = useVehicleStore(s => s.loading);
  const [chipMargin, setChipMargin] = useState<'0px 0 0px 10px' | '0px 10px 0px 0px'>('0px 10px 0px 0px')
  const [arrowIcon, setArrowIcon] = useState<string>(arrowForward)

  useEffect(() => {
    setChipMargin(document.documentElement.dir === 'rtl' ? '0px 0 0px 10px' : '0px 10px 0px 0px')
    setArrowIcon(document.documentElement.dir === 'rtl' ? arrowBack : arrowForward)
  }, [document.documentElement.dir])
  const getServiceDisplayName = (serviceType: string, fallbackName: string) => {
    if (serviceType === 'other') return fallbackName;
    const key = `serviceTypes.${serviceType}`;
    const translated = t(key);
    return translated === key ? fallbackName : translated;
  };

  const reminders = useMemo(() => {
    return getAllReminders(serviceIntervals, vehicles);
  }, [serviceIntervals, vehicles]);

  const overdueReminders = reminders.filter(r => r.status === 'overdue');
  const dueSoonReminders = reminders.filter(r => r.status === 'due_soon');
  const okReminders = reminders.filter(r => r.status === 'ok');

  // Group reminders by vehicle
  const groupRemindersByVehicle = (reminders: ReminderStatus[]) => {
    const groups = new Map<string, ReminderStatus[]>();
    reminders.forEach(reminder => {
      const vehicleId = reminder.vehicle.id;
      if (!groups.has(vehicleId)) {
        groups.set(vehicleId, []);
      }
      groups.get(vehicleId)!.push(reminder);
    });
    return groups;
  };

  const overdueGroups = groupRemindersByVehicle(overdueReminders);
  const dueSoonGroups = groupRemindersByVehicle(dueSoonReminders);

  // Sort vehicles by most urgent reminder
  const sortVehicleGroups = (groups: Map<string, ReminderStatus[]>) => {
    return Array.from(groups.entries()).sort(([, aReminders], [, bReminders]) => {
      const aMostUrgent = aReminders.reduce((min, r) => {
        const remaining = r.remainingKm ?? r.remainingDays ?? Infinity;
        return remaining < min ? remaining : min;
      }, Infinity);
      const bMostUrgent = bReminders.reduce((min, r) => {
        const remaining = r.remainingKm ?? r.remainingDays ?? Infinity;
        return remaining < min ? remaining : min;
      }, Infinity);
      return aMostUrgent - bMostUrgent;
    });
  };

  const sortedOverdueGroups = sortVehicleGroups(overdueGroups);
  const sortedDueSoonGroups = sortVehicleGroups(dueSoonGroups);

  const formatCount = (count: number) => count >= 10 ? ` (${count})` : ` (0${count})`;

  const handleNavigate = (vehicleId: string) => {
    history.push(`/vehicle/${vehicleId}`);
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
            {sortedOverdueGroups.length > 0 && (
              <>
                <div style={{ padding: '12px 12px 4px' }}>
                  <IonText color="danger">
                    <h4 style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '10px', 
                      margin: 0 
                    }}>
                      <span style={{ fontSize: '36px', lineHeight: 1 }}>&bull;</span>{t('reminders.needsAttention')}{formatCount(overdueReminders.length)}
                    </h4>
                  </IonText>
                </div>
                {sortedOverdueGroups.map(([vehicleId, vehicleReminders]) => (
                  <ServiceCard
                    key={vehicleId}
                    vehicle={vehicleReminders[0].vehicle}
                    reminders={vehicleReminders}
                    status="overdue"
                    onNavigate={handleNavigate}
                  />
                ))}
              </>
            )}

            {/* Due Soon Section */}
            {sortedDueSoonGroups.length > 0 && (
              <>
                <div style={{ padding: '12px 12px 4px' }}>
                  <IonText color="warning">
                    <h4 style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '10px',
                      margin: 0 
                    }}>
                      <span style={{ fontSize: '36px', lineHeight: 1 }}>&bull;</span>{t('reminders.comingUp')}{formatCount(dueSoonReminders.length)}
                    </h4>
                  </IonText>
                </div>
                {sortedDueSoonGroups.map(([vehicleId, vehicleReminders]) => (
                  <ServiceCard
                    key={vehicleId}
                    vehicle={vehicleReminders[0].vehicle}
                    reminders={vehicleReminders}
                    status="due_soon"
                    onNavigate={handleNavigate}
                  />
                ))}
              </>
            )}

            {/* OK Section - Keep flat list for OK services */}
            {/*okReminders.length > 0 && (
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
                      <IonChip slot="start" style={{ '--background': `var(--ion-color-success)`, opacity: '0.8', height: '10px', width: '10px', margin: chipMargin, padding: 0 }} />
                      <IonLabel>
                        <h3>{getServiceDisplayName(reminder.interval.serviceType, reminder.interval.name)}</h3>
                        <p>{reminder.vehicle.name} - {reminder.vehicle.make} {reminder.vehicle.model}</p>
                      </IonLabel>
                      <IonIcon icon={arrowIcon} slot="end" color="medium" />
                    </IonItem>
                  ))}
                </IonList>
              </>
            )*/}

            {/* End of list message */}
            <div style={{ padding: '24px 12px', textAlign: 'center' }}>
              <IonText color="medium">
                <p style={{ fontSize: '0.85rem', margin: 0, opacity: 0.7 }}>{t('reminders.endOfList')}</p>
              </IonText>
            </div>
          </>
        )}
      </IonContent>
    </IonPage>
  );
};

export default Reminders;
