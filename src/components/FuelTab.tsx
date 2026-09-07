import React, { useState, useMemo } from 'react';
import {
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonButton,
  IonContent,
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonInput,
  IonToggle,
  IonToast,
  IonChip,
  IonCard,
  IonCardContent,
  IonAlert,
  IonSegment,
  IonSegmentButton,
} from '@ionic/react';
import { add, trash, flame, water, cash, speedometer, batteryCharging } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { useVehicleStore } from '../store/vehicleStore';
import { FuelRecord, EnergyType } from '../types';
import { calcFuelConsumption, sortFuelRecords, getVehicleEnergyType } from '../services/fuelService';
import { formatCurrency, getCurrencySymbol } from '../services/currencyService';

interface Props {
  vehicleId: string;
  currentMileage: number;
  overrideShowModal: boolean; // If true, the log modal will be shown immediately (used when navigating from "Add Fuel" button)
  overrideShowModalFunc: (show: boolean) => void; // Callback to update the parent state for showing the modal
}

const FuelTab: React.FC<Props> = ({ vehicleId, currentMileage, overrideShowModal = false, overrideShowModalFunc = (show: boolean) => {overrideShowModal = show} }) => {
  const { t } = useTranslation();
  const fuelRecords = useVehicleStore(s => s.fuelRecords);
  const vehicles = useVehicleStore(s => s.vehicles);
  const addFuelRecord = useVehicleStore(s => s.addFuelRecord);
  const deleteFuelRecord = useVehicleStore(s => s.deleteFuelRecord);
  const updateMileage = useVehicleStore(s => s.updateMileage);

  const vehicle = vehicles.find(v => v.id === vehicleId);
  const vehEnergy = vehicle ? getVehicleEnergyType(vehicle) : 'fuel';
  // PHEVs ('both') can log fuel OR electricity; the modal shows an energy selector.
  const [activeEnergy, setActiveEnergy] = useState<EnergyType>('fuel');

  const records = useMemo(
    () => fuelRecords
      .filter(fr => fr.vehicleId === vehicleId)
      .sort((a, b) => b.odometer - a.odometer || new Date(b.date).getTime() - new Date(a.date).getTime()),
    [fuelRecords, vehicleId]
  );

  const stats = useMemo(() => calcFuelConsumption(records), [records]);

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [odometer, setOdometer] = useState<number>(0);
  const [liters, setLiters] = useState<number>(0);
  const [cost, setCost] = useState<number>(0);
  const [isFullTank, setIsFullTank] = useState(true);
  const [station, setStation] = useState('');
  const [notes, setNotes] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const openLogModal = () => {
    setDate(new Date().toISOString().split('T')[0]);
    setOdometer(currentMileage);
    setLiters(0);
    setCost(0);
    setIsFullTank(true);
    setStation('');
    setNotes('');
    // Default to the vehicle's energy source (PHEV starts on fuel).
    setActiveEnergy(vehEnergy === 'electric' ? 'electric' : 'fuel');
    overrideShowModalFunc(true);
  };

  // Build lookup: record id -> segment consumption (from full-tank/charge pair)
  const segmentByRecord = useMemo(() => {
    const map = new Map<string, { per100km: number; distanceKm: number; energy: number }>();
    const sorted = sortFuelRecords(records);
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      if (!curr.isFullTank) continue;
      const distanceKm = curr.odometer - prev.odometer;
      if (distanceKm <= 0) continue;
      map.set(curr.id, {
        per100km: (curr.liters / distanceKm) * 100,
        distanceKm,
        energy: curr.liters,
      });
    }
    return map;
  }, [records]);

  const handleSave = () => {
    if (odometer < 0 || liters <= 0) {
      setToastMsg(t(activeEnergy === 'electric' ? 'charging.validation' : 'fuel.validation'));
      setShowToast(true);
      return;
    }
    const record: FuelRecord = {
      id: 'fuel_' + Date.now(),
      vehicleId,
      date,
      odometer,
      liters,
      cost: cost || 0,
      isFullTank,
      energyType: activeEnergy,
      station: station || undefined,
      notes: notes || undefined,
    };
    addFuelRecord(record);
    // Keep the car's mileage in sync (forward-only — never roll it back)
    if (odometer > currentMileage) {
      updateMileage(vehicleId, odometer);
    }
    overrideShowModalFunc(false);
    setToastMsg(t(activeEnergy === 'electric' ? 'charging.recordAdded' : 'fuel.recordAdded'));
    setShowToast(true);
  };

  const handleDelete = () => {
    if (deleteId) {
      const del = records.find(r => r.id === deleteId);
      deleteFuelRecord(deleteId);
      setDeleteId(null);
      setToastMsg(t(del && (del.energyType || 'fuel') === 'electric' ? 'charging.recordDeleted' : 'fuel.recordDeleted'));
      setShowToast(true);
    }
  };
return (
    <>
      {/* Summary card */}
      <IonCard style={{ margin: '12px' }}>
        <IonCardContent>
          <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center', flexWrap: 'wrap' }}>
            <div>
              <IonIcon icon={water} size="large" color="primary" style={{ display: 'block', margin: '0 auto 4px' }} />
              <div style={{ fontWeight: 700, fontSize: '18px' }}>
                {stats.avgLPer100km !== null ? stats.avgLPer100km.toFixed(1) : stats.avgKwhPer100km !== null ? stats.avgKwhPer100km.toFixed(1) : '—'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--ion-color-medium)' }}>
                {stats.avgLPer100km !== null ? 'L/100km' : stats.avgKwhPer100km !== null ? 'kWh/100km' : t('fuel.consumption')}
              </div>
            </div>
            <div>
              <IonIcon icon={water} size="large" color="tertiary" style={{ display: 'block', margin: '0 auto 4px' }} />
              <div style={{ fontWeight: 700, fontSize: '16px' }}>
                {stats.totalLiters > 0 && (
                  <span>{stats.totalLiters.toFixed(1)} <span style={{ fontSize: '12px' }}>L</span>{stats.totalKwh > 0 ? ' + ' : ''}</span>
                )}
                {stats.totalKwh > 0 && (
                  <span>{stats.totalKwh.toFixed(1)} <span style={{ fontSize: '12px' }}>kWh</span></span>
                )}
                {stats.totalLiters <= 0 && stats.totalKwh <= 0 && '—'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--ion-color-medium)' }}>
                {stats.totalKwh > 0 && stats.totalLiters > 0
                  ? t('charging.totalFuelAndCharge')
                  : stats.totalKwh > 0
                    ? t('charging.totalKwh')
                    : t('fuel.totalLiters')}
              </div>
            </div>
            <div>
              <IonIcon icon={cash} size="large" color="success" style={{ display: 'block', margin: '0 auto 4px' }} />
              <div style={{ fontWeight: 700, fontSize: '18px' }}>{formatCurrency(stats.totalCost)}</div>
              <div style={{ fontSize: '12px', color: 'var(--ion-color-medium)' }}>{t('fuel.totalSpent')}</div>
            </div>
          </div>
          {records.length > 1 && (stats.avgPricePerLiter !== null || stats.avgPricePerKwh !== null) && (
            <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--ion-color-medium)', margin: '8px 0 0' }}>
              {stats.avgPricePerLiter !== null && (
                <>{t('fuel.avgPricePerLiter')}: {formatCurrency(stats.avgPricePerLiter)} / L</>
              )}
              {stats.avgPricePerKwh !== null && (
                <>{stats.avgPricePerLiter !== null ? '  •  ' : ''}{t('charging.avgPricePerKwh')}: {formatCurrency(stats.avgPricePerKwh)} / kWh</>
              )}
            </p>
          )}
        </IonCardContent>
      </IonCard>

      {/* Record list */}
      <IonList>
        {records.length === 0 ? (
          <div className="ion-padding ion-text-center">
            <IonIcon icon={vehEnergy === 'electric' ? batteryCharging : flame} size="large" color="light" />
            <p style={{ color: 'var(--ion-color-medium)' }}>{t(vehEnergy === 'electric' ? 'charging.noRecords' : 'fuel.noRecords')}</p>
          </div>
        ) : (
          records.map(record => {
            const seg = segmentByRecord.get(record.id);
            const isEv = (record.energyType || 'fuel') === 'electric';
            return (
              <IonItem key={record.id}>
                <IonIcon icon={isEv ? batteryCharging : flame} slot="start" color={record.isFullTank ? 'warning' : 'medium'} />
                <IonLabel>
                  <h3>
                    {record.date}
                    {record.isFullTank && (
                      <IonChip style={{ height: '18px', fontSize: '10px', marginInlineStart: '6px' }}>
                        {t('fuel.fullTank')}
                      </IonChip>
                    )}
                  </h3>
                  <p style={{ fontSize: '12px', color: '#666' }}>
                    <IonIcon icon={speedometer} style={{ verticalAlign: 'middle' }} />{' '}
                    {record.odometer.toLocaleString()} km
                    {'  •  '}
                    <strong>{record.liters.toLocaleString(undefined, { maximumFractionDigits: 2 })} {isEv ? 'kWh' : 'L'}</strong>
                    {'  •  '}
                    <strong>{formatCurrency(record.cost)}</strong>
                  </p>
                  {seg && (
                    <p style={{ fontSize: '12px', color: 'var(--ion-color-primary)', fontWeight: 500 }}>
                      {t('fuel.consumption')}: {seg.per100km.toFixed(1)} {isEv ? 'kWh/100km' : 'L/100km'} ({seg.distanceKm.toLocaleString()} km)
                    </p>
                  )}
                  {record.station && <p style={{ fontSize: '12px', color: '#888' }}>{record.station}</p>}
                  {record.notes && <p style={{ fontSize: '12px', color: '#888' }}>{record.notes}</p>}
                </IonLabel>
                <IonButton slot="end" fill="clear" color="danger" onClick={() => setDeleteId(record.id)}>
                  <IonIcon icon={trash} />
                </IonButton>
              </IonItem>
            );
          })
        )}
      </IonList>

      {/* Log Fuel / Log Charge button */}
      <div style={{ padding: '12px' }}>
        <IonButton expand="block" color="primary" onClick={openLogModal} data-tour="log-fuel-btn">
          <IonIcon icon={add} slot="start" />
          {t(vehEnergy === 'electric' ? 'charging.logButton' : (vehEnergy === 'both' ? 'charging.mixedTitle' : 'fuel.logButton'))}
        </IonButton>
      </div>
      {/* Log Fuel / Charge Modal */}
      <IonModal isOpen={overrideShowModal} onDidDismiss={() => overrideShowModalFunc(false)}>
        <IonHeader>
          <IonToolbar color="primary">
            <IonTitle>{t(vehEnergy === 'electric' ? 'charging.logTitle' : (vehEnergy === 'both' ? 'charging.mixedTitle' : 'fuel.logTitle'))}</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => overrideShowModalFunc(false)}>{t('common.cancel')}</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <IonList>
            {/* PHEV: choose which energy source this record logs. Renders first so
                the log form stays identical for ICE/EV (walkthrough safety). */}
            {vehEnergy === 'both' && (
              <IonItem>
                <IonSegment
                  value={activeEnergy}
                  onIonChange={e => setActiveEnergy((e.detail.value as EnergyType) || 'fuel')}
                  style={{ width: '100%' }}
                >
                  <IonSegmentButton value="fuel">
                    <IonLabel>{t('fuel.logButton')}</IonLabel>
                  </IonSegmentButton>
                  <IonSegmentButton value="electric">
                    <IonLabel>{t('charging.logButton')}</IonLabel>
                  </IonSegmentButton>
                </IonSegment>
              </IonItem>
            )}
            <IonItem>
              <IonLabel position="stacked">{t('fuel.fieldDate')}</IonLabel>
              <IonInput type="date" value={date} onIonChange={e => setDate(String(e.detail.value || ''))} onIonInput={e => setDate(String(e.detail.value || ''))} />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">{t('fuel.fieldOdometer')}</IonLabel>
              <IonInput
                data-tour="fuel-odometer"
                type="number"
                value={odometer}
                onIonChange={e => setOdometer(parseFloat(String(e.detail.value)) || 0)}
                onIonInput={e => setOdometer(parseFloat(String(e.detail.value)) || 0)}
              />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">
                {activeEnergy === 'electric' ? t('charging.fieldEnergy') : t('fuel.fieldLiters')} ({activeEnergy === 'electric' ? 'kWh' : 'L'})
              </IonLabel>
              <IonInput
                data-tour="fuel-liters"
                type="number"
                value={liters}
                onIonChange={e => setLiters(parseFloat(String(e.detail.value)) || 0)}
                onIonInput={e => setLiters(parseFloat(String(e.detail.value)) || 0)}
              />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">{t('fuel.fieldCost')} ({getCurrencySymbol()})</IonLabel>
              <IonInput
                data-tour="fuel-cost"
                type="number"
                value={cost}
                onIonChange={e => setCost(parseFloat(String(e.detail.value)) || 0)}
                onIonInput={e => setCost(parseFloat(String(e.detail.value)) || 0)}
              />
            </IonItem>
            <IonItem>
              <IonLabel>{activeEnergy === 'electric' ? t('charging.fieldFullBattery') : t('fuel.fieldFullTank')}</IonLabel>
              <IonToggle slot="end" checked={isFullTank} onIonChange={e => setIsFullTank(e.detail.checked)} />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">{activeEnergy === 'electric' ? t('charging.fieldStation') : t('fuel.fieldStation')} ({t('common.optional')})</IonLabel>
              <IonInput value={station} onIonChange={e => setStation(String(e.detail.value || ''))} onIonInput={e => setStation(String(e.detail.value || ''))} />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">{t('fuel.fieldNotes')} ({t('common.optional')})</IonLabel>
              <IonInput value={notes} onIonChange={e => setNotes(String(e.detail.value || ''))} onIonInput={e => setNotes(String(e.detail.value || ''))} />
            </IonItem>
          </IonList>
          <div style={{ padding: '12px' }}>
            <IonButton expand="block" color="primary" onClick={handleSave} data-tour="save-fuel-btn">
              {t('fuel.save')}
            </IonButton>
          </div>
        </IonContent>
      </IonModal>

      {/* Delete confirm */}
      <IonAlert
        isOpen={!!deleteId}
        onDidDismiss={() => setDeleteId(null)}
        header={t('fuel.deleteTitle')}
        message={t('fuel.deleteMessage')}
        buttons={[
          { text: t('common.cancel'), role: 'cancel' },
          { text: t('common.delete'), role: 'destructive', handler: handleDelete },
        ]}
      />

      <IonToast
        isOpen={showToast}
        message={toastMsg}
        duration={2000}
        position="middle"
        onDidDismiss={() => setShowToast(false)}
      />
    </>
  );
};

export default FuelTab;