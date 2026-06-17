import React, { useState, useMemo } from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonSearchbar,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonAvatar,
  IonImg,
  IonThumbnail,
} from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { car } from 'ionicons/icons';

export interface SelectOption {
  value: string;
  label: string;
  detail?: string;
  imageUrl?: string;
}

interface SearchSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (value: string) => void;
  title: string;
  options: SelectOption[];
  searchPlaceholder?: string;
  allowCustom?: boolean;
}

const SearchSelectModal: React.FC<SearchSelectModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  title,
  options,
  searchPlaceholder,
  allowCustom,
}) => {
  const { t } = useTranslation();
  const [searchText, setSearchText] = useState('');

  const filteredOptions = useMemo(() => {
    if (!searchText.trim()) return options;
    const lower = searchText.toLowerCase();
    return options.filter(
      opt => opt.label.toLowerCase().includes(lower)
    );
  }, [options, searchText]);

  const handleSelect = (value: string) => {
    onSelect(value);
    setSearchText('');
  };

  const handleClose = () => {
    setSearchText('');
    onClose();
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={handleClose}>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>{title}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleClose}>{t('searchSelect.cancel')}</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonSearchbar
          value={searchText}
          onIonChange={e => setSearchText(e.detail.value || '')}
          placeholder={searchPlaceholder || `Search ${title.toLowerCase()}...`}
          autocorrect="off"
          spellcheck={false}
        />
        <IonList>
          {options.length === 0 && allowCustom ? (
            <>
              <div className="ion-padding ion-text-center" style={{ color: 'var(--ion-color-medium)', marginTop: '20px' }}>
                <p>{t('searchSelect.noOptions')}</p>
              </div>
              <IonItem button onClick={() => handleSelect('__custom__')}>
                <IonLabel color="primary">
                  <h3>{t('searchSelect.createCustom')}</h3>
                  <p>{t('searchSelect.createCustomDesc')}</p>
                </IonLabel>
              </IonItem>
            </>
          ) : filteredOptions.length === 0 && allowCustom && searchText.trim() ? (
            <>
              <div className="ion-padding ion-text-center" style={{ color: 'var(--ion-color-medium)', marginTop: '20px' }}>
                <p>{t('searchSelect.noResults', { query: searchText.trim() })}</p>
              </div>
              <IonItem button onClick={() => handleSelect(searchText.trim())}>
                <IonLabel color="primary">
                  <h3>{t('searchSelect.addCustom', { query: searchText.trim() })}</h3>
                  <p>{t('searchSelect.addCustomDesc')}</p>
                </IonLabel>
              </IonItem>
            </>
          ) : filteredOptions.length === 0 ? (
            <div className="ion-padding ion-text-center" style={{ color: 'var(--ion-color-medium)', marginTop: '20px' }}>
              <p>{t('searchSelect.noResultsFound')}</p>
            </div>
          ) : (
            filteredOptions.map((opt, idx) => {
              return (
              <IonItem key={`${opt.value}_${idx}`} button onClick={() => handleSelect(opt.value)}>
                {opt.imageUrl ? (
                  <IonThumbnail slot="start" style={{ width: '60px', height: '60px' }}>
                    <IonImg src={opt.imageUrl} alt={opt.label} style={{objectFit: 'scale-down'}}/>
                  </IonThumbnail>
                ) : (
                  <IonIcon icon={car} slot="start" color="medium" style={{ fontSize: '24px' }} />
                )}
                <IonLabel>
                  <h3>{opt.label}</h3>
                  {opt.detail && Array.isArray(opt.detail) && opt.detail.length > 0 && (
                    <p>
                      {opt.detail[0] === opt.detail[opt.detail.length - 1]
                        ? opt.detail[0]
                        : `${opt.detail[0]} - ${opt.detail[opt.detail.length - 1]}`}
                    </p>
                  )}
                  {opt.detail && !Array.isArray(opt.detail) && <p>{opt.detail}</p>}
                </IonLabel>
              </IonItem>
            )
            })
          )}
          <div style={{height: '52px'}}>
            {' '}
          </div>
        </IonList>
      </IonContent>
    </IonModal>
  );
};

export default SearchSelectModal;