import React, { useMemo, useState } from 'react';
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
import { add, car, trash, create } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useVehicleStore } from '../store/vehicleStore';
import { calculateReminderStatus, ReminderStatus } from '../services/reminderService';

const Dashboard: React.FC = () => {
  const history = useHistory();
  const vehicles = useVehicleStore(s => s.vehicles);
  const serviceIntervals = useVehicleStore(s => s.serviceIntervals);
  const loading = useVehicleStore(s => s.loading);
  const deleteVehicle = useVehicleStore(s => s.deleteVehicle);

  const [showActionSheet, setShowActionSheet] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState('');
  const [showToast, setShowToast] = useState(false);

  const vehicleStatuses = useMemo(() => {
    return vehicles.map(vehicle => {
      const intervals = serviceIntervals.filter(i => i.vehicleId === vehicle.id);
      const reminders: ReminderStatus[] = intervals.map(interval => {
        const status = calculateReminderStatus(interval, vehicle);
        return { interval, vehicle, ...status };
      });
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

  const handleDeleteVehicle = () => {
    if (selectedVehicleId) {
      deleteVehicle(selectedVehicleId);
      setToastMsg('Vehicle deleted');
      setShowToast(true);
    }
    setShowActionSheet(false);
    setSelectedVehicleId(null);
  };

  const handleLongPress = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    setShowActionSheet(true);
  };

  if (loading) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar color="primary">
            <IonTitle>Dashboard</IonTitle>
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
          <IonTitle>Dashboard</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {/* Summary Cards */}
        {vehicles.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', padding: '12px' }}>
            <IonCard style={{ flex: 1, margin: 0 }}>
              <IonCardContent className="ion-text-center">
                <IonText color="medium">
                  <h2 style={{ margin: 0 }}>{vehicles.length}</h2>
                  <p style={{ margin: 0, fontSize: '12px' }}>Vehicles</p>
                </IonText>
              </IonCardContent>
            </IonCard>
            <IonCard style={{ flex: 1, margin: 0 }}>
              <IonCardContent className="ion-text-center">
                <IonText color={totalOverdue > 0 ? 'danger' : 'medium'}>
                  <h2 style={{ margin: 0 }}>{totalOverdue}</h2>
                  <p style={{ margin: 0, fontSize: '12px' }}>Overdue</p>
                </IonText>
              </IonCardContent>
            </IonCard>
            <IonCard style={{ flex: 1, margin: 0 }}>
              <IonCardContent className="ion-text-center">
                <IonText color={totalDueSoon > 0 ? 'warning' : 'medium'}>
                  <h2 style={{ margin: 0 }}>{totalDueSoon}</h2>
                  <p style={{ margin: 0, fontSize: '12px' }}>Due Soon</p>
                </IonText>
              </IonCardContent>
            </IonCard>
          </div>
        )}

        {vehicles.length === 0 ? (
          <div className="ion-padding ion-text-center" style={{ marginTop: '30%' }}>
            <IonIcon icon={car} style={{ fontSize: '64px', color: 'var(--ion-color-medium)' }} />
            <h3>No Vehicles Yet</h3>
            <p style={{ color: 'var(--ion-color-medium)' }}>
              Add your first vehicle to start tracking services
            </p>
            <IonButton onClick={() => history.push('/add-vehicle')}>
              <IonIcon icon={add} slot="start" />
              Add Vehicle
            </IonButton>
          </div>
        ) : (
          <div style={{ padding: '0 12px 80px 12px' }}>
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
                  <p style={{ color: 'var(--ion-color-medium)', fontSize: '14px' }}>
                    {vehicle.make} {vehicle.model} {vehicle.year}
                  </p>
                  {vehicle.engineName && (
                    <p style={{ color: 'var(--ion-color-medium)', fontSize: '12px' }}>
                      Engine: {vehicle.engineName}
                    </p>
                  )}
                  {vehicle.licensePlate && (
                    <p style={{ color: 'var(--ion-color-medium)', fontSize: '14px' }}>
                      Plate: {vehicle.licensePlate}
                    </p>
                  )}
                  <p style={{ fontSize: '14px', marginTop: '8px' }}>
                    Mileage: <strong>{vehicle.currentMileage.toLocaleString()} km</strong>
                  </p>
                  {reminders.slice(0, 3).map((reminder, idx) => (
                    <IonItem key={idx} lines="none" style={{ fontSize: '13px', '--padding-start': '0' } as any}>
                      <IonChip
                        slot="start"
                        color={reminder.status === 'overdue' ? 'danger' : reminder.status === 'due_soon' ? 'warning' : 'success'}
                        style={{ height: '8px', width: '8px', margin: '0 8px 0 0', padding: 0 }}
                      />
                      <IonLabel style={{ fontSize: '13px' }}>
                        {reminder.interval.name}
                        {reminder.remainingKm !== null && reminder.remainingKm > 0 && ` (${reminder.remainingKm} km)`}
                        {reminder.remainingKm !== null && reminder.remainingKm <= 0 && ' (OVERDUE)'}
                        {reminder.remainingDays !== null && reminder.remainingDays > 0 && ` (${reminder.remainingDays}d)`}
                        {reminder.remainingDays !== null && reminder.remainingDays <= 0 && ' (OVERDUE)'}
                      </IonLabel>
                    </IonItem>
                  ))}
                  {reminders.length > 3 && (
                    <p style={{ color: 'var(--ion-color-medium)', fontSize: '12px', marginTop: '4px' }}>
                      +{reminders.length - 3} more services
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
              text: 'Delete Vehicle',
              role: 'destructive',
              icon: trash,
              handler: handleDeleteVehicle,
            },
            {
              text: 'Cancel',
              role: 'cancel',
            },
          ]}
        />

        <IonToast
          isOpen={showToast}
          message={toastMsg}
          duration={2000}
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