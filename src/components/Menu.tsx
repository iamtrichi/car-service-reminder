import React, { useContext, useEffect } from 'react';
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
  IonSelect,
  IonSelectOption,
} from '@ionic/react';
import { useHistory, useLocation } from 'react-router-dom';
import { car, home, notifications, globe, mail, alarm, shieldCheckmark } from 'ionicons/icons';
import { menuController } from '@ionic/core/components';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { NotificationContext } from '../App';

const LANGUAGES = [
  { code: 'en', label: '🇬🇧 English' },
  { code: 'fr', label: '🇫🇷 Français' },
  { code: 'ar', label: '🇸🇦 العربية' },
  { code: 'es', label: '🇪🇸 Español' },
  { code: 'pt', label: '🇧🇷 Português' },
];

const Menu: React.FC = () => {
  const history = useHistory();
  const location = useLocation();
  const { t } = useTranslation();
  const { isEnabled: isNotificationEnabled } = useContext(NotificationContext);

  const menuItems = [
    { path: '/dashboard', label: t('menu.dashboard'), icon: home, color: 'primary' },
    { path: '/add-vehicle', label: t('menu.addVehicle'), icon: car, color: 'medium' },
    { path: '/reminders', label: t('menu.reminders'), icon: notifications, color: 'warning' },
  ];

  const currentLang = i18n.language?.startsWith('fr')
    ? 'fr'
    : i18n.language?.startsWith('ar')
    ? 'ar'
    : i18n.language?.startsWith('es')
    ? 'es'
    : i18n.language?.startsWith('pt')
    ? 'pt'
    : 'en';

    useEffect(() => {
      if(currentLang) {
        document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = currentLang;
      }
    }, [currentLang])
  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    menuController.toggle();
  };

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
              <IonIcon icon={item.icon} slot="start" color={item.color} />
              <IonLabel>{item.label}</IonLabel>
            </IonItem>
          ))}
          {isNotificationEnabled && (
            <IonItem
              button
              detail={false}
              className={location.pathname === '/notification-schedule' ? 'selected' : ''}
              onClick={() => {
                history.push('/notification-schedule');
                menuController.toggle();
              }}
            >
              <IonIcon icon={alarm} slot="start" />
              <IonLabel>{t('menu.notificationSchedule')}</IonLabel>
            </IonItem>
          )}
          <IonItem
            button
            detail={false}
            onClick={() => {
              history.push('/privacy-settings');
              menuController.toggle();
            }}
          >
            <IonIcon icon={shieldCheckmark} slot="start" color={'primary'} />
            <IonLabel>{t('menu.privacySettings')}</IonLabel>
          </IonItem>
        </IonList>
        <IonList style={{ marginTop: 'auto', borderTop: '1px solid var(--ion-color-light)', paddingTop: '8px' }}>
          <IonItem
            button
            detail={false}
            onClick={() => {
              history.push('/contact-us');
              menuController.toggle();
            }}
          >
            <IonIcon icon={mail} slot="start" color={'secondary'} />
            <IonLabel>{t('menu.contactUs')}</IonLabel>
          </IonItem>
          <IonItem>
            <IonIcon icon={globe} slot="start" />
            <IonSelect
              value={currentLang}
              interface="action-sheet"
              onIonChange={e => handleLanguageChange(e.detail.value)}
              style={{ width: '100%', maxWidth: '100%' }}
            >
              {LANGUAGES.map(lang => (
                <IonSelectOption key={lang.code} value={lang.code}>
                  {lang.label}
                </IonSelectOption>
              ))}
            </IonSelect>
          </IonItem>
        </IonList>
      </IonContent>
    </IonMenu>
  );
};

export default Menu;
