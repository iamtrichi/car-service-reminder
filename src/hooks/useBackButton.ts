import { useEffect } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import { alertController } from '@ionic/core';
import { useTranslation } from 'react-i18next';

export const useBackButton = () => {
  const history = useHistory();
  const location = useLocation();
  const { t } = useTranslation();

  console.log(location)
  useEffect(() => {
    const handleBackButton = async () => {
      // On dashboard, show exit confirmation
      if (location.pathname === '/dashboard' || !history || history.length === 0) {
        const alert = await alertController.create({
          header: t('backButton.exitTitle'),
          message: t('backButton.exitMessage'),
          buttons: [
            { text: t('backButton.cancel'), role: 'cancel' },
            { text: t('backButton.exit'), role: 'destructive' }
          ]
        });
        await alert.present();
        const { role } = await alert.onDidDismiss();
        if (role === 'destructive') {
          CapacitorApp.exitApp();
        }
      } else {
        // Navigate back on other pages
        if (history.length > 1) {
          history.goBack();
        }
      }
    };

    const subscription = CapacitorApp.addListener('backButton', handleBackButton);
    return () => {
      subscription.then(s => s.remove());
    };
  }, [history, location.pathname, t]);
};