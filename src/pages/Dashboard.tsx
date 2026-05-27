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
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonBadge,
  IonItem,
  IonLabel,
  IonFab,
  IonFabButton,
  IonSpinner,
  IonText,
  IonChip,
  IonMenuButton,
  IonActionSheet,
  IonToast,
} from '@ionic/react';
import { add, car, trash, alertCircle, time } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { useVehicleStore } from '../store/vehicleStore';
import { calculateReminderStatus, ReminderStatus } from '../services/reminderService';
import { interstitial, showBanner } from '../services/admobUtilits';

const Dashboard: React.FC = () => {
  const history = useHistory();
  const { t, i18n: i18nHook } = useTranslation();
  const vehicles = useVehicleStore(s => s.vehicles);
  const serviceIntervals = useVehicleStore(s => s.serviceIntervals);
  const loading = useVehicleStore(s => s.loading);
  const deleteVehicle = useVehicleStore(s => s.deleteVehicle);

  const [showActionSheet, setShowActionSheet] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState('');
  const [showToast, setShowToast] = useState(false);

  const urgencyOrder = { overdue: 0, due_soon: 1, ok: 2 };

  const vehicleStatuses = useMemo(() => {
    return vehicles.map(vehicle => {
      const intervals = serviceIntervals.filter(i => i.vehicleId === vehicle.id);
      const reminders: ReminderStatus[] = intervals.map(interval => {
        const status = calculateReminderStatus(interval, vehicle);
        return { interval, vehicle, ...status };
      });
      // Sort by urgency: overdue first, then due_soon, then ok
      reminders.sort((a, b) => urgencyOrder[a.status] - urgencyOrder[b.status]);
      const overdueCount = reminders.filter(r => r.status === 'overdue').length;
      const dueSoonCount = reminders.filter(r => r.status === 'due_soon').length;
      const worstStatus = overdueCount > 0 ? 'overdue' : dueSoonCount > 0 ? 'due_soon' : 'ok';
      return { vehicle, reminders, overdueCount, dueSoonCount, worstStatus };
    });
  }, [vehicles, serviceIntervals]);

  const totalOverdue = useMemo(
    () => vehicleStatuses.reduce((sum, v) => sum + v.overdueCount, 0),
    [vehicleStatuses]
  );
  const totalDueSoon = useMemo(
    () => vehicleStatuses.reduce((sum, v) => sum + v.dueSoonCount, 0),
    [vehicleStatuses]
  );

  const currentLang = i18nHook.language?.startsWith('fr') ? 'fr' : 'en';
  const toggleLang = currentLang === 'en' ? 'fr' : 'en';
  const toggleLabel = currentLang === 'en' ? 'CHANGER EN FRANCAIS' : 'SWITCH TO ENGLISH';

  const handleToggleLanguage = () => {
    i18n.changeLanguage(toggleLang);
  };

  const handleDeleteVehicle = () => {
    if (selectedVehicleId) {
      deleteVehicle(selectedVehicleId);
      setToastMsg(t('dashboard.vehicleDeleted'));
      setShowToast(true);
      setTimeout(async () => {
        await interstitial();
      }, 1000)
    }
    setShowActionSheet(false);
    setSelectedVehicleId(null);
  };

  const handleLongPress = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    setShowActionSheet(true);
  };

  useEffect(() => {
    showBanner();
  });

  if (loading) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar color="primary">
            <IonTitle>{t('dashboard.title')}</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding ion-text-center">
          <IonSpinner style={{ marginTop: '40%' }} />
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>{t('dashboard.title')}</IonTitle>
          <IonButtons slot="end">
            <IonButton
              onClick={handleToggleLanguage}
              fill="clear"
              size="small"
              style={{ fontWeight: 600, letterSpacing: '1px' }}
            >
              {toggleLabel}
            </IonButton>
          </IonButtons>
        </IonToolbar>
        {vehicles.length > 0 && (
          <IonToolbar color="primary" style={{ paddingTop: '0', paddingBottom: '0', minHeight: '70px' }}>
            <div style={{ display: 'flex', gap: '8px', padding: '8px 10px', width: '100%' }}>
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.15)', borderRadius: '10px', textAlign: 'center', padding: '8px 4px' }}>
                <IonIcon icon={car} color="light" style={{ fontSize: '22px' }} />
                <h3 style={{ margin: '4px 0 0', fontWeight: 700, fontSize: '20px', color: 'white' }}>{vehicles.length}</h3>
                <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.8)' }}>{t('dashboard.vehicles')}</p>
              </div>
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.15)', borderRadius: '10px', textAlign: 'center', padding: '8px 4px' }}>
                <IonIcon icon={alertCircle} color={totalOverdue > 0 ? 'danger' : 'light'} style={{ fontSize: '22px' }} />
                <h3 style={{ margin: '4px 0 0', fontWeight: 700, fontSize: '20px', color: totalOverdue > 0 ? 'var(--ion-color-danger)' : 'white' }}>{totalOverdue}</h3>
                <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.8)' }}>{t('dashboard.overdue')}</p>
              </div>
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.15)', borderRadius: '10px', textAlign: 'center', padding: '8px 4px' }}>
                <IonIcon icon={time} color={totalDueSoon > 0 ? 'warning' : 'light'} style={{ fontSize: '22px' }} />
                <h3 style={{ margin: '4px 0 0', fontWeight: 700, fontSize: '20px', color: totalDueSoon > 0 ? 'var(--ion-color-warning)' : 'white' }}>{totalDueSoon}</h3>
                <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.8)' }}>{t('dashboard.dueSoon')}</p>
              </div>
            </div>
          </IonToolbar>
        )}
      </IonHeader>
      <IonContent>
        {vehicles.length === 0 ? (
          <div className="ion-text-center" style={{ marginTop: '30%' }}>
            <IonIcon icon={car} style={{ fontSize: '64px', color: 'var(--ion-color-medium)' }} />
            <h3>{t('dashboard.noVehicles')}</h3>
            <p style={{ color: 'var(--ion-color-medium)' }}>
              {t('dashboard.noVehiclesDesc')}
            </p>
            <IonButton onClick={() => history.push('/add-vehicle')}>
              <IonIcon icon={add} slot="start" />
              {t('dashboard.addVehicle')}
            </IonButton>
          </div>
        ) : (
          <div style={{ padding: '0 0px 80px 0px' }}>
            {vehicleStatuses.map(({ vehicle, reminders, overdueCount, dueSoonCount, worstStatus }) => (
              <IonCard
                key={vehicle.id}
                button
                onClick={() => history.push(`/vehicle/${vehicle.id}`)}
              >
                <IonCardHeader>
                  <IonCardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <IonIcon icon={car} color={worstStatus === 'overdue' ? 'danger' : worstStatus === 'due_soon' ? 'warning' : 'success'} />
                    {vehicle.name}
                    {overdueCount > 0 && (
                      <IonBadge color="danger">{overdueCount}</IonBadge>
                    )}
                    {dueSoonCount > 0 && overdueCount === 0 && (
                      <IonBadge color="warning">{dueSoonCount}</IonBadge>
                    )}
                    <IonButton
                      slot="end"
                      fill="clear"
                      size="small"
                      style={{ marginLeft: 'auto' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLongPress(vehicle.id);
                      }}
                    >
                      <IonIcon icon={trash} color="medium" />
                    </IonButton>
                  </IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <p style={{ color: 'var(--ion-color-medium)', fontSize: '18px' }}>
                    {vehicle.make} {vehicle.model} {vehicle.year}
                  </p>
                  {vehicle.engineName && (
                    <p style={{ color: 'var(--ion-color-medium)', fontSize: '14px' }}>
                      {t('dashboard.engine')} {vehicle.engineName}
                    </p>
                  )}
                  {vehicle.licensePlate && (
                    <p style={{ color: 'var(--ion-color-medium)', fontSize: '14px' }}>
                      {t('dashboard.plate')} {vehicle.licensePlate}
                    </p>
                  )}
                  <p style={{ fontSize: '16px', marginTop: '8px' }}>
                    {t('dashboard.mileage')} <strong>{vehicle.currentMileage.toLocaleString()} {t('common.km')}</strong>
                  </p>
                  {reminders.slice(0, 3).map((reminder, idx) => (
                    <IonItem key={idx} lines="none" style={{ fontSize: '14px', '--padding-start': '0' } as any}>
                      <IonChip
                        slot="start"
                        color={reminder.status === 'overdue' ? 'danger' : reminder.status === 'due_soon' ? 'warning' : 'success'}
                        style={{ height: '8px', width: '8px', margin: '0 8px 0 0', padding: 0 }}
                      />
                      <IonLabel style={{ fontSize: '13px' }}>
                        {reminder.interval.name}
                        {reminder.remainingKm !== null && reminder.remainingKm > 0 && t('dashboard.remainingKm', { km: reminder.remainingKm.toLocaleString() })}
                        {reminder.remainingKm !== null && reminder.remainingKm <= 0 && t('dashboard.overdueKm', { km: Math.abs(reminder.remainingKm).toLocaleString() })}
                        {reminder.remainingDays !== null && reminder.remainingDays > 0 && t('dashboard.remainingDays', { days: reminder.remainingDays })}
                        {reminder.remainingDays !== null && reminder.remainingDays <= 0 && t('dashboard.overdueDays', { days: Math.abs(reminder.remainingDays).toLocaleString() })}
                      </IonLabel>
                    </IonItem>
                  ))}
                  {reminders.length > 3 && (
                    <p style={{ color: 'var(--ion-color-medium)', fontSize: '12px', marginTop: '4px' }}>
                      {t('dashboard.moreServices', { count: reminders.length - 3 })}
                    </p>
                  )}
                </IonCardContent>
              </IonCard>
            ))}
          </div>
        )}

        {/* Delete Action Sheet */}
        <IonActionSheet
          isOpen={showActionSheet}
          onDidDismiss={() => { setShowActionSheet(false); setSelectedVehicleId(null); }}
          buttons={[
            {
              text: t('dashboard.deleteVehicle'),
              role: 'destructive',
              icon: trash,
              handler: handleDeleteVehicle,
            },
            {
              text: t('common.cancel'),
              role: 'cancel',
            },
          ]}
        />

        <IonToast
          isOpen={showToast}
          message={toastMsg}
          duration={2000}
          position="top"
          onDidDismiss={() => setShowToast(false)}
        />

        {/* FAB to add vehicle */}
        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={() => history.push('/add-vehicle')}>
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>
      </IonContent>
    </IonPage>
  );
};

export default Dashboard;