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
  IonToast,
} from '@ionic/react';
import { add, car, alertCircle, time, speedometerSharp, speedometer } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useVehicleStore } from '../store/vehicleStore';
import { calculateReminderStatus, ReminderStatus } from '../services/reminderService';
import { interstitial, showBanner } from '../services/admobUtilits';

const Dashboard: React.FC = () => {
  const history = useHistory();
  const { t } = useTranslation();
  const vehicles = useVehicleStore(s => s.vehicles);
  const getServiceDisplayName = (serviceType: string, fallbackName: string) => {
    if (serviceType === 'other') return fallbackName;
    const key = `serviceTypes.${serviceType}`;
    const translated = t(key);
    return translated === key ? fallbackName : translated;
  };
  const serviceIntervals = useVehicleStore(s => s.serviceIntervals);
  const loading = useVehicleStore(s => s.loading);
  const [toastMsg, setToastMsg] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [chipMargin, setChipMargin] = useState<'0px 0 0px 10px' | '0px 10px 0px 0px'>('0px 10px 0px 0px')
    
    useEffect(() => {
      setChipMargin(document.documentElement.dir === 'rtl' ? '0px 0 0px 10px' : '0px 10px 0px 0px')
    }, [document.documentElement.dir])

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
      <IonContent  style={{'--background': '#f8f9fa'}}>
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
                className="dashboard-card"
                onClick={() => history.push(`/vehicle/${vehicle.id}`)}
              >
                <div style={{ display: 'flex', gap: '12px', padding: '12px 12px 0' }}>
                  {/* Left: 120x120 image */}
                  {vehicle.imageUrl ? (
                    <div
                      style={{
                        width: '120px',
                        height: '120px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        flexShrink: 0,
                      }}
                    >
                      <img
                        src={vehicle.imageUrl}
                        alt={vehicle.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    </div>
                  ) : (
                    <div
                      style={{
                        width: '120px',
                        height: '120px',
                        borderRadius: '8px',
                        flexShrink: 0,
                        background: worstStatus === 'overdue' ? '#c90000' : worstStatus === 'due_soon' ? '#d48304' : '#3c699ad4',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <IonIcon icon={car}  style={{ fontSize: '40px', 'color': 'white' }} />
                    </div>
                  )}

                  {/* Right: name, engine, and other details before mileage */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0px' }}>
                      <h3 style={{ margin: 0, fontWeight: 600, fontSize: '16px' }}>{vehicle.name}</h3>
                      {overdueCount > 0 && (
                        <IonBadge color="danger">{overdueCount}</IonBadge>
                      )}
                      {dueSoonCount > 0 && overdueCount === 0 && (
                        <IonBadge color="warning">{dueSoonCount}</IonBadge>
                      )}
                    </div>
                    <p style={{ color: 'var(--ion-color-primary)', fontWeight: 'bold', fontSize: '15px', margin: '2px 0' }}>
                      {vehicle.make} {vehicle.model} {vehicle.year}
                    </p>
                    {vehicle.engineName && (
                      <p style={{ color: 'var(--ion-color-medium)', fontSize: '15px', margin: '2px 0' }}>
                        {t('dashboard.engine')} {vehicle.engineName}
                      </p>
                    )}
                    {vehicle.licensePlate && (
                      <p style={{ color: 'var(--ion-color-medium)', fontSize: '15px', margin: '2px 0' }}>
                        {t('dashboard.plate')} {vehicle.licensePlate}
                      </p>
                    )}
                    <p style={{ fontSize: '16px', margin: '6px 0 0' }}>
                      {/*t('dashboard.mileage')*/}
                      <IonChip style={{ height: '24px', 'margin-inline-start': '0px' }} color={'primary'}>
                        <IonIcon icon={speedometer} color="primary"></IonIcon>
                        <IonLabel style={{ fontSize: '16px' }}> <strong>{vehicle.currentMileage.toLocaleString()} {t('common.km')}</strong></IonLabel>
                      </IonChip>
                    </p>
                  </div>
                </div>
                <IonCardContent>
                  {reminders.slice(0, 3).map((reminder, idx) => (
                    <IonItem key={idx} lines="none" style={{ fontSize: '14px', '--padding-start': '0' } as any} className="dashboard-card">
                      <IonChip
                        slot="start"
                        style={{ '--background': `var(--ion-color-${reminder.status === 'overdue' ? 'danger' : reminder.status === 'due_soon' ? 'warning' : 'success'})`, opacity: '0.8', height: '14px', width: '14px', margin: chipMargin, padding: 0 }}
                      />
                      <IonLabel style={{ fontSize: '13px' }}>
                        {getServiceDisplayName(reminder.interval.serviceType, reminder.interval.name)}
                        {reminder.status === 'overdue' ? (
                          <>
                            {' ' + t('vehicleDetail.overdue')}
                            {reminder.remainingKm !== null && reminder.remainingKm <= 0 && ` • ${t('vehicleDetail.kmOverdue', { km: Math.abs(reminder.remainingKm).toLocaleString() })}`}
                            {reminder.remainingDays !== null && reminder.remainingDays <= 0 && ` • ${t('vehicleDetail.daysOverdue', { days: Math.abs(reminder.remainingDays).toLocaleString() })}`}
                          </>
                        ) : reminder.status === 'due_soon' ? (
                          <>
                            {' ' + t('vehicleDetail.dueSoon')}
                            {reminder.remainingKm !== null && reminder.remainingKm > 0 && ` • ${t('vehicleDetail.kmRemaining', { km: reminder.remainingKm.toLocaleString() })}`}
                            {reminder.remainingDays !== null && reminder.remainingDays > 0 && ` • ${t('vehicleDetail.daysRemaining', { days: reminder.remainingDays.toLocaleString() })}`}
                          </>
                        ) : (
                          <>
                            {' '}
                            {reminder.remainingKm !== null && reminder.remainingKm > 0 && t('vehicleDetail.kmRemaining', { km: reminder.remainingKm.toLocaleString() })}
                            {reminder.remainingDays !== null && reminder.remainingDays > 0 && ` • ${t('vehicleDetail.daysRemaining', { days: reminder.remainingDays.toLocaleString() })}`}
                          </>
                        )}
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