import React, { useState } from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonImg,
  IonSpinner,
} from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { camera, close, image } from 'ionicons/icons';
import type { PexelsPhoto } from '../services/imageService';

interface ImageSelectModalProps {
  isOpen: boolean;
  photos: PexelsPhoto[];
  currentImageUrl?: string | null;
  loading?: boolean;
  onClose: () => void;
  onSelect: (imageUrl: string | null) => void;
}

const ImageSelectModal: React.FC<ImageSelectModalProps> = ({
  isOpen,
  photos,
  currentImageUrl,
  loading,
  onClose,
  onSelect,
}) => {
  const { t } = useTranslation();
  const [selectedUrl, setSelectedUrl] = useState<string | null>(currentImageUrl || null);

  const handleConfirm = () => {
    onSelect(selectedUrl);
    onClose();
  };

  const handleClear = () => {
    setSelectedUrl(null);
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>{t('imagePicker.title')}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>{t('common.cancel')}</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {loading ? (
          <div className="ion-text-center ion-padding" style={{ marginTop: '40%' }}>
            <IonSpinner />
            <p>{t('common.loading')}</p>
          </div>
        ) : photos.length === 0 ? (
          <div className="ion-text-center ion-padding" style={{ marginTop: '40%' }}>
            <IonIcon icon={image} style={{ fontSize: '48px', color: 'var(--ion-color-medium)' }} />
            <p>{t('imagePicker.noResults')}</p>
          </div>
        ) : (
          <>
            {/* No Image option */}
            <IonItem
              button
              onClick={handleClear}
              color={selectedUrl === null ? 'primary' : undefined}
              detail={false}
            >
              <IonIcon icon={close} slot="start" color="medium" />
              <IonLabel>{t('imagePicker.noImage')}</IonLabel>
            </IonItem>

            {/* 3-column grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '2px',
                padding: '2px',
              }}
            >
              {photos.map((photo) => {
                const isSelected = selectedUrl === photo.src.medium;
                return (
                  <div
                    key={photo.id}
                    onClick={() => setSelectedUrl(photo.src.medium)}
                    style={{
                      position: 'relative',
                      cursor: 'pointer',
                      aspectRatio: '4 / 3',
                      overflow: 'hidden',
                      border: isSelected ? '3px solid var(--ion-color-primary)' : '3px solid transparent',
                      borderRadius: '4px',
                    }}
                  >
                    <IonImg
                      src={photo.src.small}
                      alt={photo.alt || ''}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    {isSelected && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          background: 'rgba(0,0,0,0.6)',
                          color: '#fff',
                          fontSize: '10px',
                          padding: '2px 4px',
                          textAlign: 'center',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {t('imagePicker.selected')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Photographer credits */}
            <div style={{ padding: '8px 12px', fontSize: '11px', color: 'var(--ion-color-medium)' }}>
              {t('imagePicker.credits')}
            </div>
          </>
        )}

        {/* Confirm button */}
        <div style={{ padding: '12px' }}>
          <IonButton expand="block" onClick={handleConfirm} disabled={loading}>
            {t('imagePicker.select')}
          </IonButton>
        </div>
      </IonContent>
    </IonModal>
  );
};

export default ImageSelectModal;