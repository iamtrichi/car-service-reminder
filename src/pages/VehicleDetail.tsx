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
  IonCardContent,
  IonItem,
  IonLabel,
  IonList,
  IonChip,
  IonModal,
  IonInput,
  IonActionSheet,
  IonToast,
  IonSegment,
  IonSegmentButton,
} from '@ionic/react';
import { useParams, useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  create,
  trash,
  checkmark,
  hammer,
  informationCircle,
  time,
  speedometer,
  calendar,
  alertCircle,
  settings,
  water,
  documentText,
  construct,
  albums,
} from 'ionicons/icons';
import { useVehicleStore } from '../store/vehicleStore';
import { calculateReminderStatus, formatRemaining, getUpcomingServiceForecast } from '../services/reminderService';
import type { ServiceForecastItem } from '../services/reminderService';
import { getEngineSpecsForVehicle } from '../services/serviceConfigService';
import { ServiceRecord, ServiceType, EngineSpec, EngineVariant } from '../types';
import EngineDetailModal from '../components/EngineDetailModal';
import { interstitial } from '../services/admobUtilits';
import { getFirstCarImage } from '../services/imageService';

const VehicleDetail: React.FC = () => {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const history = useHistory();
  const { t } = useTranslation();
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
  const [editEngineModalKey, setEditEngineModalKey] = useState(0);

  const vehicle = vehicles.find(v => v.id === vehicleId);
  const intervals = serviceIntervals.filter(i => i.vehicleId === vehicleId);
  const records = serviceRecords.filter(r => r.vehicleId === vehicleId).sort(
    (a, b) => new Date(b.performedAtDate).getTime() - new Date(a.performedAtDate).getTime()
  );

  useEffect(() => {
    getFirstCarImage(`${vehicle?.make} ${vehicle?.model} ${vehicle?.year}`).then(console.log)
  }, [vehicle])
  const reminders = useMemo(() => {
    if (!vehicle) return [];
    return intervals.map(interval => {
      const status = calculateReminderStatus(interval, vehicle);
      return { interval, vehicle, ...status };
    });
  }, [vehicle, intervals]);

  const sortedReminders = useMemo(() => {
    return [...reminders].sort((a, b) => {
      // Sort order: overdue (0) → due_soon (1) → ok (2)
      // This displays overdue services first (red), then due soon (amber), then ok services (green)
      const order = { overdue: 0, due_soon: 1, ok: 2 };
      return order[a.status] - order[b.status];
    });
  }, [reminders]);

  // Load engine specs from config, merging with vehicle-level overrides
  useEffect(() => {
    if (vehicle) {
      getEngineSpecsForVehicle(vehicle).then(configSpec => {
        if (configSpec) {
          // Merge config defaults with user's local vehicle overrides.
          // Vehicle's own fluid specs (oilNorm, brakeFluidType, etc.) take precedence.
          setEngineSpec({
            ...configSpec,
            oilNorm: vehicle.oilNorm || configSpec.oilNorm,
            brakeFluidType: vehicle.brakeFluidType || configSpec.brakeFluidType,
            coolantType: vehicle.coolantType || configSpec.coolantType,
            gearboxOilType: vehicle.gearboxOilType || configSpec.gearboxOilType,
            gearboxOilCapacity: vehicle.gearboxOilCapacity || configSpec.gearboxOilCapacity,
          });
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
    // Immediately refresh engineSpec with the saved values
    setEngineSpec(prev => prev ? {
      ...prev,
      oilNorm: updated.oilNorm || prev.oilNorm,
      brakeFluidType: updated.brakeFluidType || prev.brakeFluidType,
      coolantType: updated.coolantType || prev.coolantType,
      gearboxOilType: updated.gearboxOilType || prev.gearboxOilType,
      gearboxOilCapacity: updated.gearboxOilCapacity || prev.gearboxOilCapacity,
    } : null);
    setToastMsg(t('vehicleDetail.toastFluidUpdated'));
    setShowToast(true);
  };

  const handleSaveEngine = (engine: EngineVariant) => {
    if (!vehicle) return;
    const updated = {
      ...vehicle,
      engineCode: engine.engineCode || vehicle.engineCode,
      engineName: engine.engineName || vehicle.engineName,
      hp: engine.hp || vehicle.hp || 0,
      engineDisplacement: engine.displacement || vehicle.engineDisplacement,
      fuelType: engine.fuelType || vehicle.fuelType,
      isTurbo: engine.isTurbo ?? vehicle.isTurbo ?? false,
      oilNorm: engine.oilNorm || vehicle.oilNorm,
      brakeFluidType: engine.brakeFluidType || vehicle.brakeFluidType,
      coolantType: engine.coolantType || vehicle.coolantType,
      gearboxOilType: engine.gearboxOilType || vehicle.gearboxOilType,
      gearboxOilCapacity: engine.gearboxOilCapacity || vehicle.gearboxOilCapacity,
    };
    updateVehicle(updated);
    setShowEditEngine(false);
    setToastMsg(t('vehicleDetail.toastEngineUpdated'));
    setShowToast(true);
    // Refresh engine spec from local vehicle data
    if (updated.oilNorm || updated.brakeFluidType || updated.coolantType || updated.gearboxOilType) {
      setEngineSpec({
        engineCode: updated.engineCode || '',
        engineName: updated.engineName,
        oilNorm: updated.oilNorm,
        brakeFluidType: updated.brakeFluidType,
        coolantType: updated.coolantType,
        gearboxOilType: updated.gearboxOilType,
        gearboxOilCapacity: updated.gearboxOilCapacity,
      });
    }
  };

  const handlePerformService = () => {
    if (!selectedIntervalId || !vehicle) return;

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
    setToastMsg(t('vehicleDetail.toastServiceRecorded'));
    setShowToast(true);
  };

  const handleDeleteVehicle = () => {
    if (!vehicle) return;
    const id = vehicle.id;
    deleteVehicle(id);
    history.replace('/dashboard');
  };

  const handleUpdateMileage = () => {
    if (!vehicle) return;
    updateMileage(vehicle.id, newMileage);
    setShowEditMileage(false);
    setToastMsg(t('vehicleDetail.toastMileageUpdated'));
    setShowToast(true);
  };

  /** Vibrant status color for sidebar dots — uses solid, high-contrast colors */
  const getStatusDotColor = (status: string) => {
    switch (status) {
      case 'overdue': return 'danger';     // bold red
      case 'due_soon': return 'warning';   // bold amber
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
        if (engineSpec.oilNorm) lines.push({ label: t('vehicleDetail.engineOil'), value: engineSpec.oilNorm });
        break;
      case 'brake_fluid':
        if (engineSpec.brakeFluidType) lines.push({ label: t('vehicleDetail.brakeFluid'), value: engineSpec.brakeFluidType });
        break;
      case 'coolant':
        if (engineSpec.coolantType) lines.push({ label: t('vehicleDetail.coolant'), value: engineSpec.coolantType });
        break;
      case 'transmission_fluid':
        if (engineSpec.gearboxOilType) {
          const val = engineSpec.gearboxOilCapacity
            ? `${engineSpec.gearboxOilType} — ${engineSpec.gearboxOilCapacity}`
            : engineSpec.gearboxOilType;
          lines.push({ label: t('vehicleDetail.gearboxOil'), value: val });
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
          <p key={i} style={{ fontSize: '11px', color: '#666', margin: '1px 0' }}>
            {line.label}: <span style={{ fontWeight: 500 }}>{line.value}</span>
          </p>
        ))}
      </div>
    );
  };

  /** Returns a color based on how close the service is (calm blue → amber → brick red) */
  const getForecastColor = (item: ServiceForecastItem): string => {
    if (item.status === 'overdue') return 'danger';
    let remaining = 1;
    if (item.remainingKm !== null && item.interval.intervalMileage && item.interval.intervalMileage > 0) {
      remaining = Math.min(remaining, item.remainingKm / item.interval.intervalMileage);
    }
    if (item.remainingDays !== null && item.interval.intervalMonths && item.interval.intervalMonths > 0) {
      remaining = Math.min(remaining, Math.max(0, item.remainingDays / (item.interval.intervalMonths * 30)));
    }
    if (remaining > 0.6) return 'primary';      // far out — calm blue
    if (remaining > 0.2) return 'warning';       // approaching — amber
    return 'danger';                              // imminent — brick red
  };
  
  useEffect(() => {
    if(activeTab === 'history' || activeTab === 'fluids') {
      interstitial();
    }
  }, [activeTab])

  const renderForecastItem = (item: ServiceForecastItem) => {
    const isOverdue = item.status === 'overdue';
    const dotColor = isOverdue ? 'danger' : getForecastColor(item);
    // Text uses a dark neutral color for readability; the dot provides the color signal
    const textColor = '#333';
    const fluidSpecs = getFluidSpecsForServiceType(item);

    return (
      <IonItem key={item.interval.id} onClick={() => {setActiveTab('intervals')}}>
        <IonChip
          slot="start"
          color={dotColor}
          style={{ height: '10px', width: '10px', margin: '0 8px 0 0', padding: 0 }}
        />
        <IonLabel>
          <h3>{item.interval.name}</h3>
          <p style={{ color: textColor }}>
            {formatRemaining(item)}
          </p>
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
          <IonTitle>{vehicle?.make && vehicle?.model && vehicle?.year ? `${vehicle.make} ${vehicle.model} ${vehicle.year}` : t('vehicleDetail.title')}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => setShowActions(true)} disabled={!vehicle}>
              <IonIcon icon={create} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
        {!vehicle ? (
          <div className="ion-padding ion-text-center" style={{ marginTop: '40%' }}>
            <p>{t('vehicleDetail.notFound')}</p>
            <IonButton onClick={() => history.push('/dashboard')}>{t('vehicleDetail.backToDashboard')}</IonButton>
          </div>
        ) : (
        <>
        {/* Vehicle Info Card */}
        <IonCard color="primary" style={{margin: '0px 0px 0px 0px', borderRadius: '0px'}}>
          <IonCardContent>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '12px' }}>{t('vehicleDetail.engine')}</p>
                <p style={{ fontWeight: 500 }}>
                  {vehicle.engineName || vehicle.engineCode || '-'}{' '}{vehicle.hp}{' hp'}
                </p>
                {(vehicle.engineCode || vehicle.fuelType) && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                    {[vehicle.engineCode, vehicle.fuelType, vehicle.isTurbo ? 'Turbo' : vehicle.fuelType ? 'NA' : '']
                      .filter(Boolean)
                      .map((part, idx) => (
                        <span key={idx} style={{
                          fontSize: '10px',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          background: 'rgba(255, 255, 255, 0.2)',
                          color: 'rgba(255, 255, 255, 0.9)',
                          fontWeight: 500,
                          letterSpacing: '0.3px',
                        }}>
                          {part}
                        </span>
                      ))}
                  </div>
                )}
              </div>
              {vehicle.licensePlate && (
                <div>
                  <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '12px' }}>{t('vehicleDetail.licensePlate')}</p>
                  <p style={{ fontWeight: 500 }}>{vehicle.licensePlate || '-'}</p>
                </div>
              )}
              {vehicle.vin  && (
                <div>
                  <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '12px' }}>{t('vehicleDetail.vin')}</p>
                  <p style={{ fontWeight: 500, fontSize: '12px' }}>{vehicle.vin || '-'}</p>
                </div>
              )}
              <div>
                <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '12px' }}>{t('vehicleDetail.purchaseDate')}</p>
                <p style={{ fontWeight: 500 }}>{vehicle.purchaseDate || '-'}</p>
              </div>
            </div>
            <div
              style={{
                marginTop: '12px',
                padding: '8px 12px',
                background: 'var(--ion-color-light)',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
              onClick={() => {
                setNewMileage(vehicle.currentMileage);
                setShowEditMileage(true);
              }}
            >
              <p style={{ color: 'var(--ion-color-medium)', fontSize: '12px', margin: 0, }}>
                {t('vehicleDetail.currentMileage')}
              </p>
              <h2 style={{ margin: '4px 0 0 0', color: 'black', display: 'flex', alignItems: 'center', fontWeight: 'bolder' }} >
                <IonIcon icon={speedometer} color="primary" size="large" style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                {vehicle.currentMileage.toLocaleString()} {t('common.kmUnit')}
                <IonIcon icon={create} color="medium" style={{ marginLeft: '8px', fontSize: 'larger', verticalAlign: 'middle' }} />
              </h2>
            </div>
          </IonCardContent>
        </IonCard>
        {/* Tabs: upcoming / intervals / fluids / history */}
        <IonSegment scrollable={true} color="light" value={activeTab} onIonChange={e => setActiveTab(e.detail.value as any)}>
          <IonSegmentButton value="upcoming">
            <IonIcon icon={calendar} />
            <IonLabel>{t('vehicleDetail.tabUpcoming')}</IonLabel>
          </IonSegmentButton>
          <IonSegmentButton value="intervals">
            <IonIcon icon={construct} />
            <IonLabel>{t('vehicleDetail.tabServices')}</IonLabel>
          </IonSegmentButton>
          <IonSegmentButton value="fluids">
            <IonIcon icon={documentText} />
            <IonLabel>{t('vehicleDetail.tabFluids')}</IonLabel>
          </IonSegmentButton>
          <IonSegmentButton value="history">
            <IonIcon icon={albums} />
            <IonLabel>{t('vehicleDetail.tabHistory')}</IonLabel>
          </IonSegmentButton>
        </IonSegment>
        </>
        )}
      </IonHeader>
      <IonContent>
        {!vehicle ? (
          <div className="ion-padding ion-text-center" style={{ marginTop: '40%' }}>
            <p>{t('vehicleDetail.notFound')}</p>
            <IonButton onClick={() => history.push('/dashboard')}>{t('vehicleDetail.backToDashboard')}</IonButton>
          </div>
        ) : (
        <>
        {/* Status Summary */}
        {(overdueCount > 0 || dueSoonCount > 0) && activeTab === 'intervals' && (
          <div style={{ display: 'flex', gap: '8px', padding: '12px 12px 0px', fontWeight: 'bolder' }}>
            {overdueCount > 0 && (
              <IonChip color="danger">
                {t('vehicleDetail.serviceOverdue', { count: overdueCount, plural: overdueCount === 1 ? t('dashboard.service', { count: 1 }) : t('dashboard.services', { count: overdueCount }) })}
              </IonChip>
            )}
            {dueSoonCount > 0 && (
              <IonChip color="warning">
                {t('vehicleDetail.serviceDueSoon', { count: dueSoonCount, plural: dueSoonCount === 1 ? t('dashboard.service', { count: 1 }) : t('dashboard.services', { count: dueSoonCount }) })}
              </IonChip>
            )}
          </div>
        )}

        {activeTab === 'intervals' && (
          <IonList>
            {sortedReminders.length === 0 ? (
              <div className="ion-padding ion-text-center">
                <p style={{ color: 'var(--ion-color-medium)' }}>{t('vehicleDetail.noServices')}</p>
              </div>
            ) : (
              sortedReminders.map(reminder => (
                <IonItem key={reminder.interval.id} onClick={() => {
                      setSelectedIntervalId(reminder.interval.id);
                      setRecordMileage(vehicle.currentMileage);
                      setRecordDate(new Date().toISOString().split('T')[0]);
                      setShowPerformService(true);
                    }}>
                  <IonChip
                    slot="start"
                    color={getStatusDotColor(reminder.status)}
                    style={{ height: '10px', width: '10px', margin: '0 8px 0 0', padding: 0 }}
                  />
                  <IonLabel>
                    <h3>{reminder.interval.name}</h3>
                    <p style={{ color: '#555' }}>
                      {reminder.interval.intervalMileage && t('vehicleDetail.everyKm', { km: reminder.interval.intervalMileage.toLocaleString() })}
                      {reminder.interval.intervalMileage && reminder.interval.intervalMonths && ' / '}
                      {reminder.interval.intervalMonths && t('vehicleDetail.everyMonths', { months: reminder.interval.intervalMonths })}
                    </p>
                    {reminder.status !== 'ok' && (
                      <p style={{ color: reminder.status === 'overdue' ? '#B22222' : '#C4841D' }}>
                        {reminder.status === 'overdue' ? t('vehicleDetail.overdue') : t('vehicleDetail.dueSoon')}
                        {reminder.remainingKm !== null && reminder.remainingKm <= 0 && ` — ${t('vehicleDetail.kmOverdue', { km: Math.abs(reminder.remainingKm).toLocaleString() })}`}
                        {reminder.remainingKm !== null && reminder.remainingKm > 0 && ` — ${t('vehicleDetail.kmRemaining', { km: reminder.remainingKm.toLocaleString() })}`}
                        {reminder.remainingDays !== null && reminder.remainingDays <= 0 && ` — ${t('vehicleDetail.daysOverdue', { days: Math.abs(reminder.remainingDays) })}`}
                        {reminder.remainingDays !== null && reminder.remainingDays > 0 && ` — ${t('vehicleDetail.daysRemaining', { days: reminder.remainingDays })}`}
                      </p>
                    )}
                    {reminder.interval.lastPerformedDate && (
                      <p style={{ fontSize: '12px', color: '#666' }}>
                        {t('vehicleDetail.last')} {reminder.interval.lastPerformedDate}
                        {reminder.interval.lastPerformedMileage && ` ${t('vehicleDetail.atKm', { km: reminder.interval.lastPerformedMileage.toLocaleString() })}`}
                      </p>
                    )}
                    {/* Inline fluid specs for this service type */}
                    {renderFluidSpecLines(getFluidSpecLines(reminder.interval.serviceType))}
                  </IonLabel>
                  <IonButton
                    slot="end"
                    fill="clear"
                    color={reminder.status === 'overdue' ? 'danger' : reminder.status === 'due_soon' ? 'warning' : 'success'}
                  >
                    <IonIcon icon={reminder.status === 'overdue' ? alertCircle : reminder.status === 'due_soon' ? time : checkmark} />
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
                <p style={{ color: 'var(--ion-color-medium)' }}>{t('vehicleDetail.noUpcoming')}</p>
              </div>
            ) : (
              <>
                {/* Missed Services Section */}
                {missedForecast.length > 0 && (
                  <>
                    <div style={{ padding: '8px 16px 4px', fontWeight: 600, color: 'var(--ion-color-danger)', fontSize: '14px' }}>
                      <IonIcon icon={alertCircle} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                      {t('vehicleDetail.missedServices')}
                    </div>
                    {missedForecast.map(item => renderForecastItem(item))}
                  </>
                )}

                {/* Upcoming in 10000km Section */}
                {upcomingForecast.length > 0 && (
                  <>
                    <div style={{ padding: '8px 16px 4px', fontWeight: 600, color: 'var(--ion-color-primary)', fontSize: '14px' }}>
                      <IonIcon icon={calendar} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                      {t('vehicleDetail.upcomingIn')}
                    </div>
                    {upcomingForecast.map(item => renderForecastItem(item))}
                  </>
                )}
              </>
            )}
          </IonList>
        )}

        {activeTab === 'fluids' && (
          <IonList>
            {engineSpec ? (
              <>
                <IonItem lines="full">
                  <IonLabel>
                    <h3>{t('vehicleDetail.fluidSpecs')}</h3>
                  </IonLabel>
                  <IonButton slot="end" fill="clear" onClick={openEditFluidModal} style={{fontSize: 'larger'}}>
                    <IonIcon icon={create} slot="icon-only" />
                  </IonButton>
                </IonItem>
                {(engineSpec.oilCapacity || engineSpec.oilNorm) && (
                  <IonItem lines="none">
                    {/* Custom Color engine-oil used */}
                    <IonIcon icon={water} slot="start" color="engine-oil" />
                    <IonLabel>
                      <p style={{ fontSize: '12px', color: 'var(--ion-color-medium)' }}>{t('vehicleDetail.engineOil')}</p>
                      <p style={{ fontWeight: 500, whiteSpace: 'pre-wrap' }}>
                        {engineSpec.oilCapacity ? `${engineSpec.oilCapacity} — ` : ''}{engineSpec.oilNorm || ''}
                      </p>
                    </IonLabel>
                  </IonItem>
                )}
                {engineSpec.brakeFluidType && (
                  <IonItem lines="none">
                    {/* Custom Color brake-fluid used */}
                    <IonIcon icon={alertCircle} slot="start" color="brake-fluid" />
                    <IonLabel>
                      <p style={{ fontSize: '12px', color: 'var(--ion-color-medium)' }}>{t('vehicleDetail.brakeFluid')}</p>
                      <p style={{ fontWeight: 500, whiteSpace: 'pre-wrap' }}>{engineSpec.brakeFluidType}</p>
                    </IonLabel>
                  </IonItem>
                )}
                {engineSpec.coolantType && (
                  <IonItem lines="none">
                    {/* Custom Color coolant-pink used */}
                    <IonIcon icon={water} slot="start" color="coolant-pink" />
                    <IonLabel>
                      <p style={{ fontSize: '12px', color: 'var(--ion-color-medium)' }}>{t('vehicleDetail.coolant')}</p>
                      <p style={{ fontWeight: 500, whiteSpace: 'pre-wrap' }}>{engineSpec.coolantType}</p>
                    </IonLabel>
                  </IonItem>
                )}
                {engineSpec.gearboxOilType && (
                  <IonItem lines="none">
                    {/* Custom Color gear-oil used */}
                    <IonIcon icon={settings} slot="start" color="gear-oil" />
                    <IonLabel>
                      <p style={{ fontSize: '12px', color: 'var(--ion-color-medium)' }}>{t('vehicleDetail.gearboxOil')}</p>
                      <p style={{ fontWeight: 500, whiteSpace: 'pre-wrap' }}>
                        {engineSpec.gearboxOilType}{engineSpec.gearboxOilCapacity ? ` — ${engineSpec.gearboxOilCapacity}` : ''}
                      </p>
                    </IonLabel>
                  </IonItem>
                )}
              </>
            ) : (
              <div className="ion-padding ion-text-center">
                <p style={{ color: 'var(--ion-color-medium)' }}>{t('vehicleDetail.noFluids')}</p>
              </div>
            )}
          </IonList>
        )}

        {activeTab === 'history' && (
          <IonList>
            {records.length === 0 ? (
              <div className="ion-padding ion-text-center">
                <p style={{ color: 'var(--ion-color-medium)' }}>{t('vehicleDetail.noHistory')}</p>
              </div>
            ) : (
              records.map(record => (
                <IonItem key={record.id}>
                  <IonIcon icon={hammer} slot="start" color="medium" />
                  <IonLabel>
                    <h3>{record.name}</h3>
                    <p>
                      {record.performedAtDate} {t('vehicleDetail.atKm', { km: record.performedAtMileage.toLocaleString() })}
                    </p>
                    {record.cost && <p>{t('vehicleDetail.cost')} {t('vehicleDetail.costCurrency', { cost: record.cost })}</p>}
                    {record.notes && <p style={{ fontSize: '12px' }}>{record.notes}</p>}
                    {record.workshop && <p style={{ fontSize: '12px' }}>{t('vehicleDetail.workshop')} {record.workshop}</p>}
                  </IonLabel>
                </IonItem>
              ))
            )}
          </IonList>
        )}
        </>
        )}

        {/* Edit/Delete Action Sheet (always rendered, but only works when vehicle exists) */}
        <IonActionSheet
          isOpen={showActions}
          onDidDismiss={() => setShowActions(false)}
          buttons={[
            {
              text: t('vehicleDetail.editVehicle'),
              icon: create,
              handler: () => vehicle && history.push(`/add-vehicle/${vehicle.id}`),
            },
            {
              text: t('vehicleDetail.editEngine'),
              icon: settings,
              handler: () => {
                setEditEngineModalKey(k => k + 1);
                setShowEditEngine(true);
              },
            },
            {
              text: t('vehicleDetail.editFluids'),
              icon: informationCircle,
              handler: () => openEditFluidModal(),
            },
            {
              text: t('vehicleDetail.deleteVehicle'),
              icon: trash,
              role: 'destructive',
              handler: handleDeleteVehicle,
            },
            {
              text: t('common.cancel'),
              role: 'cancel',
            },
          ]}
        />

        {/* Engine Detail Edit Modal */}
        {vehicle && (
        <EngineDetailModal
          key={editEngineModalKey}
          isOpen={showEditEngine}
          engineCode={vehicle.engineCode || vehicle.engineName || ''}
          initialData={{
            engineName: vehicle.engineName,
            hp: vehicle.hp,
            displacement: vehicle.engineDisplacement,
            fuelType: vehicle.fuelType,
            isTurbo: vehicle.isTurbo,
            oilNorm: vehicle.oilNorm,
            brakeFluidType: vehicle.brakeFluidType,
            coolantType: vehicle.coolantType,
            gearboxOilType: vehicle.gearboxOilType,
            gearboxOilCapacity: vehicle.gearboxOilCapacity,
          }}
          onClose={() => setShowEditEngine(false)}
          onSave={handleSaveEngine}
        />
        )}

        {/* Edit Fluid Specs Modal */}
        <IonModal isOpen={showEditFluidModal} onDidDismiss={() => setShowEditFluidModal(false)}>
          <IonHeader>
            <IonToolbar color="primary">
              <IonTitle>{t('vehicleDetail.editFluidSpecs')}</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowEditFluidModal(false)}>{t('common.cancel')}</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonList>
              <IonItem>
                <IonLabel position="stacked">{t('vehicleDetail.oilNorm')}</IonLabel>
                <IonInput
                  value={editOilNorm}
                  placeholder={t('vehicleDetail.oilPlaceholder')}
                  onIonChange={e => setEditOilNorm(e.detail.value || '')}
                  onIonInput={e => setEditOilNorm(e.detail.value || '')}
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">{t('vehicleDetail.brakeFluidType')}</IonLabel>
                <IonInput
                  value={editBrakeFluidType}
                  placeholder={t('vehicleDetail.brakeFluidPlaceholder')}
                  onIonChange={e => setEditBrakeFluidType(e.detail.value || '')}
                  onIonInput={e => setEditBrakeFluidType(e.detail.value || '')}
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">{t('vehicleDetail.coolantType')}</IonLabel>
                <IonInput
                  value={editCoolantType}
                  placeholder={t('vehicleDetail.coolantPlaceholder')}
                  onIonChange={e => setEditCoolantType(e.detail.value || '')}
                  onIonInput={e => setEditCoolantType(e.detail.value || '')}
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">{t('vehicleDetail.gearboxOilType')}</IonLabel>
                <IonInput
                  value={editGearboxOilType}
                  placeholder={t('vehicleDetail.gearboxOilPlaceholder')}
                  onIonChange={e => setEditGearboxOilType(e.detail.value || '')}
                  onIonInput={e => setEditGearboxOilType(e.detail.value || '')}
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">{t('vehicleDetail.gearboxOilCapacity')}</IonLabel>
                <IonInput
                  value={editGearboxOilCapacity}
                  placeholder={t('vehicleDetail.gearboxCapacityPlaceholder')}
                  onIonChange={e => setEditGearboxOilCapacity(e.detail.value || '')}
                  onIonInput={e => setEditGearboxOilCapacity(e.detail.value || '')}
                />
              </IonItem>
            </IonList>
            <div style={{ padding: '12px' }}>
              <IonButton expand="block" onClick={handleSaveFluidSpecs}>
                {t('vehicleDetail.saveFluidSpecs')}
              </IonButton>
            </div>
          </IonContent>
        </IonModal>

        {/* Perform Service Modal */}
        <IonModal isOpen={showPerformService} onDidDismiss={() => setShowPerformService(false)}>
          <IonHeader>
            <IonToolbar color="primary">
              <IonTitle>{t('vehicleDetail.logService')}</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowPerformService(false)}>{t('common.cancel')}</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonList>
              <IonItem>
                <IonLabel position="stacked">{t('vehicleDetail.fieldDate')}</IonLabel>
                <IonInput
                  type="date"
                  value={recordDate}
                  onIonChange={e => setRecordDate(e.detail.value || new Date().toISOString().split('T')[0])}
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">{t('vehicleDetail.fieldMileageAtService')}</IonLabel>
                <IonInput
                  type="number"
                  value={recordMileage}
                  onIonChange={e => setRecordMileage(parseInt(e.detail.value || '0') || 0)}
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">{t('vehicleDetail.fieldCost')}</IonLabel>
                <IonInput
                  type="number"
                  value={recordCost}
                  onIonChange={e => setRecordCost(parseInt(e.detail.value || '0') || 0)}
                  placeholder="0"
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">{t('vehicleDetail.fieldWorkshop')}</IonLabel>
                <IonInput
                  value={recordWorkshop}
                  placeholder="e.g., Renault Garage"
                  onIonChange={e => setRecordWorkshop(e.detail.value || '')}
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">{t('vehicleDetail.fieldNotes')}</IonLabel>
                <IonInput
                  value={recordNotes}
                  placeholder={t('common.optional')}
                  onIonChange={e => setRecordNotes(e.detail.value || '')}
                />
              </IonItem>
            </IonList>
            <div style={{ padding: '12px' }}>
              <IonButton expand="block" onClick={handlePerformService}>
                <IonIcon icon={checkmark} slot="start" />
                {t('vehicleDetail.confirmService')}
              </IonButton>
            </div>
          </IonContent>
        </IonModal>

        {/* Edit Mileage Modal */}
        <IonModal isOpen={showEditMileage} onDidDismiss={() => setShowEditMileage(false)}>
          <IonHeader>
            <IonToolbar color="primary">
              <IonTitle>{t('vehicleDetail.updateMileage')}</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowEditMileage(false)}>{t('common.cancel')}</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonList>
              <IonItem>
                <IonLabel position="stacked">{t('vehicleDetail.currentMileageField')}</IonLabel>
                <IonInput
                  type="number"
                  value={newMileage}
                  onIonChange={e => setNewMileage(parseInt(e.detail.value || '0') || 0)}
                  onIonInput={e => setNewMileage(parseInt(e.detail.value || '0') || 0)}
                />
              </IonItem>
            </IonList>
            <div style={{ padding: '12px' }}>
              <IonButton expand="block" onClick={handleUpdateMileage}>
                {t('vehicleDetail.updateMileageBtn')}
              </IonButton>
            </div>
          </IonContent>
        </IonModal>

        <IonToast
          isOpen={showToast}
          message={toastMsg}
          duration={2000}
          position="middle"
          onDidDismiss={() => setShowToast(false)}
        />
      </IonContent>
    </IonPage>
  );
};

export default VehicleDetail;