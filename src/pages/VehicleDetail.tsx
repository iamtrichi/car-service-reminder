import React, { useState, useMemo, useEffect } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonButton,
  IonBackButton,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonList,
  IonChip,
  IonBadge,
  IonModal,
  IonInput,
  IonText,
  IonActionSheet,
  IonToast,
  IonFab,
  IonFabButton,
  IonSegment,
  IonSegmentButton,
  IonLoading,
  IonAlert,
} from '@ionic/react';
import { useParams, useHistory } from 'react-router-dom';
import {
  car,
  create,
  trash,
  checkmark,
  hammer,
  add,
  informationCircle,
  time,
  speedometer,
  calendar,
  alertCircle,
  settings,
} from 'ionicons/icons';
import { useVehicleStore } from '../store/vehicleStore';
import { calculateReminderStatus, getUpcomingServiceForecast } from '../services/reminderService';
import type { ServiceForecastItem } from '../services/reminderService';
import { getEngineSpecsForVehicle } from '../services/serviceConfigService';
import { ServiceRecord, ServiceType, EngineSpec, EngineVariant } from '../types';
import EngineDetailModal from '../components/EngineDetailModal';

const VehicleDetail: React.FC = () => {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const history = useHistory();
  const {
    vehicles,
    serviceIntervals,
    serviceRecords,
    updateMileage,
    deleteVehicle,
    performService,
    removeInterval,
    updateVehicle,
  } = useVehicleStore();

  const [showActions, setShowActions] = useState(false);
  const [showPerformService, setShowPerformService] = useState(false);
  const [showEditMileage, setShowEditMileage] = useState(false);
  const [selectedIntervalId, setSelectedIntervalId] = useState<string | null>(null);
  const [newMileage, setNewMileage] = useState<number>(0);
  const [recordMileage, setRecordMileage] = useState<number>(0);
  const [recordDate, setRecordDate] = useState(new Date().toISOString().split('T')[0]);
  const [recordCost, setRecordCost] = useState<number>(0);
  const [recordNotes, setRecordNotes] = useState('');
  const [recordWorkshop, setRecordWorkshop] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'intervals' | 'history' | 'upcoming' | 'fluids'>('upcoming');
  const [engineSpec, setEngineSpec] = useState<EngineSpec | null>(null);

  // Fluid / engine edit modal state
  const [showEditFluidModal, setShowEditFluidModal] = useState(false);
  const [editOilNorm, setEditOilNorm] = useState('');
  const [editBrakeFluidType, setEditBrakeFluidType] = useState('');
  const [editCoolantType, setEditCoolantType] = useState('');
  const [editGearboxOilType, setEditGearboxOilType] = useState('');
  const [editGearboxOilCapacity, setEditGearboxOilCapacity] = useState('');

  // Engine detail modal state
  const [showEditEngine, setShowEditEngine] = useState(false);

  const vehicle = vehicles.find(v => v.id === vehicleId);
  const intervals = serviceIntervals.filter(i => i.vehicleId === vehicleId);
  const records = serviceRecords.filter(r => r.vehicleId === vehicleId).sort(
    (a, b) => new Date(b.performedAtDate).getTime() - new Date(a.performedAtDate).getTime()
  );

  const reminders = useMemo(() => {
    if (!vehicle) return [];
    return intervals.map(interval => {
      const status = calculateReminderStatus(interval, vehicle);
      return { interval, vehicle, ...status };
    });
  }, [vehicle, intervals]);

  useEffect(() => {
    if (vehicle) {
      getEngineSpecsForVehicle(vehicle).then(configSpec => {
        if (configSpec) {
          setEngineSpec(configSpec);
        } else if (vehicle.oilNorm || vehicle.brakeFluidType || vehicle.coolantType || vehicle.gearboxOilType) {
          setEngineSpec({
            engineCode: vehicle.engineCode || '',
            engineName: vehicle.engineName,
            oilNorm: vehicle.oilNorm,
            brakeFluidType: vehicle.brakeFluidType,
            coolantType: vehicle.coolantType,
            gearboxOilType: vehicle.gearboxOilType,
            gearboxOilCapacity: vehicle.gearboxOilCapacity,
          });
        } else {
          setEngineSpec(null);
        }
      });
    }
  }, [vehicle]);

  // Pre-populate fluid edit fields when opening modal
  const openEditFluidModal = () => {
    setEditOilNorm(vehicle?.oilNorm || engineSpec?.oilNorm || '');
    setEditBrakeFluidType(vehicle?.brakeFluidType || engineSpec?.brakeFluidType || '');
    setEditCoolantType(vehicle?.coolantType || engineSpec?.coolantType || '');
    setEditGearboxOilType(vehicle?.gearboxOilType || engineSpec?.gearboxOilType || '');
    setEditGearboxOilCapacity(vehicle?.gearboxOilCapacity || engineSpec?.gearboxOilCapacity || '');
    setShowEditFluidModal(true);
  };

  const handleSaveFluidSpecs = () => {
    if (!vehicle) return;
    const updated = {
      ...vehicle,
      oilNorm: editOilNorm || undefined,
      brakeFluidType: editBrakeFluidType || undefined,
      coolantType: editCoolantType || undefined,
      gearboxOilType: editGearboxOilType || undefined,
      gearboxOilCapacity: editGearboxOilCapacity || undefined,
    };
    updateVehicle(updated);
    setShowEditFluidModal(false);
    setToastMsg('Fluid specifications updated!');
    setShowToast(true);
  };

  const handleSaveEngine = (engine: EngineVariant) => {
    if (!vehicle) return;
    const updated = {
      ...vehicle,
      engineCode: engine.engineCode || vehicle.engineCode,
      engineName: engine.engineName || vehicle.engineName,
      hp: engine.hp || vehicle.hp,
      engineDisplacement: engine.displacement || vehicle.engineDisplacement,
      fuelType: engine.fuelType || vehicle.fuelType,
      isTurbo: engine.isTurbo !== undefined ? engine.isTurbo : vehicle.isTurbo,
      oilNorm: engine.oilNorm || vehicle.oilNorm,
      brakeFluidType: engine.brakeFluidType || vehicle.brakeFluidType,
      coolantType: engine.coolantType || vehicle.coolantType,
      gearboxOilType: engine.gearboxOilType || vehicle.gearboxOilType,
      gearboxOilCapacity: engine.gearboxOilCapacity || vehicle.gearboxOilCapacity,
    };
    updateVehicle(updated);
    setShowEditEngine(false);
    setToastMsg('Engine updated!');
    setShowToast(true);
  };

  if (!vehicle) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar color="primary">
            <IonButtons slot="start">
              <IonBackButton defaultHref="/dashboard" />
            </IonButtons>
            <IonTitle>Vehicle Not Found</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding ion-text-center">
          <p>Vehicle not found.</p>
          <IonButton onClick={() => history.push('/dashboard')}>Back to Dashboard</IonButton>
        </IonContent>
      </IonPage>
    );
  }

  const handlePerformService = () => {
    if (!selectedIntervalId) return;

    const record: ServiceRecord = {
      id: 'rec_' + Date.now(),
      vehicleId: vehicle.id,
      serviceIntervalId: selectedIntervalId,
      serviceType: intervals.find(i => i.id === selectedIntervalId)?.serviceType || ServiceType.OTHER,
      name: intervals.find(i => i.id === selectedIntervalId)?.name || 'Service',
      performedAtMileage: recordMileage || vehicle.currentMileage,
      performedAtDate: recordDate,
      cost: recordCost || undefined,
      notes: recordNotes || undefined,
      workshop: recordWorkshop || undefined,
    };

    performService(selectedIntervalId, record);
    setShowPerformService(false);
    setRecordDate(new Date().toISOString().split('T')[0]);
    setRecordCost(0);
    setRecordNotes('');
    setRecordWorkshop('');
    setToastMsg('Service recorded successfully!');
    setShowToast(true);
  };

  const handleDeleteVehicle = () => {
    // Navigate away first, then delete to avoid rendering with a missing vehicle
    history.push('/dashboard');
    setTimeout(() => deleteVehicle(vehicle.id), 50);
  };

  const handleUpdateMileage = () => {
    updateMileage(vehicle.id, newMileage);
    setShowEditMileage(false);
    setToastMsg('Mileage updated!');
    setShowToast(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'overdue': return 'danger';
      case 'due_soon': return 'warning';
      default: return 'success';
    }
  };

  const overdueCount = reminders.filter(r => r.status === 'overdue').length;
  const dueSoonCount = reminders.filter(r => r.status === 'due_soon').length;

  const forecast = useMemo(() => {
    if (!vehicle) return [];
    return getUpcomingServiceForecast(vehicle, intervals, engineSpec);
  }, [vehicle, intervals, engineSpec]);

  const missedForecast = useMemo(() => forecast.filter(f => f.category === 'missed'), [forecast]);
  const upcomingForecast = useMemo(() => forecast.filter(f => f.category === 'upcoming_km'), [forecast]);

  /** Returns inline fluid specs for a service type, using the current engineSpec */
  const getFluidSpecLines = (serviceType: string): { label: string; value: string }[] => {
    const lines: { label: string; value: string }[] = [];
    if (!engineSpec) return lines;

    switch (serviceType) {
      case 'oil_change':
      case 'oil_filter':
        if (engineSpec.oilNorm) lines.push({ label: 'Oil', value: engineSpec.oilNorm });
        break;
      case 'brake_fluid':
        if (engineSpec.brakeFluidType) lines.push({ label: 'Brake Fluid', value: engineSpec.brakeFluidType });
        break;
      case 'coolant':
        if (engineSpec.coolantType) lines.push({ label: 'Coolant', value: engineSpec.coolantType });
        break;
      case 'transmission_fluid':
        if (engineSpec.gearboxOilType) {
          const val = engineSpec.gearboxOilCapacity
            ? `${engineSpec.gearboxOilType} — ${engineSpec.gearboxOilCapacity}`
            : engineSpec.gearboxOilType;
          lines.push({ label: 'Gearbox Oil', value: val });
        }
        break;
    }
    return lines;
  };

  const getFluidSpecsForServiceType = (item: ServiceForecastItem) => {
    return getFluidSpecLines(item.interval.serviceType);
  };

  const renderFluidSpecLines = (lines: { label: string; value: string }[]) => {
    if (lines.length === 0) return null;
    return (
      <div style={{ marginTop: '2px' }}>
        {lines.map((line, i) => (
          <p key={i} style={{ fontSize: '11px', color: 'var(--ion-color-medium)', margin: '1px 0' }}>
            {line.label}: <span style={{ fontWeight: 500 }}>{line.value}</span>
          </p>
        ))}
      </div>
    );
  };

  const renderForecastItem = (item: ServiceForecastItem) => {
    const isOverdue = item.status === 'overdue';
    const color = isOverdue ? 'danger' : 'primary';
    const fluidSpecs = getFluidSpecsForServiceType(item);

    return (
      <IonItem key={item.interval.id}>
        <IonChip
          slot="start"
          color={color}
          style={{ height: '10px', width: '10px', margin: '0 8px 0 0', padding: 0 }}
        />
        <IonLabel>
          <h3>{item.interval.name}</h3>
          {item.remainingKm !== null && (
            <p style={{ color: `var(--ion-color-${color})` }}>
              {isOverdue
                ? `Overdue by ${Math.abs(item.remainingKm).toLocaleString()} km`
                : `${item.dueAtKm?.toLocaleString()} km (in ${item.remainingKm.toLocaleString()} km)`
              }
              {item.remainingDays !== null && ` • ${Math.abs(item.remainingDays)} days`}
            </p>
          )}
          {item.remainingKm === null && item.remainingDays !== null && (
            <p style={{ color: `var(--ion-color-${color})` }}>
              {isOverdue
                ? `Overdue by ${Math.abs(item.remainingDays)} days`
                : `Due in ${item.remainingDays} days`
              }
            </p>
          )}
          {renderFluidSpecLines(fluidSpecs)}
        </IonLabel>
      </IonItem>
    );
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/dashboard" />
          </IonButtons>
          <IonTitle>{vehicle.name}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => setShowActions(true)}>
              <IonIcon icon={create} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {/* Vehicle Info Card */}
        <IonCard>
          <IonCardHeader>
            <IonCardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IonIcon icon={car} color="primary" />
              {vehicle.make} {vehicle.model} {vehicle.year}
            </IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {vehicle.licensePlate && (
                <div>
                  <p style={{ color: 'var(--ion-color-medium)', fontSize: '12px' }}>License Plate</p>
                  <p style={{ fontWeight: 500 }}>{vehicle.licensePlate || '-'}</p>
                </div>
              )}
              {vehicle.vin  && (
                <div>
                  <p style={{ color: 'var(--ion-color-medium)', fontSize: '12px' }}>VIN</p>
                  <p style={{ fontWeight: 500, fontSize: '12px' }}>{vehicle.vin || '-'}</p>
                </div>
              )}
              <div>
                <p style={{ color: 'var(--ion-color-medium)', fontSize: '12px' }}>Engine</p>
                <p style={{ fontWeight: 500 }}>
                  {vehicle.engineName || vehicle.engineCode || '-'}
                </p>
                {(vehicle.engineCode || vehicle.fuelType) && (
                  <p style={{ fontSize: '11px', color: 'var(--ion-color-medium)' }}>
                    {[vehicle.engineCode, vehicle.fuelType, vehicle.isTurbo ? 'Turbo' : vehicle.fuelType ? 'NA' : '']
                      .filter(Boolean)
                      .join(' • ')}
                  </p>
                )}
              </div>
              <div>
                <p style={{ color: 'var(--ion-color-medium)', fontSize: '12px' }}>Purchase Date</p>
                <p style={{ fontWeight: 500 }}>{vehicle.purchaseDate || '-'}</p>
              </div>
            </div>
            <div
              style={{
                marginTop: '12px',
                padding: '12px',
                background: 'var(--ion-color-light)',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
              onClick={() => {
                setNewMileage(vehicle.currentMileage);
                setShowEditMileage(true);
              }}
            >
              <p style={{ color: 'var(--ion-color-medium)', fontSize: '12px', margin: 0 }}>
                Current Mileage
              </p>
              <h2 style={{ margin: '4px 0 0 0' }}>
                {vehicle.currentMileage.toLocaleString()} km
                <IonIcon icon={create} style={{ marginLeft: '8px', fontSize: '16px', verticalAlign: 'middle' }} />
              </h2>
            </div>
            {/*<div style={{padding: '12px', background: 'var(--ion-color-warning-light)', borderRadius: 8, margin: '12px'}}>
              <IonText color="warning">
                <strong>If any vehicle info is wrong or missing, tap <IonIcon icon={create} style={{verticalAlign: 'middle'}} /> Edit Vehicle below to update it.</strong>
              </IonText>
            </div>*/}
          </IonCardContent>
        </IonCard>

        {/* Fluid Specifications Card — editable */}
        {engineSpec && (
          <IonCard button onClick={openEditFluidModal} style={{ cursor: 'pointer' }}>
            <IonCardHeader>
              <IonCardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px' }}>
                <IonIcon icon={informationCircle} color="primary" />
                Fluid Specifications
                <IonIcon icon={settings} slot="end" style={{ marginLeft: 'auto', fontSize: '16px', color: 'var(--ion-color-medium)' }} />
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              {(engineSpec.oilCapacity || engineSpec.oilNorm) && (
                <IonItem lines="none" style={{ '--padding-start': '0' } as any}>
                  <IonLabel>
                    <p style={{ fontSize: '12px', color: 'var(--ion-color-medium)' }}>Engine Oil</p>
                    <p style={{ fontWeight: 500, whiteSpace: 'pre-wrap' }}>
                      {engineSpec.oilCapacity ? `${engineSpec.oilCapacity} — ` : ''}{engineSpec.oilNorm || ''}
                    </p>
                  </IonLabel>
                </IonItem>
              )}
              {engineSpec.brakeFluidType && (
                <IonItem lines="none" style={{ '--padding-start': '0' } as any}>
                  <IonLabel>
                    <p style={{ fontSize: '12px', color: 'var(--ion-color-medium)' }}>Brake Fluid</p>
                    <p style={{ fontWeight: 500, whiteSpace: 'pre-wrap' }}>{engineSpec.brakeFluidType}</p>
                  </IonLabel>
                </IonItem>
              )}
              {engineSpec.coolantType && (
                <IonItem lines="none" style={{ '--padding-start': '0' } as any}>
                  <IonLabel>
                    <p style={{ fontSize: '12px', color: 'var(--ion-color-medium)' }}>Coolant</p>
                    <p style={{ fontWeight: 500, whiteSpace: 'pre-wrap' }}>{engineSpec.coolantType}</p>
                  </IonLabel>
                </IonItem>
              )}
              {engineSpec.gearboxOilType && (
                <IonItem lines="none" style={{ '--padding-start': '0' } as any}>
                  <IonLabel>
                    <p style={{ fontSize: '12px', color: 'var(--ion-color-medium)' }}>Gearbox Oil</p>
                    <p style={{ fontWeight: 500, whiteSpace: 'pre-wrap' }}>
                      {engineSpec.gearboxOilType}{engineSpec.gearboxOilCapacity ? ` — ${engineSpec.gearboxOilCapacity}` : ''}
                    </p>
                  </IonLabel>
                </IonItem>
              )}
            </IonCardContent>
          </IonCard>
        )}

        {/* Status Summary */}
        {(overdueCount > 0 || dueSoonCount > 0) && (
          <div style={{ display: 'flex', gap: '8px', padding: '0 12px 12px' }}>
            {overdueCount > 0 && (
              <IonChip color="danger">
                {overdueCount} {overdueCount === 1 ? 'service' : 'services'} overdue
              </IonChip>
            )}
            {dueSoonCount > 0 && (
              <IonChip color="warning">
                {dueSoonCount} {dueSoonCount === 1 ? 'service' : 'services'} due soon
              </IonChip>
            )}
          </div>
        )}

        {/* Tabs: Intervals / History / Upcoming */}
        <IonSegment value={activeTab} onIonChange={e => setActiveTab(e.detail.value as any)}>
          <IonSegmentButton value="intervals">
            <IonIcon icon={time} />
            <IonLabel>Services</IonLabel>
          </IonSegmentButton>
          <IonSegmentButton value="history">
            <IonIcon icon={hammer} />
            <IonLabel>History</IonLabel>
          </IonSegmentButton>
          <IonSegmentButton value="upcoming">
            <IonIcon icon={calendar} />
            <IonLabel>Upcoming</IonLabel>
          </IonSegmentButton>
        </IonSegment>

        {activeTab === 'intervals' && (
          <IonList>
            {reminders.length === 0 ? (
              <div className="ion-padding ion-text-center">
                <p style={{ color: 'var(--ion-color-medium)' }}>No services configured</p>
              </div>
            ) : (
              reminders.map(reminder => (
                <IonItem key={reminder.interval.id}>
                  <IonChip
                    slot="start"
                    color={getStatusColor(reminder.status)}
                    style={{ height: '10px', width: '10px', margin: '0 8px 0 0', padding: 0 }}
                  />
                  <IonLabel>
                    <h3>{reminder.interval.name}</h3>
                    <p>
                      {reminder.interval.intervalMileage && `Every ${reminder.interval.intervalMileage.toLocaleString()} km`}
                      {reminder.interval.intervalMileage && reminder.interval.intervalMonths && ' / '}
                      {reminder.interval.intervalMonths && `Every ${reminder.interval.intervalMonths} months`}
                    </p>
                    {reminder.status !== 'ok' && (
                      <p style={{ color: `var(--ion-color-${getStatusColor(reminder.status)})` }}>
                        {reminder.status === 'overdue' ? 'OVERDUE' : 'Due Soon'}
                        {reminder.remainingKm !== null && reminder.remainingKm <= 0 && ` by ${Math.abs(reminder.remainingKm).toLocaleString()} km`}
                        {reminder.remainingKm !== null && reminder.remainingKm > 0 && ` in ${reminder.remainingKm.toLocaleString()} km`}
                        {reminder.remainingDays !== null && reminder.remainingDays <= 0 && ` by ${Math.abs(reminder.remainingDays)} days`}
                        {reminder.remainingDays !== null && reminder.remainingDays > 0 && ` in ${reminder.remainingDays} days`}
                      </p>
                    )}
                    {reminder.interval.lastPerformedDate && (
                      <p style={{ fontSize: '12px', color: 'var(--ion-color-medium)' }}>
                        Last: {reminder.interval.lastPerformedDate}
                        {reminder.interval.lastPerformedMileage && ` at ${reminder.interval.lastPerformedMileage.toLocaleString()} km`}
                      </p>
                    )}
                    {/* Inline fluid specs for this service type */}
                    {renderFluidSpecLines(getFluidSpecLines(reminder.interval.serviceType))}
                  </IonLabel>
                  <IonButton
                    slot="end"
                    fill="clear"
                    color="success"
                    onClick={() => {
                      setSelectedIntervalId(reminder.interval.id);
                      setRecordMileage(vehicle.currentMileage);
                      setRecordDate(new Date().toISOString().split('T')[0]);
                      setShowPerformService(true);
                    }}
                  >
                    <IonIcon icon={checkmark} />
                  </IonButton>
                </IonItem>
              ))
            )}
          </IonList>
        )}

        {activeTab === 'upcoming' && (
          <IonList>
            {forecast.length === 0 ? (
              <div className="ion-padding ion-text-center">
                <p style={{ color: 'var(--ion-color-medium)' }}>No upcoming or missed services</p>
              </div>
            ) : (
              <>
                {/* Missed Services Section */}
                {missedForecast.length > 0 && (
                  <>
                    <div style={{ padding: '8px 16px 4px', fontWeight: 600, color: 'var(--ion-color-danger)', fontSize: '14px' }}>
                      <IonIcon icon={alertCircle} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                      Missed Services
                    </div>
                    {missedForecast.map(item => renderForecastItem(item))}
                  </>
                )}

                {/* Upcoming in 10000km Section */}
                {upcomingForecast.length > 0 && (
                  <>
                    <div style={{ padding: '8px 16px 4px', fontWeight: 600, color: 'var(--ion-color-primary)', fontSize: '14px' }}>
                      <IonIcon icon={calendar} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                      Upcoming in 10,000 km
                    </div>
                    {upcomingForecast.map(item => renderForecastItem(item))}
                  </>
                )}
              </>
            )}
          </IonList>
        )}

        {activeTab === 'history' && (
          <IonList>
            {records.length === 0 ? (
              <div className="ion-padding ion-text-center">
                <p style={{ color: 'var(--ion-color-medium)' }}>No service history yet</p>
              </div>
            ) : (
              records.map(record => (
                <IonItem key={record.id}>
                  <IonIcon icon={hammer} slot="start" color="medium" />
                  <IonLabel>
                    <h3>{record.name}</h3>
                    <p>
                      {record.performedAtDate} at {record.performedAtMileage.toLocaleString()} km
                    </p>
                    {record.cost && <p>Cost: {record.cost} TND</p>}
                    {record.notes && <p style={{ fontSize: '12px' }}>{record.notes}</p>}
                    {record.workshop && <p style={{ fontSize: '12px' }}>Workshop: {record.workshop}</p>}
                  </IonLabel>
                </IonItem>
              ))
            )}
          </IonList>
        )}

        {/* Edit/Delete Action Sheet */}
        <IonActionSheet
          isOpen={showActions}
          onDidDismiss={() => setShowActions(false)}
          buttons={[
            {
              text: 'Edit Vehicle',
              icon: create,
              handler: () => history.push(`/add-vehicle/${vehicle.id}`),
            },
            {
              text: 'Edit Engine Details',
              icon: settings,
              handler: () => setShowEditEngine(true),
            },
            {
              text: 'Edit Fluid Specs',
              icon: informationCircle,
              handler: () => openEditFluidModal(),
            },
            {
              text: 'Delete Vehicle',
              icon: trash,
              role: 'destructive',
              handler: handleDeleteVehicle,
            },
            {
              text: 'Cancel',
              role: 'cancel',
            },
          ]}
        />

        {/* Engine Detail Edit Modal */}
        <EngineDetailModal
          isOpen={showEditEngine}
          engineCode={vehicle.engineCode || vehicle.engineName || ''}
          onClose={() => setShowEditEngine(false)}
          onSave={handleSaveEngine}
        />

        {/* Edit Fluid Specs Modal */}
        <IonModal isOpen={showEditFluidModal} onDidDismiss={() => setShowEditFluidModal(false)}>
          <IonHeader>
            <IonToolbar color="primary">
              <IonTitle>Edit Fluid Specs</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowEditFluidModal(false)}>Cancel</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonList>
              <IonItem>
                <IonLabel position="stacked">Engine Oil Norm</IonLabel>
                <IonInput
                  value={editOilNorm}
                  placeholder="e.g., 5W-30"
                  onIonChange={e => setEditOilNorm(e.detail.value || '')}
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Brake Fluid Type</IonLabel>
                <IonInput
                  value={editBrakeFluidType}
                  placeholder="e.g., DOT 4"
                  onIonChange={e => setEditBrakeFluidType(e.detail.value || '')}
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Coolant Type</IonLabel>
                <IonInput
                  value={editCoolantType}
                  placeholder="e.g., Ethylene Glycol"
                  onIonChange={e => setEditCoolantType(e.detail.value || '')}
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Gearbox Oil Type</IonLabel>
                <IonInput
                  value={editGearboxOilType}
                  placeholder="e.g., Manual 75W-80"
                  onIonChange={e => setEditGearboxOilType(e.detail.value || '')}
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Gearbox Oil Capacity</IonLabel>
                <IonInput
                  value={editGearboxOilCapacity}
                  placeholder="e.g., 3.5L"
                  onIonChange={e => setEditGearboxOilCapacity(e.detail.value || '')}
                />
              </IonItem>
            </IonList>
            <div style={{ padding: '12px' }}>
              <IonButton expand="block" onClick={handleSaveFluidSpecs}>
                Save Fluid Specs
              </IonButton>
            </div>
          </IonContent>
        </IonModal>

        {/* Perform Service Modal */}
        <IonModal isOpen={showPerformService} onDidDismiss={() => setShowPerformService(false)}>
          <IonHeader>
            <IonToolbar color="primary">
              <IonTitle>Log Service</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowPerformService(false)}>Cancel</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonList>
              <IonItem>
                <IonLabel position="stacked">Date</IonLabel>
                <IonInput
                  type="date"
                  value={recordDate}
                  onIonChange={e => setRecordDate(e.detail.value || new Date().toISOString().split('T')[0])}
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Mileage at service</IonLabel>
                <IonInput
                  type="number"
                  value={recordMileage}
                  onIonChange={e => setRecordMileage(parseInt(e.detail.value || '0') || 0)}
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Cost (optional)</IonLabel>
                <IonInput
                  type="number"
                  value={recordCost}
                  onIonChange={e => setRecordCost(parseInt(e.detail.value || '0') || 0)}
                  placeholder="0"
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Workshop (optional)</IonLabel>
                <IonInput
                  value={recordWorkshop}
                  placeholder="e.g., Renault Garage"
                  onIonChange={e => setRecordWorkshop(e.detail.value || '')}
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Notes (optional)</IonLabel>
                <IonInput
                  value={recordNotes}
                  placeholder="Any notes about the service"
                  onIonChange={e => setRecordNotes(e.detail.value || '')}
                />
              </IonItem>
            </IonList>
            <div style={{ padding: '12px' }}>
              <IonButton expand="block" onClick={handlePerformService}>
                <IonIcon icon={checkmark} slot="start" />
                Confirm Service
              </IonButton>
            </div>
          </IonContent>
        </IonModal>

        {/* Edit Mileage Modal */}
        <IonModal isOpen={showEditMileage} onDidDismiss={() => setShowEditMileage(false)}>
          <IonHeader>
            <IonToolbar color="primary">
              <IonTitle>Update Mileage</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowEditMileage(false)}>Cancel</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonList>
              <IonItem>
                <IonLabel position="stacked">Current Mileage (km)</IonLabel>
                <IonInput
                  type="number"
                  value={newMileage}
                  onIonChange={e => setNewMileage(parseInt(e.detail.value || '0') || 0)}
                />
              </IonItem>
            </IonList>
            <div style={{ padding: '12px' }}>
              <IonButton expand="block" onClick={handleUpdateMileage}>
                Update Mileage
              </IonButton>
            </div>
          </IonContent>
        </IonModal>

        <IonToast
          isOpen={showToast}
          message={toastMsg}
          duration={2000}
          onDidDismiss={() => setShowToast(false)}
        />
      </IonContent>
    </IonPage>
  );
};

export default VehicleDetail;