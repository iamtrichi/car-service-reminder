import React, { useState, useMemo } from 'react';
import {
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonButton,
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
} from '@ionic/react';
import { add, trash, flame, water, cash, speedometer } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { useVehicleStore } from '../store/vehicleStore';
import { FuelRecord } from '../types';
import { calcFuelConsumption, sortFuelRecords } from '../services/fuelService';
import { formatCurrency, getCurrencySymbol } from '../services/currencyService';

interface Props {
  vehicleId: string;
  currentMileage: number;
}

const FuelTab: React.FC<Props> = ({ vehicleId, currentMileage }) => {
  const { t } = useTranslation();
  const fuelRecords = useVehicleStore(s => s.fuelRecords);
  const addFuelRecord = useVehicleStore(s => s.addFuelRecord);
  const deleteFuelRecord = useVehicleStore(s => s.deleteFuelRecord);
  const updateMileage = useVehicleStore(s => s.updateMileage);

  const records = useMemo(
    () => fuelRecords
      .filter(fr => fr.vehicleId === vehicleId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [fuelRecords, vehicleId]
  );

  const stats = useMemo(() => calcFuelConsumption(records), [records]);

  const [showModal, setShowModal] = useState(false);
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
    setShowModal(true);
  };

  // Build lookup: record id -> segment consumption (from full-tank pair)
  const segmentByRecord = useMemo(() => {
    const map = new Map<string, { lPer100km: number; distanceKm: number; liters: number }>();
    const sorted = sortFuelRecords(records);
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      if (!curr.isFullTank) continue;
      const distanceKm = curr.odometer - prev.odometer;
      if (distanceKm <= 0) continue;
      map.set(curr.id, {
        lPer100km: (curr.liters / distanceKm) * 100,
        distanceKm,
        liters: curr.liters,
      });
    }
    return map;
  }, [records]);

  const handleSave = () => {
    if (odometer <= 0 || liters <= 0) {
      setToastMsg(t('fuel.validation'));
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
      station: station || undefined,
      notes: notes || undefined,
    };
    addFuelRecord(record);
    // Keep the car's mileage in sync (forward-only — never roll it back)
    if (odometer > currentMileage) {
      updateMileage(vehicleId, odometer);
    }
    setShowModal(false);
    setToastMsg(t('fuel.recordAdded'));
    setShowToast(true);
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteFuelRecord(deleteId);
      setDeleteId(null);
      setToastMsg(t('fuel.recordDeleted'));
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
                {stats.avgLPer100km !== null ? stats.avgLPer100km.toFixed(1) : '—'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--ion-color-medium)' }}>L/100km</div>
            </div>
            <div>
              <IonIcon icon={water} size="large" color="tertiary" style={{ display: 'block', margin: '0 auto 4px' }} />
              <div style={{ fontWeight: 700, fontSize: '18px' }}>
                {stats.totalLiters.toFixed(1)} <span style={{ fontSize: '12px' }}>L</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--ion-color-medium)' }}>{t('fuel.totalLiters')}</div>
            </div>
            <div>
              <IonIcon icon={cash} size="large" color="success" style={{ display: 'block', margin: '0 auto 4px' }} />
              <div style={{ fontWeight: 700, fontSize: '18px' }}>{formatCurrency(stats.totalCost)}</div>
              <div style={{ fontSize: '12px', color: 'var(--ion-color-medium)' }}>{t('fuel.totalSpent')}</div>
            </div>
          </div>
          {records.length > 1 && stats.avgPricePerLiter !== null && (
            <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--ion-color-medium)', margin: '8px 0 0' }}>
              {t('fuel.avgPricePerLiter')}: {formatCurrency(stats.avgPricePerLiter)} / L
            </p>
          )}
        </IonCardContent>
      </IonCard>

      {/* Record list */}
      <IonList>
        {records.length === 0 ? (
          <div className="ion-padding ion-text-center">
            <IonIcon icon={flame} size="large" color="light" />
            <p style={{ color: 'var(--ion-color-medium)' }}>{t('fuel.noRecords')}</p>
          </div>
        ) : (
          records.map(record => {
            const seg = segmentByRecord.get(record.id);
            return (
              <IonItem key={record.id}>
                <IonIcon icon={flame} slot="start" color={record.isFullTank ? 'warning' : 'medium'} />
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
                    <strong>{record.liters.toLocaleString(undefined, { maximumFractionDigits: 2 })} L</strong>
                    {'  •  '}
                    <strong>{formatCurrency(record.cost)}</strong>
                  </p>
                  {seg && (
                    <p style={{ fontSize: '12px', color: 'var(--ion-color-primary)', fontWeight: 500 }}>
                      {t('fuel.consumption')}: {seg.lPer100km.toFixed(1)} L/100km ({seg.distanceKm.toLocaleString()} km)
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

      {/* Log Fuel button */}
      <div style={{ padding: '12px' }}>
        <IonButton expand="block" color="primary" onClick={openLogModal}>
          <IonIcon icon={add} slot="start" />
          {t('fuel.logButton')}
        </IonButton>
      </div>
{/* Log Fuel Modal */}
      <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)}>
        <IonHeader>
          <IonToolbar color="primary">
            <IonTitle>{t('fuel.logTitle')}</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setShowModal(false)}>{t('common.cancel')}</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <div className="ion-padding">
          <IonList>
            <IonItem>
              <IonLabel position="stacked">{t('fuel.fieldDate')}</IonLabel>
              <IonInput type="date" value={date} onIonChange={e => setDate(String(e.detail.value || ''))} />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">{t('fuel.fieldOdometer')}</IonLabel>
              <IonInput
                type="number"
                value={odometer}
                onIonChange={e => setOdometer(parseFloat(String(e.detail.value)) || 0)}
              />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">{t('fuel.fieldLiters')} (L)</IonLabel>
              <IonInput
                type="number"
                value={liters}
                onIonChange={e => setLiters(parseFloat(String(e.detail.value)) || 0)}
              />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">{t('fuel.fieldCost')} ({getCurrencySymbol()})</IonLabel>
              <IonInput
                type="number"
                value={cost}
                onIonChange={e => setCost(parseFloat(String(e.detail.value)) || 0)}
              />
            </IonItem>
            <IonItem>
              <IonLabel>{t('fuel.fieldFullTank')}</IonLabel>
              <IonToggle slot="end" checked={isFullTank} onIonChange={e => setIsFullTank(e.detail.checked)} />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">{t('fuel.fieldStation')} ({t('common.optional')})</IonLabel>
              <IonInput value={station} onIonChange={e => setStation(String(e.detail.value || ''))} />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">{t('fuel.fieldNotes')} ({t('common.optional')})</IonLabel>
              <IonInput value={notes} onIonChange={e => setNotes(String(e.detail.value || ''))} />
            </IonItem>
          </IonList>
          <div style={{ padding: '12px' }}>
            <IonButton expand="block" color="primary" onClick={handleSave}>
              {t('fuel.save')}
            </IonButton>
          </div>
        </div>
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