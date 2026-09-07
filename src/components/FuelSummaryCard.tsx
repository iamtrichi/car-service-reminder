import React, { useMemo } from 'react';
import {
  IonCard,
  IonCardContent,
  IonIcon,
  IonText,
  IonChip,
} from '@ionic/react';
import { flame, water, cash, chevronForward, batteryCharging } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { useVehicleStore } from '../store/vehicleStore';
import { calcFuelConsumption, getVehicleEnergyType } from '../services/fuelService';
import { formatCurrency } from '../services/currencyService';

interface Props {
  vehicleId: string;
  onOpen: () => void;
  'data-tour'?: string;
}

/**
 * Compact clickable summary of the vehicle's fuel/charging log, shown under the
 * "Upcoming" tab. Tapping it opens the dedicated fuel page.
 */
const FuelSummaryCard: React.FC<Props> = ({ vehicleId, onOpen, ...rest }) => {
  const { t } = useTranslation();
  const fuelRecords = useVehicleStore(s => s.fuelRecords);
  const vehicles = useVehicleStore(s => s.vehicles);

  const vehicle = vehicles.find(v => v.id === vehicleId);
  const vehEnergy = vehicle ? getVehicleEnergyType(vehicle) : 'fuel';

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
      data-tour={rest['data-tour']}
    >
      <IonCardContent>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <IonIcon icon={vehEnergy === 'electric' ? batteryCharging : flame} size="large" color="warning" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <strong style={{ fontSize: '15px' }}>{t(vehEnergy === 'both' ? 'charging.mixedTitle' : vehEnergy === 'electric' ? 'charging.pageTitle' : 'fuel.pageTitle')}</strong>
              <IonChip style={{ height: '18px', fontSize: '10px', margin: 0, whiteSpace: 'nowrap' }} color="medium">
                📋 {records.length}
              </IonChip>
            </div>
            {records.length === 0 ? (
              <IonText color="medium">
                <p style={{ fontSize: '12px', margin: '2px 0 0' }}>{t(vehEnergy === 'electric' ? 'charging.noRecordsShort' : 'fuel.noRecordsShort')}</p>
              </IonText>
            ) : (
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '4px' }}>
                {stats.avgLPer100km !== null && (
                  <span style={{ fontSize: '12px', color: 'var(--ion-color-dark)' }}>
                    <strong>{stats.avgLPer100km.toFixed(1)} L/100km</strong>
                  </span>
                )}
                {stats.totalLiters > 0 && (
                  <span style={{ fontSize: '12px', color: 'var(--ion-color-medium)' }}>
                    {stats.totalLiters.toFixed(1)} L
                  </span>
                )}
                {stats.avgKwhPer100km !== null && (
                  <span style={{ fontSize: '12px', color: 'var(--ion-color-dark)' }}>
                    <strong>{stats.avgKwhPer100km.toFixed(1)} kWh/100km</strong>
                  </span>
                )}
                {stats.totalKwh > 0 && (
                  <span style={{ fontSize: '12px', color: 'var(--ion-color-medium)' }}>
                    {stats.totalKwh.toFixed(1)} kWh
                  </span>
                )}
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