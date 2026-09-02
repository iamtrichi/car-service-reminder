import React, { useEffect } from 'react';
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
import { car, home, notifications, globe, mail, settings, statsChart } from 'ionicons/icons';
import { menuController } from '@ionic/core/components';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'pt', label: 'Português', flag: '🇵🇹' },
];

const Menu: React.FC = () => {
  const history = useHistory();
  const location = useLocation();
  const { t } = useTranslation();

  const menuItems = [
    { path: '/dashboard', label: t('menu.dashboard'), icon: home, color: 'primary' },
    { path: '/add-vehicle', label: t('menu.addVehicle'), icon: car, color: 'medium' },
    { path: '/reminders', label: t('menu.reminders'), icon: notifications, color: 'warning' },
    { path: '/statistics', label: t('vehicleDetail.tabExpenses'), icon: statsChart, color: 'success' },
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
          <IonItem
            button
            detail={false}
            className={location.pathname === '/settings' ? 'selected' : ''}
            onClick={() => {
              history.push('/settings');
              menuController.toggle();
            }}
          >
            <IonIcon icon={settings} slot="start" color={'medium'} />
            <IonLabel>{t('menu.settings')}</IonLabel>
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
                  {lang.flag} {lang.label}
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
