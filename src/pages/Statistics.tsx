import React, { useMemo, useState } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonCard,
  IonCardContent,
  IonSelect,
  IonSelectOption,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonIcon,
  IonItem,
  IonText,
  useIonViewWillEnter,
  useIonViewWillLeave,
} from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { wallet, water, construct, statsChart, calendar, car, documentText } from 'ionicons/icons';
import { useVehicleStore } from '../store/vehicleStore';
import { getExpenseStats, ExpensePeriod } from '../services/statsService';
import { formatCurrency } from '../services/currencyService';
import { resumeBanner, hideBanner } from '../services/admobUtilits';
import MonthlyBarChart from '../components/MonthlyBarChart';

const PERIODS: ExpensePeriod[] = ['all', 'm3', 'm6', 'm12', 'year'];

const Statistics: React.FC = () => {
  const { t } = useTranslation();
  const vehicles = useVehicleStore(s => s.vehicles);
  const serviceRecords = useVehicleStore(s => s.serviceRecords);
  const fuelRecords = useVehicleStore(s => s.fuelRecords);
  const vehicleDocuments = useVehicleStore(s => s.vehicleDocuments);
  const loadData = useVehicleStore(s => s.loadData);

  const [vehicleId, setVehicleId] = useState<string>('__all__');
  const [period, setPeriod] = useState<ExpensePeriod>('m6');

  // Re-sync localStorage into the store on every visit so the expense stats
  // are always recalculated from the latest persisted data (services, fuel,
  // documents). Covers Ionic page caching and any mutation that bypassed
  // the store while this page stayed cached.
  useIonViewWillEnter(() => {
    loadData();
    resumeBanner();
  });

  useIonViewWillLeave(() => {
    hideBanner();
  });

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
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/dashboard" />
          </IonButtons>
          <IonTitle>{t('statistics.title')}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent style={{ '--background': '#f8f9fa' }}>
        {/* Filters */}
        <div style={{ padding: '10px 12px 4px' }}>
          <IonItem style={{ borderRadius: '10px', marginBottom: '8px' }}>
            <IonIcon icon={car} slot="start" color="primary" />
            <IonSelect
              value={vehicleId}
              interface="action-sheet"
              onIonChange={e => setVehicleId(String(e.detail.value))}
              style={{ width: '100%' }}
            >
              <IonSelectOption value="__all__">{t('statistics.allVehicles')}</IonSelectOption>
              {vehicles.map(v => (
                <IonSelectOption key={v.id} value={v.id}>
                  {v.make && v.model ? `${v.make} ${v.model} ${v.year || ''}` : v.name}
                </IonSelectOption>
              ))}
            </IonSelect>
          </IonItem>
          <IonSegment scrollable={true} value={period} onIonChange={e => setPeriod(e.detail.value as ExpensePeriod)}>
            {PERIODS.map(p => (
              <IonSegmentButton key={p} value={p}>
                <IonLabel>{t(`statistics.period_${p}`)}</IonLabel>
              </IonSegmentButton>
            ))}
          </IonSegment>
        </div>

        {stats.totalSpent <= 0 ? (
          <div className="ion-padding ion-text-center" style={{ marginTop: '24px' }}>
            <IonIcon icon={statsChart} size="large" color="light" style={{ display: 'block', margin: '0 auto 8px' }} />
            <IonText color="medium">
              <p>{t('statistics.noData')}</p>
            </IonText>
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div style={{ display: 'flex', gap: '8px', padding: '8px 12px', flexWrap: 'wrap' }}>
              <IonCard style={{ margin: 0, flex: '1 1 45%', borderRadius: '12px' }}>
                <IonCardContent style={{ textAlign: 'center', padding: '14px 8px' }}>
                  <IonIcon icon={wallet} size="large" color="primary" style={{ display: 'block', margin: '0 auto 4px' }} />
                  <div style={{ fontWeight: 700, fontSize: '18px', whiteSpace: 'nowrap' }}>{formatCurrency(stats.totalSpent)}</div>
                  <div style={{ fontSize: '12px', color: 'var(--ion-color-medium)' }}>{t('expenses.totalSpent')}</div>
                </IonCardContent>
              </IonCard>
              <IonCard style={{ margin: 0, flex: '1 1 45%', borderRadius: '12px' }}>
                <IonCardContent style={{ textAlign: 'center', padding: '14px 8px' }}>
                  <IonIcon icon={construct} size="large" color="warning" style={{ display: 'block', margin: '0 auto 4px' }} />
                  <div style={{ fontWeight: 700, fontSize: '16px', whiteSpace: 'nowrap' }}>{formatCurrency(stats.serviceSpent)}</div>
                  <div style={{ fontSize: '12px', color: 'var(--ion-color-medium)' }}>{t('expenses.services')}</div>
                </IonCardContent>
              </IonCard>
              <IonCard style={{ margin: 0, flex: '1 1 45%', borderRadius: '12px' }}>
                <IonCardContent style={{ textAlign: 'center', padding: '14px 8px' }}>
                  <IonIcon icon={documentText} size="large" color="secondary" style={{ display: 'block', margin: '0 auto 4px' }} />
                  <div style={{ fontWeight: 700, fontSize: '16px', whiteSpace: 'nowrap' }}>{formatCurrency(stats.documentSpent)}</div>
                  <div style={{ fontSize: '12px', color: 'var(--ion-color-medium)' }}>{t('expenses.documents')}</div>
                </IonCardContent>
              </IonCard>
              <IonCard style={{ margin: 0, flex: '1 1 45%', borderRadius: '12px' }}>
                <IonCardContent style={{ textAlign: 'center', padding: '14px 8px' }}>
                  <IonIcon icon={water} size="large" color="tertiary" style={{ display: 'block', margin: '0 auto 4px' }} />
                  <div style={{ fontWeight: 700, fontSize: '16px', whiteSpace: 'nowrap' }}>{formatCurrency(stats.fuelSpent)}</div>
                  <div style={{ fontSize: '12px', color: 'var(--ion-color-medium)' }}>{t('expenses.fuel')}</div>
                </IonCardContent>
              </IonCard>
              <IonCard style={{ margin: 0, flex: '1 1 45%', borderRadius: '12px' }}>
                <IonCardContent style={{ textAlign: 'center', padding: '14px 8px' }}>
                  <IonIcon icon={calendar} size="large" color="success" style={{ display: 'block', margin: '0 auto 4px' }} />
                  <div style={{ fontWeight: 700, fontSize: '16px', whiteSpace: 'nowrap' }}>{formatCurrency(stats.avgPerMonth)}</div>
                  <div style={{ fontSize: '12px', color: 'var(--ion-color-medium)' }}>{t('expenses.perMonth')}</div>
                </IonCardContent>
              </IonCard>
            </div>

            {/* Monthly chart */}
            {stats.monthly.length > 0 && <MonthlyBarChart buckets={stats.monthly} />}
{/* Per-vehicle breakdown (only when all vehicles selected) */}
            {stats.perVehicle.length > 1 && (
              <IonCard style={{ margin: '8px 12px', borderRadius: '12px' }}>
                <IonCardContent>
                  <div style={{ fontWeight: 600, marginBottom: '12px', color: 'var(--ion-color-dark)' }}>
                    {t('statistics.byVehicle')}
                  </div>
                  {stats.perVehicle.map(v => {
                    const share = stats.totalSpent > 0 ? v.total / stats.totalSpent : 0;
                    return (
                      <div key={v.vehicleId} style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.name}</span>
                          <span style={{ color: 'var(--ion-color-medium)' }}>{formatCurrency(v.total)}</span>
                        </div>
                        <div style={{ height: '8px', borderRadius: '4px', background: 'var(--ion-color-light)' }}>
                          <div style={{ height: '100%', width: `${Math.max(share * 100, v.total > 0 ? 2 : 0)}%`, borderRadius: '4px', background: 'var(--ion-color-secondary)' }} />
                        </div>
                      </div>
                    );
                  })}
                </IonCardContent>
              </IonCard>
            )}

            {/* Category breakdown */}
            {stats.categories.length > 0 && (
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
                        <div style={{ height: '100%', width: `${Math.max(cat.share * 100, cat.amount > 0 ? 2 : 0)}%`, borderRadius: '4px', background: 'var(--ion-color-primary)' }} />
                      </div>
                    </div>
                  ))}
                </IonCardContent>
              </IonCard>
            )}

            {/* Fleet consumption summary */}
            {stats.avgConsumption !== null && (
              <IonItem lines="none" style={{ fontSize: '13px', color: 'var(--ion-color-medium)' }}>
                <IonIcon icon={water} slot="start" color="tertiary" />
                <IonLabel>
                  {t('statistics.avgConsumption')}: <strong>{stats.avgConsumption.toFixed(1)} L/100km</strong>
                  {' • '}
                  {t('statistics.records', { services: stats.serviceCount, fuel: stats.fuelCount })}
                </IonLabel>
              </IonItem>
            )}
          </>
        )}
      </IonContent>
    </IonPage>
  );
};

export default Statistics;