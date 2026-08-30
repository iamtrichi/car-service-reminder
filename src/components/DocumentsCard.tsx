import React, { useMemo } from 'react';
import {
  IonCard,
  IonCardContent,
  IonIcon,
  IonText,
  IonChip,
} from '@ionic/react';
import { documentText, chevronForward } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { useVehicleStore } from '../store/vehicleStore';
import { getDocumentStatus } from '../services/documentService';

interface Props {
  vehicleId: string;
  onOpen: () => void;
}

/**
 * Compact clickable summary of the vehicle's documents, shown under the
 * "Dashboard" (upcoming) tab. Highlights expiring / expired documents and
 * opens the dedicated documents page on tap.
 */
const DocumentsCard: React.FC<Props> = ({ vehicleId, onOpen }) => {
  const { t } = useTranslation();
  const vehicleDocuments = useVehicleStore(s => s.vehicleDocuments);

  const docs = useMemo(
    () => vehicleDocuments.filter(d => d.vehicleId === vehicleId),
    [vehicleDocuments, vehicleId]
  );

  const { expired, expiring } = useMemo(() => {
    let expired = 0;
    let expiring = 0;
    for (const d of docs) {
      const status = getDocumentStatus(d.expiryDate).status;
      if (status === 'expired') expired++;
      else if (status === 'expiring_soon') expiring++;
    }
    return { expired, expiring };
  }, [docs]);

  // Color priority: expired > expiring soon > neutral
  const iconColor = expired > 0 ? 'danger' : expiring > 0 ? 'warning' : 'medium';

  const subtitle = (() => {
    if (docs.length === 0) return t('documents.noDocumentsShort');
    const attention = expired + expiring;
    if (attention > 0) {
      return (expired > 0 ? `${expired} ${t('documents.expired')} · ` : '') +
        `${expiring} ${t('documents.expiringSoon')}`;
    }
    return t('documents.upToDate');
  })();

  return (
    <IonCard
      button
      onClick={onOpen}
      style={{ margin: '8px 12px', borderRadius: '12px', '--background': 'var(--ion-color-light)' } as any}
    >
      <IonCardContent>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <IonIcon icon={documentText} size="large" color={iconColor} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <strong style={{ fontSize: '15px' }}>{t('documents.title')}</strong>
              <IonChip style={{ height: '18px', fontSize: '10px', margin: 0, whiteSpace: 'nowrap' }} color={iconColor}>
                📋 {docs.length}
              </IonChip>
            </div>
            <IonText color={docs.length === 0 ? 'medium' : expired > 0 ? 'danger' : expiring > 0 ? 'warning' : 'success'}>
              <p style={{ fontSize: '12px', margin: '2px 0 0' }}>{subtitle}</p>
            </IonText>
          </div>
          <IonIcon icon={chevronForward} color="medium" style={{ flexShrink: 0 }} />
        </div>
      </IonCardContent>
    </IonCard>
  );
};

export default DocumentsCard;