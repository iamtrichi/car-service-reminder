import React from 'react';
import { IonCard, IonCardContent } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { MonthlyBucket } from '../services/statsService';

/**
 * Pure CSS stacked bar chart (no chart library): fuel (tertiary) + services
 * (warning) + documents (secondary) stacked per month. Labels are terse so many
 * months fit on a phone.
 */
interface Props {
  buckets: MonthlyBucket[];
}

const MonthlyBarChart: React.FC<Props> = ({ buckets }) => {
  const { t } = useTranslation();
  const maxTotal = Math.max(...buckets.map(b => b.total), 1);

  if (buckets.length === 0) return null;

  return (
    <IonCard style={{ margin: '8px 12px', borderRadius: '12px' }}>
      <IonCardContent>
        <div style={{ fontWeight: 600, marginBottom: '12px', color: 'var(--ion-color-dark)' }}>
          {t('statistics.monthlySpending')}
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '140px' }}>
          {buckets.map(b => {
            const totalH = b.total > 0 ? Math.max((b.total / maxTotal) * 120, 4) : 2;
            const fuelH = (b.fuelCost / maxTotal) * 120;
            const serviceH = (b.serviceCost / maxTotal) * 120;
            const docH = (b.documentCost / maxTotal) * 120;
            return (
              <div key={b.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column-reverse', height: `${totalH}px`, width: '100%', gap: 0 }}>
                  {serviceH > 0 && (
                    <div style={{ height: `${serviceH}px`, width: '100%', background: 'var(--ion-color-warning)', borderRadius: '2px 2px 0 0' }} />
                  )}
                  {fuelH > 0 && (
                    <div style={{ height: `${fuelH}px`, width: '100%', background: 'var(--ion-color-tertiary)', borderRadius: '2px 2px 0 0' }} />
                  )}
                  {docH > 0 && (
                    <div style={{ height: `${docH}px`, width: '100%', background: 'var(--ion-color-secondary)', borderRadius: '2px 2px 0 0' }} />
                  )}
                </div>
                <div style={{ fontSize: '9px', color: 'var(--ion-color-medium)', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                  {b.label}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '11px', color: 'var(--ion-color-medium)', flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '10px', height: '10px', background: 'var(--ion-color-tertiary)', display: 'inline-block', borderRadius: '2px' }} />
            {t('expenses.fuel')}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '10px', height: '10px', background: 'var(--ion-color-warning)', display: 'inline-block', borderRadius: '2px' }} />
            {t('expenses.services')}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '10px', height: '10px', background: 'var(--ion-color-secondary)', display: 'inline-block', borderRadius: '2px' }} />
            {t('expenses.documents')}
          </span>
        </div>
      </IonCardContent>
    </IonCard>
  );
};

export default MonthlyBarChart;