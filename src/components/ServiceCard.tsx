import React from 'react';
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonChip,
  IonIcon,
  IonLabel,
  IonText,
} from '@ionic/react';
import { car } from 'ionicons/icons';
import { ReminderStatus } from '../services/reminderService';
import { useTranslation } from 'react-i18next';

interface ServiceCardProps {
  vehicle: ReminderStatus['vehicle'];
  reminders: ReminderStatus[];
  status: 'overdue' | 'due_soon';
  onNavigate: (vehicleId: string) => void;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ vehicle, reminders, status, onNavigate }) => {
  const { t } = useTranslation();

  // Priority services for card title (engine/gearbox oil services get priority)
  const priorityServiceTypes = ['oil_change', 'oil_filter', 'transmission_fluid'];

  // Sort reminders: priority services first, then by most overdue/due soon
  const sortedReminders = [...reminders].sort((a, b) => {
    const aPriority = priorityServiceTypes.includes(a.interval.serviceType) ? 0 : 1;
    const bPriority = priorityServiceTypes.includes(b.interval.serviceType) ? 0 : 1;
    if (aPriority !== bPriority) return aPriority - bPriority;

    // Within same priority, sort by urgency (most urgent first)
    const aRemaining = a.remainingKm ?? a.remainingDays ?? Infinity;
    const bRemaining = b.remainingKm ?? b.remainingDays ?? Infinity;
    return aRemaining - bRemaining;
  });

  // Primary reminder for card header (most urgent priority service, or most urgent overall)
  const primaryReminder = sortedReminders[0];
  const otherReminders = sortedReminders.slice(1);

  const getServiceDisplayName = (serviceType: string, fallbackName: string) => {
    if (serviceType === 'other') return fallbackName;
    const key = `serviceTypes.${serviceType}`;
    const translated = t(key);
    return translated === key ? fallbackName : translated;
  };

  const formatRemaining = (reminder: ReminderStatus) => {
    if (status === 'overdue') {
      const parts: string[] = [];
      if (reminder.remainingKm !== null) {
        parts.push(t('reminders.overdueKm', { km: Math.abs(reminder.remainingKm).toLocaleString() }));
      }
      if (reminder.remainingDays !== null) {
        parts.push(t('reminders.overdueDays', { days: Math.abs(reminder.remainingDays) }));
      }
      return parts.join(' • ');
    } else {
      const parts: string[] = [];
      if (reminder.remainingKm !== null) {
        parts.push(t('reminders.dueInKm', { km: reminder.remainingKm.toLocaleString() }));
      }
      if (reminder.remainingDays !== null) {
        parts.push(t('reminders.dueInDays', { days: reminder.remainingDays }));
      }
      return parts.join(' / ');
    }
  };

  const indicatorColor = status === 'overdue' ? 'danger' : 'warning';
  const indicatorText = status === 'overdue' ? t('reminders.overdueIndicator') : t('reminders.dueSoonIndicator');
  const statusText = status === 'overdue' ? t('common.overdue') : t('common.dueSoon');

  const handleCardClick = () => {
    onNavigate(vehicle.id);
  };

  return (
    <IonCard
      className="service-card"
      button
      onClick={handleCardClick}
      style={{
        '--background': status === 'overdue' ? 'rgba(253, 243, 243, 0.32)' : 'rgba(255, 131, 0, 0.02)',
        border: `1px solid ${status === 'overdue' ? '#ff000069' : 'rgba(255, 131, 0, 0.41)'}`,
        margin: '8px 12px',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}
    >
      <IonCardHeader style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Status Indicator - 50x50px rounded square with 7px radius */}
          <div
            className="status-indicator"
            style={{
              minWidth: '80px',
              minHeight: '80px',
              borderRadius: '7px',
              background: `var(--ion-color-${indicatorColor})`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: '600',
              fontSize: '11px',
              lineHeight: '1.2',
              textAlign: 'center',
              padding: '4px',
              flexShrink: 0,
            }}
          >
            {indicatorText.split(' ').map((word, idx) => (
              <span key={idx} style={{fontSize: idx === 0 ? '24px' : '14px'}}>{word}</span>
            ))}
          </div>

          {/* Card Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', flexDirection: 'column' }}>
              {/* Vehicle Name & Model at right side */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#666',
                  fontSize: '13px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  alignSelf: 'flex-start',
                  marginTop: '2px',
                  justifyContent: 'space-between',
                  width: '100%'
                }}
              >
                <IonText color={indicatorColor}><h5 style={{margin: '0px'}}>{statusText}</h5></IonText>
                {/* Vehicle Name & Model at right side */}
                <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#666',
                  fontSize: '13px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  alignSelf: 'flex-start',
                  marginTop: '2px',
                  justifyContent: 'flex-start',
                }}
                >
                  <IonIcon icon={car} size="small" style={{ color: '#999' }} />
                  <span style={{ fontWeight: '600' }}>{vehicle.make} {vehicle.model}</span>
                </div>
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                {/* Primary Service Name as Title */}
                <IonCardTitle
                  style={{
                    margin: 0,
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#1a1a2e',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {getServiceDisplayName(primaryReminder.interval.serviceType, primaryReminder.interval.name)}
                </IonCardTitle>
                {/* Subtitle: Overdue/Due info */}
                <IonCardSubtitle
                  style={{
                    margin: '4px 0 0 0',
                    fontSize: '13px',
                    color: `var(--ion-color-${indicatorColor})`,
                    fontWeight: '500',
                  }}
                >
                  {formatRemaining(primaryReminder)}
                </IonCardSubtitle>
              </div>
            </div>

            {/* Other Services as IonChips */}
            {otherReminders.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px',
                  marginTop: '10px',
                  paddingTop: '10px',
                  borderTop: '1px solid #f0f0f0',
                }}
              >
                {otherReminders.map((reminder, idx) => (
                  <IonChip
                    key={`${reminder.interval.id}_${idx}`}
                    color={'medium'}
                    style={{
                      borderRadius: '8px',
                      margin: 0,
                      height: '28px',
                      fontSize: '12px',
                    }}
                  >
                    <IonLabel style={{ fontWeight: 700 }}>
                      {getServiceDisplayName(reminder.interval.serviceType, reminder.interval.name)}
                    </IonLabel>
                  </IonChip>
                ))}
              </div>
            )}
          </div>
        </div>
      </IonCardHeader>
    </IonCard>
  );
};

export default ServiceCard;