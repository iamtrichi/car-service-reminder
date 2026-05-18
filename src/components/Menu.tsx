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

const Menu: React.FC = () => {
  const history = useHistory();
  const location = useLocation();

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: home },
    { path: '/add-vehicle', label: 'Add Vehicle', icon: car },
    { path: '/reminders', label: 'Reminders', icon: notifications },
  ];

  return (
    <IonMenu contentId="main">
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Car Service</IonTitle>
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