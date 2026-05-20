import React, { useState, useMemo, useEffect } from 'react';
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
} from '@ionic/react';
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
  const [rawSearch, setRawSearch] = useState('');
  const [searchText, setSearchText] = useState('');

  // Debounce the search input to avoid filtering on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setSearchText(rawSearch), 150);
    return () => clearTimeout(t);
  }, [rawSearch]);

  const filteredOptions = useMemo(() => {
    if (!searchText.trim()) return options;
    const lower = searchText.toLowerCase();
    return options.filter(
      opt =>
        opt.label.toLowerCase().includes(lower)
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
            <IonButton onClick={handleClose}>Cancel</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonSearchbar
          value={rawSearch}
          onIonChange={e => setRawSearch(e.detail.value || '')}
          placeholder={searchPlaceholder || `Search ${title.toLowerCase()}...`}
          autocorrect="off"
          spellcheck={false}
        />
        <IonList>
          {options.length === 0 && allowCustom ? (
            <>
              <div className="ion-padding ion-text-center" style={{ color: 'var(--ion-color-medium)', marginTop: '20px' }}>
                <p>No options in our database</p>
              </div>
              <IonItem button onClick={() => handleSelect('__custom__')}>
                <IonLabel color="primary">
                  <h3>+ Create custom engine</h3>
                  <p>Enter your engine details manually</p>
                </IonLabel>
              </IonItem>
            </>
          ) : filteredOptions.length === 0 && allowCustom && searchText.trim() ? (
            <>
              <div className="ion-padding ion-text-center" style={{ color: 'var(--ion-color-medium)', marginTop: '20px' }}>
                <p>No results found for "{searchText.trim()}"</p>
              </div>
              <IonItem button onClick={() => handleSelect(searchText.trim())}>
                <IonLabel color="primary">
                  <h3>+ Add custom: {searchText.trim()}</h3>
                  <p>Your selection is not in our database</p>
                </IonLabel>
              </IonItem>
            </>
          ) : filteredOptions.length === 0 ? (
            <div className="ion-padding ion-text-center" style={{ color: 'var(--ion-color-medium)', marginTop: '20px' }}>
              <p>No results found</p>
            </div>
          ) : (
            filteredOptions.map((opt, idx) => (
              <IonItem key={`${opt.value}_${idx}`} button onClick={() => handleSelect(opt.value)}>
                {opt.imageUrl ? (
                  <IonAvatar slot="start" style={{ width: '40px', height: '40px' }}>
                    <IonImg src={opt.imageUrl} alt={opt.label} />
                  </IonAvatar>
                ) : (
                  <IonIcon icon={car} slot="start" color="medium" style={{ fontSize: '24px' }} />
                )}
                <IonLabel>
                  <h3>{opt.label}</h3>
                  {opt.detail && <p>{opt.detail}</p>}
                </IonLabel>
              </IonItem>
            ))
          )}
        </IonList>
      </IonContent>
    </IonModal>
  );
};

export default SearchSelectModal;