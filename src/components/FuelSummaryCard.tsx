import React, { useMemo } from 'react';
import {
  IonCard,
  IonCardContent,
  IonIcon,
  IonText,
  IonChip,
} from '@ionic/react';
import { flame, water, cash, chevronForward } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { useVehicleStore } from '../store/vehicleStore';
import { calcFuelConsumption } from '../services/fuelService';
import { formatCurrency } from '../services/currencyService';

interface Props {
  vehicleId: string;
  onOpen: () => void;
}

/**
 * Compact clickable summary of the vehicle's fuel log, shown under the
 * "Upcoming" tab. Tapping it opens the dedicated fuel page.
 */
const FuelSummaryCard: React.FC<Props> = ({ vehicleId, onOpen }) => {
  const { t } = useTranslation();
  const fuelRecords = useVehicleStore(s => s.fuelRecords);

  const records = useMemo(
    () => fuelRecords.filter(fr => fr.vehicleId === vehicleId),
    [fuelRecords, vehicleId]
  );
  const stats = useMemo(() => calcFuelConsumption(records), [records]);

  return (
    <IonCard
      button
      onClick={onOpen}
      style={{ margin: '8px 12px', borderRadius: '12px', '--background': 'var(--ion-color-light)' } as any}
    >
      <IonCardContent>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <IonIcon icon={flame} size="large" color="warning" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <strong style={{ fontSize: '15px' }}>{t('fuel.pageTitle')}</strong>
              <IonChip style={{ height: '18px', fontSize: '10px', margin: 0, whiteSpace: 'nowrap' }} color="medium">
                📋 {records.length}
              </IonChip>
            </div>
            {records.length === 0 ? (
              <IonText color="medium">
                <p style={{ fontSize: '12px', margin: '2px 0 0' }}>{t('fuel.noRecordsShort')}</p>
              </IonText>
            ) : (
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '4px' }}>
                <span style={{ fontSize: '12px', color: 'var(--ion-color-dark)' }}>
                  <strong>{stats.avgLPer100km !== null ? `${stats.avgLPer100km.toFixed(1)} L/100km` : '—'}</strong>
                </span>
                <span style={{ fontSize: '12px', color: 'var(--ion-color-medium)' }}>
                  {stats.totalLiters.toFixed(1)} L
                </span>
                <span style={{ fontSize: '12px', color: 'var(--ion-color-medium)' }}>
                  {formatCurrency(stats.totalCost)}
                </span>
              </div>
            )}
          </div>
          <IonIcon icon={chevronForward} color="medium" style={{ flexShrink: 0 }} />
        </div>
      </IonCardContent>
    </IonCard>
  );
};

export default FuelSummaryCard;