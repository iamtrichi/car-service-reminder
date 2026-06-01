import React from 'react';
import {
  IonContent,
  IonList,
  IonItem,
  IonIcon,
  IonLabel,
  IonMenu,
  IonHeader,
  IonToolbar,
  IonTitle,
} from '@ionic/react';
import { useHistory, useLocation } from 'react-router-dom';
import { car, home, notifications, globe } from 'ionicons/icons';
import { menuController } from '@ionic/core/components';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';

const Menu: React.FC = () => {
  const history = useHistory();
  const location = useLocation();
  const { t } = useTranslation();

  const menuItems = [
    { path: '/dashboard', label: t('menu.dashboard'), icon: home },
    { path: '/add-vehicle', label: t('menu.addVehicle'), icon: car },
    { path: '/reminders', label: t('menu.reminders'), icon: notifications },
  ];

  const currentLang = i18n.language?.startsWith('fr') ? 'fr' : 'en';
  const toggleLang = currentLang === 'en' ? 'fr' : 'en';
  const toggleLabel = currentLang === 'en' ? 'Français' : 'English';

  return (
    <IonMenu contentId="main">
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>{t('app.title')}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList>
          {menuItems.map(item => (
            <IonItem
              key={item.path}
              button
              detail={false}
              className={location.pathname === item.path ? 'selected' : ''}
              onClick={() => {
                history.push(item.path);
                menuController.toggle()
              }}
            >
              <IonIcon icon={item.icon} slot="start" />
              <IonLabel>{item.label}</IonLabel>
            </IonItem>
          ))}
        </IonList>
        <IonList style={{ marginTop: 'auto', borderTop: '1px solid var(--ion-color-light)', paddingTop: '8px' }}>
          <IonItem
            button
            detail={false}
            onClick={() => {
              i18n.changeLanguage(toggleLang);
              menuController.toggle();
            }}
          >
            <IonIcon icon={globe} slot="start" />
            <IonLabel>{toggleLabel}</IonLabel>
          </IonItem>
        </IonList>
      </IonContent>
    </IonMenu>
  );
};

export default Menu;