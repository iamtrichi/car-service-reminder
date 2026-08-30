import React, { useState, useMemo } from 'react';
import {
  IonCard,
  IonCardContent,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonIcon,
  IonItem,
} from '@ionic/react';
import { wallet, water, construct, statsChart, calendar, documentText } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { useVehicleStore } from '../store/vehicleStore';
import { getExpenseStats, ExpensePeriod } from '../services/statsService';
import { formatCurrency } from '../services/currencyService';
import MonthlyBarChart from './MonthlyBarChart';

interface Props {
  vehicleId: string;
}

const PERIODS: ExpensePeriod[] = ['all', 'm3', 'm6', 'm12', 'year'];

const ExpensesTab: React.FC<Props> = ({ vehicleId }) => {
  const { t } = useTranslation();
  const vehicles = useVehicleStore(s => s.vehicles);
  const serviceRecords = useVehicleStore(s => s.serviceRecords);
  const fuelRecords = useVehicleStore(s => s.fuelRecords);
  const vehicleDocuments = useVehicleStore(s => s.vehicleDocuments);
  const [period, setPeriod] = useState<ExpensePeriod>('m6');

  const stats = useMemo(
    () => getExpenseStats({ vehicles, serviceRecords, fuelRecords, vehicleDocuments, vehicleId, period }),
    [vehicles, serviceRecords, fuelRecords, vehicleDocuments, vehicleId, period]
  );

  const categoryLabel = (id: string, name: string) => {
    if (id === '__fuel__') return t('statistics.fuel');
    if (id === '__doc__') return t('expenses.documents');
    const key = `serviceTypes.${name}`;
    const translated = t(key);
    return translated === key ? name : translated;
  };

  return (
    <>
      {/* Period selector */}
      <IonSegment
        scrollable={true}
        value={period}
        onIonChange={e => setPeriod(e.detail.value as ExpensePeriod)}
        style={{ margin: '8px 0 4px' }}
      >
        {PERIODS.map(p => (
          <IonSegmentButton key={p} value={p}>
            <IonLabel>{t(`statistics.period_${p}`)}</IonLabel>
          </IonSegmentButton>
        ))}
      </IonSegment>
{/* Summary cards */}
      <div style={{ display: 'flex', gap: '8px', padding: '8px 12px', flexWrap: 'wrap' }}>
        <IonCard style={{ margin: 0, flex: '1 1 40%', borderRadius: '12px' }}>
          <IonCardContent style={{ textAlign: 'center', padding: '14px 8px' }}>
            <IonIcon icon={wallet} size="large" color="primary" style={{ display: 'block', margin: '0 auto 4px' }} />
            <div style={{ fontWeight: 700, fontSize: '18px', whiteSpace: 'nowrap' }}>{formatCurrency(stats.totalSpent)}</div>
            <div style={{ fontSize: '12px', color: 'var(--ion-color-medium)' }}>{t('expenses.totalSpent')}</div>
          </IonCardContent>
        </IonCard>
        <IonCard style={{ margin: 0, flex: '1 1 40%', borderRadius: '12px' }}>
          <IonCardContent style={{ textAlign: 'center', padding: '14px 8px' }}>
            <IonIcon icon={construct} size="large" color="warning" style={{ display: 'block', margin: '0 auto 4px' }} />
            <div style={{ fontWeight: 700, fontSize: '16px', whiteSpace: 'nowrap' }}>{formatCurrency(stats.serviceSpent)}</div>
            <div style={{ fontSize: '12px', color: 'var(--ion-color-medium)' }}>{t('expenses.services')}</div>
          </IonCardContent>
        </IonCard>
        <IonCard style={{ margin: 0, flex: '1 1 40%', borderRadius: '12px' }}>
          <IonCardContent style={{ textAlign: 'center', padding: '14px 8px' }}>
            <IonIcon icon={documentText} size="large" color="secondary" style={{ display: 'block', margin: '0 auto 4px' }} />
            <div style={{ fontWeight: 700, fontSize: '16px', whiteSpace: 'nowrap' }}>{formatCurrency(stats.documentSpent)}</div>
            <div style={{ fontSize: '12px', color: 'var(--ion-color-medium)' }}>{t('expenses.documents')}</div>
          </IonCardContent>
        </IonCard>
        <IonCard style={{ margin: 0, flex: '1 1 40%', borderRadius: '12px' }}>
          <IonCardContent style={{ textAlign: 'center', padding: '14px 8px' }}>
            <IonIcon icon={water} size="large" color="tertiary" style={{ display: 'block', margin: '0 auto 4px' }} />
            <div style={{ fontWeight: 700, fontSize: '16px', whiteSpace: 'nowrap' }}>{formatCurrency(stats.fuelSpent)}</div>
            <div style={{ fontSize: '12px', color: 'var(--ion-color-medium)' }}>{t('expenses.fuel')}</div>
          </IonCardContent>
        </IonCard>
        <IonCard style={{ margin: 0, flex: '1 1 40%', borderRadius: '12px' }}>
          <IonCardContent style={{ textAlign: 'center', padding: '14px 8px' }}>
            <IonIcon icon={calendar} size="large" color="success" style={{ display: 'block', margin: '0 auto 4px' }} />
            <div style={{ fontWeight: 700, fontSize: '16px', whiteSpace: 'nowrap' }}>{formatCurrency(stats.avgPerMonth)}</div>
            <div style={{ fontSize: '12px', color: 'var(--ion-color-medium)' }}>{t('expenses.perMonth')}</div>
          </IonCardContent>
        </IonCard>
      </div>

      {/* Monthly bar chart (shared CSS component) */}
      {stats.monthly.length > 0 && <MonthlyBarChart buckets={stats.monthly} />}
{/* Category breakdown */}
      {stats.categories.length > 0 ? (
        <IonCard style={{ margin: '8px 12px', borderRadius: '12px' }}>
          <IonCardContent>
            <div style={{ fontWeight: 600, marginBottom: '12px', color: 'var(--ion-color-dark)' }}>
              {t('statistics.byCategory')}
            </div>
            {stats.categories.map(cat => (
              <div key={cat.id} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {categoryLabel(cat.id, cat.name)}
                  </span>
                  <span style={{ color: 'var(--ion-color-medium)' }}>{formatCurrency(cat.amount)}</span>
                </div>
                <div style={{ height: '8px', borderRadius: '4px', background: 'var(--ion-color-light)' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.max(cat.share * 100, cat.amount > 0 ? 2 : 0)}%`,
                      borderRadius: '4px',
                      background: 'var(--ion-color-primary)',
                    }}
                  />
                </div>
              </div>
            ))}
          </IonCardContent>
        </IonCard>
      ) : null}

      {/* Averages line */}
      {stats.totalSpent > 0 && (
        <IonItem lines="none" style={{ fontSize: '13px', color: 'var(--ion-color-medium)' }}>
          <IonIcon icon={statsChart} slot="start" color="primary" />
          <IonLabel>
            {t('expenses.nRecords', {
              services: stats.serviceCount,
              fuel: stats.fuelCount,
            })}
            {stats.avgConsumption !== null && (
              <> • {t('statistics.avgConsumption')}: {stats.avgConsumption.toFixed(1)} L/100km</>
            )}
          </IonLabel>
        </IonItem>
      )}

      {/* Empty state */}
      {stats.totalSpent <= 0 && (
        <div className="ion-padding ion-text-center">
          <IonIcon icon={wallet} size="large" color="light" />
          <p style={{ color: 'var(--ion-color-medium)' }}>{t('expenses.noData')}</p>
        </div>
      )}
    </>
  );
};

export default ExpensesTab;