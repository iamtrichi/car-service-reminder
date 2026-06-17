import React, { useState } from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonFooter,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonImg,
  IonSpinner,
  IonToast,
} from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { close, image, cloudUpload } from 'ionicons/icons';
import { Camera, CameraSource, CameraResultType } from '@capacitor/camera';
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
  const [uploading, setUploading] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [showToast, setShowToast] = useState(false);

  const handleConfirm = () => {
    onSelect(selectedUrl);
    onClose();
  };

  const handleClear = () => {
    setSelectedUrl(null);
  };

  const handlePickFromGallery = async () => {
    try {
      // Use system photo picker (no permissions needed on Android 13+ / iOS)
      const result = await Camera.getPhoto({
        quality: 90,
        source: CameraSource.Photos,
        width: 1200,
        height: 900,
        correctOrientation: true,
        resultType: CameraResultType.Uri,
      });

      if (result?.path || result?.webPath) {
        setSelectedUrl(result.webPath || result.path || null);
      }
    } catch (error: any) {
      console.error('Camera pick error:', error);
      // User cancelled - do nothing
      if (error?.message?.includes('cancel')) {
        return;
      }
      setToastMsg(t('imagePicker.pickError'));
      setShowToast(true);
    }
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
        {loading || uploading ? (
          <div className="ion-text-center ion-padding" style={{ marginTop: '40%' }}>
            <IonSpinner />
            <p>{t('common.loading')}</p>
          </div>
        ) : (
          <>
            {/* Upload from device */}
            <IonItem button onClick={handlePickFromGallery} detail={false}>
              <IonIcon icon={cloudUpload} slot="start" color="primary" />
              <IonLabel>{t('imagePicker.uploadFromDevice')}</IonLabel>
            </IonItem>

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

            {/* Divider with "or choose from Pexels" label */}
            <div
              style={{
                padding: '8px 16px',
                fontSize: '12px',
                color: 'var(--ion-color-medium)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <div style={{ flex: 1, height: '1px', background: 'var(--ion-color-light-shade)' }} />
              <span>{t('imagePicker.pexelsLabel')}</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--ion-color-light-shade)' }} />
            </div>

            {/* 3-column grid */}
            {photos.length > 0 ? (
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
            ) : (
              <div className="ion-text-center ion-padding" style={{ marginTop: '20px' }}>
                <IonIcon icon={image} style={{ fontSize: '48px', color: 'var(--ion-color-medium)' }} />
                <p>{t('imagePicker.noResults')}</p>
              </div>
            )}

            {/* Photographer credits */}
            <div style={{ padding: '8px 12px', fontSize: '11px', color: 'var(--ion-color-medium)' }}>
              {t('imagePicker.credits')}
            </div>
          </>
        )}
      </IonContent>

      <IonFooter>
        <div style={{ padding: '24px 12px', marginBottom: '80px' }}>
          <IonButton expand="block" onClick={handleConfirm} disabled={loading || uploading}>
            {t('imagePicker.select')}
          </IonButton>
        </div>
      </IonFooter>

      <IonToast
        isOpen={showToast}
        message={toastMsg}
        duration={3000}
        position="top"
        onDidDismiss={() => setShowToast(false)}
      />
    </IonModal>
  );
};

export default ImageSelectModal;