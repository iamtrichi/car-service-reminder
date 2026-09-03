import React, { useState, useMemo } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonButton,
  IonFab,
  IonFabButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonChip,
  IonModal,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonToggle,
  IonToast,
  IonAlert,
} from '@ionic/react';
import { useParams, useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { add, trash, create, documentText } from 'ionicons/icons';
import { useIonViewWillEnter, useIonViewWillLeave } from '@ionic/react';
import { useVehicleStore } from '../store/vehicleStore';
import { VehicleDocument, DocumentRenewal, DocumentType } from '../types';
import {
  DOCUMENT_TYPES,
  defaultsToLifetime,
  getDocumentStatus,
  DocumentStatus,
} from '../services/documentService';
import { formatCurrency, getCurrencySymbol } from '../services/currencyService';
import { resumeBanner, hideBanner } from '../services/admobUtilits';

const STATUS_SORT_ORDER: Record<DocumentStatus, number> = {
  expired: 0,
  expiring_soon: 1,
  valid: 2,
  lifetime: 3,
};

/** Normalize a YYYY-MM-DD string for date comparison (ignores datetime suffix). */
function resolveDateString(dateStr: string): string {
  return dateStr.slice(0, 10);
}

/**
 * Dedicated per-vehicle documents page: add/edit/delete documents
 * (registration, insurance, vignette, technical inspection, other) with
 * expiry tracking and lifetime (no-expiry) support.
 * Route: /vehicle/:vehicleId/documents
 */
const DocumentsPage: React.FC = () => {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const history = useHistory();
  const { t } = useTranslation();

  const vehicles = useVehicleStore(s => s.vehicles);
  const vehicleDocuments = useVehicleStore(s => s.vehicleDocuments);
  const addVehicleDocument = useVehicleStore(s => s.addVehicleDocument);
  const updateVehicleDocument = useVehicleStore(s => s.updateVehicleDocument);
  const deleteVehicleDocument = useVehicleStore(s => s.deleteVehicleDocument);

  const vehicle = vehicles.find(v => v.id === vehicleId);

  // Modal form state
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [docType, setDocType] = useState<DocumentType>(DocumentType.REGISTRATION);
  const [docName, setDocName] = useState('');
  const [isLifetime, setIsLifetime] = useState(true);
  const [expiry, setExpiry] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useIonViewWillEnter(() => { resumeBanner(); });
  useIonViewWillLeave(() => { hideBanner(); });

  const docs = useMemo(
    () => vehicleDocuments.filter(d => d.vehicleId === vehicleId),
    [vehicleDocuments, vehicleId]
  );

  const sortedDocs = useMemo(() => {
    return [...docs].sort((a, b) => {
      const sa = getDocumentStatus(a.expiryDate).status;
      const sb = getDocumentStatus(b.expiryDate).status;
      if (STATUS_SORT_ORDER[sa] !== STATUS_SORT_ORDER[sb]) {
        return STATUS_SORT_ORDER[sa] - STATUS_SORT_ORDER[sb];
      }
      const da = a.expiryDate || '9999-99-99';
      const db = b.expiryDate || '9999-99-99';
      return da.localeCompare(db);
    });
  }, [docs]);

  const l10nName = (type: DocumentType) => t(`documentTypes.${type}`);

  const showToastMsg = (msg: string) => {
    setToastMsg(msg);
    setShowToast(true);
  };

  const openAdd = () => {
    setEditId(null);
    setDocType(DocumentType.REGISTRATION);
    setDocName(l10nName(DocumentType.REGISTRATION));
    setIsLifetime(defaultsToLifetime(DocumentType.REGISTRATION));
    setExpiry('');
    setIssueDate('');
    setCost('');
    setNotes('');
    setShowModal(true);
  };

  const openEdit = (doc: VehicleDocument) => {
    setEditId(doc.id);
    setDocType(doc.documentType);
    setDocName(doc.name);
    setIsLifetime(!doc.expiryDate);
    setExpiry(doc.expiryDate || '');
    setIssueDate(doc.issueDate || '');
    setCost(doc.cost != null ? String(doc.cost) : '');
    setNotes(doc.notes || '');
    setShowModal(true);
  };

  const handleTypeChange = (value: DocumentType) => {
    setDocType(value);
    if (editId) {
      // When editing, only re-autofill if the name still matches the old type label
      const prevDefault = l10nName(docType);
      if (docName === prevDefault) setDocName(l10nName(value));
    } else {
      setDocName(l10nName(value));
      setIsLifetime(defaultsToLifetime(value));
    }
  };

  const handleSave = () => {
    const trimmed = docName.trim();
    if (!trimmed) {
      showToastMsg(t('documents.nameRequired'));
      return;
    }
    if (!isLifetime && !expiry) {
      showToastMsg(t('documents.expiryRequired'));
      return;
    }
    const costNum = cost.trim() ? parseFloat(cost.replace(',', '.')) : undefined;
    if (cost.trim() && (isNaN(costNum as number) || (costNum as number) < 0)) {
      showToastMsg(t('documents.invalidCost'));
      return;
    }
    // Auto-set issue date to today when a cost is recorded but no issue date given
    let resolvedIssueDate = issueDate;
    if ((costNum || 0) > 0 && !resolvedIssueDate) {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      resolvedIssueDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    }

    // When editing an existing paid document and saving another paid issuance,
    // treat it as a renewal: archive the previous issuance (issueDate/cost/notes)
    // so its expense stays visible in statistics instead of being overwritten.
    let renewals: DocumentRenewal[] | undefined;
    if (editId) {
      const existing = docs.find(d => d.id === editId);
      if (existing) {
        renewals = existing.renewals ? [...existing.renewals] : [];
        const hadCost = (existing.cost ?? 0) > 0;
        const hasCost = (costNum || 0) > 0;
        const sameIssuance = resolvedIssueDate && existing.issueDate
          ? resolveDateString(resolvedIssueDate) === resolveDateString(existing.issueDate)
          : !resolvedIssueDate && !existing.issueDate;
        // Archive the previous issuance only when the new save represents a
        // different (newer) issuance — i.e., the old one had a cost and the new
        // date is different (a renewal). Same-date corrections just overwrite.
        if (hadCost && hasCost && !sameIssuance) {
          renewals.push({
            issueDate: existing.issueDate,
            cost: existing.cost,
            notes: existing.notes,
          });
        }
        // Drop the oldest renewal once there are more than 100 (historical cap)
        if (renewals.length > 100) renewals = renewals.slice(renewals.length - 100);
      }
    }

    const doc: VehicleDocument = {
      id: editId || 'doc_' + Date.now(),
      vehicleId,
      documentType: docType,
      name: trimmed,
      expiryDate: isLifetime ? null : expiry,
      issueDate: resolvedIssueDate || undefined,
      cost: costNum,
      notes: notes || undefined,
      renewals,
    };
    if (editId) updateVehicleDocument(doc);
    else addVehicleDocument(doc);
    setShowModal(false);
  };

  const handleDelete = () => {
    if (deleteId) deleteVehicleDocument(deleteId);
    setDeleteId(null);
  };

  const getStatusInfo = (doc: VehicleDocument) => {
    const { status, daysRemaining } = getDocumentStatus(doc.expiryDate);
    let label: string;
    switch (status) {
      case 'lifetime':
        label = t('documents.lifetimeDoc');
        break;
      case 'expired':
        label = daysRemaining === 0
          ? t('documents.expiredToday')
          : t('documents.expiredDaysAgo', { days: Math.abs(daysRemaining || 0) });
        break;
      case 'expiring_soon':
        label = daysRemaining === 0
          ? t('documents.expiresToday')
          : t('documents.expiresInDays', { days: daysRemaining || 0 });
        break;
      default:
        label = t('documents.valid');
    }
    const color = status === 'expired' ? 'danger'
      : status === 'expiring_soon' ? 'warning'
      : status === 'valid' ? 'success' : 'medium';
    return { status, label, color };
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonButtons slot="start">
            <IonBackButton defaultHref={`/vehicle/${vehicleId}`} />
          </IonButtons>
          <IonTitle>{t('documents.title')}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={openAdd}>
              <IonIcon slot="icon-only" icon={add} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent style={{ '--background': '#f8f9fa' }}>
        {!vehicle ? (
          <div className="ion-padding ion-text-center" style={{ marginTop: '40%' }}>
            <p>{t('vehicleDetail.notFound')}</p>
            <IonButton onClick={() => history.push('/dashboard')}>
              {t('vehicleDetail.backToDashboard')}
            </IonButton>
          </div>
        ) : sortedDocs.length === 0 ? (
          <div className="ion-padding ion-text-center" style={{ marginTop: '30%' }}>
            <IonIcon icon={documentText} style={{ fontSize: '64px', color: 'var(--ion-color-medium)' }} />
            <h3>{t('documents.noDocuments')}</h3>
            <p style={{ color: 'var(--ion-color-medium)' }}>{t('documents.noDocumentsShort')}</p>
            <IonButton onClick={openAdd}>
              <IonIcon icon={add} slot="start" />
              {t('documents.add')}
            </IonButton>
          </div>
        ) : (
          <IonList>
            {sortedDocs.map(doc => {
              const { label, color } = getStatusInfo(doc);
              return (
                <IonItem key={doc.id} button onClick={() => openEdit(doc)}>
                  <IonIcon icon={documentText} color={color} slot="start" />
                  <IonLabel>
                    <h3>{doc.name}</h3>
                    <p style={{ color: 'var(--ion-color-medium)' }}>
                      {l10nName(doc.documentType)}
                      {(doc.cost ?? 0) > 0 ? ` · ${formatCurrency(doc.cost ?? 0)}` : ''}
                      {(doc.renewals?.length ?? 0) > 0 ? ` · ${t('documents.renewalCount', { count: doc.renewals!.length })}` : ''}
                    </p>
                  </IonLabel>
                  <IonChip slot="end" style={{ height: '18px', fontSize: '10px', margin: 0 }} color={color}>
                    {label}
                  </IonChip>
                  <IonButton
                    slot="end"
                    fill="clear"
                    onClick={e => { e.stopPropagation(); setDeleteId(doc.id); }}
                  >
                    <IonIcon icon={trash} color="danger" />
                  </IonButton>
                </IonItem>
              );
            })}
          </IonList>
        )}

        {sortedDocs.length > 0 && (
          <IonFab vertical="bottom" horizontal="end" slot="fixed">
            <IonFabButton onClick={openAdd}>
              <IonIcon icon={add} />
            </IonFabButton>
          </IonFab>
        )}

        {/* Add / Edit Document Modal */}
        <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)}>
          <IonHeader>
            <IonToolbar color="primary">
              <IonTitle>{editId ? t('documents.edit') : t('documents.add')}</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowModal(false)}>{t('common.cancel')}</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonList>
              <IonItem>
                <IonLabel position="stacked">{t('documents.fieldType')}</IonLabel>
                <IonSelect
                  value={docType}
                  onIonChange={e => handleTypeChange(e.detail.value as DocumentType)}
                >
                  {DOCUMENT_TYPES.map(type => (
                    <IonSelectOption key={type} value={type}>{l10nName(type)}</IonSelectOption>
                  ))}
                </IonSelect>
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">
                  {t('documents.fieldName')}{' '}
                  <span style={{ color: 'var(--ion-color-danger)' }}>*</span>
                </IonLabel>
                <IonInput
                  value={docName}
                  placeholder={t('documents.fieldNamePlaceholder')}
                  onIonChange={e => setDocName(String(e.detail.value || ''))}
                  onIonInput={e => setDocName(String(e.detail.value || ''))}
                />
              </IonItem>
              <IonItem>
                <IonLabel>{t('documents.lifetime')}</IonLabel>
                <IonToggle
                  slot="end"
                  checked={isLifetime}
                  onIonChange={e => setIsLifetime(e.detail.checked)}
                />
              </IonItem>
              {!isLifetime && (
                <IonItem>
                  <IonLabel position="stacked">
                    {t('documents.fieldExpiry')}{' '}
                    <span style={{ color: 'var(--ion-color-danger)' }}>*</span>
                  </IonLabel>
                  <IonInput
                    type="date"
                    value={expiry}
                    onIonChange={e => setExpiry(String(e.detail.value || ''))}
                  />
                </IonItem>
              )}
              <IonItem>
                <IonLabel position="stacked">
                  {t('documents.fieldIssueDate')} ({t('common.optional')})
                </IonLabel>
                <IonInput
                  type="date"
                  value={issueDate}
                  onIonChange={e => setIssueDate(String(e.detail.value || ''))}
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">
                  {t('documents.fieldCost')} ({t('common.optional')})
                </IonLabel>
                <IonInput
                  type="number"
                  inputmode="decimal"
                  value={cost}
                  placeholder={`0.00 ${getCurrencySymbol()}`}
                  onIonChange={e => setCost(String(e.detail.value || ''))}
                  onIonInput={e => setCost(String(e.detail.value || ''))}
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">
                  {t('documents.fieldNotes')} ({t('common.optional')})
                </IonLabel>
                <IonInput
                  value={notes}
                  onIonChange={e => setNotes(String(e.detail.value || ''))}
                  onIonInput={e => setNotes(String(e.detail.value || ''))}
                />
              </IonItem>
            </IonList>
            <div style={{ padding: '12px' }}>
              <IonButton expand="block" color="primary" onClick={handleSave}>
                <IonIcon icon={create} slot="start" />
                {t('documents.save')}
              </IonButton>
            </div>
          </IonContent>
        </IonModal>

        {/* Delete confirm */}
        <IonAlert
          isOpen={!!deleteId}
          onDidDismiss={() => setDeleteId(null)}
          header={t('documents.delete')}
          message={t('documents.deleteMessage')}
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
      </IonContent>
    </IonPage>
  );
};

export default DocumentsPage;