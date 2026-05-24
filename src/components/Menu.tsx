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
import { car, home, notifications } from 'ionicons/icons';
import { menuController } from '@ionic/core/components';
import { useTranslation } from 'react-i18next';

const Menu: React.FC = () => {
  const history = useHistory();
  const location = useLocation();
  const { t } = useTranslation();

  const menuItems = [
    { path: '/dashboard', label: t('menu.dashboard'), icon: home },
    { path: '/add-vehicle', label: t('menu.addVehicle'), icon: car },
    { path: '/reminders', label: t('menu.reminders'), icon: notifications },
  ];

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
      </IonContent>
    </IonMenu>
  );
};

export default Menu;